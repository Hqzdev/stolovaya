import { Injectable } from "@nestjs/common";
import type {
  DataMode,
  WorkspaceSettings,
  WorkspaceState,
} from "@stolovaya/contracts";
import { Environment } from "../config/environment";
import {
  WorkspaceRepository,
  type StoredWorkspace,
} from "./workspace.repository";

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly environment: Environment,
  ) {}
  private state(value: StoredWorkspace): WorkspaceState {
    return {
      ...value,
      today:
        value.mode === "demo" && value.demoDate
          ? value.demoDate
          : this.environment.today(),
    };
  }
  async current(): Promise<WorkspaceState> {
    return this.state(await this.repository.current());
  }
  async settings(): Promise<WorkspaceSettings> {
    const value = await this.repository.settings();
    return { ...value, ...this.state(value) };
  }
  async switchMode(
    mode: DataMode,
    version: number,
  ): Promise<WorkspaceSettings> {
    await this.repository.switchMode(mode, version);
    return this.settings();
  }
}
