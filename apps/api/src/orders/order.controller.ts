import { WorkspaceData } from "../workspace/workspace.context";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles, SessionRequest } from "../auth/access.guard";
import { ChangeStatusDto, CreateOrderDto, OrderQuery } from "./order.dto";
import { OrderService } from "./order.service";

@ApiTags("Заказы")
@ApiCookieAuth()
@WorkspaceData()
@Controller("orders")
export class OrderController {
  constructor(private readonly orders: OrderService) {}
  @Get()
  @ApiOperation({
    summary: "Список заказов с фильтрами и пагинацией по 10 записей",
  })
  list(@Query() query: OrderQuery) {
    return this.orders.list(query);
  }
  @Get(":id")
  @ApiOperation({ summary: "Состав и история заказа" })
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.orders.detail(id);
  }
  @Post()
  @Roles("cook")
  @ApiOperation({ summary: "Создать заказ со статусом «Новый»" })
  create(@Body() body: CreateOrderDto, @Req() request: SessionRequest) {
    return this.orders.create(body, request.session.user.login);
  }
  @Patch(":id/status")
  @Roles("cook")
  @ApiOperation({
    summary:
      "Начать приготовление или отметить готовность; повтор идемпотентен",
  })
  transition(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ChangeStatusDto,
    @Req() request: SessionRequest,
  ) {
    return this.orders.transition(id, body.status, request.session.user.login);
  }
}
