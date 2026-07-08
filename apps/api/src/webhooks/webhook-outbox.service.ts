import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { ObservabilityContextService } from "../observability/observability-context.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLocalWebhookEventDto, WEBHOOK_EVENT_TYPES } from "./dto/create-local-webhook-event.dto";

export type OutboundWebhookMode = "DISABLED" | "MOCK_LOCAL" | "PROVIDER_PLACEHOLDER";

export interface WebhookReadiness {
  mode: OutboundWebhookMode;
  status: "Disabled" | "Ready for Local Proof" | "Needs Production Approval";
  outboundDeliveryEnabled: boolean;
  externalCallsEnabled: false;
  mockDeliveryEnabled: boolean;
  signingSecretsStored: false;
  publicDeliveryApproved: boolean;
  retryReadiness: {
    states: ["PENDING", "QUEUED", "MOCK_DELIVERED", "RETRY_SCHEDULED", "FAILED", "BLOCKED"];
    backoffConfigured: false;
  };
  eventCatalog: readonly string[];
  safePayloadsOnly: true;
  warnings: string[];
}

@Injectable()
export class WebhookOutboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly observabilityContext: ObservabilityContextService,
  ) {}

  readiness(): WebhookReadiness {
    const mode = this.mode();
    return {
      mode,
      status: mode === "MOCK_LOCAL" ? "Ready for Local Proof" : mode === "PROVIDER_PLACEHOLDER" ? "Needs Production Approval" : "Disabled",
      outboundDeliveryEnabled: mode !== "DISABLED",
      externalCallsEnabled: false,
      mockDeliveryEnabled: mode === "MOCK_LOCAL",
      signingSecretsStored: false,
      publicDeliveryApproved: readBoolean(this.config.get<string>("LEDGERBYTE_OUTBOUND_WEBHOOKS_PUBLIC_APPROVED")) === true,
      retryReadiness: {
        states: ["PENDING", "QUEUED", "MOCK_DELIVERED", "RETRY_SCHEDULED", "FAILED", "BLOCKED"],
        backoffConfigured: false,
      },
      eventCatalog: WEBHOOK_EVENT_TYPES,
      safePayloadsOnly: true,
      warnings: [
        "Outbound webhooks are disabled by default.",
        "MOCK_LOCAL records local delivery attempts only and never calls external URLs.",
        "Production delivery requires explicit approval, secret custody, retries, monitoring, and rate-limit review.",
      ],
    };
  }

  eventCatalog() {
    return {
      eventTypes: WEBHOOK_EVENT_TYPES.map((eventType) => ({
        eventType,
        status: "catalogued",
        payloadPolicy: "safe-summary-only",
      })),
      noExternalCalls: true,
      noSecretsReturned: true,
    };
  }

  async createLocalMockEvent(organizationId: string, actorUserId: string, dto: CreateLocalWebhookEventDto) {
    if (this.mode() !== "MOCK_LOCAL") {
      throw new BadRequestException("Outbound webhook delivery is disabled. MOCK_LOCAL is local/test-only and must be explicitly configured.");
    }

    const requestId = this.observabilityContext.getRequestId() ?? null;
    const safePayloadSummary = this.safePayloadSummary(dto);
    const result = await this.prisma.$transaction(async (tx) => {
      const outbox = await tx.eventOutboxItem.create({
        data: {
          organizationId,
          eventType: dto.eventType,
          aggregateType: dto.aggregateType,
          aggregateId: dto.aggregateId,
          status: "QUEUED",
          safePayloadSummary,
          requestId,
        },
      });
      const event = await tx.webhookEvent.create({
        data: {
          organizationId,
          eventType: dto.eventType,
          status: "MOCK_DELIVERED",
          safePayloadSummary,
          requestId,
        },
      });
      const attempt = await tx.webhookDeliveryAttempt.create({
        data: {
          organizationId,
          webhookEventId: event.id,
          attemptNumber: 1,
          status: "MOCK_DELIVERED",
          responseSummary: {
            mock: true,
            externalCallAttempted: false,
            noResponseBodyStored: true,
          },
          requestId,
        },
      });
      return { outbox, event, attempt };
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "WEBHOOK_LOCAL_MOCK_EVENT_RECORDED",
      entityType: "WebhookEvent",
      entityId: result.event.id,
      after: {
        eventType: dto.eventType,
        aggregateType: dto.aggregateType,
        status: "MOCK_DELIVERED",
        externalCallAttempted: false,
        safePayloadsOnly: true,
      },
    });

    return {
      status: "MOCK_DELIVERED",
      eventId: result.event.id,
      outboxItemId: result.outbox.id,
      deliveryAttemptId: result.attempt.id,
      requestId,
      externalCallAttempted: false,
      safePayloadsOnly: true,
    };
  }

  private safePayloadSummary(dto: CreateLocalWebhookEventDto): Prisma.InputJsonObject {
    return {
      eventType: dto.eventType,
      aggregateType: dto.aggregateType,
      aggregateId: dto.aggregateId,
      sourceReferencePresent: Boolean(dto.sourceReference?.trim()),
      rawPayloadStored: false,
      providerPayloadStored: false,
      secretFieldsStored: false,
    };
  }

  private mode(): OutboundWebhookMode {
    const raw = this.config.get<string>("LEDGERBYTE_OUTBOUND_WEBHOOKS_MODE")?.trim().toUpperCase();
    if (raw === "MOCK_LOCAL" || raw === "PROVIDER_PLACEHOLDER") return raw;
    return "DISABLED";
  }
}

function readBoolean(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}
