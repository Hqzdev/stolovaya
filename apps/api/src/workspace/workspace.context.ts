import { Inject, Injectable, Scope, SetMetadata } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import type { Request } from "express";
import type { WorkspaceState } from "@stolovaya/contracts";

export const WorkspaceData = () => SetMetadata("workspaceData", true);
export interface WorkspaceRequest extends Request {
  workspace: WorkspaceState;
}

@Injectable({ scope: Scope.REQUEST })
export class WorkspaceContext {
  constructor(@Inject(REQUEST) private readonly request: WorkspaceRequest) {}
  get state(): WorkspaceState {
    return this.request.workspace;
  }
}
