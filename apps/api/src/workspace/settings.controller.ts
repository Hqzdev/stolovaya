import { Body, Controller, Get, Patch } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { IsIn, IsInt, Min } from "class-validator";
import type { DataMode } from "@stolovaya/contracts";
import { Roles } from "../auth/access.guard";
import { WorkspaceService } from "./workspace.service";

class DataModeDto {
  @ApiProperty({ enum: ["live", "demo"] })
  @IsIn(["live", "demo"])
  mode!: DataMode;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) version!: number;
}

@ApiTags("Настройки")
@ApiCookieAuth()
@Roles("admin")
@Controller("settings")
export class SettingsController {
  constructor(private readonly workspace: WorkspaceService) {}
  @Get()
  @ApiOperation({
    summary: "Режим данных и число рабочих и демонстрационных заказов",
  })
  settings() {
    return this.workspace.settings();
  }
  @Patch("data-mode")
  @ApiOperation({
    summary:
      "Переключить данные для обоих кабинетов; первое включение подготавливает демо",
  })
  switchMode(@Body() body: DataModeDto) {
    return this.workspace.switchMode(body.mode, body.version);
  }
}
