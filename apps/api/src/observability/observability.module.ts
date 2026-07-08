import { Global, Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ObservabilityContextService } from "./observability-context.service";
import { ObservabilityReadinessController } from "./observability-readiness.controller";
import { ObservabilityReadinessService } from "./observability-readiness.service";
import { RequestLoggingInterceptor } from "./request-logging.interceptor";
import { SafeExceptionFilter } from "./safe-exception.filter";
import { StructuredLoggerService } from "./structured-logger.service";

@Global()
@Module({
  controllers: [ObservabilityReadinessController],
  providers: [
    ObservabilityContextService,
    ObservabilityReadinessService,
    StructuredLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: SafeExceptionFilter,
    },
  ],
  exports: [ObservabilityContextService, ObservabilityReadinessService, StructuredLoggerService],
})
export class ObservabilityModule {}
