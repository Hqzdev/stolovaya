import assert from "node:assert/strict";
import { chromium } from "playwright";
import { config } from "dotenv";
import pg from "pg";

config({ quiet: true });
const baseURL = process.env.APP_ORIGIN || "http://localhost:3000";
const browser = await chromium.launch(
  process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {},
);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const errors = [];
let createdId;
let checks = 0;
const contexts = [];
const numericText = (value) =>
  new RegExp(`^${String(value).split("").join("\\s*")}$`);
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log(`✓ ${message}`);
}
async function session(role) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1080 },
    reducedMotion: "reduce",
  });
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page
    .getByLabel("Логин", { exact: true })
    .fill(process.env[`${role.toUpperCase()}_LOGIN`]);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env[`${role.toUpperCase()}_PASSWORD`]);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL(`**/${role}`);
  return page;
}
try {
  const admin = await session("admin");
  const workspace = await admin.evaluate(
    async () => (await (await fetch("/api/v1/auth/me")).json()).workspace,
  );
  check(
    workspace.mode === "demo",
    "Браузерный сценарий запущен на демонстрационных данных",
  );
  const week = await admin.evaluate(
    async () => await (await fetch("/api/v1/analytics?period=week")).json(),
  );
  await admin
    .getByRole("heading", { name: "Статистика питания", exact: true })
    .waitFor();
  const issuedCard = admin
    .locator("main a")
    .filter({ hasText: "Выдано порций" });
  await issuedCard.waitFor();
  const before = Number(
    (await issuedCard.locator("span").nth(1).textContent()).replace(/\s/g, ""),
  );
  await issuedCard.click();
  await admin.waitForURL("**/admin/orders?**status=ready");
  await admin.locator("tbody tr").first().waitFor();
  check(
    (await admin.locator("tbody tr").count()) > 0,
    "Показатель выдачи открывает готовые заказы",
  );
  await admin.locator("tbody tr").first().getByRole("link").first().click();
  await admin.getByRole("heading", { name: /^Заказ #/ }).waitFor();
  check(
    await admin
      .getByRole("heading", { name: "История заказа", exact: true })
      .isVisible(),
    "Из таблицы открывается история заказа",
  );
  await admin.goto("/admin");
  await admin.getByRole("button", { name: "Неделя", exact: true }).click();
  await admin.waitForURL("**period=week");
  await admin
    .locator("main a")
    .filter({ hasText: "Выдано порций" })
    .getByText(numericText(week.totals.issued))
    .waitFor();
  check(
    true,
    `Переключение недели показывает ${week.totals.issued} порций из PostgreSQL`,
  );
  await admin.locator('svg[aria-label^="Количество"] a').first().click();
  await admin.waitForURL("**/admin/orders?**on=*");
  check(
    new URL(admin.url()).searchParams.has("on"),
    "Столбец графика открывает заказы выбранного дня",
  );
  await admin.goto(
    `/admin/orders?period=week&page=${Math.ceil(week.totals.orders / 10)}`,
  );
  await admin.locator("tbody tr").first().waitFor();
  check(
    (await admin.locator("tbody tr").count()) ===
      ((week.totals.orders - 1) % 10) + 1,
    "Последняя страница соответствует количеству заказов из PostgreSQL",
  );
  await admin
    .getByRole("textbox", { name: "Найти блюдо, класс или заказ" })
    .fill("impossible-query-xyz");
  await admin.getByRole("button", { name: "Найти", exact: true }).click();
  await admin
    .getByRole("heading", { name: "Заказов пока нет", exact: true })
    .waitFor();
  check(true, "Пустой поиск отображается в интерфейсе");
  await admin
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await admin.locator("tbody tr").first().waitFor();
  check(
    (await admin.locator("tbody tr").count()) === 10,
    "Сброс фильтров возвращает первую страницу",
  );
  await admin.goto("/admin/dishes/soup");
  await admin
    .getByRole("heading", { name: "Куриный суп с лапшой", exact: true })
    .waitFor();
  await admin.getByRole("link", { name: "9А", exact: true }).first().click();
  await admin.getByRole("heading", { name: "Класс 9А", exact: true }).waitFor();
  check(true, "Переход из блюда к аналитике класса");
  await admin.goto("/admin");
  await admin.locator("main a").filter({ hasText: "Выдано порций" }).waitFor();
  const cook = await session("cook");
  await cook.getByRole("link", { name: "Добавить блюдо", exact: true }).click();
  await cook.getByLabel("Блюдо", { exact: true }).selectOption("soup");
  await cook.getByLabel("Класс / группа", { exact: true }).selectOption("9a");
  await cook.getByLabel("Количество порций", { exact: true }).fill("3");
  await cook.route("**/api/v1/orders", async (route) => {
    if (route.request().method() === "POST") await route.abort("failed");
    else await route.continue();
  });
  await cook
    .getByRole("button", { name: "Добавить блюдо", exact: true })
    .click();
  await cook.getByRole("alert").waitFor();
  check(
    (await cook
      .getByLabel("Количество порций", { exact: true })
      .inputValue()) === "3" &&
      (await cook.getByLabel("Блюдо", { exact: true }).inputValue()) === "soup",
    "После ошибки сохранения форма не теряет данные",
  );
  await cook.unroute("**/api/v1/orders");
  const created = cook.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/orders") &&
      response.request().method() === "POST",
  );
  await cook
    .getByRole("button", { name: "Добавить блюдо", exact: true })
    .click();
  createdId = (await (await created).json()).order.id;
  await cook.waitForURL("**/cook");
  const row = cook.locator("tbody tr").filter({ hasText: `#${createdId}` });
  await row.waitFor();
  check(
    await row.getByText("Новый", { exact: true }).isVisible(),
    "Форма создаёт заказ в PostgreSQL",
  );
  await row.getByRole("button", { name: "Начать", exact: true }).click();
  await row.getByText("Готовится", { exact: true }).waitFor();
  await row.getByRole("button", { name: "Готово", exact: true }).click();
  await row.getByText("Готово", { exact: true }).waitFor();
  check(true, "Кнопки повара проводят заказ через все статусы");
  await admin.bringToFront();
  await admin
    .locator("main a")
    .filter({ hasText: "Выдано порций" })
    .getByText(numericText(before + 3))
    .waitFor({ timeout: 20000 });
  check(true, "Открытый кабинет администратора получает новые порции");
  const result = await pool.query(
    "SELECT status, quantity FROM orders WHERE id = $1",
    [createdId],
  );
  check(
    result.rows[0].status === "ready" && result.rows[0].quantity === 3,
    "Данные браузерного сценария подтверждены SQL-запросом",
  );
  await cook.goto("/cook/orders/new");
  await cook.getByLabel("Блюдо", { exact: true }).selectOption("soup");
  await cook.getByLabel("Количество порций", { exact: true }).fill("5");
  await admin.getByRole("link", { name: "Настройки", exact: true }).click();
  await admin
    .getByRole("heading", { name: "Настройки", exact: true })
    .waitFor();
  await admin
    .getByRole("radio", { name: "Рабочие данные", exact: true })
    .check();
  await admin
    .getByRole("button", { name: "Включить рабочие данные", exact: true })
    .click();
  await admin
    .getByText("Включены рабочие данные для обоих кабинетов.", { exact: true })
    .waitFor();
  check(true, "Настройки переключают приложение в рабочий режим");
  await cook
    .getByRole("alert")
    .filter({ hasText: "Режим данных изменился" })
    .waitFor({ timeout: 20000 });
  check(
    (await cook
      .getByLabel("Количество порций", { exact: true })
      .inputValue()) === "5" &&
      (await cook
        .getByRole("button", { name: "Добавить блюдо", exact: true })
        .isDisabled()),
    "Открытая форма узнаёт о смене режима, сохраняет поля и блокирует отправку",
  );
  await cook.goto("/cook");
  await cook
    .getByRole("heading", { name: "Заказы на сегодня", exact: true })
    .waitFor();
  await cook
    .getByText("Загружаем данные…", { exact: true })
    .waitFor({ state: "hidden" });
  check(
    (await cook
      .locator("tbody tr")
      .filter({ hasText: `#${createdId}` })
      .count()) === 0,
    "Демонстрационный заказ отсутствует в рабочем кабинете повара",
  );
  await admin
    .getByRole("radio", { name: "Демонстрационные данные", exact: true })
    .check();
  await admin
    .getByRole("button", { name: "Включить демо", exact: true })
    .click();
  await admin
    .getByText("Демо включено для обоих кабинетов.", { exact: true })
    .waitFor();
  await cook
    .locator("tbody tr")
    .filter({ hasText: `#${createdId}` })
    .waitFor({ timeout: 20000 });
  check(
    true,
    "Повторное включение демо возвращает сохранённый заказ в открытый кабинет",
  );
  await admin.goto("/admin");
  await admin.setViewportSize({ width: 1024, height: 900 });
  check(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "На ширине 1024 px нет горизонтального переполнения страницы",
  );
  check(errors.length === 0, "Нет ошибок JavaScript в браузере");
  console.log(`\nБраузерных проверок пройдено: ${checks}.`);
} finally {
  if (createdId)
    await pool.query("DELETE FROM orders WHERE id = $1", [createdId]);
  for (const context of contexts) await context.close();
  await browser.close();
  await pool.end();
}
