import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsString, MaxLength, MinLength } from "class-validator";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { Public, SessionRequest } from "./access.guard";
import { WorkspaceService } from "../workspace/workspace.service";
import { Environment } from "../config/environment";

class LoginDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) login!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(256) password!: string;
}

@ApiTags("Доступ")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly environment: Environment,
    private readonly workspace: WorkspaceService,
  ) {}
  @Post("login")
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Войти одним из двух аккаунтов из .env" })
  async login(
    @Body() body: LoginDto,
    @Req() request: SessionRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, user, csrfToken } = await this.auth.login(
      body.login.trim(),
      body.password,
      request.cookies?.[AuthService.cookieName],
    );
    response.cookie(AuthService.cookieName, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: this.environment.secureCookie,
      maxAge: AuthService.lifetimeMs,
      path: "/",
    });
    const workspace = await this.workspace.current();
    return {
      workspace,
      user,
      csrfToken,
      today: workspace.today,
      timezone: this.environment.timezone,
    };
  }
  @Get("me")
  @ApiCookieAuth()
  @ApiOperation({
    summary: "Получить роль, CSRF-токен и текущую дату столовой",
  })
  me(@Req() request: SessionRequest) {
    return {
      ...request.session,
      workspace: request.workspace,
      today: request.workspace.today,
      timezone: this.environment.timezone,
    };
  }
  @Post("logout")
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Завершить сессию" })
  async logout(
    @Req() request: SessionRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.cookies[AuthService.cookieName]);
    response.clearCookie(AuthService.cookieName, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: this.environment.secureCookie,
    });
  }
}
