import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import type { Identity, Role } from "@stolovaya/contracts";
import { Database } from "../database/database";
import { CredentialsService } from "./credentials.service";

export interface AuthenticatedSession {
  user: Identity;
  csrfToken: string;
}

@Injectable()
export class AuthService {
  static readonly cookieName = "stolovaya_session";
  static readonly lifetimeMs = 8 * 60 * 60 * 1000;
  constructor(
    private readonly database: Database,
    private readonly credentials: CredentialsService,
  ) {}
  async login(
    login: string,
    password: string,
    previousToken?: string,
  ): Promise<{ token: string; user: Identity; csrfToken: string }> {
    const account = await this.credentials.authenticate(login, password);
    if (!account) throw new UnauthorizedException("Неверный логин или пароль.");
    const token = randomBytes(32).toString("hex");
    const csrfToken = randomBytes(32).toString("hex");
    await this.database.query("DELETE FROM sessions WHERE expires_at <= now()");
    if (previousToken) await this.logout(previousToken);
    await this.database.query(
      "INSERT INTO sessions (token_hash, role, credential_version, csrf_token, expires_at) VALUES ($1, $2, $3, $4, $5)",
      [
        this.hash(token),
        account.identity.role,
        account.version,
        csrfToken,
        new Date(Date.now() + AuthService.lifetimeMs),
      ],
    );
    return { token, user: account.identity, csrfToken };
  }
  async resolve(token?: string): Promise<AuthenticatedSession | null> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const [session] = await this.database.query<{
      role: Role;
      credential_version: string;
      csrf_token: string;
    }>(
      "SELECT role, credential_version, csrf_token FROM sessions WHERE token_hash = $1 AND expires_at > now()",
      [this.hash(token)],
    );
    if (!session) return null;
    const user = this.credentials.current(
      session.role,
      session.credential_version,
    );
    if (!user) {
      await this.logout(token);
      return null;
    }
    return { user, csrfToken: session.csrf_token };
  }
  async logout(token: string): Promise<void> {
    await this.database.query("DELETE FROM sessions WHERE token_hash = $1", [
      this.hash(token),
    ]);
  }
  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
