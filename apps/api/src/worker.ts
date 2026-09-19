import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { setTimeout as delay } from "node:timers/promises";
import { StructuredLoggerService } from "./observability/structured-logger.service";
import { boundedWorkerInteger, OutboxSchedulerService } from "./worker/outbox-scheduler.service";
import { WorkerModule } from "./worker/worker.module";

async function main(): Promise<void> {
  const intervalMs = boundedWorkerInteger(process.env.LEDGERBYTE_WORKER_INTERVAL_MS, 5_000, 60_000);
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
  const logger = app.get(StructuredLoggerService);
  app.useLogger(logger);
  const scheduler = app.get(OutboxSchedulerService);
  const stop = new AbortController();
  let deadline: NodeJS.Timeout | undefined;
  const shutdown = () => {
    if (stop.signal.aborted) return;
    stop.abort();
    // A provider outage must not hold a terminating container indefinitely.
    // In-flight claims retain the existing stale-lock recovery semantics.
    deadline = setTimeout(() => process.exit(1), 45_000);
    deadline.unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  try {
    while (!stop.signal.aborted) {
      try {
        const result = await scheduler.tick(stop.signal);
        logger.emit({ message: `worker.tick ${JSON.stringify(result)}`, module: "Worker", action: "heartbeat" });
      } catch {
        logger.emit({ level: "error", message: "worker.tick.failed", module: "Worker", action: "tick_failed" });
      }
      try { await delay(intervalMs, undefined, { signal: stop.signal }); } catch { /* shutdown wakes the delay */ }
    }
  } finally {
    await app.close();
    if (deadline) clearTimeout(deadline);
    process.removeListener("SIGTERM", shutdown);
    process.removeListener("SIGINT", shutdown);
  }
}

void main().catch(() => { console.error("Worker startup failed; inspect redacted configuration and connectivity diagnostics."); process.exitCode = 1; });
