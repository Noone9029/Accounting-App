import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { redactForDiagnostics, redactText } from "./redaction";

const SAFE_DOMAIN_ERROR_CODES = new Set([
  "ACCOUNTING_CLOSE_REVIEW_INVALIDATED",
  "ACCOUNTING_CLOSE_LOCK_REVALIDATION_FAILED",
]);

@Catch()
@Injectable()
export class SafeExceptionFilter implements ExceptionFilter {
  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<AuthenticatedRequest & { requestId?: string }>();
    const response = context.getResponse<Response>();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const localSafe = isLocalSafeEnvironment(readRuntimeEnvironment(this.config));
    const errorResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = readSafeMessage(exception, errorResponse, localSafe);
    const details = localSafe ? readSafeDetails(errorResponse) : undefined;
    const domainCode = readSafeDomainCode(errorResponse);

    response.status(statusCode).json({
      error: {
        code: domainCode ?? statusCodeToCode(statusCode),
        message,
        statusCode,
        requestId: request.requestId ?? response.getHeader("x-request-id") ?? "unavailable",
        ...(details === undefined ? {} : { details }),
      },
    });
  }
}

export function isLocalSafeEnvironment(environment: string): boolean {
  return ["development", "dev", "local", "test"].includes(environment.toLowerCase());
}

function readRuntimeEnvironment(config: ConfigService): string {
  return config.get<string>("APP_ENV") ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
}

function readSafeMessage(exception: unknown, response: string | object | undefined, localSafe: boolean): string {
  if (!(exception instanceof HttpException)) {
    return localSafe && exception instanceof Error ? redactText(exception.message) : "Internal server error.";
  }

  if (typeof response === "string") {
    return response;
  }

  if (isRecord(response)) {
    const message = response.message;
    if (typeof message === "string") {
      return message;
    }
    if (Array.isArray(message)) {
      return "Validation failed.";
    }
  }

  return exception.message;
}

function readSafeDetails(response: string | object | undefined): unknown {
  if (!isRecord(response)) {
    return undefined;
  }
  const message = response.message;
  if (Array.isArray(message)) {
    return redactForDiagnostics(message);
  }
  return undefined;
}

function readSafeDomainCode(response: string | object | undefined): string | undefined {
  if (!isRecord(response) || typeof response.code !== "string") {
    return undefined;
  }
  return SAFE_DOMAIN_ERROR_CODES.has(response.code) ? response.code : undefined;
}

function statusCodeToCode(statusCode: number): string {
  if (statusCode === HttpStatus.BAD_REQUEST) {
    return "BAD_REQUEST";
  }
  if (statusCode === HttpStatus.UNAUTHORIZED) {
    return "UNAUTHORIZED";
  }
  if (statusCode === HttpStatus.FORBIDDEN) {
    return "FORBIDDEN";
  }
  if (statusCode === HttpStatus.NOT_FOUND) {
    return "NOT_FOUND";
  }
  return statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
