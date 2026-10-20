import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Environment } from "./config/environment";
import { Database } from "./database/database";
import { CredentialsService } from "./auth/credentials.service";
import { AuthService } from "./auth/auth.service";
import { AccessGuard, Public } from "./auth/access.guard";
import { AuthController } from "./auth/auth.controller";
import { CatalogEntryRepository } from "./catalog/catalog-entry.repository";
import { CatalogRepository } from "./catalog/catalog.repository";
import { CatalogService } from "./catalog/catalog.service";
import { CatalogController } from "./catalog/catalog.controller";
import { ScopeService } from "./orders/scope.service";
import { OrderRepository } from "./orders/order.repository";
import { OrderService } from "./orders/order.service";
import { OrderController } from "./orders/order.controller";
import { AnalyticsService } from "./analytics/analytics.service";
import { AnalyticsController } from "./analytics/analytics.controller";

import { WorkspaceRepository } from "./workspace/workspace.repository";
import { WorkspaceService } from "./workspace/workspace.service";
import { WorkspaceContext } from "./workspace/workspace.context";
import { SettingsController } from "./workspace/settings.controller";

@ApiTags("Состояние")
@Controller("health")
class HealthController {
  constructor(private readonly database: Database) {}
  @Get()
  @Public()
  @ApiOperation({ summary: "Проверить подключение к PostgreSQL" })
  async health() {
    await this.database.query("SELECT 1");
    return { status: "ok" };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }])],
  controllers: [
    HealthController,
    SettingsController,
    AuthController,
    CatalogController,
    OrderController,
    AnalyticsController,
  ],
  providers: [
    Environment,
    Database,
    WorkspaceRepository,
    WorkspaceService,
    WorkspaceContext,
    CredentialsService,
    AuthService,
    CatalogService,
    CatalogEntryRepository,
    CatalogRepository,
    ScopeService,
    OrderRepository,
    OrderService,
    AnalyticsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export class AppModule {}
