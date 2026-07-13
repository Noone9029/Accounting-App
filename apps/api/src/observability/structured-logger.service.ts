import { Injectable, LoggerService } from "@nestjs/common";
import { redactForDiagnostics } from "./redaction";

export type StructuredLogLevel = "info" | "warn" | "error" | "debug";

export interface StructuredLogEntry {
  level?: StructuredLogLevel;
  message: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  organizationId?: string;
  userId?: string;
  module?: string;
  action?: string;
  errorName?: string;
  prismaArgument?: string;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  log(message: unknown, context?: string): void {
    this.emit({ level: "info", message: String(message), module: context });
  }

  error(message: unknown, _trace?: string, context?: string): void {
    this.emit({ level: "error", message: String(message), module: context });
  }

  warn(message: unknown, context?: string): void {
    this.emit({ level: "warn", message: String(message), module: context });
  }

  debug(message: unknown, context?: string): void {
    this.emit({ level: "debug", message: String(message), module: context });
  }

  verbose(message: unknown, context?: string): void {
    this.emit({ level: "debug", message: String(message), module: context });
  }

  emit(entry: StructuredLogEntry): void {
    const safeEntry = redactForDiagnostics({
      timestamp: new Date().toISOString(),
      level: entry.level ?? "info",
      ...entry,
    });
    const serialized = JSON.stringify(safeEntry);
    if (entry.level === "error") {
      console.error(serialized);
    } else if (entry.level === "warn") {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }
}
