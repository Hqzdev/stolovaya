import { Controller, Get } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CatalogService } from "./catalog.service";

@ApiTags("Справочники")
@ApiCookieAuth()
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get()
  @ApiOperation({ summary: "Блюда и классы для формы заказа" })
  all() {
    return this.catalog.all();
  }
}
