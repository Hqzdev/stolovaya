import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  DataMode,
  CreateOrder,
  Order,
  OrderDetail,
  OrderPage,
  OrderStatus,
  Scope,
  Totals,
} from "@stolovaya/contracts";
import { Database } from "../database/database";
import { WorkspaceContext } from "../workspace/workspace.context";
import { WorkspaceRepository } from "../workspace/workspace.repository";
import { OrderQuery } from "./order.dto";

export const orderSelect = `o.id, o.dish_id AS "dishId", d.name AS dish, o.group_id AS "groupId", g.name AS "group",
  o.quantity, to_char(o.service_date, 'YYYY-MM-DD') AS "serviceDate", to_char(o.serving_time, 'HH24:MI') AS "servingTime",
  o.status, o.created_at AS "createdAt", o.cooking_at AS "cookingAt", o.ready_at AS "readyAt", o.created_by AS "createdBy"`;
export const orderJoin =
  "orders o JOIN dishes d ON d.id = o.dish_id JOIN school_groups g ON g.id = o.group_id";
export const totalsSelect = `COALESCE(sum(o.quantity), 0)::float8 AS planned,
  COALESCE(sum(o.quantity) FILTER (WHERE o.status = 'ready'), 0)::float8 AS issued,
  count(*)::int AS orders, count(*) FILTER (WHERE o.status = 'ready')::int AS ready,
  count(*) FILTER (WHERE o.status = 'cooking')::int AS cooking, count(*) FILTER (WHERE o.status = 'new')::int AS fresh,
  COALESCE(sum(o.quantity) FILTER (WHERE o.status = 'cooking'), 0)::float8 AS "cookingPortions",
  COALESCE(sum(o.quantity) FILTER (WHERE o.status = 'new'), 0)::float8 AS "newPortions"`;

export class OrderFilter {
  readonly values: unknown[];
  readonly where: string;
  constructor(scope: Scope, mode: DataMode, query: OrderQuery = {}) {
    this.values = [scope.from, scope.to, mode];
    const parts = [
      "o.service_date BETWEEN $1::date AND $2::date",
      "o.data_mode = $3",
    ];
    const add = (value: unknown, clause: (placeholder: string) => string) => {
      this.values.push(value);
      parts.push(clause(`$${this.values.length}`));
    };
    if (query.dish) add(query.dish, (p) => `o.dish_id = ${p}`);
    if (query.group) add(query.group, (p) => `o.group_id = ${p}`);
    if (query.status === "pending") parts.push("o.status != 'ready'");
    else if (query.status && query.status !== "all")
      add(query.status, (p) => `o.status = ${p}::order_status`);
    if (query.q?.trim())
      add(
        query.q.trim(),
        (p) =>
          `strpos(lower(d.name || ' ' || g.name || ' #' || o.id::text), lower(${p})) > 0`,
      );
    if (query.on) add(query.on, (p) => `o.service_date = ${p}::date`);
    if (query.hour) {
      this.values.push(scope.timezone);
      const zone = `$${this.values.length}`;
      add(
        query.hour,
        (p) =>
          `o.status = 'ready' AND to_char(timezone(${zone}, o.ready_at), 'HH24') = ${p}`,
      );
    }
    this.where = parts.join(" AND ");
  }
}

@Injectable()
export class OrderRepository {
  constructor(
    private readonly database: Database,
    private readonly workspace: WorkspaceContext,
    private readonly settings: WorkspaceRepository,
  ) {}
  async list(scope: Scope, query: OrderQuery): Promise<OrderPage> {
    const filter = new OrderFilter(scope, this.workspace.state.mode, query);
    const scopeFilter = new OrderFilter(scope, this.workspace.state.mode);
    const [totals] = await this.database.query<Totals>(
      `SELECT ${totalsSelect} FROM ${orderJoin} WHERE ${filter.where}`,
      filter.values,
    );
    const pageSize = 10;
    const page = Math.min(
      query.page || 1,
      Math.max(1, Math.ceil(totals.orders / pageSize)),
    );
    const sorting =
      query.sort === "qty"
        ? "o.quantity DESC, o.id DESC"
        : query.sort === "qty-asc"
          ? "o.quantity ASC, o.id DESC"
          : "o.service_date DESC, o.created_at DESC, o.id DESC";
    const items = await this.database.query<Order>(
      `SELECT ${orderSelect} FROM ${orderJoin} WHERE ${filter.where} ORDER BY ${sorting} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      filter.values,
    );
    const [counts] = await this.database.query<{
      all: number;
      new: number;
      cooking: number;
      ready: number;
    }>(
      `SELECT count(*)::int AS "all", count(*) FILTER (WHERE status = 'new')::int AS new, count(*) FILTER (WHERE status = 'cooking')::int AS cooking, count(*) FILTER (WHERE status = 'ready')::int AS ready FROM orders o WHERE ${scopeFilter.where}`,
      scopeFilter.values,
    );
    return {
      items,
      total: totals.orders,
      page,
      pageSize,
      totals,
      counts,
      scope,
    };
  }
  async detail(id: number): Promise<OrderDetail> {
    const [order] = await this.database.query<Order>(
      `SELECT ${orderSelect} FROM ${orderJoin} WHERE o.id = $1 AND o.data_mode = $2`,
      [id, this.workspace.state.mode],
    );
    if (!order) throw new NotFoundException("Заказ не найден.");
    const events = await this.database.query<OrderDetail["events"][number]>(
      'SELECT id, status, happened_at AS "happenedAt", actor FROM order_events WHERE order_id = $1 ORDER BY happened_at, id',
      [id],
    );
    return { order, events };
  }
  async create(data: CreateOrder, actor: string): Promise<OrderDetail> {
    const id = await this.database.transaction(async (client) => {
      await this.settings.assertCurrent(client, this.workspace.state);
      const result = await client.query<{ id: number }>(
        "INSERT INTO orders (dish_id, group_id, quantity, service_date, serving_time, created_by, data_mode) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [
          data.dishId,
          data.groupId,
          data.quantity,
          data.serviceDate,
          data.servingTime,
          actor,
          this.workspace.state.mode,
        ],
      );
      const id = result.rows[0].id;
      await client.query(
        "INSERT INTO order_events (order_id, status, actor) VALUES ($1, 'new', $2)",
        [id, actor],
      );
      return id;
    });
    return this.detail(id);
  }
  async transition(
    id: number,
    next: OrderStatus,
    actor: string,
  ): Promise<OrderDetail> {
    await this.database.transaction(async (client) => {
      await this.settings.assertCurrent(client, this.workspace.state);
      const result = await client.query<{ status: OrderStatus }>(
        "SELECT status FROM orders WHERE id = $1 AND data_mode = $2 FOR UPDATE",
        [id, this.workspace.state.mode],
      );
      const current = result.rows[0]?.status;
      if (!current) throw new NotFoundException("Заказ не найден.");
      if (current === next) return;
      if (!(
        (current === "new" && next === "cooking") ||
        (current === "cooking" && next === "ready")
      ))
        throw new ConflictException(
          "Статус уже изменился. Обновите список заказов.",
        );
      const column = next === "cooking" ? "cooking_at" : "ready_at";
      await client.query(
        `UPDATE orders SET status = $2, ${column} = now() WHERE id = $1`,
        [id, next],
      );
      await client.query(
        "INSERT INTO order_events (order_id, status, actor) VALUES ($1,$2,$3)",
        [id, next, actor],
      );
    });
    return this.detail(id);
  }
}
