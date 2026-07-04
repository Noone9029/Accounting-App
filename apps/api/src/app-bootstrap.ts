import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCsrfProtectionMiddleware } from "./auth/auth-cookie";

export { createCsrfProtectionMiddleware } from "./auth/auth-cookie";

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;
type CorsOrigin =
  | boolean
  | string
  | string[]
  | ((origin: string | undefined, callback: CorsOriginCallback) => void);

type HeaderResponse = {
  setHeader(name: string, value: string): void;
};

type NextFunction = () => void;

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const environment = readRuntimeEnvironment(config);

  app.use(createSecurityHeadersMiddleware(environment));
  app.use(createCsrfProtectionMiddleware(config));

  app.enableCors({
    origin: readCorsOrigin(config.get<string>("CORS_ORIGIN"), environment),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}

export function readCorsOrigin(configuredOrigin: string | undefined, environment = "development"): CorsOrigin {
  const origins = (configuredOrigin ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return "http://localhost:3000";
  }

  if (origins.includes("*")) {
    if (!isDevelopmentLikeEnvironment(environment)) {
      throw new Error("Wildcard CORS origins are not allowed outside development and test when credentials are enabled.");
    }

    return true;
  }

  const firstOrigin = origins[0];
  if (origins.length === 1 && firstOrigin && !firstOrigin.includes("*")) {
    return firstOrigin;
  }

  return (origin, callback) => {
    if (!origin || origins.some((allowedOrigin) => isCorsOriginAllowed(origin, allowedOrigin))) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}

export function isCorsOriginAllowed(origin: string, allowedOrigin: string): boolean {
  if (allowedOrigin === origin) {
    return true;
  }

  if (!allowedOrigin.includes("*")) {
    return false;
  }

  const [prefix, suffix] = allowedOrigin.split("*", 2);
  return origin.startsWith(prefix ?? "") && origin.endsWith(suffix ?? "");
}

export function createSecurityHeadersMiddleware(environment = "development") {
  return (_request: unknown, response: HeaderResponse, next: NextFunction) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    response.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "form-action 'self'",
        "img-src 'self' data: https:",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self' https:",
      ].join("; "),
    );

    if (!isDevelopmentLikeEnvironment(environment)) {
      response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    next();
  };
}

function readRuntimeEnvironment(config: ConfigService): string {
  return config.get<string>("APP_ENV") ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
}

function isDevelopmentLikeEnvironment(environment: string): boolean {
  return ["development", "dev", "local", "test"].includes(environment.toLowerCase());
}
