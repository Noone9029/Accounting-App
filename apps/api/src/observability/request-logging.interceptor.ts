import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import { tap } from "rxjs";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { StructuredLoggerService } from "./structured-logger.service";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { requestId?: string; path?: string; originalUrl?: string }>();
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const startedAt = Date.now();
    const moduleName = context.getClass().name.replace(/Controller$/, "");
    const action = context.getHandler().name;

    return next.handle().pipe(
      tap({
        complete: () => {
          this.logger.emit({
            level: "info",
            message: "api.request.completed",
            requestId: request.requestId,
            method: request.method,
            path: readRequestPath(request),
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
            organizationId: request.organizationId,
            userId: request.user?.id,
            module: moduleName,
            action,
          });
        },
        error: (error: unknown) => {
          this.logger.emit({
            level: "error",
            message: "api.request.failed",
            requestId: request.requestId,
            method: request.method,
            path: readRequestPath(request),
            statusCode: error instanceof HttpException ? error.getStatus() : 500,
            durationMs: Date.now() - startedAt,
            organizationId: request.organizationId,
            userId: request.user?.id,
            module: moduleName,
            action,
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
        },
      }),
    );
  }
}

function readRequestPath(request: { path?: string; originalUrl?: string; url?: string }) {
  return (request.path || request.originalUrl || request.url || "").split("?", 1)[0] || "/";
}
