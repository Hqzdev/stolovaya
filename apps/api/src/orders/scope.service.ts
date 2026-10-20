import { Injectable } from "@nestjs/common";
import type { Scope } from "@stolovaya/contracts";
import { Environment } from "../config/environment";
import { WorkspaceContext } from "../workspace/workspace.context";
import { OrderQuery } from "./order.dto";

@Injectable()
export class ScopeService {
  constructor(
    private readonly environment: Environment,
    private readonly workspace: WorkspaceContext,
  ) {}
  resolve(query: OrderQuery): Scope {
    const date = query.date || this.workspace.state.today;
    const period = query.period || "day";
    const start = new Date(`${date}T12:00:00Z`);
    if (period === "week") start.setUTCDate(start.getUTCDate() - 6);
    return {
      date,
      period,
      from: start.toISOString().slice(0, 10),
      to: date,
      timezone: this.environment.timezone,
    };
  }
}
