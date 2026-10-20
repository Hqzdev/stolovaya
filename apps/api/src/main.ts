import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { Environment } from "./config/environment";
import { HttpErrorFilter } from "./common/http-error.filter";
import { describeResponses } from "./common/openapi";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  const environment = app.get(Environment);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(
    (
      _request: unknown,
      response: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  const options = new DocumentBuilder()
    .setTitle("Столовая — API")
    .setDescription(
      "Две роли из .env. Для изменяющих запросов обязательны Origin и X-CSRF-Token из /auth/me.",
    )
    .setVersion("1.0.0")
    .addCookieAuth("stolovaya_session")
    .build();
  SwaggerModule.setup(
    "api/v1/docs",
    app,
    describeResponses(SwaggerModule.createDocument(app, options)),
    { swaggerOptions: { persistAuthorization: false } },
  );
  await app.listen(environment.port, "0.0.0.0");
}
bootstrap().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Не удалось запустить сервер.",
  );
  process.exitCode = 1;
});
