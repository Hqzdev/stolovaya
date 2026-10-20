import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";

config({ quiet: true });
const base = process.env.APP_ORIGIN || "http://localhost:3000";
const login = await fetch(`${base}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base },
  body: JSON.stringify({
    login: process.env.ADMIN_LOGIN,
    password: process.env.ADMIN_PASSWORD,
  }),
});
if (!login.ok)
  throw new Error("Для экспорта графика нужен доступ администратора.");
const context = await login.json();
const cookie = login.headers.getSetCookie()[0].split(";")[0];
try {
  const response = await fetch(
    `${base}/api/v1/analytics?period=week&date=${process.env.DEMO_DATE || context.today}`,
    { headers: { Cookie: cookie } },
  );
  if (!response.ok)
    throw new Error("Не удалось получить аналитику из PostgreSQL.");
  const analytics = await response.json();
  const data = {
    scope: analytics.scope,
    totals: analytics.totals,
    chart: analytics.chart,
    source: "GET /api/v1/analytics?period=week — демонстрационная PostgreSQL",
  };
  await mkdir("assets/readme", { recursive: true });
  await writeFile(
    "assets/readme/demo-analytics.json",
    JSON.stringify(data, null, 2) + "\n",
  );
  const wrap = (title, description, height, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${description}</desc><rect width="1200" height="${height}" rx="16" fill="#f6f5f4"/><g font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fill="#111111">${body}</g></svg>\n`;
  await writeFile(
    "assets/readme/hero.svg",
    wrap(
      "Столовая — учёт школьного питания",
      "Повар создаёт заказ для класса. Готовые порции попадают в аналитику администратора.",
      310,
      `<text x="56" y="58" font-size="18" letter-spacing="2" fill="#757575">ШКОЛЬНОЕ ПИТАНИЕ / ДВА РАБОЧИХ МЕСТА</text><text x="52" y="151" font-size="80" font-weight="600" letter-spacing="-3">Столовая</text><text x="56" y="201" font-size="26">От заказа для класса — к понятной статистике.</text><rect x="56" y="237" width="174" height="36" rx="8" fill="#e6f3fe"/><text x="75" y="262" font-size="19" fill="#0075de">Next.js + NestJS</text><text x="252" y="262" font-size="19" fill="#757575">PostgreSQL · TypeScript · MIT</text><rect x="840" y="80" width="304" height="174" rx="12" fill="#fff1ce"/><text x="868" y="119" font-size="20" fill="#826018">Новый → Готовится</text><text x="865" y="183" font-size="45" font-weight="600">Готово</text><text x="868" y="220" font-size="20" fill="#826018">Порции учтены в выдаче</text>`,
    ),
  );
  const blocks = [
    ["01", "Повар", "Создаёт заказ", "Блюдо · класс · порции"],
    ["02", "Готовность", "Отмечает «Готово»", "Порции входят в выдачу"],
    ["03", "Администратор", "Видит результат", "День · неделя · подробности"],
  ];
  await writeFile(
    "assets/readme/workflow.svg",
    wrap(
      "Как работает Столовая",
      "Заказ повара, отметка готовности и аналитика администратора связаны одной базой PostgreSQL.",
      260,
      blocks
        .map((block, index) => {
          const x = 40 + index * 390;
          return `<rect x="${x}" y="36" width="340" height="188" rx="12" fill="${index === 1 ? "#fff1ce" : "#ffffff"}" stroke="#00000014"/><text x="${x + 24}" y="73" font-size="18" fill="#757575">${block[0]}</text><text x="${x + 24}" y="113" font-size="29" font-weight="600">${block[1]}</text><text x="${x + 24}" y="154" font-size="22">${block[2]}</text><text x="${x + 24}" y="190" font-size="19" fill="#615d59">${block[3]}</text>${index < 2 ? `<path d="M${x + 351} 130h27m-8-7 8 7-8 7" fill="none" stroke="#0075de" stroke-width="2"/>` : ""}`;
        })
        .join(""),
    ),
  );
  const max = Math.max(1, ...data.chart.map((point) => point.issued));
  const bars = data.chart
    .map((point, index) => {
      const x = 90 + index * 148;
      const height = (point.issued / max) * 188;
      return `<text x="${x + 47}" y="${340 - height}" text-anchor="middle" font-size="24" font-weight="500">${point.issued}</text><rect x="${x}" y="${354 - Math.max(3, height)}" width="94" height="${Math.max(3, height)}" rx="5" fill="${point.issued ? "#0075de" : "#dedbd7"}"/><text x="${x + 47}" y="392" text-anchor="middle" font-size="20" fill="#615d59">${point.label}</text>`;
    })
    .join("");
  await writeFile(
    "assets/readme/weekly-chart.svg",
    wrap(
      "Выдача порций за неделю",
      `Демонстрационные данные: ${data.totals.issued} выданных из ${data.totals.planned} запланированных порций.`,
      440,
      `<text x="56" y="58" font-size="32" font-weight="600">Выдача за неделю</text><text x="56" y="96" font-size="19" fill="#757575">Демонстрационные данные · ${data.scope.from} — ${data.scope.to}</text><text x="1144" y="58" text-anchor="end" font-size="32" font-weight="600">${data.totals.issued} порции</text><text x="1144" y="96" text-anchor="end" font-size="19" fill="#757575">из ${data.totals.planned} запланированных</text><path d="M56 355h1088" stroke="#00000014"/>${bars}`,
    ),
  );
  console.log("README: обложка, схема работы и график из API сохранены.");
} finally {
  await fetch(`${base}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: base,
      "X-CSRF-Token": context.csrfToken,
    },
  });
}
