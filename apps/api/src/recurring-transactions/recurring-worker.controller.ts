import { Controller, Get, Headers, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { RecurringRunService } from "./recurring-run.service";

@Controller("internal/recurring-worker")
export class RecurringWorkerController {
  constructor(private readonly runs: RecurringRunService, private readonly config: ConfigService) {}

  @Get()
  process(@Headers("authorization") authorization?: string) {
    const secret = this.config.get<string>("CRON_SECRET")?.trim();
    if (!secret) throw new ServiceUnavailableException("Recurring scheduler is not configured.");
    const presented = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!safeEqual(presented, secret)) throw new UnauthorizedException("Recurring scheduler authentication failed.");
    return this.runs.processDue({ workerClaimId: `vercel-cron:${randomUUID()}`, limit: 25 });
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(leftDigest, rightDigest);
}
