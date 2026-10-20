import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/access.guard";
import { OrderQuery } from "../orders/order.dto";
import { AnalyticsService } from "./analytics.service";

@ApiTags("Аналитика администратора")
@ApiCookieAuth()
@Roles("admin")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get()
  @ApiOperation({ summary: "Показатели, график, разбивка по блюдам и классам" })
  overview(@Query() query: OrderQuery) {
    return this.analytics.overview(query);
  }
  @Get("dishes/:id")
  @ApiOperation({ summary: "Подробная аналитика блюда" })
  dish(@Param("id") id: string, @Query() query: OrderQuery) {
    return this.analytics.entity("dish", id, query);
  }
  @Get("groups/:id")
  @ApiOperation({ summary: "Подробная аналитика класса или группы" })
  group(@Param("id") id: string, @Query() query: OrderQuery) {
    return this.analytics.entity("group", id, query);
  }
}
