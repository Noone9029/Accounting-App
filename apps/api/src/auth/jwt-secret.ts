import { ConfigService } from "@nestjs/config";

const DEVELOPMENT_JWT_SECRET = "dev-only-secret";
const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;

export function readJwtSecret(config: ConfigService): string {
  const configuredSecret = config.get<string>("JWT_SECRET")?.trim();
  const environment = readRuntimeEnvironment(config);

  if (configuredSecret) {
    if (!isDevelopmentLikeEnvironment(environment)) {
      assertProductionJwtSecret(configuredSecret);
    }

    return configuredSecret;
  }

  if (isDevelopmentLikeEnvironment(environment)) {
    return DEVELOPMENT_JWT_SECRET;
  }

  throw new Error("JWT_SECRET must be configured outside development and test.");
}

function assertProductionJwtSecret(secret: string): void {
  if (secret === DEVELOPMENT_JWT_SECRET) {
    throw new Error("JWT_SECRET must not use the development fallback outside development and test.");
  }

  if (secret.length < MINIMUM_PRODUCTION_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MINIMUM_PRODUCTION_SECRET_LENGTH} characters outside development and test.`);
  }
}

function readRuntimeEnvironment(config: ConfigService): string {
  return config.get<string>("APP_ENV") ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
}

function isDevelopmentLikeEnvironment(environment: string): boolean {
  return ["development", "dev", "local", "test"].includes(environment.toLowerCase());
}
