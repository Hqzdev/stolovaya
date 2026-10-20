import { Injectable, NotFoundException } from "@nestjs/common";
import type { Catalog, CatalogEntry } from "@stolovaya/contracts";
import { CatalogRepository } from "./catalog.repository";

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}
  all(): Promise<Catalog> {
    return this.repository.all();
  }
  async get(kind: "dish" | "group", id: string): Promise<CatalogEntry> {
    const entry = await this.repository.find(kind, id);
    if (!entry)
      throw new NotFoundException(
        kind === "dish" ? "Блюдо не найдено." : "Класс или группа не найдены.",
      );
    return entry;
  }
}
