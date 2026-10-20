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
  await admin
    .locator("tbody tr")
    .filter({ hasText: "#1248" })
    .getByRole("link")
    .first()
    .click();
  await admin
    .getByRole("heading", { name: "Заказ #1248", exact: true })
    .waitFor();
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
    .getByText("994", { exact: true })
    .waitFor();
  check(true, "Переключение недели показывает 994 порции");
  await admin.locator('svg[aria-label^="Количество"] a').first().click();
  await admin.waitForURL("**/admin/orders?**on=*");
  check(
    new URL(admin.url()).searchParams.has("on"),
    "Столбец графика открывает заказы выбранного дня",
  );
  await admin.goto("/admin/orders?period=week&page=5");
  await admin.locator("tbody tr").first().waitFor();
  check(
    (await admin.locator("tbody tr").count()) === 4,
    "Последняя страница: 4 записи из 44",
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
    .getByText(String(before + 3), { exact: true })
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
