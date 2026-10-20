import { chromium } from "playwright";
import { config } from "dotenv";
import { mkdir } from "node:fs/promises";

config({ quiet: true });
const baseURL = process.env.APP_ORIGIN || "http://localhost:3000";
const browser = await chromium.launch(
  process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {},
);
const context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
  deviceScaleFactor: 1,
  locale: "ru-RU",
  reducedMotion: "reduce",
  baseURL,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("docs/screenshots", { recursive: true });
async function capture(name, path, text) {
  await page.goto(path);
  await page.getByRole("heading", { name: text, exact: true }).waitFor();
  await page
    .getByText("Загружаем данные…", { exact: true })
    .waitFor({ state: "hidden" });
  await page.evaluate(() => document.fonts.ready);
  if (path.startsWith("/admin"))
    await page.locator("main section").first().waitFor();
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    fullPage: true,
  });
  console.log(`Скриншот: ${name}`);
}
async function signIn(role) {
  await page.goto("/login");
  await page
    .getByLabel("Логин", { exact: true })
    .fill(process.env[`${role.toUpperCase()}_LOGIN`]);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env[`${role.toUpperCase()}_PASSWORD`]);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL(`**/${role}`);
}
try {
  await capture("login", "/login", "Вход в Столовую");
  await signIn("admin");
  const today = await page.evaluate(
    async () => (await (await fetch("/api/v1/auth/me")).json()).today,
  );
  const date = process.env.DEMO_DATE || today;
  await capture("admin-day", `/admin?date=${date}`, "Статистика питания");
  await capture(
    "admin-week",
    `/admin?date=${date}&period=week`,
    "Статистика питания",
  );
  await capture(
    "orders",
    `/admin/orders?date=${date}&period=week`,
    "Заказы и выданные порции",
  );
  await capture(
    "dish",
    `/admin/dishes/soup?date=${date}`,
    "Куриный суп с лапшой",
  );
  await capture("group", `/admin/groups/9a?date=${date}`, "Класс 9А");
  await capture("order", `/admin/orders/1248?date=${date}`, "Заказ #1248");
  await capture("components", "/components", "Компоненты и стили");
  await capture(
    "presentation-style",
    "/presentation-style",
    "Дизайн-код презентации",
  );
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await page.waitForURL("**/login");
  await signIn("cook");
  await capture("cook", "/cook", "Заказы на сегодня");
  await capture("new-order", "/cook/orders/new", "Добавить блюдо");
  await page.getByLabel("Блюдо", { exact: true }).selectOption("soup");
  await page.getByLabel("Класс / группа", { exact: true }).selectOption("9a");
  await page.screenshot({
    path: "docs/screenshots/new-order.png",
    fullPage: true,
  });
  if (errors.length) throw new Error(`Ошибки браузера: ${errors.join("; ")}`);
} finally {
  await context.close();
  await browser.close();
}
