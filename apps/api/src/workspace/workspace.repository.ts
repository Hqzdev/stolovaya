import { ConflictException, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { DataMode, WorkspaceState } from "@stolovaya/contracts";
import { Database } from "../database/database";
import { Environment } from "../config/environment";
import { seedDemo } from "../database/seed";

export interface StoredWorkspace {
  mode: DataMode;
  version: number;
  demoDate: string | null;
}
const selectWorkspace = `SELECT mode, version, to_char(demo_date, 'YYYY-MM-DD') AS "demoDate" FROM workspace_settings WHERE id = true`;

@Injectable()
export class WorkspaceRepository {
  constructor(
    private readonly database: Database,
    private readonly environment: Environment,
  ) {}

  async current(): Promise<StoredWorkspace> {
    const [value] = await this.database.query<StoredWorkspace>(selectWorkspace);
    return value;
  }
  async settings(): Promise<
    StoredWorkspace & { liveOrders: number; demoOrders: number }
  > {
    const [value] = await this.database.query<
      StoredWorkspace & { liveOrders: number; demoOrders: number }
    >(
      `SELECT w.mode, w.version, to_char(w.demo_date, 'YYYY-MM-DD') AS "demoDate",
       (SELECT count(*)::int FROM orders WHERE data_mode = 'live') AS "liveOrders",
       (SELECT count(*)::int FROM orders WHERE data_mode = 'demo') AS "demoOrders"
       FROM workspace_settings w WHERE id = true`,
    );
    return value;
  }
  async assertCurrent(
    client: PoolClient,
    snapshot: WorkspaceState,
  ): Promise<void> {
    const {
      rows: [value],
    } = await client.query<StoredWorkspace>(`${selectWorkspace} FOR SHARE`);
    if (value.version !== snapshot.version || value.mode !== snapshot.mode)
      throw new ConflictException(
        "Режим данных изменился. Обновите страницу перед сохранением.",
      );
  }
  async switchMode(mode: DataMode, version: number): Promise<void> {
    await this.database.transaction(async (client) => {
      const {
        rows: [current],
      } = await client.query<StoredWorkspace>(`${selectWorkspace} FOR UPDATE`);
      if (current.version !== version)
        throw new ConflictException(
          "Настройки уже изменились. Обновите страницу и повторите действие.",
        );
      if (current.mode === mode) return;
      if (mode === "demo" && !current.demoDate)
        await seedDemo(client, this.environment);
      await client.query(
        "UPDATE workspace_settings SET mode = $1, version = version + 1 WHERE id = true",
        [mode],
      );
    });
  }
}
