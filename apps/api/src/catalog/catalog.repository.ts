import { Injectable } from "@nestjs/common";
import type { Catalog, CatalogEntry } from "@stolovaya/contracts";
import { Database } from "../database/database";

@Injectable()
export class CatalogRepository {
  constructor(private readonly database: Database) {}
  async all(): Promise<Catalog> {
    const [dishes, groups] = await Promise.all([
      this.database.query<CatalogEntry>(
        "SELECT id, name FROM dishes ORDER BY name",
      ),
      this.database.query<CatalogEntry>(
        "SELECT id, name FROM school_groups ORDER BY name",
      ),
    ]);
    return { dishes, groups };
  }
  async find(
    kind: "dish" | "group",
    id: string,
  ): Promise<CatalogEntry | undefined> {
    const table = kind === "dish" ? "dishes" : "school_groups";
    const [entry] = await this.database.query<CatalogEntry>(
      `SELECT id, name FROM ${table} WHERE id = $1`,
      [id],
    );
    return entry;
  }
}
