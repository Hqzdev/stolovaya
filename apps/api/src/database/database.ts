import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool, PoolClient, QueryResultRow } from "pg";
import { Environment } from "../config/environment";
import { migrate } from "./migrate";

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  constructor(environment: Environment) {
    this.pool = new Pool({
      connectionString: environment.databaseUrl,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  }
  async onModuleInit(): Promise<void> {
    await migrate(this.pool);
  }
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
  async query<T extends QueryResultRow>(
    sql: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    return (await this.pool.query<T>(sql, values)).rows;
  }
  async transaction<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
