import { Injectable } from "@nestjs/common";
import { OrderRepository } from "./order.repository";
import { ScopeService } from "./scope.service";
import { CreateOrderDto, OrderQuery } from "./order.dto";
import type { OrderStatus } from "@stolovaya/contracts";

@Injectable()
export class OrderService {
  constructor(
    private readonly repository: OrderRepository,
    private readonly scopes: ScopeService,
  ) {}
  list(query: OrderQuery) {
    return this.repository.list(this.scopes.resolve(query), query);
  }
  detail(id: number) {
    return this.repository.detail(id);
  }
  create(data: CreateOrderDto, actor: string) {
    return this.repository.create(data, actor);
  }
  transition(id: number, status: OrderStatus, actor: string) {
    return this.repository.transition(id, status, actor);
  }
}
