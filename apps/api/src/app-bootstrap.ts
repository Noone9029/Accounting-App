import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;
type CorsOrigin =
  | boolean
  | string
  | string[]
  | ((origin: string | undefined, callback: CorsOriginCallback) => void);

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.enableCors({
    origin: readCorsOrigin(config.get<string>("CORS_ORIGIN")),
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

export function readCorsOrigin(configuredOrigin: string | undefined): CorsOrigin {
  const origins = (configuredOrigin ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return "http://localhost:3000";
  }

  if (origins.includes("*")) {
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
