import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Role } from "@stolovaya/contracts";
import { AuthService, AuthenticatedSession } from "./auth.service";
import { Environment } from "../config/environment";

export const Public = () => SetMetadata("public", true);
export const Roles = (...roles: Role[]) => SetMetadata("roles", roles);
export interface SessionRequest extends Request {
  session: AuthenticatedSession;
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly environment: Environment,
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
    return true;
  }
}
