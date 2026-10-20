import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Catalog, CatalogEntry } from "@stolovaya/contracts";
import { Database } from "../database/database";

@Injectable()
export class CatalogService {
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
  async get(kind: "dish" | "group", id: string): Promise<CatalogEntry> {
    const table = kind === "dish" ? "dishes" : "school_groups";
    const [entry] = await this.database.query<CatalogEntry>(
      `SELECT id, name FROM ${table} WHERE id = $1`,
      [id],
    );
    if (!entry)
      throw new NotFoundException(
        kind === "dish" ? "Блюдо не найдено." : "Класс или группа не найдены.",
      );
    return entry;
  }
  async validate(dishId: string, groupId: string): Promise<void> {
    const [row] = await this.database.query<{ valid: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM dishes WHERE id = $1) AND EXISTS(SELECT 1 FROM school_groups WHERE id = $2) AS valid",
      [dishId, groupId],
    );
    if (!row.valid)
      throw new BadRequestException("Выберите блюдо и класс из справочника.");
  }
}
