import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import { WorkspaceService } from "../workspace/workspace.service";
import type { WorkspaceRequest } from "../workspace/workspace.context";
import type { Role } from "@stolovaya/contracts";
import { AuthService, AuthenticatedSession } from "./auth.service";
import { Environment } from "../config/environment";

export const Public = () => SetMetadata("public", true);
export const Roles = (...roles: Role[]) => SetMetadata("roles", roles);
export interface SessionRequest extends WorkspaceRequest {
  session: AuthenticatedSession;
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly environment: Environment,
    private readonly workspace: WorkspaceService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (mutating && request.headers.origin !== this.environment.origin)
      throw new ForbiddenException("Запрос отправлен с недопустимого адреса.");
    if (
      this.reflector.getAllAndOverride<boolean>("public", [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const session = await this.auth.resolve(
      request.cookies?.[AuthService.cookieName],
    );
    if (!session) throw new UnauthorizedException("Войдите в систему.");
    request.session = session;
    if (mutating && request.headers["x-csrf-token"] !== session.csrfToken)
      throw new ForbiddenException("Обновите страницу и повторите действие.");
    const roles = this.reflector.getAllAndOverride<Role[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(session.user.role))
      throw new ForbiddenException("Этот раздел доступен только другой роли.");
    request.workspace = await this.workspace.current();
    if (
      this.reflector.getAllAndOverride<boolean>("workspaceData", [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      const version = String(request.workspace.version);
      context
        .switchToHttp()
        .getResponse<Response>()
        .setHeader("X-Data-Version", version);
      const expected = request.headers["x-data-version"];
      if ((expected && expected !== version) || (mutating && !expected))
        throw new ConflictException(
          "Режим данных изменился. Обновите страницу перед продолжением.",
        );
    }
    return true;
  }
}
