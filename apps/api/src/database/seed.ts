import type { PoolClient } from "pg";
import type { OrderStatus } from "@stolovaya/contracts";
import { CatalogEntryRepository } from "../catalog/catalog-entry.repository";
import { Environment } from "../config/environment";

export async function seedCatalog(
  client: PoolClient,
): Promise<{ dishes: Map<string, string>; groups: Map<string, string> }> {
  const repository = new CatalogEntryRepository();
  const dishes = new Map<string, string>();
  const groups = new Map<string, string>();
  for (const [id, name] of [
    ["soup", "Куриный суп с лапшой"],
    ["cutlet", "Котлета с гречкой"],
    ["casserole", "Творожная запеканка"],
  ]) {
    const entry = await repository.resolve("dish", name, client, id);
    dishes.set(id, entry.id);
  }
  for (const [id, name] of [
    ["9a", "9А"],
    ["10b", "10Б"],
    ["8v", "8В"],
    ["7a", "7А"],
  ]) {
    const entry = await repository.resolve("group", name, client, id);
    groups.set(id, entry.id);
  }
  return { dishes, groups };
}

type SeedOrder = [string, string, number, number, string, OrderStatus, string?];

export async function seedDemo(
  client: PoolClient,
  environment: Environment,
): Promise<string> {
  if (
    (
      await client.query(
        "SELECT 1 FROM orders WHERE data_mode = 'demo' LIMIT 1",
      )
    ).rowCount
  )
    throw new Error(
      "Демонстрационный набор уже существует. Рабочие и демонстрационные заказы сохранены.",
    );
  const anchor = process.env.DEMO_DATE || environment.today();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(anchor) ||
    new Date(`${anchor}T12:00:00Z`).toISOString().slice(0, 10) !== anchor
  )
    throw new Error("DEMO_DATE должна быть корректной датой YYYY-MM-DD.");
  const catalog = await seedCatalog(client);
  const actor = environment.accounts.find(
    (account) => account.role === "cook",
  )!.login;
  const records: SeedOrder[] = [];
  const history: [number, [string, string, number][]][] = [
    [
      -6,
      [
        ["soup", "9a", 24],
        ["cutlet", "9a", 32],
        ["soup", "10b", 16],
        ["cutlet", "10b", 34],
        ["casserole", "8v", 36],
        ["soup", "7a", 30],
        ["casserole", "7a", 14],
      ],
    ],
    [
      -5,
      [
        ["soup", "9a", 44],
        ["cutlet", "9a", 20],
        ["soup", "10b", 36],
        ["cutlet", "10b", 20],
        ["casserole", "8v", 44],
        ["cutlet", "7a", 34],
        ["casserole", "7a", 14],
      ],
    ],
    [
      -4,
      [
        ["soup", "9a", 20],
        ["cutlet", "9a", 38],
        ["soup", "10b", 22],
        ["cutlet", "10b", 32],
        ["casserole", "8v", 40],
        ["soup", "7a", 30],
        ["casserole", "7a", 16],
      ],
    ],
    [
      -3,
      [
        ["soup", "9a", 32],
        ["cutlet", "9a", 32],
        ["soup", "10b", 48],
        ["casserole", "10b", 10],
        ["cutlet", "8v", 24],
        ["casserole", "8v", 24],
        ["cutlet", "7a", 22],
        ["casserole", "7a", 32],
      ],
    ],
  ];
  for (const [offset, rows] of history)
    rows.forEach(([dish, group, quantity], index) =>
      records.push([
        dish,
        group,
        quantity,
        offset,
        minutes("08:30", index * 17),
        "ready",
        minutes("08:30", index * 17 + 10),
      ]),
    );
  const pending: [number, string, string, number, OrderStatus][] = [
    [-6, "soup", "9a", 22, "cooking"],
    [-5, "cutlet", "10b", 20, "new"],
    [-4, "soup", "8v", 14, "cooking"],
    [-4, "cutlet", "8v", 16, "new"],
    [-4, "casserole", "8v", 4, "cooking"],
    [-3, "casserole", "7a", 22, "new"],
  ];
  for (const [offset, dish, group, quantity, status] of pending)
    records.push([dish, group, quantity, offset, "11:30", status]);
  records.push(
    ["casserole", "9a", 26, 0, "11:40", "new"],
    ["cutlet", "7a", 26, 0, "11:25", "cooking"],
    ["soup", "8v", 20, 0, "11:15", "cooking"],
    ["soup", "9a", 32, 0, "10:20", "ready", "10:28"],
    ["cutlet", "10b", 26, 0, "10:00", "ready", "10:12"],
    ["casserole", "8v", 18, 0, "09:30", "ready", "09:42"],
    ["soup", "7a", 30, 0, "09:20", "ready", "09:28"],
    ["cutlet", "9a", 36, 0, "09:10", "ready", "09:22"],
    ["casserole", "10b", 32, 0, "08:50", "ready", "08:58"],
  );
  for (const [
    dish,
    group,
    quantity,
    offset,
    created,
    status,
    ready,
  ] of records) {
    const day = new Date(`${anchor}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + offset);
    const date = day.toISOString().slice(0, 10);
    const timestamp = (time: string) => `${date} ${time}:00`;
    const {
      rows: [order],
    } = await client.query<{ id: number }>(
      `INSERT INTO orders (dish_id,group_id,quantity,service_date,serving_time,status,created_by,created_at,cooking_at,ready_at,data_mode)
      VALUES ($1,$2,$3,$4,'12:10',$5,$6,$7::timestamp AT TIME ZONE $10,$8::timestamp AT TIME ZONE $10,$9::timestamp AT TIME ZONE $10,'demo') RETURNING id`,
      [
        catalog.dishes.get(dish)!,
        catalog.groups.get(group)!,
        quantity,
        date,
        status,
        actor,
        timestamp(created),
        status === "new" ? null : timestamp(minutes(created, 2)),
        ready ? timestamp(ready) : null,
        environment.timezone,
      ],
    );
    const events: [OrderStatus, string][] = [["new", created]];
    if (status !== "new") events.push(["cooking", minutes(created, 2)]);
    if (ready) events.push(["ready", ready]);
    for (const [state, time] of events)
      await client.query(
        "INSERT INTO order_events (order_id,status,actor,happened_at) VALUES ($1,$2,$3,$4::timestamp AT TIME ZONE $5)",
        [order.id, state, actor, timestamp(time), environment.timezone],
      );
  }
  await client.query(
    "UPDATE workspace_settings SET demo_date = $1 WHERE id = true",
    [anchor],
  );
  return anchor;
}

function minutes(time: string, amount: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  const value = hours * 60 + minutes + amount;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
