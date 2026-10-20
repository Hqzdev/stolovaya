import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { CatalogEntry } from "@stolovaya/contracts";

@Injectable()
export class CatalogEntryRepository {
  async resolve(
    kind: "dish" | "group",
    name: string,
    client: PoolClient,
    id: string = randomUUID(),
  ): Promise<CatalogEntry> {
    const table = kind === "dish" ? "dishes" : "school_groups";
    const {
      rows: [entry],
    } = await client.query<CatalogEntry>(
      `INSERT INTO ${table} (id, name) VALUES ($1, $2)
       ON CONFLICT (lower(name)) DO UPDATE SET name = ${table}.name
       RETURNING id, name`,
      [id, name],
    );
    return entry;
  }
}
