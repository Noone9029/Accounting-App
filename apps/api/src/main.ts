import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { configureApp } from "./app-bootstrap";
import { AppModule } from "./app.module";
import { buildStartupConfigSummary } from "./config/production-config";
import { StructuredLoggerService } from "./observability/structured-logger.service";
import { configureOpenApi } from "./openapi";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = app.get(StructuredLoggerService);
  app.useLogger(logger);
  logger.emit({
    level: "info",
    message: `api.config.startup_readiness ${JSON.stringify(buildStartupConfigSummary(process.env))}`,
    module: "ConfigReadiness",
    action: "startup",
  });

  configureApp(app);
  configureOpenApi(app, config);

  const port = config.get<number>("API_PORT") ?? 4000;
  await app.listen(port);
}

void bootstrap();
