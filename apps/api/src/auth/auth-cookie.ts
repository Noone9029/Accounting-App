import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import type { CookieOptions, Response } from "express";

const DEFAULT_AUTH_COOKIE_NAME = "ledgerbyte_auth";
const DEFAULT_CSRF_COOKIE_NAME = "ledgerbyte_csrf";
const DEFAULT_CSRF_HEADER_NAME = "x-csrf-token";
const DEFAULT_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const AUTH_COOKIE_PREFIX = "/auth/";
const CSRF_EXEMPT_AUTH_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/password-reset/request",
  "/auth/password-reset/confirm",
]);

type SameSite = "lax" | "strict" | "none";

type HeaderValue = string | string[] | undefined;

type RequestLike = {
  method?: string;
  path?: string;
  url?: string;
  requestId?: string;
  headers: Record<string, HeaderValue>;
};

type CsrfResponse = {
  status(statusCode: number): CsrfResponse;
  json(body: unknown): void;
};

type NextFunction = () => void;

export interface AuthCookieSettings {
  authCookieName: string;
  csrfCookieName: string;
  csrfHeaderName: string;
  authCookieOptions: CookieOptions;
  csrfCookieOptions: CookieOptions;
  clearCookieOptions: CookieOptions;
}

export function readAuthCookieSettings(config: ConfigService): AuthCookieSettings {
  const environment = readRuntimeEnvironment(config);
  const secure = readSecureCookieFlag(config, environment);
  const sameSite = readSameSite(config, environment);
  const domain = readOptionalString(config.get<string>("AUTH_COOKIE_DOMAIN"));
  const maxAge = parseDurationMs(config.get<string>("JWT_EXPIRES_IN"), DEFAULT_SESSION_MAX_AGE_MS);
  const baseOptions: CookieOptions = {
    secure,
    sameSite,
    path: "/",
    maxAge,
  };

  if (domain) {
    baseOptions.domain = domain;
  }

  return {
    authCookieName: readOptionalString(config.get<string>("AUTH_COOKIE_NAME")) ?? DEFAULT_AUTH_COOKIE_NAME,
    csrfCookieName: readOptionalString(config.get<string>("CSRF_COOKIE_NAME")) ?? DEFAULT_CSRF_COOKIE_NAME,
    csrfHeaderName: (readOptionalString(config.get<string>("CSRF_HEADER_NAME")) ?? DEFAULT_CSRF_HEADER_NAME).toLowerCase(),
    authCookieOptions: {
      ...baseOptions,
      httpOnly: true,
    },
    csrfCookieOptions: {
      ...baseOptions,
      httpOnly: false,
    },
    clearCookieOptions: domain ? { path: "/", domain } : { path: "/" },
  };
}

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function setAuthCookies(response: Response, config: ConfigService, accessToken: string): string {
  const settings = readAuthCookieSettings(config);
  const csrfToken = createCsrfToken();

  response.cookie(settings.authCookieName, accessToken, settings.authCookieOptions);
  response.cookie(settings.csrfCookieName, csrfToken, settings.csrfCookieOptions);

  return csrfToken;
}

export function clearAuthCookies(response: Response, config: ConfigService): void {
  const settings = readAuthCookieSettings(config);

  response.clearCookie(settings.authCookieName, settings.clearCookieOptions);
  response.clearCookie(settings.csrfCookieName, settings.clearCookieOptions);
}

export function extractAuthCookieToken(request: RequestLike, config: ConfigService): string | null {
  const settings = readAuthCookieSettings(config);
  return readCookie(request.headers.cookie, settings.authCookieName);
}

export function validateCsrfRequest(request: RequestLike, config: ConfigService): void {
  if (!shouldValidateCsrf(request, config)) {
    return;
  }

  const settings = readAuthCookieSettings(config);
  const csrfCookie = readCookie(request.headers.cookie, settings.csrfCookieName);
  const csrfHeader = readSingleHeader(request.headers[settings.csrfHeaderName]);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    throw new ForbiddenException("Invalid CSRF token.");
  }
}

export function createCsrfProtectionMiddleware(config: ConfigService) {
  return (request: RequestLike, response: CsrfResponse, next: NextFunction) => {
    try {
      validateCsrfRequest(request, config);
      next();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        response.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Invalid CSRF token.",
            statusCode: 403,
            requestId: request.requestId ?? "unavailable",
          },
        });
        return;
      }

      throw error;
    }
  };
}

export function shouldValidateCsrf(request: RequestLike, config: ConfigService): boolean {
  if (!isUnsafeMethod(request.method) || hasBearerAuthorization(request) || isCsrfExemptAuthPath(readRequestPath(request))) {
    return false;
  }

  return extractAuthCookieToken(request, config) !== null;
}

export function hasBearerAuthorization(request: RequestLike): boolean {
  const authorization = readSingleHeader(request.headers.authorization);
  return authorization?.startsWith("Bearer ") ?? false;
}

function readRuntimeEnvironment(config: ConfigService): string {
  return config.get<string>("APP_ENV") ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
}

function readSecureCookieFlag(config: ConfigService, environment: string): boolean {
  const configured = readOptionalString(config.get<string>("AUTH_COOKIE_SECURE"));
  if (configured !== undefined) {
    const secure = configured.toLowerCase() === "true";
    if (!secure && !isDevelopmentLikeEnvironment(environment)) {
      throw new Error("AUTH_COOKIE_SECURE=false is not allowed outside development and test.");
    }
    return secure;
  }

  return !isDevelopmentLikeEnvironment(environment);
}

function readSameSite(config: ConfigService, environment: string): SameSite {
  const configured = readOptionalString(config.get<string>("AUTH_COOKIE_SAME_SITE"))?.toLowerCase();
  if (configured === "lax" || configured === "strict" || configured === "none") {
    return configured;
  }

  return isDevelopmentLikeEnvironment(environment) ? "lax" : "none";
}

function parseDurationMs(value: string | undefined, fallback: number): number {
  const normalized = readOptionalString(value);
  if (!normalized) {
    return fallback;
  }

  const match = /^(\d+)(ms|s|m|h|d)?$/.exec(normalized);
  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] ?? 1000);
}

function isUnsafeMethod(method: string | undefined): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes((method ?? "GET").toUpperCase());
}

function isDevelopmentLikeEnvironment(environment: string): boolean {
  return ["development", "dev", "local", "test"].includes(environment.toLowerCase());
}

function readOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readSingleHeader(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function readCookie(header: HeaderValue, name: string): string | null {
  const cookieHeader = readSingleHeader(header);
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

function readRequestPath(request: RequestLike): string {
  const value = request.path ?? request.url ?? "";
  return value.split("?")[0] ?? "";
}

function isCsrfExemptAuthPath(path: string): boolean {
  if (CSRF_EXEMPT_AUTH_PATHS.has(path)) {
    return true;
  }

  return path.startsWith(AUTH_COOKIE_PREFIX) && /^\/auth\/invitations\/[^/]+\/accept$/.test(path);
}
