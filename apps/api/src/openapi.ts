import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function configureOpenApi(app: INestApplication, config: ConfigService): boolean {
  if (!isOpenApiDocsEnabled(config)) {
    return false;
  }

  const openApiConfig = new DocumentBuilder()
    .setTitle("LedgerByte API")
    .setDescription("LedgerByte API v1 beta surface. Provider-backed and posting actions remain gated by tenant configuration.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup("api/docs", app, document, {
    customSiteTitle: "LedgerByte API docs",
    swaggerOptions: {
      persistAuthorization: false,
    },
  });

  return true;
}

export function isOpenApiDocsEnabled(config: ConfigService): boolean {
  const explicitFlag = readBoolean(config.get<string>("LEDGERBYTE_API_DOCS_ENABLED"));
  if (explicitFlag !== undefined) {
    return explicitFlag;
  }

  return isDevelopmentLikeEnvironment(readRuntimeEnvironment(config));
}

function readRuntimeEnvironment(config: ConfigService): string {
  return config.get<string>("APP_ENV") ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
}

function isDevelopmentLikeEnvironment(environment: string): boolean {
  return ["development", "dev", "local", "test"].includes(environment.toLowerCase());
}

function readBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value.toLowerCase())) {
    return false;
  }

  return undefined;
}
