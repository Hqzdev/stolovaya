import { Pool } from "pg";
import { Environment } from "../config/environment";
import { migrate } from "./migrate";
import { seedCatalog, seedDemo } from "./seed";

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!["migrate", "catalog", "demo"].includes(command))
    throw new Error("Команда: migrate, catalog или demo.");
  const environment = new Environment();
  const pool = new Pool({ connectionString: environment.databaseUrl });
  try {
    await migrate(pool);
    if (command === "migrate") {
      console.log("Миграции применены.");
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(73810292)");
      await client.query(
        "SELECT id FROM workspace_settings WHERE id = true FOR UPDATE",
      );
      const date =
        command === "demo" ? await seedDemo(client, environment) : null;
      if (command === "catalog") await seedCatalog(client);
      await client.query("COMMIT");
      console.log(
        date
          ? `Демонстрационные заказы загружены. Дата: ${date}. День: 174 / 246, неделя: 994 / 1164.`
          : "Справочники заполнены.",
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Ошибка настройки базы.",
  );
  process.exitCode = 1;
});
