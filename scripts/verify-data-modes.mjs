import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";
import { WorkspaceService } from "../apps/api/dist/workspace/workspace.service.js";
import { WorkspaceRepository } from "../apps/api/dist/workspace/workspace.repository.js";
import { Environment } from "../apps/api/dist/config/environment.js";
import { seedCatalog, seedDemo } from "../apps/api/dist/database/seed.js";

config({ quiet: true });
const origin = process.env.APP_ORIGIN || "http://localhost:3000";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log(`✓ ${message}`);
}

class ApiSession {
  cookie = "";
  csrfToken = "";
  workspace;
  async request(path, method = "GET", body, headers = {}) {
    const response = await fetch(`${origin}/api/v1${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: this.cookie,
        "X-CSRF-Token": this.csrfToken,
        ...(this.workspace
          ? { "X-Data-Version": String(this.workspace.version) }
          : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  }
  async login(role) {
    const response = await fetch(`${origin}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        login: process.env[`${role.toUpperCase()}_LOGIN`],
        password: process.env[`${role.toUpperCase()}_PASSWORD`],
      }),
    });
    assert.equal(response.status, 200, `Вход ${role}`);
    const context = await response.json();
    this.cookie = response.headers.getSetCookie()[0].split(";")[0];
    this.csrfToken = context.csrfToken;
    this.workspace = context.workspace;
  }
  async sync() {
    const result = await this.request("/auth/me");
    assert.equal(result.status, 200);
    this.workspace = result.body.workspace;
  }
  async switchMode(mode) {
    const settings = await this.request("/settings");
    assert.equal(settings.status, 200);
    const result = await this.request("/settings/data-mode", "PATCH", {
      mode,
      version: settings.body.version,
    });
    assert.equal(result.status, 200);
    await this.sync();
    return result.body;
  }
}

const admin = new ApiSession(),
  cook = new ApiSession();
const created = [];
let originalMode;
try {
  // An isolated schema and rollback exercise a clean install without touching app records.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const schema = `verify_modes_${randomUUID().replaceAll("-", "")}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    await client.query(
      await readFile("apps/api/migrations/001_initial.sql", "utf8"),
    );
    await client.query(
      await readFile("apps/api/migrations/003_catalog_names.sql", "utf8"),
    );
    const environment = new Environment();
    await seedCatalog(client);
    await client.query(
      "INSERT INTO orders (dish_id,group_id,quantity,service_date,serving_time,created_by) VALUES ('soup','9a',5,$1,'12:10','verification')",
      [environment.today()],
    );
    await client.query(
      await readFile("apps/api/migrations/002_data_modes.sql", "utf8"),
    );
    check(
      (await client.query("SELECT data_mode FROM orders")).rows[0].data_mode ===
        "live",
      "Миграция оставляет обычные заказы рабочими",
    );
    await client.query("SAVEPOINT before_seed");
    const date = await seedDemo(client, environment);
    const {
      rows: [seed],
    } = await client.query(
      "SELECT count(*)::int AS count, sum(quantity)::int AS planned, sum(quantity) FILTER (WHERE status = 'ready')::int AS issued FROM orders WHERE data_mode = 'demo'",
    );
    check(
      seed.count === 44 && seed.planned === 1164 && seed.issued === 994,
      "Чистая база: демо содержит 44 заказа, 994 / 1164 порций",
    );
    const {
      rows: [day],
    } = await client.query(
      "SELECT sum(quantity)::int AS planned, sum(quantity) FILTER (WHERE status = 'ready')::int AS issued FROM orders WHERE data_mode = 'demo' AND service_date = $1",
      [date],
    );
    check(
      day.planned === 246 && day.issued === 174,
      "Чистое демо: за день 174 / 246",
    );
    const {
      rows: [settings],
    } = await client.query(
      "SELECT mode, demo_date::text FROM workspace_settings",
    );
    check(
      settings.mode === "live" && settings.demo_date === date,
      "Предварительный seed не включает демо",
    );
    await assert.rejects(() => seedDemo(client, environment), /уже существует/);
    check(
      (
        await client.query(
          "SELECT count(*)::int AS count FROM orders WHERE data_mode = 'live'",
        )
      ).rows[0].count === 1,
      "Повторный seed сохраняет рабочие и демонстрационные заказы",
    );
    await client.query("ROLLBACK TO SAVEPOINT before_seed");
    const repository = new WorkspaceRepository(
      {
        query: async (sql, values = []) =>
          (await client.query(sql, values)).rows,
        transaction: async (action) => action(client),
      },
      environment,
    );
    const workspace = new WorkspaceService(repository, environment);
    const firstDemo = await workspace.switchMode("demo", 1);
    check(
      firstDemo.mode === "demo" &&
        firstDemo.demoOrders === 44 &&
        firstDemo.liveOrders === 1 &&
        firstDemo.version === 2,
      "Первое включение автоматически готовит демо рядом с рабочими заказами",
    );
    const returned = await workspace.switchMode("live", firstDemo.version);
    check(
      returned.mode === "live" &&
        returned.liveOrders === 1 &&
        returned.demoOrders === 44,
      "Оба набора сохраняются после первого переключения",
    );
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }

  await admin.login("admin");
  await cook.login("cook");
  originalMode = admin.workspace.mode;
  check(
    (await cook.request("/settings")).status === 403,
    "Повар не читает настройки",
  );
  check(
    (
      await cook.request("/settings/data-mode", "PATCH", {
        mode: "demo",
        version: cook.workspace.version,
      })
    ).status === 403,
    "Повар не переключает режим",
  );
  await admin.switchMode("live");
  await cook.sync();
  const catalog = (await cook.request("/catalog")).body;
  const payload = {
    dishName: catalog.dishes[0].name,
    groupName: catalog.groups[0].name,
    quantity: 5,
    serviceDate: cook.workspace.today,
    servingTime: "12:10",
  };
  const before = (await admin.request(`/analytics?date=${payload.serviceDate}`))
    .body.totals;
  const live = await cook.request("/orders", "POST", payload);
  assert.equal(live.status, 201);
  created.push(live.body.order.id);
  const liveId = live.body.order.id;
  check(
    (await pool.query("SELECT data_mode FROM orders WHERE id = $1", [liveId]))
      .rows[0].data_mode === "live",
    "Рабочий заказ сохраняется с режимом live",
  );
  await cook.request(`/orders/${liveId}/status`, "PATCH", {
    status: "cooking",
  });
  await cook.request(`/orders/${liveId}/status`, "PATCH", { status: "ready" });
  check(
    (await admin.request(`/analytics?date=${payload.serviceDate}`)).body.totals
      .issued ===
      before.issued + 5,
    "Рабочая готовность появляется в рабочей аналитике",
  );
  check(
    (await cook.request("/orders", "POST", payload, { "X-Data-Version": "" }))
      .status === 409,
    "Запись без версии режима отклоняется",
  );

  const oldVersion = cook.workspace.version;
  await admin.switchMode("demo");
  check(
    (await cook.request("/orders", "POST", payload)).status === 409,
    "Устаревшая вкладка не записывает заказ в другой набор",
  );
  check(
    (await cook.request("/orders")).status === 409,
    "Чтение с устаревшей версией отклоняется",
  );
  await cook.sync();
  check(
    cook.workspace.mode === "demo" &&
      cook.workspace.version !== oldVersion &&
      cook.workspace.today === cook.workspace.demoDate,
    "Кабинет повара получает общий режим и дату демо",
  );
  check(
    (await admin.request(`/orders/${liveId}`)).status === 404,
    "Рабочий заказ и его история скрыты в демо",
  );
  check(
    (
      await cook.request(`/orders/${liveId}/status`, "PATCH", {
        status: "ready",
      })
    ).status === 404,
    "В демо нельзя изменить рабочий заказ по номеру",
  );
  const demoBefore = (await admin.request("/analytics")).body.totals;
  const demo = await cook.request("/orders", "POST", {
    ...payload,
    quantity: 7,
    serviceDate: cook.workspace.today,
  });
  assert.equal(demo.status, 201);
  const demoId = demo.body.order.id;
  created.push(demoId);
  await cook.request(`/orders/${demoId}/status`, "PATCH", {
    status: "cooking",
  });
  await cook.request(`/orders/${demoId}/status`, "PATCH", { status: "ready" });
  check(
    (await admin.request("/analytics")).body.totals.issued ===
      demoBefore.issued + 7,
    "Демонстрационный заказ проходит весь сценарий и меняет только демо",
  );
  await admin.switchMode("live");
  await cook.sync();
  check(
    (await admin.request(`/orders/${demoId}`)).status === 404,
    "Демонстрационный заказ скрыт в рабочем режиме",
  );
  const restored = (await admin.request(`/orders/${liveId}`)).body;
  check(
    restored.order.status === "ready" && restored.events.length === 3,
    "Рабочий заказ и история сохранены после переключений",
  );
  const after = (await admin.request(`/analytics?date=${payload.serviceDate}`))
    .body.totals;
  check(
    after.planned === before.planned + 5 && after.issued === before.issued + 5,
    "Демо не влияет на рабочие показатели",
  );
  await admin.switchMode("demo");
  check(
    (await admin.request(`/orders/${demoId}`)).body.events.length === 3,
    "Изменения и история демо переживают повторное включение",
  );
  const version = admin.workspace.version;
  const same = await admin.switchMode("demo");
  check(same.version === version, "Повтор того же режима идемпотентен");
  check(
    (
      await admin.request("/settings/data-mode", "PATCH", {
        mode: "live",
        version: version - 1,
      })
    ).status === 409,
    "Устаревшие настройки не перезаписывают новый режим",
  );
  check(
    (
      await admin.request("/settings/data-mode", "PATCH", {
        mode: "unknown",
        version,
      })
    ).status === 400,
    "Неизвестный режим отклоняется",
  );
  const concurrent = await Promise.all([
    admin.request("/settings/data-mode", "PATCH", { mode: "live", version }),
    admin.request("/settings/data-mode", "PATCH", { mode: "live", version }),
  ]);
  check(
    concurrent
      .map((result) => result.status)
      .sort()
      .join() === "200,409",
    "Конкурирующие переключения защищены версией и транзакцией",
  );
  console.log(`\nПроверок режимов пройдено: ${checks}.`);
} finally {
  if (created.length)
    await pool.query("DELETE FROM orders WHERE id = ANY($1::int[])", [created]);
  try {
    if (originalMode) await admin.switchMode(originalMode);
  } finally {
    for (const session of [admin, cook])
      if (session.cookie)
        await session.request("/auth/logout", "POST").catch(() => {});
    await pool.end();
  }
}
