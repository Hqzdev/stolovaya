import { Injectable } from "@nestjs/common";
import { config } from "dotenv";
import { resolve } from "node:path";
import type { Role } from "@stolovaya/contracts";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
config({ path: resolve(process.cwd(), ".env"), quiet: true });

export interface AccountConfiguration {
  role: Role;
  login: string;
  password: string;
}

@Injectable()
export class Environment {
  readonly databaseUrl = this.required("DATABASE_URL");
  readonly sessionSecret = this.required("SESSION_SECRET", 32);
  readonly origin = this.readOrigin();
  readonly timezone = process.env.APP_TIMEZONE || "Asia/Yekaterinburg";
  readonly port = Number(process.env.PORT || process.env.API_PORT || 4000);
  readonly secureCookie = process.env.COOKIE_SECURE === "true";
  readonly accounts: readonly AccountConfiguration[] = Object.freeze([
    Object.freeze({
      role: "admin" as const,
      login: this.required("ADMIN_LOGIN").trim(),
      password: this.required("ADMIN_PASSWORD", 8),
    }),
    Object.freeze({
      role: "cook" as const,
      login: this.required("COOK_LOGIN").trim(),
      password: this.required("COOK_PASSWORD", 8),
    }),
  ]);

  constructor() {
    for (const account of this.accounts) {
      if (account.login.length > 100 || account.password.length > 256)
        throw new Error(
          "Логин должен содержать до 100 символов, пароль — до 256.",
        );
    }
    if (
      this.accounts[0].login.toLowerCase() ===
      this.accounts[1].login.toLowerCase()
    )
      throw new Error("ADMIN_LOGIN и COOK_LOGIN должны отличаться.");
    if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535)
      throw new Error("Некорректный API_PORT.");
    try {
      new Intl.DateTimeFormat("ru-RU", { timeZone: this.timezone }).format();
    } catch {
      throw new Error(
        "Укажите корректный APP_TIMEZONE, например Asia/Yekaterinburg.",
      );
    }
    if (!["true", "false", undefined].includes(process.env.COOKIE_SECURE))
      throw new Error("COOKIE_SECURE должен быть true или false.");
  }

  today(): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  private required(name: string, minimum = 1): string {
    const value = process.env[name];
    if (!value || value.trim().length < minimum)
      throw new Error(
        `Заполните ${name} в .env (не меньше ${minimum} символов).`,
      );
    return value;
  }

  private readOrigin(): string {
    const value = process.env.APP_ORIGIN || "http://localhost:3000";
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== value)
      throw new Error(
        "APP_ORIGIN должен содержать только origin, например http://localhost:3000.",
      );
    return value;
  }
}
