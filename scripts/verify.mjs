import assert from "node:assert/strict";
import { config } from "dotenv";
import pg from "pg";

config({ quiet: true });
const origin = process.env.APP_ORIGIN || "http://localhost:3000";
const base = process.env.VERIFY_URL || origin;
let checks = 0;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const sessions = [];
let createdId;

async function request(path, session, method = "GET", body, extra = {}) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(session
        ? { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken }
        : {}),
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    response,
    body: response.status === 204 ? null : await response.json(),
  };
}
function check(condition, description) {
  assert.ok(condition, description);
  checks++;
  console.log(`✓ ${description}`);
}
async function login(role) {
  const result = await request("/auth/login", null, "POST", {
    login: process.env[`${role.toUpperCase()}_LOGIN`],
    password: process.env[`${role.toUpperCase()}_PASSWORD`],
  });
  check(
    result.response.status === 200 && result.body.user.role === role,
    `Вход: ${role}`,
  );
  const session = {
    cookie: result.response.headers.getSetCookie()[0].split(";")[0],
    csrfToken: result.body.csrfToken,
    today: result.body.today,
  };
  sessions.push(session);
  return session;
}

try {
  check(
    (await request("/health")).response.status === 200,
    "Next.js → NestJS → PostgreSQL",
  );
  check(
    (await request("/orders")).response.status === 401,
    "Без сессии данные закрыты",
  );
  check(
    (
      await request("/auth/login", null, "POST", {
        login: "unregistered-account",
        password: "not-a-real-password",
      })
    ).response.status === 401,
    "Третий аккаунт не существует",
  );
  check(
    (await request("/auth/register", null, "POST", {})).response.status === 404,
    "Регистрации нет",
  );
  const admin = await login("admin"),
    cook = await login("cook");
  check(
    (await request("/analytics", cook)).response.status === 403,
    "Повар не имеет доступа к API администратора",
  );
  check(
    (await request("/orders", admin, "POST", {})).response.status === 403,
    "Администратор не создаёт заказы",
  );
  check(
    (await request("/orders", cook, "POST", {}, { "X-CSRF-Token": "" }))
      .response.status === 403,
    "Изменения защищены CSRF-токеном",
  );
  check(
    (
      await request(
        "/orders",
        cook,
        "POST",
        {},
        { Origin: "https://example.org" },
      )
    ).response.status === 403,
    "Чужой origin отклоняется",
  );
  const catalog = (await request("/catalog", cook)).body;
  check(
    catalog.dishes.length > 0 && catalog.groups.length > 0,
    "Справочники доступны обеим ролям",
  );
  const date = process.env.DEMO_DATE || cook.today;
  const scope = `date=${date}&period=day`;
  const baseline = (await request(`/analytics?${scope}`, admin)).body;
  if (process.env.VERIFY_DEMO === "true") {
    check(
      baseline.totals.issued === 174 &&
        baseline.totals.planned === 246 &&
        baseline.totals.orders === 9,
      "День: 174 / 246, 9 заказов",
    );
    const week = (await request(`/analytics?date=${date}&period=week`, admin))
      .body;
    check(
      week.totals.issued === 994 &&
        week.totals.planned === 1164 &&
        week.totals.orders === 44,
      "Неделя: 994 / 1164, 44 заказа",
    );
    check(
      week.chart.reduce((sum, point) => sum + point.issued, 0) === 994,
      "Сумма графика совпадает с показателем выдачи",
    );
  }
  const payload = {
    dishId: catalog.dishes[0].id,
    groupId: catalog.groups[0].id,
    quantity: 3,
    serviceDate: date,
    servingTime: "12:10",
  };
  check(
    (await request("/orders", cook, "POST", { ...payload, quantity: 0 }))
      .response.status === 400,
    "Ноль порций не сохраняется",
  );
  check(
    (await request("/orders", cook, "POST", { ...payload, quantity: 1.5 }))
      .response.status === 400,
    "Дробные порции не сохраняются",
  );
  const created = await request("/orders", cook, "POST", payload);
  createdId = created.body.order?.id;
  check(
    created.response.status === 201 && Number.isInteger(createdId),
    "Повар создаёт реальный заказ",
  );
  const planned = (await request(`/analytics?${scope}`, admin)).body;
  check(
    planned.totals.planned === baseline.totals.planned + 3 &&
      planned.totals.issued === baseline.totals.issued,
    "Новый заказ увеличивает только план",
  );
  check(
    (
      await request(`/orders/${createdId}/status`, cook, "PATCH", {
        status: "ready",
      })
    ).response.status === 409,
    "Нельзя пропустить этап приготовления",
  );
  await request(`/orders/${createdId}/status`, cook, "PATCH", {
    status: "cooking",
  });
  const ready = await request(`/orders/${createdId}/status`, cook, "PATCH", {
    status: "ready",
  });
  check(
    ready.response.status === 200 &&
      ready.body.order.status === "ready" &&
      ready.body.events.length === 3,
    "Готовность и три события сохранены",
  );
  await Promise.all([
    request(`/orders/${createdId}/status`, cook, "PATCH", { status: "ready" }),
    request(`/orders/${createdId}/status`, cook, "PATCH", { status: "ready" }),
  ]);
  const issued = (await request(`/analytics?${scope}`, admin)).body;
  check(
    issued.totals.issued === baseline.totals.issued + 3,
    "Повторная и параллельная готовность не удваивает выдачу",
  );
  const filtered = (await request(`/orders?${scope}&q=%23${createdId}`, admin))
    .body;
  check(
    filtered.total === 1 && filtered.items[0].id === createdId,
    "Поиск по номеру заказа",
  );
  const entity = (
    await request(`/analytics/dishes/${payload.dishId}?${scope}`, admin)
  ).body;
  check(
    entity.entity.id === payload.dishId &&
      entity.orders.items.some((order) => order.id === createdId),
    "Подробности блюда связаны с заказами",
  );
  const group = (
    await request(`/analytics/groups/${payload.groupId}?${scope}`, admin)
  ).body;
  check(group.entity.id === payload.groupId, "Подробности класса");
  const empty = (
    await request(`/orders?${scope}&q=impossible-query-xyz`, admin)
  ).body;
  check(
    empty.total === 0 && empty.totals.planned === 0,
    "Пустой поиск возвращает нули",
  );
  check(
    (await request("/orders?date=2026-02-30", admin)).response.status === 400,
    "Несуществующая дата отклоняется",
  );
  await request("/auth/logout", admin, "POST");
  check(
    (await request("/auth/me", admin)).response.status === 401,
    "Выход отзывает сессию",
  );
  console.log(`\nПроверок пройдено: ${checks}.`);
} finally {
  if (createdId)
    await pool.query("DELETE FROM orders WHERE id = $1", [createdId]);
  for (const session of sessions)
    await request("/auth/logout", session, "POST").catch(() => {});
  await pool.end();
}
