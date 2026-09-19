import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BillingLifecycleService } from "../billing/billing-lifecycle.service";
import { BillingWebhookService } from "../billing/billing-webhook.service";
import { EmailRetryWorkerService } from "../email/email-retry-worker.service";
import { PrismaService } from "../prisma/prisma.service";

export function boundedWorkerInteger(value: string | undefined, fallback: number, maximum: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) throw new Error("Invalid bounded worker configuration.");
  return parsed;
}

@Injectable()
export class OutboxSchedulerService {
  private afterOrganizationId: string | undefined;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailRetryWorkerService,
    private readonly billing: BillingLifecycleService,
    private readonly webhooks: BillingWebhookService,
  ) {}

  async tick(signal?: AbortSignal): Promise<{ skipped: boolean; emailOrganizations: number }> {
    if (this.running || signal?.aborted) return { skipped: true, emailOrganizations: 0 };
    this.running = true;
    let emailOrganizations = 0;
    try {
      // Sequential batches keep aggregate concurrency at one. PostgreSQL claim
      // predicates remain the authority if another process is briefly present.
      if (this.enabled("LEDGERBYTE_BILLING_WORKER_ENABLED")) {
        await this.webhooks.processPending({ batchSize: 25 });
        if (!signal?.aborted) await this.billing.processDueTransitions({ batchSize: 25 });
        if (!signal?.aborted) await this.billing.processDuePlanChanges({ batchSize: 25 });
      }
      if (signal?.aborted || !this.enabled("LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED") || !this.enabled("LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED")) {
        return { skipped: false, emailOrganizations };
      }
      const organizationLimit = boundedWorkerInteger(this.config.get<string>("LEDGERBYTE_WORKER_ORGANIZATIONS_PER_TICK"), 10, 50);
      const batchSize = boundedWorkerInteger(this.config.get<string>("LEDGERBYTE_WORKER_EMAIL_BATCH_SIZE"), 1, 10);
      const now = new Date();
      const organizations = await this.prisma.organization.findMany({
        where: {
          ...(this.afterOrganizationId ? { id: { gt: this.afterOrganizationId } } : {}),
          emailOutbox: { some: { status: { in: ["QUEUED", "FAILED"] }, bouncedAt: null, complainedAt: null,
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] } },
        },
        orderBy: { id: "asc" }, take: organizationLimit, select: { id: true },
      });
      if (organizations.length === 0) this.afterOrganizationId = undefined;
      for (const organization of organizations) {
        if (signal?.aborted) break;
        // A system task has no human actor. Preserve a nullable audit actor;
        // never impersonate the tenant's owner or invent a user identifier.
        this.afterOrganizationId = organization.id;
        await this.email.process(organization.id, undefined, batchSize);
        emailOrganizations += 1;
      }
      return { skipped: false, emailOrganizations };
    } finally {
      this.running = false;
    }
  }

  private enabled(name: string): boolean { return this.config.get<string>(name)?.trim().toLowerCase() === "true"; }
}
