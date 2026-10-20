import { Injectable } from "@nestjs/common";
import type {
  Analytics,
  Breakdown,
  ChartPoint,
  EntityAnalytics,
  Order,
  Totals,
} from "@stolovaya/contracts";
import { Database } from "../database/database";
import {
  OrderFilter,
  OrderRepository,
  orderJoin,
  orderSelect,
  totalsSelect,
} from "../orders/order.repository";
import { ScopeService } from "../orders/scope.service";
import { OrderQuery } from "../orders/order.dto";
import { CatalogService } from "../catalog/catalog.service";

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly database: Database,
    private readonly scopes: ScopeService,
    private readonly orders: OrderRepository,
    private readonly catalog: CatalogService,
  ) {}
  async overview(query: OrderQuery): Promise<Analytics> {
    const scope = this.scopes.resolve(query);
    const filter = new OrderFilter(scope, {
      dish: query.dish,
      group: query.group,
    });
    const [totalsRows, dishes, groups, recent] = await Promise.all([
      this.database.query<Totals>(
        `SELECT ${totalsSelect} FROM ${orderJoin} WHERE ${filter.where}`,
        filter.values,
      ),
      this.database.query<Breakdown>(
        `SELECT d.id, d.name, ${totalsSelect} FROM ${orderJoin} WHERE ${filter.where} GROUP BY d.id ORDER BY issued DESC, d.name`,
        filter.values,
      ),
      this.database.query<Breakdown>(
        `SELECT g.id, g.name, ${totalsSelect} FROM ${orderJoin} WHERE ${filter.where} GROUP BY g.id ORDER BY g.name`,
        filter.values,
      ),
      this.database.query<Order>(
        `SELECT ${orderSelect} FROM ${orderJoin} WHERE ${filter.where} ORDER BY o.created_at DESC, o.id DESC LIMIT 4`,
        filter.values,
      ),
    ]);
    const chartValues =
      scope.period === "day"
        ? [...filter.values, scope.timezone]
        : [...filter.values];
    const zone = `$${chartValues.length}`;
    const key =
      scope.period === "day"
        ? `to_char(timezone(${zone}, o.ready_at), 'HH24')`
        : `to_char(o.service_date, 'YYYY-MM-DD')`;
    const bars = await this.database.query<{ key: string; issued: number }>(
      `SELECT ${key} AS key, sum(o.quantity)::float8 AS issued FROM ${orderJoin} WHERE ${filter.where} AND o.status = 'ready' GROUP BY 1 ORDER BY 1`,
      chartValues,
    );
    const amounts = new Map(bars.map((bar) => [bar.key, bar.issued]));
    const chart: ChartPoint[] = [];
    if (scope.period === "day") {
      const hours = bars.map((bar) => Number(bar.key));
      const first = Math.min(8, ...hours),
        last = Math.max(14, ...hours);
      for (let hour = first; hour <= last; hour++) {
        const key = String(hour).padStart(2, "0");
        chart.push({ key, label: `${key}:00`, issued: amounts.get(key) || 0 });
      }
    } else {
      for (let offset = 0; offset < 7; offset++) {
        const date = new Date(`${scope.from}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() + offset);
        const key = date.toISOString().slice(0, 10);
        chart.push({
          key,
          label: new Intl.DateTimeFormat("ru-RU", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }).format(date),
          issued: amounts.get(key) || 0,
        });
      }
    }
    return {
      scope,
      totals: totalsRows[0],
      dishes,
      groups,
      recent,
      chart,
      updatedAt: new Date().toISOString(),
    };
  }
  async entity(
    kind: "dish" | "group",
    id: string,
    query: OrderQuery,
  ): Promise<EntityAnalytics> {
    const entity = await this.catalog.get(kind, id);
    const filtered = {
      ...query,
      dish: kind === "dish" ? id : undefined,
      group: kind === "group" ? id : undefined,
    };
    const [analytics, orders] = await Promise.all([
      this.overview(filtered),
      this.orders.list(this.scopes.resolve(filtered), filtered),
    ]);
    return { ...analytics, entity, kind, orders };
  }
}
