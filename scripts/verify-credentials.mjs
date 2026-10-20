import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";

config({ quiet: true });
const origin = process.env.APP_ORIGIN || "http://localhost:3000";
const temporary = "http://127.0.0.1:4011";
let server;
const sessions = [];
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
  console.log(`✓ ${message}`);
};
async function login(
  base,
  role,
  password = process.env[`${role.toUpperCase()}_PASSWORD`],
) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      login: process.env[`${role.toUpperCase()}_LOGIN`],
      password,
    }),
  });
  if (!response.ok) return { status: response.status };
  const result = await response.json();
  const session = {
    status: response.status,
    base,
    cookie: response.headers.getSetCookie()[0].split(";")[0],
    csrfToken: result.csrfToken,
  };
  sessions.push(session);
  return session;
}
try {
  for (const [values, expected, message] of [
    [
      { ADMIN_PASSWORD: "" },
      "ADMIN_PASSWORD",
      "Пустой пароль останавливает запуск",
    ],
    [
      { COOK_LOGIN: process.env.ADMIN_LOGIN },
      "должны отличаться",
      "Одинаковые логины останавливают запуск",
    ],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        "new (require('./apps/api/dist/config/environment.js').Environment)()",
      ],
      { env: { ...process.env, ...values }, encoding: "utf8" },
    );
    check(result.status !== 0 && result.stderr.includes(expected), message);
  }
  const admin = await login(origin, "admin");
  const cook = await login(origin, "cook");
  const nextPassword = randomBytes(24).toString("hex");
  server = spawn(process.execPath, ["apps/api/dist/main.js"], {
    env: { ...process.env, API_PORT: "4011", COOK_PASSWORD: nextPassword },
    stdio: "ignore",
  });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      ready = (await fetch(`${temporary}/api/v1/health`)).ok;
    } catch {
      ready = false;
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  check(ready, "API запущен с новой конфигурацией повара");
  const me = (session) =>
    fetch(`${temporary}/api/v1/auth/me`, {
      headers: { Cookie: session.cookie },
    });
  check(
    (await me(cook)).status === 401,
    "Старая сессия повара отозвана после смены пароля",
  );
  check(
    (await me(admin)).status === 200,
    "Неизменённая сессия администратора остаётся действующей",
  );
  check(
    (await login(temporary, "cook")).status === 401,
    "Предыдущий пароль больше не принимается",
  );
  check(
    (await login(temporary, "cook", nextPassword)).status === 200,
    "Новый пароль принимается",
  );
  console.log(`\nПроверок конфигурации пройдено: ${checks}.`);
} finally {
  for (const session of sessions)
    await fetch(`${session.base}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: session.cookie,
        "X-CSRF-Token": session.csrfToken,
      },
    }).catch(() => {});
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
}
