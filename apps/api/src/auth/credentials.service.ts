import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  createHmac,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { Identity, Role } from "@stolovaya/contracts";
import { Environment } from "../config/environment";

const scrypt = promisify(scryptCallback);
interface Credential {
  identity: Identity;
  hash: Buffer;
  version: string;
}

@Injectable()
export class CredentialsService implements OnModuleInit {
  private readonly credentials = new Map<Role, Credential>();
  constructor(private readonly environment: Environment) {}
  async onModuleInit(): Promise<void> {
    for (const account of this.environment.accounts) {
      this.credentials.set(account.role, {
        identity: { role: account.role, login: account.login },
        hash: (await scrypt(
          account.password,
          this.salt(account.role),
          64,
        )) as Buffer,
        version: createHmac("sha256", this.environment.sessionSecret)
          .update(JSON.stringify(account))
          .digest("hex"),
      });
    }
  }
  async authenticate(
    login: string,
    password: string,
  ): Promise<Credential | null> {
    const account = [...this.credentials.values()].find(
      (value) => value.identity.login === login,
    );
    const hash = (await scrypt(
      password,
      this.salt(account?.identity.role || "cook"),
      64,
    )) as Buffer;
    return account && timingSafeEqual(hash, account.hash) ? account : null;
  }
  current(role: Role, version: string): Identity | null {
    const credential = this.credentials.get(role);
    return credential?.version === version ? credential.identity : null;
  }
  private salt(role: Role): string {
    return createHmac("sha256", this.environment.sessionSecret)
      .update(role)
      .digest("hex");
  }
}
