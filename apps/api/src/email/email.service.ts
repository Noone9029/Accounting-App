import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  DocumentType,
  EmailDeliveryMonitoringEvidenceStatus,
  EmailDeliveryMonitoringEvidenceType,
  EmailDeliveryStatus,
  EmailProviderEventType,
  EmailSenderDomainEvidenceStatus,
  EmailSenderDomainEvidenceType,
  EmailSuppressionReason,
  EmailTemplateType,
  GeneratedDocumentStatus,
  Prisma,
} from "@prisma/client";
import { hasPermission, PERMISSIONS } from "@ledgerbyte/shared";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AP_GENERATED_DOCUMENT_EMAIL_PROVIDER,
  AP_GENERATED_DOCUMENT_EMAIL_SUPPORTED_SOURCES,
  type ApGeneratedDocumentEmailSourceType,
} from "./ap-generated-document-email.types";
import { CreateApGeneratedDocumentEmailDto } from "./dto/create-ap-generated-document-email.dto";
import { CreateEmailDeliveryMonitoringEvidenceDto } from "./dto/create-email-delivery-monitoring-evidence.dto";
import { CreateEmailSuppressionDto } from "./dto/create-email-suppression.dto";
import { CreateEmailSenderDomainEvidenceDto } from "./dto/create-email-sender-domain-evidence.dto";
import { ReceiveEmailProviderWebhookDto } from "./dto/receive-email-provider-webhook.dto";
import { ReceiveMockEmailProviderEventDto } from "./dto/receive-mock-email-provider-event.dto";
import { RevokeEmailDeliveryMonitoringEvidenceDto } from "./dto/revoke-email-delivery-monitoring-evidence.dto";
import { RevokeEmailSuppressionDto } from "./dto/revoke-email-suppression.dto";
import { RevokeEmailSenderDomainEvidenceDto } from "./dto/revoke-email-sender-domain-evidence.dto";
import { RunEmailRetryProcessDto } from "./dto/run-email-retry-process.dto";
import { RunEmailRetryWorkerDto } from "./dto/run-email-retry-worker.dto";
import { VerifyEmailDeliveryMonitoringEvidenceDto } from "./dto/verify-email-delivery-monitoring-evidence.dto";
import { VerifyEmailSenderDomainEvidenceDto } from "./dto/verify-email-sender-domain-evidence.dto";
import { buildOrganizationInviteEmail, buildPasswordResetEmail, buildTestEmail } from "./email-templates";
import { EMAIL_PROVIDER, type EmailMessage, type EmailProvider } from "./email-provider";
import {
  EMAIL_REDACTION_GUARANTEES,
  containsCustomerEmailContent,
  containsEmailSecret,
  maskEmailAddress,
  redactEmailDiagnosticText,
} from "./email-redaction";

interface SendOrganizationInviteInput {
  organizationId: string;
  toEmail: string;
  organizationName: string;
  roleName: string;
  acceptUrl: string;
}

interface SendPasswordResetInput {
  organizationId?: string | null;
  toEmail: string;
  resetUrl: string;
}

interface SendTestEmailInput {
  organizationId: string;
  toEmail: string;
}

interface CreateApGeneratedDocumentOutboxInput {
  organizationId: string;
  actorUserId: string;
  generatedDocumentId: string;
  dto: CreateApGeneratedDocumentEmailDto;
  permissions: unknown;
}

interface RunDiagnosticsInput {
  organizationId: string;
  toEmail?: string;
}

type RelayDiagnosticsStatus = "NOT_RUN" | "SKIPPED_DISABLED" | "READY_FOR_NON_PRODUCTION_TEST" | "ATTEMPTED" | "FAILED";
type SenderDomainEvidenceStatus = "BLOCKED" | "PARTIAL" | "READY_FOR_REVIEW";
type MonitoringEvidenceStatus = "BLOCKED" | "PARTIAL" | "READY_FOR_REVIEW";
type EmailRetryWorkerSchedulerProvider = "NONE" | "FUTURE_CRON" | "FUTURE_QUEUE" | "FUTURE_SERVERLESS_CRON";

type EmailRetryProcessStatus = "SKIPPED_DISABLED" | "ATTEMPTED";
type EmailRetryWorkerRunStatus = "SKIPPED_DISABLED" | "SKIPPED_PROCESSOR_DISABLED" | "ATTEMPTED";
type EmailWebhookProcessStatus = "REJECTED_UNVERIFIED" | "ACCEPTED_VERIFIED";

const REQUIRED_SENDER_DOMAIN_EVIDENCE_TYPES = [
  EmailSenderDomainEvidenceType.SPF,
  EmailSenderDomainEvidenceType.DKIM,
  EmailSenderDomainEvidenceType.DMARC,
];
const DEFAULT_EMAIL_MAX_ATTEMPTS = 3;
const MAX_EMAIL_RETRY_PROCESS_LIMIT = 50;
const EMAIL_SUPPRESSED_STATUS = "SUPPRESSED";
const EMAIL_WEBHOOK_SIGNATURE_MODE = "GENERIC_HMAC_SHA256_TEST_ONLY";
const REQUIRED_MONITORING_EVIDENCE_TYPES = [
  EmailDeliveryMonitoringEvidenceType.RETRY_WORKER,
  EmailDeliveryMonitoringEvidenceType.BOUNCE_ALERTS,
  EmailDeliveryMonitoringEvidenceType.COMPLAINT_ALERTS,
  EmailDeliveryMonitoringEvidenceType.SUPPRESSION_TRENDS,
  EmailDeliveryMonitoringEvidenceType.DELIVERY_DASHBOARD,
  EmailDeliveryMonitoringEvidenceType.PROVIDER_WEBHOOK_HEALTH,
];

@Injectable()
export class EmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(EMAIL_PROVIDER)
    private readonly provider: EmailProvider,
    @Optional()
    private readonly auditLogService?: AuditLogService,
  ) {}

  get isMockProvider(): boolean {
    return this.provider.isMock;
  }

  async readiness(organizationId: string) {
    const providerReadiness = this.provider.readiness();
    const fromAddressConfigured = Boolean(this.configuredFromEmail);
    const replyToConfigured = Boolean(this.config.get<string>("EMAIL_REPLY_TO")?.trim());
    const smtpHostConfigured = providerReadiness.smtp.hostConfigured;
    const smtpPortConfigured = providerReadiness.smtp.portConfigured;
    const smtpSecureModeConfigured = providerReadiness.smtp.secureModeConfigured;
    const credentialsConfigured = providerReadiness.smtp.userConfigured && providerReadiness.smtp.passwordConfigured;
    const providerConfigured = providerReadiness.provider !== "invalid";
    const senderDomain = await this.senderDomainReadiness(organizationId);
    const relayDiagnosticsStatus = this.currentRelayDiagnosticsStatus(providerReadiness.realSendingEnabled);
    const retryPlan = await this.retryPlan(organizationId);
    const retryWorkerPlan = await this.retryWorkerPlan(organizationId);
    const providerEventPlan = await this.providerEventsPlan(organizationId);
    const webhookPlan = await this.providerWebhookPlan(organizationId);
    const monitoringPlan = await this.monitoringPlan(organizationId);
    const activeSuppressionCount = await this.prisma.emailSuppression.count({
      where: { organizationId, active: true },
    });
    const operationalBlockers = this.operationalReadinessBlockers({
      senderDomainReady: senderDomain.productionReadyContribution,
      relayDiagnosticsStatus,
      retryProcessorEnabled: retryPlan.retryProcessorEnabled,
      retryWorkerConfigured: retryWorkerPlan.workerConfigured,
      retryWorkerEnabled: retryWorkerPlan.workerEnabled,
      providerEventIngestionReady: providerEventPlan.providerEventIngestionReady,
      bounceWebhookConfigured: providerEventPlan.bounceWebhookConfigured,
      monitoringConfigured: monitoringPlan.monitoringConfigured,
      webhookVerificationEnabled: webhookPlan.webhookVerificationEnabled,
      webhookSecretConfigured: webhookPlan.webhookSecretConfigured,
      providerWebhookSignatureVerified: webhookPlan.providerWebhookSignatureVerified,
      alertingConfigured: monitoringPlan.alertingConfigured,
    });
    const productionBlockers = [
      ...this.productionReadinessBlockers({
      provider: providerReadiness.provider,
      fromAddressConfigured,
      replyToConfigured,
      smtpHostConfigured,
      smtpPortConfigured,
      smtpSecureModeConfigured,
      credentialsConfigured,
      providerReady: providerReadiness.ready,
      }),
      ...operationalBlockers,
    ];

    return {
      ...providerReadiness,
      fromEmail: this.fromEmail,
      localOnly: !providerReadiness.realSendingEnabled,
      noCustomerEmailSent: true,
      readOnly: true,
      noMutation: true,
      providerConfigured,
      fromAddressConfigured,
      replyToConfigured,
      smtpHostConfigured,
      smtpPortConfigured,
      smtpSecureModeConfigured,
      credentialsConfigured,
      productionReady: productionBlockers.length === 0,
      blockers: [...new Set([...providerReadiness.blockingReasons, ...productionBlockers])],
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      diagnostics: this.diagnosticsPlan(),
      senderDomain,
      relayDiagnosticsStatus,
      relayDiagnosticsRequired: true,
      retryPolicyConfigured: true,
      retryProcessorEnabled: retryPlan.retryProcessorEnabled,
      retryWorkerConfigured: retryWorkerPlan.workerConfigured,
      retryWorkerEnabled: retryWorkerPlan.workerEnabled,
      retryPendingCount: retryPlan.pendingCount,
      retryBlockedCount: retryPlan.blockedCount,
      retrySuppressedCount: retryPlan.suppressedOutboxCount,
      bounceWebhookConfigured: providerEventPlan.bounceWebhookConfigured,
      bounceWebhookSignatureVerified: providerEventPlan.bounceWebhookSignatureVerified,
      webhookVerificationConfigured: webhookPlan.webhookVerificationConfigured,
      webhookVerificationEnabled: webhookPlan.webhookVerificationEnabled,
      webhookSecretConfigured: webhookPlan.webhookSecretConfigured,
      providerWebhookSignatureVerified: webhookPlan.providerWebhookSignatureVerified,
      suppressionListConfigured: true,
      activeSuppressionCount,
      providerEventIngestionReady: providerEventPlan.providerEventIngestionReady,
      monitoringEvidenceStatus: monitoringPlan.evidenceStatus,
      monitoringConfigured: monitoringPlan.monitoringConfigured,
      alertingConfigured: monitoringPlan.alertingConfigured,
      retryThroughputMonitoringConfigured: monitoringPlan.retryThroughputMonitoringConfigured,
      bounceAlertThresholdConfigured: monitoringPlan.bounceAlertThresholdConfigured,
      complaintAlertThresholdConfigured: monitoringPlan.complaintAlertThresholdConfigured,
      suppressionTrendMonitoringConfigured: monitoringPlan.suppressionTrendMonitoringConfigured,
      providerWebhookHealthMonitoringConfigured: monitoringPlan.providerWebhookHealthMonitoringConfigured,
      providerWebhookAlertsReady: monitoringPlan.providerWebhookHealthMonitoringConfigured && monitoringPlan.alertingConfigured,
    };
  }

  diagnosticsPlan(toEmail?: string) {
    const providerReadiness = this.provider.readiness();
    return {
      executionEnabled: this.diagnosticsExecutionEnabled,
      allowedRecipientsConfigured: this.configuredList("LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS").length > 0,
      allowedDomainsConfigured: this.allowedDiagnosticDomains.length > 0,
      provider: this.provider.provider,
      smtpConfigured: providerReadiness.provider === "smtp" && providerReadiness.ready,
      wouldSendToRedactedRecipient: toEmail ? maskEmailAddress(toEmail.trim().toLowerCase()) : null,
      noCustomerEmailSentByDefault: true,
      noMutationByDefault: true,
      productionReady: false,
    };
  }

  async retryPlan(organizationId: string) {
    const now = new Date();
    const pendingCount = await this.prisma.emailOutbox.count({
      where: {
        organizationId,
        status: EmailDeliveryStatus.QUEUED,
      },
    });
    const failedRetryableCount = await this.prisma.emailOutbox.count({
      where: {
        organizationId,
        status: EmailDeliveryStatus.FAILED,
        attemptCount: { lt: DEFAULT_EMAIL_MAX_ATTEMPTS },
        bouncedAt: null,
        complainedAt: null,
        NOT: { providerEventStatus: EMAIL_SUPPRESSED_STATUS },
      },
    });
    const blockedCount = await this.prisma.emailOutbox.count({
      where: {
        organizationId,
        OR: [
          { status: EmailDeliveryStatus.FAILED, attemptCount: { gte: DEFAULT_EMAIL_MAX_ATTEMPTS } },
          { bouncedAt: { not: null } },
          { complainedAt: { not: null } },
          { providerEventStatus: EMAIL_SUPPRESSED_STATUS },
        ],
      },
    });
    const nextAttemptCount = await this.prisma.emailOutbox.count({
      where: {
        organizationId,
        status: { in: [EmailDeliveryStatus.QUEUED, EmailDeliveryStatus.FAILED] },
        attemptCount: { lt: DEFAULT_EMAIL_MAX_ATTEMPTS },
        bouncedAt: null,
        complainedAt: null,
        NOT: { providerEventStatus: EMAIL_SUPPRESSED_STATUS },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
    });
    const suppressedOutboxCount = await this.prisma.emailOutbox.count({
      where: {
        organizationId,
        providerEventStatus: EMAIL_SUPPRESSED_STATUS,
      },
    });
    const activeSuppressionCount = await this.prisma.emailSuppression.count({
      where: {
        organizationId,
        active: true,
      },
    });
    const blockers = [];
    const warnings = [
      "Retry processing is disabled by default and must be explicitly enabled for a controlled worker or admin run.",
      "Retry processing updates existing outbox metadata only; it must not create customer-facing outbox records.",
    ];

    if (!this.retryProcessorEnabled) {
      blockers.push("Email retry processor is disabled by default.");
    }

    return {
      readOnly: true,
      noMutation: true,
      noCustomerEmailSent: true,
      executionEnabled: this.retryProcessorEnabled,
      retryWorkerConfigured: this.retryProcessorEnabled,
      retryProcessorEnabled: this.retryProcessorEnabled,
      pendingCount,
      failedRetryableCount,
      blockedCount,
      nextAttemptCount,
      suppressedOutboxCount,
      activeSuppressionCount,
      maxAttemptsPolicy: {
        defaultMaxAttempts: DEFAULT_EMAIL_MAX_ATTEMPTS,
        maxBatchLimit: MAX_EMAIL_RETRY_PROCESS_LIMIT,
      },
      productionReadyContribution: this.retryProcessorEnabled,
      blockers,
      warnings,
    };
  }

  async retryWorkerPlan(organizationId: string) {
    const retryPlan = await this.retryPlan(organizationId);
    const schedulerProvider = this.retryWorkerSchedulerProvider;
    const workerEnabled = this.retryWorkerEnabled;
    const workerConfigured = workerEnabled && this.retryProcessorEnabled && schedulerProvider !== "NONE";
    const blockers = [
      ...(workerConfigured ? [] : ["Scheduled email retry worker is not configured."]),
      ...(workerEnabled ? [] : ["Email retry worker execution is disabled by default."]),
      ...(this.retryProcessorEnabled ? [] : ["Email retry processor is disabled by default."]),
      ...(schedulerProvider === "NONE" ? ["Email retry worker scheduler provider is not configured."] : []),
    ];

    return {
      readOnly: true,
      noMutation: true,
      noCustomerEmailSent: true,
      workerConfigured,
      workerEnabled,
      schedulerProvider,
      retryProcessorEnabled: this.retryProcessorEnabled,
      pendingCount: retryPlan.pendingCount,
      dueRetryCount: retryPlan.nextAttemptCount,
      suppressedCount: retryPlan.suppressedOutboxCount,
      activeSuppressionCount: retryPlan.activeSuppressionCount,
      blockedCount: retryPlan.blockedCount,
      maxAttemptsPolicy: retryPlan.maxAttemptsPolicy,
      recommendedSchedule: "Run at most one worker every 5 minutes with a small batch limit after provider, suppression, and monitoring gates are reviewed.",
      productionReadyContribution: workerConfigured,
      blockers,
      warnings: [
        "This is a scheduled-worker readiness plan only; it sends no email, mutates no outbox rows, and calls no provider.",
        "Worker execution remains disabled until LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED and the retry processor gate are explicitly enabled.",
      ],
    };
  }

  async retryWorkerRun(organizationId: string, actorUserId: string, dto: RunEmailRetryWorkerDto = {}) {
    const plan = await this.retryWorkerPlan(organizationId);
    if (!this.retryWorkerEnabled) {
      return {
        status: "SKIPPED_DISABLED" satisfies EmailRetryWorkerRunStatus,
        executionEnabled: false,
        executionAttempted: false,
        noEmailSent: true,
        noCustomerEmailSent: true,
        noMutation: true,
        provider: this.provider.provider,
        plan,
        redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      };
    }

    if (!this.retryProcessorEnabled) {
      return {
        status: "SKIPPED_PROCESSOR_DISABLED" satisfies EmailRetryWorkerRunStatus,
        executionEnabled: true,
        executionAttempted: false,
        noEmailSent: true,
        noCustomerEmailSent: true,
        noMutation: true,
        provider: this.provider.provider,
        plan,
        redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      };
    }

    const result = await this.retryProcess(organizationId, actorUserId, dto);
    return {
      ...result,
      workerEnabled: true,
      workerConfigured: plan.workerConfigured,
      schedulerProvider: plan.schedulerProvider,
      plan,
    };
  }

  async monitoringPlan(organizationId: string) {
    const evidence = await this.prisma.emailDeliveryMonitoringEvidence.findMany({
      where: { organizationId },
      select: EMAIL_DELIVERY_MONITORING_EVIDENCE_SELECT,
    });
    const verifiedEvidenceTypes = REQUIRED_MONITORING_EVIDENCE_TYPES.filter((evidenceType) =>
      evidence.some(
        (entry) =>
          entry.evidenceType === evidenceType &&
          entry.status === EmailDeliveryMonitoringEvidenceStatus.VERIFIED &&
          entry.productionReadyContribution,
      ),
    );
    const missingEvidenceTypes = REQUIRED_MONITORING_EVIDENCE_TYPES.filter((evidenceType) => !verifiedEvidenceTypes.includes(evidenceType));
    const evidenceStatus: MonitoringEvidenceStatus =
      missingEvidenceTypes.length === 0 ? "READY_FOR_REVIEW" : verifiedEvidenceTypes.length > 0 ? "PARTIAL" : "BLOCKED";
    const retryThroughputMonitoringConfigured = verifiedEvidenceTypes.includes(EmailDeliveryMonitoringEvidenceType.RETRY_WORKER);
    const bounceAlertThresholdConfigured = verifiedEvidenceTypes.includes(EmailDeliveryMonitoringEvidenceType.BOUNCE_ALERTS);
    const complaintAlertThresholdConfigured = verifiedEvidenceTypes.includes(EmailDeliveryMonitoringEvidenceType.COMPLAINT_ALERTS);
    const suppressionTrendMonitoringConfigured = verifiedEvidenceTypes.includes(EmailDeliveryMonitoringEvidenceType.SUPPRESSION_TRENDS);
    const deliveryDashboardConfigured = verifiedEvidenceTypes.includes(EmailDeliveryMonitoringEvidenceType.DELIVERY_DASHBOARD);
    const providerWebhookHealthMonitoringConfigured = verifiedEvidenceTypes.includes(EmailDeliveryMonitoringEvidenceType.PROVIDER_WEBHOOK_HEALTH);
    const monitoringConfigured =
      evidenceStatus === "READY_FOR_REVIEW" &&
      retryThroughputMonitoringConfigured &&
      suppressionTrendMonitoringConfigured &&
      deliveryDashboardConfigured &&
      providerWebhookHealthMonitoringConfigured;
    const alertingConfigured = bounceAlertThresholdConfigured && complaintAlertThresholdConfigured;

    return {
      readOnly: true,
      noMutation: true,
      noCustomerEmailSent: true,
      metadataOnly: true,
      monitoringConfigured,
      alertingConfigured,
      retryThroughputMonitoringConfigured,
      bounceAlertThresholdConfigured,
      complaintAlertThresholdConfigured,
      suppressionTrendMonitoringConfigured,
      deliveryDashboardConfigured,
      providerWebhookHealthMonitoringConfigured,
      evidenceStatus,
      productionReadyContribution: monitoringConfigured && alertingConfigured,
      requiredEvidenceTypes: REQUIRED_MONITORING_EVIDENCE_TYPES,
      verifiedEvidenceTypes,
      missingEvidenceTypes,
      blockers: [
        ...(retryThroughputMonitoringConfigured ? [] : ["Retry throughput monitoring evidence is missing."]),
        ...(bounceAlertThresholdConfigured ? [] : ["Bounce alert threshold evidence is missing."]),
        ...(complaintAlertThresholdConfigured ? [] : ["Complaint alert threshold evidence is missing."]),
        ...(suppressionTrendMonitoringConfigured ? [] : ["Suppression trend monitoring evidence is missing."]),
        ...(deliveryDashboardConfigured ? [] : ["Delivery dashboard evidence is missing."]),
        ...(providerWebhookHealthMonitoringConfigured ? [] : ["Provider webhook health monitoring evidence is missing."]),
      ],
      warnings: [
        "Monitoring evidence is manual metadata capture only. No external monitoring tool is called.",
        "Alert thresholds are not active until verified monitoring evidence exists and production monitoring is configured outside this endpoint.",
      ],
    };
  }

  async providerEventsPlan(organizationId: string) {
    const monitoringPlan = await this.monitoringPlan(organizationId);
    const webhookPlan = await this.providerWebhookPlan(organizationId);
    return {
      readOnly: true,
      noMutation: true,
      noCustomerEmailSent: true,
      metadataOnly: true,
      mockIngestionAvailable: true,
      providerEventIngestionReady: webhookPlan.productionReadyContribution,
      bounceWebhookConfigured: webhookPlan.webhookVerificationConfigured,
      bounceWebhookSignatureVerified: webhookPlan.providerWebhookSignatureVerified,
      webhookVerificationConfigured: webhookPlan.webhookVerificationConfigured,
      webhookVerificationEnabled: webhookPlan.webhookVerificationEnabled,
      webhookSecretConfigured: webhookPlan.webhookSecretConfigured,
      monitoringConfigured: monitoringPlan.monitoringConfigured,
      alertingConfigured: monitoringPlan.alertingConfigured,
      bounceAlertThresholdConfigured: monitoringPlan.bounceAlertThresholdConfigured,
      complaintAlertThresholdConfigured: monitoringPlan.complaintAlertThresholdConfigured,
      providerWebhookAlertsReady: monitoringPlan.providerWebhookHealthMonitoringConfigured && monitoringPlan.alertingConfigured,
      productionReadyContribution: false,
      blockers: [
        ...(webhookPlan.webhookVerificationConfigured ? [] : ["Signed provider webhook verification is not configured."]),
        ...(webhookPlan.providerWebhookSignatureVerified ? [] : ["No verified signed provider webhook event has been captured."]),
        ...(monitoringPlan.monitoringConfigured ? [] : ["Email monitoring is not configured."]),
        ...(monitoringPlan.alertingConfigured ? [] : ["Email alerting is not configured."]),
      ],
      warnings: [
        "Mock provider events are for local/admin readiness evidence only.",
        "Provider-agnostic webhook verification is test-only until a production provider adapter and signature contract are reviewed.",
      ],
    };
  }

  async providerWebhookPlan(organizationId: string) {
    const verifiedEventCount = await this.prisma.emailProviderEvent.count({
      where: { organizationId, signatureVerified: true },
    });
    const allowedProviders = this.allowedWebhookProviders;
    const webhookVerificationEnabled = this.webhookVerificationEnabled;
    const webhookSecretConfigured = this.webhookSecretConfigured;
    const allowedProvidersConfigured = allowedProviders.length > 0;
    const webhookVerificationConfigured = webhookVerificationEnabled && webhookSecretConfigured && allowedProvidersConfigured;
    const providerWebhookSignatureVerified = verifiedEventCount > 0;
    const blockers = [];

    if (!webhookVerificationEnabled) {
      blockers.push("Signed provider webhook verification is disabled by default.");
    }
    if (!webhookSecretConfigured) {
      blockers.push("Email provider webhook secret is not configured.");
    }
    if (!allowedProvidersConfigured) {
      blockers.push("Allowed email webhook providers are not configured.");
    }
    if (!providerWebhookSignatureVerified) {
      blockers.push("No verified signed provider webhook event has been captured.");
    }

    return {
      readOnly: true,
      noMutation: true,
      noCustomerEmailSent: true,
      metadataOnly: true,
      webhookVerificationConfigured,
      webhookVerificationEnabled,
      webhookSecretConfigured,
      allowedProvidersConfigured,
      allowedProviders,
      signatureVerificationMode: EMAIL_WEBHOOK_SIGNATURE_MODE,
      rawHeadersReturned: false,
      rawProviderPayloadReturned: false,
      webhookSecretReturned: false,
      providerWebhookSignatureVerified,
      verifiedEventCount,
      productionReadyContribution: webhookVerificationConfigured && providerWebhookSignatureVerified,
      blockers,
      warnings: [
        "Webhook verification is disabled by default and uses a provider-agnostic HMAC test verifier in this phase.",
        "No raw webhook headers, provider payloads, auth headers, tokens, provider secrets, or webhook secrets are returned.",
      ],
    };
  }

  async retryProcess(organizationId: string, actorUserId: string, dto: RunEmailRetryProcessDto = {}) {
    const plan = await this.retryPlan(organizationId);
    if (!this.retryProcessorEnabled) {
      return {
        status: "SKIPPED_DISABLED" satisfies EmailRetryProcessStatus,
        executionEnabled: false,
        executionAttempted: false,
        noEmailSent: true,
        noCustomerEmailSent: true,
        noMutation: true,
        provider: this.provider.provider,
        plan,
        redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      };
    }

    const limit = clampRetryLimit(dto.limit);
    const now = new Date();
    const candidates = await this.prisma.emailOutbox.findMany({
      where: {
        organizationId,
        status: { in: [EmailDeliveryStatus.QUEUED, EmailDeliveryStatus.FAILED] },
        bouncedAt: null,
        complainedAt: null,
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      take: limit,
      select: EMAIL_OUTBOX_RETRY_SELECT,
    });
    const retryable = candidates.filter((candidate) => candidate.attemptCount < candidate.maxAttempts);
    let blockedCount = candidates.length - retryable.length;
    const lockedBy = `email-retry:${actorUserId}:${Date.now()}`;
    const attempted = [];
    let sentCount = 0;
    let failedCount = 0;
    let suppressedCount = 0;

    for (const email of retryable) {
      const suppression = email.organizationId ? await this.findActiveSuppression(email.organizationId, email.toEmail) : null;
      if (suppression) {
        suppressedCount += 1;
        blockedCount += 1;
        await this.prisma.emailOutbox.update({
          where: { id: email.id },
          data: {
            status: EmailDeliveryStatus.FAILED,
            providerEventStatus: EMAIL_SUPPRESSED_STATUS,
            errorMessage: "Email delivery blocked by active suppression.",
            lastErrorRedacted: "Email delivery blocked by active suppression.",
            nextAttemptAt: null,
            retryLockedAt: null,
            retryLockedBy: null,
          },
          select: EMAIL_OUTBOX_LIST_SELECT,
        });
        continue;
      }

      await this.prisma.emailOutbox.update({
        where: { id: email.id },
        data: {
          retryLockedAt: new Date(),
          retryLockedBy: lockedBy,
        },
        select: EMAIL_OUTBOX_LIST_SELECT,
      });

      const result = await this.provider.send({
        organizationId: email.organizationId,
        toEmail: email.toEmail,
        fromEmail: email.fromEmail,
        subject: email.subject,
        templateType: email.templateType,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
      });
      const attemptCount = email.attemptCount + 1;
      const errorMessage = redactEmailDiagnosticText(result.errorMessage);
      const failed = result.status === EmailDeliveryStatus.FAILED;
      if (failed) {
        failedCount += 1;
      } else {
        sentCount += 1;
      }

      const updated = await this.prisma.emailOutbox.update({
        where: { id: email.id },
        data: {
          attemptCount,
          lastAttemptAt: new Date(),
          status: result.status,
          provider: result.provider,
          providerMessageId: result.providerMessageId ?? email.providerMessageId ?? null,
          errorMessage,
          lastErrorRedacted: errorMessage,
          sentAt: result.sentAt ?? (failed ? email.sentAt : new Date()),
          nextAttemptAt: failed && attemptCount < email.maxAttempts ? nextRetryAttemptAt(attemptCount) : null,
          retryLockedAt: null,
          retryLockedBy: null,
        },
        select: EMAIL_OUTBOX_LIST_SELECT,
      });

      attempted.push({
        id: updated.id,
        status: updated.status,
        provider: updated.provider,
        attemptCount,
        providerMessageId: updated.providerMessageId ? "present" : null,
        errorMessage: redactEmailDiagnosticText(updated.errorMessage),
        nextAttemptAt: updated.nextAttemptAt,
      });
    }

    const response = {
      status: "ATTEMPTED" satisfies EmailRetryProcessStatus,
      executionEnabled: true,
      executionAttempted: true,
      noCustomerEmailSentByDefault: true,
      noRealCustomerEmailSent: !this.provider.readiness().realSendingEnabled,
      customerEmailSendAttempted: attempted.length > 0,
      noMutation: false,
      noOutboxRecordCreated: true,
      provider: this.provider.provider,
      attemptedCount: attempted.length,
      sentCount,
      failedCount,
      blockedCount,
      suppressedCount,
      attempted,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
    };

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_RETRY_ATTEMPTED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_OUTBOX,
      entityId: organizationId,
      after: {
        attemptedCount: response.attemptedCount,
        sentCount: response.sentCount,
        failedCount: response.failedCount,
        blockedCount: response.blockedCount,
        suppressedCount: response.suppressedCount,
        provider: response.provider,
      },
    });

    return response;
  }

  async receiveMockProviderEvent(organizationId: string, actorUserId: string, dto: ReceiveMockEmailProviderEventDto) {
    this.assertProviderEventContainsNoSecrets(dto.payloadSummaryJson ?? {});
    const emailOutbox = dto.emailOutboxId
      ? await this.prisma.emailOutbox.findFirst({
          where: { id: dto.emailOutboxId, organizationId },
          select: { id: true, organizationId: true, toEmail: true },
        })
      : null;

    if (dto.emailOutboxId && !emailOutbox) {
      throw new NotFoundException("Email outbox record not found.");
    }

    const event = await this.prisma.emailProviderEvent.create({
      data: {
        organizationId,
        emailOutboxId: emailOutbox?.id ?? null,
        provider: normalizeOptionalText(dto.provider) ?? "mock",
        eventType: dto.eventType,
        providerMessageIdRedacted: dto.providerMessageId ? "present" : null,
        payloadSummaryJson: sanitizeEvidenceSummary(dto.payloadSummaryJson ?? {}),
        signatureVerified: false,
        productionReadyContribution: false,
      },
      select: EMAIL_PROVIDER_EVENT_SELECT,
    });

    if (emailOutbox) {
      await this.prisma.emailOutbox.update({
        where: { id: emailOutbox.id },
        data: providerEventOutboxUpdate(dto.eventType),
        select: EMAIL_OUTBOX_LIST_SELECT,
      });
    }
    const suppression = await this.createEventSuppressionIfNeeded({
      organizationId,
      actorUserId,
      eventId: event.id,
      eventType: dto.eventType,
      provider: normalizeOptionalText(dto.provider) ?? "mock",
      recipientEmail: dto.recipientEmail ?? emailOutbox?.toEmail,
      localMock: true,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_PROVIDER_EVENT_RECEIVED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_PROVIDER_EVENT,
      entityId: event.id,
      after: event,
    });

    return {
      metadataOnly: true,
      noEmailSent: true,
      noCustomerEmail: true,
      noOutboxRecordCreated: true,
      signatureVerified: false,
      productionReadyContribution: false,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      event,
      suppression,
    };
  }

  async receiveSignedProviderWebhook(organizationId: string, actorUserId: string, dto: ReceiveEmailProviderWebhookDto) {
    const plan = await this.providerWebhookPlan(organizationId);
    if (!plan.webhookVerificationEnabled) {
      return {
        status: "REJECTED_UNVERIFIED" satisfies EmailWebhookProcessStatus,
        executionEnabled: false,
        executionAttempted: false,
        noEmailSent: true,
        noCustomerEmail: true,
        noMutation: true,
        noOutboxMutation: true,
        noEventPersisted: true,
        reason: "Email provider webhook verification is disabled by default.",
        redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
        plan,
      };
    }
    if (!this.webhookSecretConfigured) {
      throw new BadRequestException("Email provider webhook secret is not configured.");
    }

    const provider = normalizeOptionalText(dto.provider)?.toLowerCase() ?? "";
    if (!provider) {
      throw new BadRequestException("Email provider webhook requires a provider.");
    }
    if (this.allowedWebhookProviders.length > 0 && !this.allowedWebhookProviders.includes(provider)) {
      throw new BadRequestException("Email provider is not allowlisted for webhook ingestion.");
    }
    if (!isProviderEventType(dto.eventType)) {
      throw new BadRequestException("Email provider webhook event type is not supported.");
    }
    this.assertProviderEventContainsNoSecrets(dto.payloadSummaryJson ?? {});
    if (!this.verifyProviderWebhookSignature(dto)) {
      throw new BadRequestException("Email provider webhook signature is invalid.");
    }

    const emailOutbox = dto.emailOutboxId
      ? await this.prisma.emailOutbox.findFirst({
          where: { id: dto.emailOutboxId, organizationId },
          select: { id: true, organizationId: true, toEmail: true },
        })
      : null;
    if (dto.emailOutboxId && !emailOutbox) {
      throw new NotFoundException("Email outbox record not found.");
    }

    const recipientEmail = normalizeOptionalText(dto.recipientEmail)?.toLowerCase();
    if (recipientEmail && !isEmailAddress(recipientEmail)) {
      throw new BadRequestException("Email provider webhook recipient must be a valid email address.");
    }

    const event = await this.prisma.emailProviderEvent.create({
      data: {
        organizationId,
        emailOutboxId: emailOutbox?.id ?? null,
        provider,
        eventType: dto.eventType,
        providerMessageIdRedacted: dto.providerMessageId ? "present" : null,
        payloadSummaryJson: sanitizeEvidenceSummary({
          ...(dto.payloadSummaryJson ?? {}),
          ...(recipientEmail || emailOutbox?.toEmail ? { recipientMasked: maskEmailAddress(recipientEmail ?? emailOutbox?.toEmail ?? "") } : {}),
        }),
        signatureVerified: true,
        productionReadyContribution: true,
      },
      select: EMAIL_PROVIDER_EVENT_SELECT,
    });

    if (emailOutbox) {
      await this.prisma.emailOutbox.update({
        where: { id: emailOutbox.id },
        data: providerEventOutboxUpdate(dto.eventType),
        select: EMAIL_OUTBOX_LIST_SELECT,
      });
    }
    const suppression = await this.createEventSuppressionIfNeeded({
      organizationId,
      actorUserId,
      eventId: event.id,
      eventType: dto.eventType,
      provider,
      recipientEmail: recipientEmail ?? emailOutbox?.toEmail,
      localMock: false,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_PROVIDER_EVENT_RECEIVED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_PROVIDER_EVENT,
      entityId: event.id,
      after: {
        ...event,
        suppressionId: suppression?.id ?? null,
      },
    });

    return {
      status: "ACCEPTED_VERIFIED" satisfies EmailWebhookProcessStatus,
      metadataOnly: true,
      noEmailSent: true,
      noCustomerEmail: true,
      noOutboxRecordCreated: true,
      signatureVerified: true,
      productionReadyContribution: true,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      event,
      suppression,
    };
  }

  async runDiagnostics(input: RunDiagnosticsInput) {
    const plan = this.diagnosticsPlan(input.toEmail);
    if (!this.diagnosticsExecutionEnabled) {
      return {
        status: "SKIPPED_DISABLED",
        executionEnabled: false,
        executionAttempted: false,
        noEmailSent: true,
        noCustomerEmailSent: true,
        noMutation: true,
        provider: this.provider.provider,
        message: "Email diagnostics sending is disabled by default.",
        redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
        plan,
      };
    }

    const toEmail = input.toEmail?.trim().toLowerCase();
    if (!toEmail) {
      throw new BadRequestException("Diagnostic recipient is required when diagnostics sending is enabled.");
    }
    if (!isEmailAddress(toEmail)) {
      throw new BadRequestException("Diagnostic recipient must be a valid email address.");
    }
    if (!this.isAllowedDiagnosticRecipient(toEmail)) {
      throw new BadRequestException("Diagnostic recipient is not allowed.");
    }

    const result = await this.provider.send({
      organizationId: input.organizationId,
      toEmail,
      fromEmail: this.fromEmail,
      subject: "LedgerByte diagnostic test email",
      templateType: EmailTemplateType.TEST_EMAIL,
      bodyText:
        "This LedgerByte diagnostic message checks email provider delivery. It contains no tenant records, invoice details, contact details, or business data.",
      bodyHtml:
        "<p>This LedgerByte diagnostic message checks email provider delivery. It contains no tenant records, invoice details, contact details, or business data.</p>",
    });

    return {
      status: "ATTEMPTED",
      executionEnabled: true,
      executionAttempted: true,
      noEmailSent: result.status !== EmailDeliveryStatus.SENT_PROVIDER,
      noCustomerEmailSent: true,
      noMutation: true,
      provider: result.provider,
      recipient: maskEmailAddress(toEmail),
      delivery: {
        provider: result.provider,
        status: result.status,
        providerMessageId: result.providerMessageId ? "present" : null,
        errorMessage: redactEmailDiagnosticText(result.errorMessage),
        sentAt: result.sentAt?.toISOString() ?? null,
      },
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      plan,
    };
  }

  async sendOrganizationInvite(input: SendOrganizationInviteInput) {
    const template = buildOrganizationInviteEmail({
      organizationName: input.organizationName,
      roleName: input.roleName,
      acceptUrl: input.acceptUrl,
      expiresInText: "7 days",
    });

    return this.send({
      organizationId: input.organizationId,
      toEmail: input.toEmail,
      fromEmail: this.fromEmail,
      subject: template.subject,
      templateType: EmailTemplateType.ORGANIZATION_INVITE,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
    });
  }

  async sendPasswordReset(input: SendPasswordResetInput) {
    const template = buildPasswordResetEmail({
      resetUrl: input.resetUrl,
      expiresInText: "1 hour",
    });

    return this.send({
      organizationId: input.organizationId ?? null,
      toEmail: input.toEmail,
      fromEmail: this.fromEmail,
      subject: template.subject,
      templateType: EmailTemplateType.PASSWORD_RESET,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
    });
  }

  async sendTestEmail(input: SendTestEmailInput) {
    const template = buildTestEmail({ provider: this.provider.provider });

    return this.send({
      organizationId: input.organizationId,
      toEmail: input.toEmail,
      fromEmail: this.fromEmail,
      subject: template.subject,
      templateType: EmailTemplateType.TEST_EMAIL,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
    });
  }

  async createApGeneratedDocumentOutbox(input: CreateApGeneratedDocumentOutboxInput) {
    const document = await this.prisma.generatedDocument.findFirst({
      where: {
        id: input.generatedDocumentId,
        organizationId: input.organizationId,
      },
      select: AP_GENERATED_DOCUMENT_EMAIL_DOCUMENT_SELECT,
    });

    if (!document) {
      throw new NotFoundException("Generated document not found.");
    }
    if (document.status !== GeneratedDocumentStatus.GENERATED) {
      throw new BadRequestException("Generated document must be generated before AP email outbox creation.");
    }

    const sourceConfig = apGeneratedDocumentEmailSourceConfig(document.sourceType, document.documentType);
    if (!sourceConfig) {
      throw new BadRequestException("Generated document is not supported for AP email outbox.");
    }

    this.assertApGeneratedDocumentEmailPermissions(input.permissions, sourceConfig.requiredPermission);
    const source = await this.findApGeneratedDocumentEmailSource(
      input.organizationId,
      document.sourceType as ApGeneratedDocumentEmailSourceType,
      document.sourceId,
    );
    const recipientEmail = normalizeApGeneratedDocumentEmailRecipient(input.dto.recipientEmail ?? source.recipientEmail);
    if (!recipientEmail) {
      throw new BadRequestException("AP generated document email requires a recipient email.");
    }

    const email = await this.prisma.emailOutbox.create({
      data: {
        organizationId: input.organizationId,
        toEmail: recipientEmail,
        fromEmail: this.fromEmail,
        subject: `LedgerByte AP generated document ${document.documentNumber}`,
        templateType: EmailTemplateType.AP_GENERATED_DOCUMENT,
        bodyText: [
          "A LedgerByte AP generated document is ready for local review.",
          `Document: ${document.documentNumber}`,
          `Attachment: ${document.filename}`,
          "No real email was sent. This outbox row is local metadata only.",
        ].join("\n"),
        bodyHtml: null,
        status: EmailDeliveryStatus.SENT_MOCK,
        provider: AP_GENERATED_DOCUMENT_EMAIL_PROVIDER,
        providerMessageId: null,
        errorMessage: null,
        sentAt: null,
        attemptCount: 0,
        maxAttempts: 0,
        nextAttemptAt: null,
        lastAttemptAt: null,
        lastErrorRedacted: null,
        providerEventStatus: null,
        generatedDocumentId: document.id,
        sourceType: document.sourceType,
        sourceId: document.sourceId,
        attachmentFilename: document.filename,
        attachmentMimeType: document.mimeType,
        attachmentSizeBytes: document.sizeBytes,
        attachmentContentHash: document.contentHash,
      },
      select: EMAIL_OUTBOX_LIST_SELECT,
    });

    const response = {
      localOnly: true,
      noEmailSent: true,
      providerCalled: false,
      provider: AP_GENERATED_DOCUMENT_EMAIL_PROVIDER,
      emailOutbox: apGeneratedDocumentEmailOutboxResponse(email),
      generatedDocument: {
        id: document.id,
        documentType: document.documentType,
        sourceType: document.sourceType,
        sourceId: document.sourceId,
        documentNumber: document.documentNumber,
        filename: document.filename,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        contentHash: document.contentHash,
      },
      redaction: {
        noBodyReturned: true,
        noPdfBodyReturned: true,
        noAttachmentBodyReturned: true,
        noProviderPayload: true,
      },
    };

    await this.auditLogService?.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "CREATE",
      entityType: AUDIT_ENTITY_TYPES.EMAIL_OUTBOX,
      entityId: email.id,
      after: {
        emailOutbox: response.emailOutbox,
        generatedDocument: response.generatedDocument,
        providerCalled: false,
        noEmailSent: true,
      },
    });

    return response;
  }

  async listSuppressions(organizationId: string) {
    return {
      metadataOnly: true,
      noCustomerEmail: true,
      noEmailSent: true,
      noOutboxRecord: true,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      suppressions: await this.prisma.emailSuppression.findMany({
        where: { organizationId },
        orderBy: [{ active: "desc" }, { createdAt: "desc" }],
        select: EMAIL_SUPPRESSION_SELECT,
      }),
    };
  }

  async createSuppression(organizationId: string, actorUserId: string, dto: CreateEmailSuppressionDto) {
    this.assertSuppressionInputContainsNoSecrets(dto);
    const email = normalizeEmailAddress(dto.email);
    const suppression = await this.createOrActivateSuppression({
      organizationId,
      actorUserId,
      email,
      reason: dto.reason ?? EmailSuppressionReason.MANUAL,
      sourceProvider: null,
      providerEventId: null,
      note: normalizeOptionalText(dto.note),
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_SUPPRESSION_CREATED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_SUPPRESSION,
      entityId: suppression.id,
      after: suppression,
    });

    return this.suppressionResponse(suppression);
  }

  async revokeSuppression(organizationId: string, actorUserId: string, id: string, dto: RevokeEmailSuppressionDto = {}) {
    this.assertSuppressionInputContainsNoSecrets(dto);
    const existing = await this.prisma.emailSuppression.findFirst({
      where: { id, organizationId },
      select: EMAIL_SUPPRESSION_SELECT,
    });
    if (!existing) {
      throw new NotFoundException("Email suppression not found.");
    }
    if (!existing.active) {
      throw new BadRequestException("Email suppression is already revoked.");
    }

    const revoked = await this.prisma.emailSuppression.update({
      where: { id },
      data: {
        active: false,
        revokedById: actorUserId,
        revokedAt: new Date(),
        note: normalizeOptionalText(dto.note) ?? existing.note,
      },
      select: EMAIL_SUPPRESSION_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_SUPPRESSION_REVOKED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_SUPPRESSION,
      entityId: revoked.id,
      before: existing,
      after: revoked,
    });

    return this.suppressionResponse(revoked);
  }

  async listMonitoringEvidence(organizationId: string) {
    return {
      metadataOnly: true,
      noCustomerEmail: true,
      noEmailSent: true,
      noOutboxRecord: true,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      evidence: await this.prisma.emailDeliveryMonitoringEvidence.findMany({
        where: { organizationId },
        orderBy: [{ evidenceType: "asc" }, { createdAt: "desc" }],
        select: EMAIL_DELIVERY_MONITORING_EVIDENCE_SELECT,
      }),
    };
  }

  async createMonitoringEvidence(organizationId: string, actorUserId: string, dto: CreateEmailDeliveryMonitoringEvidenceDto) {
    this.assertMonitoringEvidenceContainsNoSecrets(dto);
    const provider = normalizeOptionalText(dto.provider);
    const note = normalizeOptionalText(dto.note);

    await this.prisma.emailDeliveryMonitoringEvidence.updateMany({
      where: {
        organizationId,
        evidenceType: dto.evidenceType,
        status: { in: [EmailDeliveryMonitoringEvidenceStatus.DRAFT, EmailDeliveryMonitoringEvidenceStatus.VERIFIED] },
      },
      data: { status: EmailDeliveryMonitoringEvidenceStatus.SUPERSEDED, productionReadyContribution: false },
    });

    const evidence = await this.prisma.emailDeliveryMonitoringEvidence.create({
      data: {
        organizationId,
        createdById: actorUserId,
        evidenceType: dto.evidenceType,
        provider,
        evidenceSummaryJson: sanitizeEvidenceSummary(dto.evidenceSummaryJson),
        note,
        status: EmailDeliveryMonitoringEvidenceStatus.DRAFT,
        productionReadyContribution: false,
      },
      select: EMAIL_DELIVERY_MONITORING_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_DELIVERY_MONITORING_EVIDENCE_CREATED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_DELIVERY_MONITORING_EVIDENCE,
      entityId: evidence.id,
      after: evidence,
    });

    return this.monitoringEvidenceResponse(evidence);
  }

  async verifyMonitoringEvidence(
    organizationId: string,
    actorUserId: string,
    id: string,
    dto: VerifyEmailDeliveryMonitoringEvidenceDto = {},
  ) {
    const existing = await this.prisma.emailDeliveryMonitoringEvidence.findFirst({
      where: { id, organizationId },
      select: EMAIL_DELIVERY_MONITORING_EVIDENCE_SELECT,
    });

    if (!existing) {
      throw new NotFoundException("Email delivery monitoring evidence not found.");
    }
    if (existing.status !== EmailDeliveryMonitoringEvidenceStatus.DRAFT) {
      throw new BadRequestException("Only draft email delivery monitoring evidence can be verified.");
    }
    this.assertMonitoringEvidenceContainsNoSecrets(existing);
    this.assertMonitoringEvidenceContainsNoSecrets(dto);

    const contributionRequested = dto.productionReadyContribution ?? isProductionReadyMonitoringEvidenceType(existing.evidenceType);
    const productionReadyContribution = contributionRequested && isProductionReadyMonitoringEvidenceType(existing.evidenceType);
    const verified = await this.prisma.emailDeliveryMonitoringEvidence.update({
      where: { id },
      data: {
        status: EmailDeliveryMonitoringEvidenceStatus.VERIFIED,
        verifiedById: actorUserId,
        verifiedAt: new Date(),
        note: normalizeOptionalText(dto.note) ?? existing.note,
        productionReadyContribution,
      },
      select: EMAIL_DELIVERY_MONITORING_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_DELIVERY_MONITORING_EVIDENCE_VERIFIED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_DELIVERY_MONITORING_EVIDENCE,
      entityId: verified.id,
      before: existing,
      after: verified,
    });

    return this.monitoringEvidenceResponse(verified);
  }

  async revokeMonitoringEvidence(
    organizationId: string,
    actorUserId: string,
    id: string,
    dto: RevokeEmailDeliveryMonitoringEvidenceDto = {},
  ) {
    const existing = await this.prisma.emailDeliveryMonitoringEvidence.findFirst({
      where: { id, organizationId },
      select: EMAIL_DELIVERY_MONITORING_EVIDENCE_SELECT,
    });

    if (!existing) {
      throw new NotFoundException("Email delivery monitoring evidence not found.");
    }
    if (existing.status === EmailDeliveryMonitoringEvidenceStatus.REVOKED) {
      throw new BadRequestException("Email delivery monitoring evidence is already revoked.");
    }
    this.assertMonitoringEvidenceContainsNoSecrets(dto);

    const revoked = await this.prisma.emailDeliveryMonitoringEvidence.update({
      where: { id },
      data: {
        status: EmailDeliveryMonitoringEvidenceStatus.REVOKED,
        revokedById: actorUserId,
        revokedAt: new Date(),
        note: normalizeOptionalText(dto.note) ?? existing.note,
        productionReadyContribution: false,
      },
      select: EMAIL_DELIVERY_MONITORING_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_DELIVERY_MONITORING_EVIDENCE_REVOKED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_DELIVERY_MONITORING_EVIDENCE,
      entityId: revoked.id,
      before: existing,
      after: revoked,
    });

    return this.monitoringEvidenceResponse(revoked);
  }

  async listSenderDomainEvidence(organizationId: string) {
    return {
      metadataOnly: true,
      noCustomerEmail: true,
      noEmailSent: true,
      noOutboxRecord: true,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      evidence: await this.prisma.emailSenderDomainEvidence.findMany({
        where: { organizationId },
        orderBy: [{ domain: "asc" }, { evidenceType: "asc" }, { createdAt: "desc" }],
        select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
      }),
    };
  }

  async createSenderDomainEvidence(organizationId: string, actorUserId: string, dto: CreateEmailSenderDomainEvidenceDto) {
    this.assertEvidenceContainsNoSecrets(dto);
    const domain = normalizeDomain(dto.domain);
    const provider = normalizeOptionalText(dto.provider);
    const note = normalizeOptionalText(dto.note);

    await this.prisma.emailSenderDomainEvidence.updateMany({
      where: {
        organizationId,
        domain,
        evidenceType: dto.evidenceType,
        status: { in: [EmailSenderDomainEvidenceStatus.DRAFT, EmailSenderDomainEvidenceStatus.VERIFIED] },
      },
      data: { status: EmailSenderDomainEvidenceStatus.SUPERSEDED, productionReadyContribution: false },
    });

    const evidence = await this.prisma.emailSenderDomainEvidence.create({
      data: {
        organizationId,
        createdById: actorUserId,
        domain,
        evidenceType: dto.evidenceType,
        provider,
        evidenceSummaryJson: sanitizeEvidenceSummary(dto.evidenceSummaryJson),
        note,
        status: EmailSenderDomainEvidenceStatus.DRAFT,
        productionReadyContribution: false,
      },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_SENDER_DOMAIN_EVIDENCE_CREATED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_SENDER_DOMAIN_EVIDENCE,
      entityId: evidence.id,
      after: evidence,
    });

    return this.senderDomainEvidenceResponse(evidence);
  }

  async verifySenderDomainEvidence(organizationId: string, actorUserId: string, id: string, dto: VerifyEmailSenderDomainEvidenceDto = {}) {
    const existing = await this.prisma.emailSenderDomainEvidence.findFirst({
      where: { id, organizationId },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    if (!existing) {
      throw new NotFoundException("Email sender-domain evidence not found.");
    }
    if (existing.status !== EmailSenderDomainEvidenceStatus.DRAFT) {
      throw new BadRequestException("Only draft sender-domain evidence can be verified.");
    }
    this.assertEvidenceContainsNoSecrets(existing);
    this.assertEvidenceContainsNoSecrets(dto);

    const contributionRequested = dto.productionReadyContribution ?? isProductionReadyEvidenceType(existing.evidenceType);
    const productionReadyContribution = contributionRequested && isProductionReadyEvidenceType(existing.evidenceType);
    const verified = await this.prisma.emailSenderDomainEvidence.update({
      where: { id },
      data: {
        status: EmailSenderDomainEvidenceStatus.VERIFIED,
        verifiedById: actorUserId,
        verifiedAt: new Date(),
        note: normalizeOptionalText(dto.note) ?? existing.note,
        productionReadyContribution,
      },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_SENDER_DOMAIN_EVIDENCE_VERIFIED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_SENDER_DOMAIN_EVIDENCE,
      entityId: verified.id,
      before: existing,
      after: verified,
    });

    return this.senderDomainEvidenceResponse(verified);
  }

  async revokeSenderDomainEvidence(organizationId: string, actorUserId: string, id: string, dto: RevokeEmailSenderDomainEvidenceDto = {}) {
    const existing = await this.prisma.emailSenderDomainEvidence.findFirst({
      where: { id, organizationId },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    if (!existing) {
      throw new NotFoundException("Email sender-domain evidence not found.");
    }
    if (existing.status === EmailSenderDomainEvidenceStatus.REVOKED) {
      throw new BadRequestException("Email sender-domain evidence is already revoked.");
    }
    this.assertEvidenceContainsNoSecrets(dto);

    const revoked = await this.prisma.emailSenderDomainEvidence.update({
      where: { id },
      data: {
        status: EmailSenderDomainEvidenceStatus.REVOKED,
        revokedById: actorUserId,
        revokedAt: new Date(),
        note: normalizeOptionalText(dto.note) ?? existing.note,
        productionReadyContribution: false,
      },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_SENDER_DOMAIN_EVIDENCE_REVOKED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_SENDER_DOMAIN_EVIDENCE,
      entityId: revoked.id,
      before: existing,
      after: revoked,
    });

    return this.senderDomainEvidenceResponse(revoked);
  }

  list(organizationId: string) {
    return this.prisma.emailOutbox.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: EMAIL_OUTBOX_LIST_SELECT,
    });
  }

  async get(organizationId: string, id: string) {
    const email = await this.prisma.emailOutbox.findFirst({
      where: { id, organizationId },
      select: EMAIL_OUTBOX_DETAIL_SELECT,
    });

    if (!email) {
      throw new NotFoundException("Email outbox record not found.");
    }

    return email;
  }

  private async send(message: EmailMessage) {
    const suppression = message.organizationId ? await this.findActiveSuppression(message.organizationId, message.toEmail) : null;
    if (suppression) {
      return this.prisma.emailOutbox.create({
        data: {
          organizationId: message.organizationId ?? null,
          toEmail: message.toEmail,
          fromEmail: message.fromEmail,
          subject: message.subject,
          templateType: message.templateType,
          bodyText: message.bodyText,
          bodyHtml: message.bodyHtml ?? null,
          status: EmailDeliveryStatus.FAILED,
          provider: this.provider.provider,
          providerMessageId: null,
          errorMessage: "Email delivery blocked by active suppression.",
          sentAt: null,
          attemptCount: 0,
          maxAttempts: DEFAULT_EMAIL_MAX_ATTEMPTS,
          nextAttemptAt: null,
          lastAttemptAt: null,
          lastErrorRedacted: "Email delivery blocked by active suppression.",
          providerEventStatus: EMAIL_SUPPRESSED_STATUS,
        },
        select: EMAIL_OUTBOX_DETAIL_SELECT,
      });
    }

    const result = await this.provider.send(message);
    const failed = result.status === EmailDeliveryStatus.FAILED;
    const errorMessage = redactEmailDiagnosticText(result.errorMessage);
    return this.prisma.emailOutbox.create({
      data: {
        organizationId: message.organizationId ?? null,
        toEmail: message.toEmail,
        fromEmail: message.fromEmail,
        subject: message.subject,
        templateType: message.templateType,
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml ?? null,
        status: result.status,
        provider: result.provider,
        providerMessageId: result.providerMessageId ?? null,
        errorMessage,
        sentAt: result.sentAt ?? null,
        attemptCount: 1,
        maxAttempts: DEFAULT_EMAIL_MAX_ATTEMPTS,
        nextAttemptAt: failed ? nextRetryAttemptAt(1) : null,
        lastAttemptAt: new Date(),
        lastErrorRedacted: errorMessage,
      },
      select: EMAIL_OUTBOX_DETAIL_SELECT,
    });
  }

  private get fromEmail(): string {
    return this.configuredFromEmail || "no-reply@ledgerbyte.local";
  }

  private get configuredFromEmail(): string {
    return this.config.get<string>("EMAIL_FROM")?.trim() ?? "";
  }

  private get diagnosticsExecutionEnabled(): boolean {
    return this.config.get<string>("LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED")?.trim().toLowerCase() === "true";
  }

  private get retryProcessorEnabled(): boolean {
    return this.config.get<string>("LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED")?.trim().toLowerCase() === "true";
  }

  private get retryWorkerEnabled(): boolean {
    return this.config.get<string>("LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED")?.trim().toLowerCase() === "true";
  }

  private get retryWorkerSchedulerProvider(): EmailRetryWorkerSchedulerProvider {
    const value = this.config.get<string>("LEDGERBYTE_EMAIL_RETRY_WORKER_SCHEDULER_PROVIDER")?.trim().toUpperCase();
    if (value === "FUTURE_CRON" || value === "FUTURE_QUEUE" || value === "FUTURE_SERVERLESS_CRON") {
      return value;
    }
    return "NONE";
  }

  private get webhookVerificationEnabled(): boolean {
    return this.config.get<string>("EMAIL_PROVIDER_WEBHOOK_VERIFICATION_ENABLED")?.trim().toLowerCase() === "true";
  }

  private get webhookSecret(): string {
    return this.config.get<string>("EMAIL_PROVIDER_WEBHOOK_SECRET")?.trim() ?? "";
  }

  private get webhookSecretConfigured(): boolean {
    return this.webhookSecret.length > 0;
  }

  private get allowedWebhookProviders(): string[] {
    return this.configuredList("EMAIL_PROVIDER_WEBHOOK_ALLOWED_PROVIDERS");
  }

  private get allowedDiagnosticDomains(): string[] {
    return [...this.configuredList("LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_DOMAINS"), "example.test", "ledgerbyte.local"];
  }

  private configuredList(key: string): string[] {
    return (
      this.config
        .get<string>(key)
        ?.split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean) ?? []
    );
  }

  private isAllowedDiagnosticRecipient(email: string): boolean {
    const allowedRecipients = new Set(this.configuredList("LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS"));
    if (allowedRecipients.has(email)) {
      return true;
    }

    const domain = email.split("@")[1]?.toLowerCase();
    return Boolean(domain && this.allowedDiagnosticDomains.includes(domain));
  }

  private async senderDomainReadiness(organizationId: string) {
    const fromDomain = emailDomain(this.fromEmail);
    const replyToDomain = emailDomain(this.config.get<string>("EMAIL_REPLY_TO")?.trim() ?? "");
    const evidence = await this.prisma.emailSenderDomainEvidence.findMany({
      where: { organizationId },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });
    const verifiedEvidenceTypes = REQUIRED_SENDER_DOMAIN_EVIDENCE_TYPES.filter((evidenceType) =>
      evidence.some(
        (entry) =>
          entry.domain === fromDomain &&
          entry.evidenceType === evidenceType &&
          entry.status === EmailSenderDomainEvidenceStatus.VERIFIED &&
          entry.productionReadyContribution,
      ),
    );
    const missingEvidenceTypes = REQUIRED_SENDER_DOMAIN_EVIDENCE_TYPES.filter((evidenceType) => !verifiedEvidenceTypes.includes(evidenceType));
    const evidenceStatus: SenderDomainEvidenceStatus =
      missingEvidenceTypes.length === 0 && fromDomain ? "READY_FOR_REVIEW" : verifiedEvidenceTypes.length > 0 ? "PARTIAL" : "BLOCKED";
    const blockers: string[] = [];
    const warnings = [
      "Sender-domain evidence is manual metadata capture only. No live DNS lookup is performed.",
      "DNS provider secrets, SMTP credentials, API keys, tokens, authorization headers, connection URLs, and private DKIM keys must not be stored.",
    ];

    if (!fromDomain) {
      blockers.push("Email from domain is required before sender-domain evidence can be reviewed.");
    }
    if (missingEvidenceTypes.length > 0) {
      blockers.push("SPF, DKIM, and DMARC evidence must be captured before production email readiness review.");
    }
    if (replyToDomain && fromDomain && replyToDomain !== fromDomain) {
      warnings.push("Reply-to domain differs from the sender domain and should be separately reviewed before production rollout.");
    }

    return {
      fromDomain,
      replyToDomain,
      evidenceRequired: true,
      requiredEvidenceTypes: REQUIRED_SENDER_DOMAIN_EVIDENCE_TYPES,
      verifiedEvidenceTypes,
      missingEvidenceTypes,
      evidenceStatus,
      productionReadyContribution: evidenceStatus === "READY_FOR_REVIEW",
      blockers,
      warnings,
    };
  }

  private currentRelayDiagnosticsStatus(realSendingEnabled: boolean): RelayDiagnosticsStatus {
    if (!this.diagnosticsExecutionEnabled) {
      return "SKIPPED_DISABLED";
    }
    if (realSendingEnabled && (this.configuredList("LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS").length > 0 || this.allowedDiagnosticDomains.length > 0)) {
      return "READY_FOR_NON_PRODUCTION_TEST";
    }
    return "NOT_RUN";
  }

  private operationalReadinessBlockers(input: {
    senderDomainReady: boolean;
    relayDiagnosticsStatus: RelayDiagnosticsStatus;
    retryProcessorEnabled: boolean;
    retryWorkerConfigured: boolean;
    retryWorkerEnabled: boolean;
    providerEventIngestionReady: boolean;
    bounceWebhookConfigured: boolean;
    monitoringConfigured: boolean;
    webhookVerificationEnabled: boolean;
    webhookSecretConfigured: boolean;
    providerWebhookSignatureVerified: boolean;
    alertingConfigured: boolean;
  }): string[] {
    const blockers: string[] = [];

    if (!input.senderDomainReady) {
      blockers.push("Sender domain SPF/DKIM/DMARC evidence is required before production email delivery.");
    }
    if (input.relayDiagnosticsStatus !== "ATTEMPTED") {
      blockers.push("Non-production relay diagnostics must be completed before production email delivery is considered ready.");
    }
    if (!input.retryProcessorEnabled) {
      blockers.push("Email retry processor is disabled by default.");
    }
    if (!input.retryWorkerEnabled) {
      blockers.push("Email retry worker execution is disabled by default.");
    }
    if (!input.retryWorkerConfigured) {
      blockers.push("Scheduled email retry worker is not configured.");
    }
    if (!input.bounceWebhookConfigured) {
      blockers.push("Bounce webhook handling is not configured.");
    }
    if (!input.webhookVerificationEnabled) {
      blockers.push("Signed provider webhook verification is disabled by default.");
    }
    if (!input.webhookSecretConfigured) {
      blockers.push("Email provider webhook secret is not configured.");
    }
    if (!input.providerWebhookSignatureVerified) {
      blockers.push("No verified signed provider webhook event has been captured.");
    }
    if (!input.providerEventIngestionReady) {
      blockers.push("Provider event ingestion is mock-only and unsigned.");
    }
    if (!input.monitoringConfigured) {
      blockers.push("Email monitoring is not configured.");
    }
    if (!input.alertingConfigured) {
      blockers.push("Email alerting is not configured.");
    }

    return blockers;
  }

  private suppressionResponse(suppression: unknown) {
    return {
      metadataOnly: true,
      noCustomerEmail: true,
      noEmailSent: true,
      noOutboxRecord: true,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      suppression,
    };
  }

  private senderDomainEvidenceResponse(evidence: unknown) {
    return {
      metadataOnly: true,
      noCustomerEmail: true,
      noEmailSent: true,
      noOutboxRecord: true,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      evidence,
    };
  }

  private monitoringEvidenceResponse(evidence: unknown) {
    return {
      metadataOnly: true,
      noCustomerEmail: true,
      noEmailSent: true,
      noOutboxRecord: true,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      evidence,
    };
  }

  private assertApGeneratedDocumentEmailPermissions(permissions: unknown, sourcePermission: string) {
    const requiredPermissions = [PERMISSIONS.emailOutbox.view, PERMISSIONS.generatedDocuments.download, sourcePermission];
    const missing = requiredPermissions.filter((permission) => !hasPermission(permissions, permission));
    if (missing.length > 0) {
      throw new ForbiddenException("You do not have permission to create AP generated-document email outbox metadata.");
    }
  }

  private async findApGeneratedDocumentEmailSource(
    organizationId: string,
    sourceType: ApGeneratedDocumentEmailSourceType,
    sourceId: string,
  ): Promise<{ sourceNumber: string; recipientEmail?: string | null }> {
    if (sourceType === "PurchaseOrder") {
      const source = await this.prisma.purchaseOrder.findFirst({
        where: { id: sourceId, organizationId },
        select: { id: true, purchaseOrderNumber: true, supplier: { select: { email: true } } },
      });
      return apEmailSourceResult(source, "purchaseOrderNumber");
    }
    if (sourceType === "PurchaseBill") {
      const source = await this.prisma.purchaseBill.findFirst({
        where: { id: sourceId, organizationId },
        select: { id: true, billNumber: true, supplier: { select: { email: true } } },
      });
      return apEmailSourceResult(source, "billNumber");
    }
    if (sourceType === "SupplierPayment") {
      const source = await this.prisma.supplierPayment.findFirst({
        where: { id: sourceId, organizationId },
        select: { id: true, paymentNumber: true, supplier: { select: { email: true } } },
      });
      return apEmailSourceResult(source, "paymentNumber");
    }
    if (sourceType === "SupplierRefund") {
      const source = await this.prisma.supplierRefund.findFirst({
        where: { id: sourceId, organizationId },
        select: { id: true, refundNumber: true, supplier: { select: { email: true } } },
      });
      return apEmailSourceResult(source, "refundNumber");
    }
    if (sourceType === "PurchaseDebitNote") {
      const source = await this.prisma.purchaseDebitNote.findFirst({
        where: { id: sourceId, organizationId },
        select: { id: true, debitNoteNumber: true, supplier: { select: { email: true } } },
      });
      return apEmailSourceResult(source, "debitNoteNumber");
    }

    const source = await this.prisma.cashExpense.findFirst({
      where: { id: sourceId, organizationId },
      select: { id: true, expenseNumber: true, contact: { select: { email: true } } },
    });
    if (!source) {
      throw new NotFoundException("AP source record not found.");
    }
    return {
      sourceNumber: source.expenseNumber,
      recipientEmail: source.contact?.email ?? null,
    };
  }

  private assertEvidenceContainsNoSecrets(value: unknown) {
    if (containsEmailSecret(value)) {
      throw new BadRequestException("Email sender-domain evidence must not contain secrets.");
    }
  }

  private assertMonitoringEvidenceContainsNoSecrets(value: unknown) {
    if (containsEmailSecret(value) || containsCustomerEmailContent(value)) {
      throw new BadRequestException("Email delivery monitoring evidence must not contain secrets or customer email content.");
    }
  }

  private assertProviderEventContainsNoSecrets(value: unknown) {
    if (containsEmailSecret(value) || containsCustomerEmailContent(value)) {
      throw new BadRequestException("Email provider event payload must not contain secrets or customer email content.");
    }
  }

  private assertSuppressionInputContainsNoSecrets(value: unknown) {
    if (containsEmailSecret(value)) {
      throw new BadRequestException("Email suppression metadata must not contain secrets.");
    }
    const withoutEmail = typeof value === "object" && value !== null ? { ...(value as Record<string, unknown>), email: undefined } : value;
    if (containsCustomerEmailContent(withoutEmail)) {
      throw new BadRequestException("Email suppression metadata must not contain customer message content.");
    }
  }

  private async findActiveSuppression(organizationId: string, email: string) {
    return this.prisma.emailSuppression.findFirst({
      where: {
        organizationId,
        emailHash: hashEmailAddress(normalizeEmailAddress(email)),
        active: true,
      },
      select: EMAIL_SUPPRESSION_SELECT,
    });
  }

  private async createEventSuppressionIfNeeded(input: {
    organizationId: string;
    actorUserId: string;
    eventId: string;
    eventType: EmailProviderEventType;
    provider: string;
    recipientEmail?: string | null;
    localMock: boolean;
  }) {
    if (input.eventType !== EmailProviderEventType.BOUNCED && input.eventType !== EmailProviderEventType.COMPLAINED) {
      return null;
    }
    const email = input.recipientEmail ? normalizeEmailAddress(input.recipientEmail) : null;
    if (!email) {
      return null;
    }
    const suppression = await this.createOrActivateSuppression({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      email,
      reason: input.eventType === EmailProviderEventType.BOUNCED ? EmailSuppressionReason.BOUNCE : EmailSuppressionReason.COMPLAINT,
      sourceProvider: input.provider,
      providerEventId: input.eventId,
      note: input.localMock ? "Local mock provider event suppression metadata." : "Verified provider webhook suppression metadata.",
    });

    await this.auditLogService?.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: AUDIT_EVENTS.EMAIL_SUPPRESSION_CREATED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_SUPPRESSION,
      entityId: suppression.id,
      after: suppression,
    });

    return suppression;
  }

  private async createOrActivateSuppression(input: {
    organizationId: string;
    actorUserId: string;
    email: string;
    reason: EmailSuppressionReason;
    sourceProvider?: string | null;
    providerEventId?: string | null;
    note?: string | null;
  }) {
    const email = normalizeEmailAddress(input.email);
    const existing = await this.prisma.emailSuppression.findFirst({
      where: {
        organizationId: input.organizationId,
        emailHash: hashEmailAddress(email),
        active: true,
      },
      select: EMAIL_SUPPRESSION_SELECT,
    });
    if (existing) {
      return existing;
    }

    return this.prisma.emailSuppression.create({
      data: {
        organizationId: input.organizationId,
        emailHash: hashEmailAddress(email),
        emailMasked: maskEmailAddress(email),
        reason: input.reason,
        sourceProvider: normalizeOptionalText(input.sourceProvider),
        providerEventId: input.providerEventId ?? null,
        active: true,
        createdById: input.actorUserId,
        note: normalizeOptionalText(input.note),
      },
      select: EMAIL_SUPPRESSION_SELECT,
    });
  }

  buildProviderWebhookTestSignature(dto: Omit<ReceiveEmailProviderWebhookDto, "signature">) {
    if (!this.webhookSecretConfigured) {
      throw new BadRequestException("Email provider webhook secret is not configured.");
    }
    return createHmac("sha256", this.webhookSecret).update(providerWebhookSignaturePayload(dto)).digest("hex");
  }

  private verifyProviderWebhookSignature(dto: ReceiveEmailProviderWebhookDto): boolean {
    if (!dto.signature || !this.webhookSecretConfigured) {
      return false;
    }
    const expected = this.buildProviderWebhookTestSignature(dto);
    return safeCompareHex(expected, dto.signature);
  }

  private productionReadinessBlockers(input: {
    provider: string;
    fromAddressConfigured: boolean;
    replyToConfigured: boolean;
    smtpHostConfigured: boolean;
    smtpPortConfigured: boolean;
    smtpSecureModeConfigured: boolean;
    credentialsConfigured: boolean;
    providerReady: boolean;
  }): string[] {
    const blockers: string[] = [];

    if (input.provider !== "smtp") {
      blockers.push("SMTP provider must be enabled before production email delivery is considered ready.");
    }
    if (!input.providerReady) {
      blockers.push("Email provider readiness blockers must be resolved before production delivery.");
    }
    if (!input.fromAddressConfigured) {
      blockers.push("Email from address must be configured for production delivery.");
    }
    if (!input.replyToConfigured) {
      blockers.push("Email reply-to address should be configured for production support workflows.");
    }
    if (input.provider === "smtp" && !input.smtpHostConfigured) {
      blockers.push("SMTP host is required when SMTP delivery is enabled.");
    }
    if (input.provider === "smtp" && !input.smtpPortConfigured) {
      blockers.push("SMTP port is required when SMTP delivery is enabled.");
    }
    if (input.provider === "smtp" && !input.smtpSecureModeConfigured) {
      blockers.push("SMTP secure mode must be explicitly configured as true or false.");
    }
    if (input.provider === "smtp" && !input.credentialsConfigured) {
      blockers.push("SMTP credentials are required when SMTP delivery is enabled.");
    }

    return blockers;
  }
}

const EMAIL_OUTBOX_LIST_SELECT = {
  id: true,
  organizationId: true,
  toEmail: true,
  fromEmail: true,
  subject: true,
  templateType: true,
  status: true,
  provider: true,
  providerMessageId: true,
  errorMessage: true,
  sentAt: true,
  attemptCount: true,
  maxAttempts: true,
  nextAttemptAt: true,
  lastAttemptAt: true,
  lastErrorRedacted: true,
  providerEventStatus: true,
  generatedDocumentId: true,
  sourceType: true,
  sourceId: true,
  attachmentFilename: true,
  attachmentMimeType: true,
  attachmentSizeBytes: true,
  attachmentContentHash: true,
  bouncedAt: true,
  complainedAt: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailOutboxSelect;

const EMAIL_OUTBOX_DETAIL_SELECT = {
  ...EMAIL_OUTBOX_LIST_SELECT,
  bodyText: true,
  bodyHtml: true,
} satisfies Prisma.EmailOutboxSelect;

const EMAIL_OUTBOX_RETRY_SELECT = {
  ...EMAIL_OUTBOX_DETAIL_SELECT,
  retryLockedAt: true,
  retryLockedBy: true,
} satisfies Prisma.EmailOutboxSelect;

const AP_GENERATED_DOCUMENT_EMAIL_DOCUMENT_SELECT = {
  id: true,
  organizationId: true,
  documentType: true,
  sourceType: true,
  sourceId: true,
  documentNumber: true,
  filename: true,
  mimeType: true,
  contentHash: true,
  sizeBytes: true,
  status: true,
} satisfies Prisma.GeneratedDocumentSelect;

const EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT = {
  id: true,
  organizationId: true,
  domain: true,
  status: true,
  evidenceType: true,
  provider: true,
  evidenceSummaryJson: true,
  verifiedById: true,
  verifiedAt: true,
  revokedById: true,
  revokedAt: true,
  note: true,
  productionReadyContribution: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailSenderDomainEvidenceSelect;

const EMAIL_DELIVERY_MONITORING_EVIDENCE_SELECT = {
  id: true,
  organizationId: true,
  status: true,
  evidenceType: true,
  provider: true,
  evidenceSummaryJson: true,
  verifiedById: true,
  verifiedAt: true,
  revokedById: true,
  revokedAt: true,
  note: true,
  productionReadyContribution: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailDeliveryMonitoringEvidenceSelect;

const EMAIL_PROVIDER_EVENT_SELECT = {
  id: true,
  organizationId: true,
  emailOutboxId: true,
  provider: true,
  eventType: true,
  providerMessageIdRedacted: true,
  payloadSummaryJson: true,
  signatureVerified: true,
  productionReadyContribution: true,
  receivedAt: true,
  createdAt: true,
} satisfies Prisma.EmailProviderEventSelect;

const EMAIL_SUPPRESSION_SELECT = {
  id: true,
  organizationId: true,
  emailHash: true,
  emailMasked: true,
  reason: true,
  sourceProvider: true,
  providerEventId: true,
  active: true,
  createdById: true,
  revokedById: true,
  revokedAt: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailSuppressionSelect;

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmailAddress(value: string): string {
  const email = value.trim().toLowerCase();
  if (!isEmailAddress(email)) {
    throw new BadRequestException("Email suppression requires a valid email address.");
  }
  return email;
}

function hashEmailAddress(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function emailDomain(email: string): string | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain && isDomainName(domain) ? domain : null;
}

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase().replace(/^@/, "");
  const domain = trimmed.includes("@") ? trimmed.split("@").pop() ?? "" : trimmed;
  if (!isDomainName(domain)) {
    throw new BadRequestException("Sender-domain evidence requires a valid domain.");
  }
  return domain;
}

function isDomainName(value: string): boolean {
  if (value.length === 0 || value.length > 253 || !value.includes(".")) {
    return false;
  }
  return value.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeApGeneratedDocumentEmailRecipient(value?: string | null): string | null {
  const email = value?.trim().toLowerCase();
  if (!email) {
    return null;
  }
  if (!isEmailAddress(email)) {
    throw new BadRequestException("AP generated document email requires a valid recipient email.");
  }
  return email;
}

function apGeneratedDocumentEmailSourceConfig(sourceType: string, documentType: DocumentType) {
  const config = AP_GENERATED_DOCUMENT_EMAIL_SUPPORTED_SOURCES[sourceType as ApGeneratedDocumentEmailSourceType];
  if (!config || config.documentType !== documentType) {
    return null;
  }
  return config;
}

function apEmailSourceResult<T extends { supplier?: { email?: string | null } | null }>(
  source: (T & Record<string, unknown>) | null,
  numberField: string,
): { sourceNumber: string; recipientEmail?: string | null } {
  if (!source) {
    throw new NotFoundException("AP source record not found.");
  }
  return {
    sourceNumber: String(source[numberField] ?? ""),
    recipientEmail: source.supplier?.email ?? null,
  };
}

function apGeneratedDocumentEmailOutboxResponse(email: Prisma.EmailOutboxGetPayload<{ select: typeof EMAIL_OUTBOX_LIST_SELECT }>) {
  return {
    id: email.id,
    organizationId: email.organizationId,
    toEmail: email.toEmail,
    fromEmail: email.fromEmail,
    subject: email.subject,
    templateType: email.templateType,
    status: email.status,
    provider: email.provider,
    providerMessageId: email.providerMessageId,
    errorMessage: email.errorMessage,
    sentAt: email.sentAt,
    attemptCount: email.attemptCount,
    maxAttempts: email.maxAttempts,
    nextAttemptAt: email.nextAttemptAt,
    lastAttemptAt: email.lastAttemptAt,
    lastErrorRedacted: email.lastErrorRedacted,
    providerEventStatus: email.providerEventStatus,
    generatedDocumentId: email.generatedDocumentId,
    sourceType: email.sourceType,
    sourceId: email.sourceId,
    attachmentFilename: email.attachmentFilename,
    attachmentMimeType: email.attachmentMimeType,
    attachmentSizeBytes: email.attachmentSizeBytes,
    attachmentContentHash: email.attachmentContentHash,
    bouncedAt: email.bouncedAt,
    complainedAt: email.complainedAt,
    deliveredAt: email.deliveredAt,
    createdAt: email.createdAt,
    updatedAt: email.updatedAt,
  };
}

function sanitizeEvidenceSummary(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function providerWebhookSignaturePayload(dto: Omit<ReceiveEmailProviderWebhookDto, "signature"> | ReceiveEmailProviderWebhookDto): string {
  return stableStringify({
    provider: normalizeOptionalText(dto.provider)?.toLowerCase() ?? "",
    eventType: dto.eventType,
    providerMessageId: normalizeOptionalText(dto.providerMessageId),
    emailOutboxId: normalizeOptionalText(dto.emailOutboxId),
    recipientEmail: normalizeOptionalText(dto.recipientEmail)?.toLowerCase() ?? null,
    payloadSummaryJson: dto.payloadSummaryJson ?? {},
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function safeCompareHex(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]+$/i.test(actual) || expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

function isProductionReadyEvidenceType(evidenceType: EmailSenderDomainEvidenceType): boolean {
  return evidenceType !== EmailSenderDomainEvidenceType.OTHER;
}

function isProductionReadyMonitoringEvidenceType(evidenceType: EmailDeliveryMonitoringEvidenceType): boolean {
  return evidenceType !== EmailDeliveryMonitoringEvidenceType.OTHER;
}

function isProviderEventType(value: unknown): value is EmailProviderEventType {
  return Object.values(EmailProviderEventType).includes(value as EmailProviderEventType);
}

function clampRetryLimit(value?: number): number {
  if (!Number.isInteger(value) || value === undefined) {
    return 10;
  }
  return Math.min(Math.max(value, 1), MAX_EMAIL_RETRY_PROCESS_LIMIT);
}

function nextRetryAttemptAt(attemptCount: number): Date {
  const minutes = Math.min(60, Math.max(5, attemptCount * 15));
  return new Date(Date.now() + minutes * 60 * 1000);
}

function providerEventOutboxUpdate(eventType: EmailProviderEventType): Prisma.EmailOutboxUpdateInput {
  const now = new Date();
  if (eventType === EmailProviderEventType.DELIVERED) {
    return {
      providerEventStatus: eventType,
      deliveredAt: now,
    };
  }
  if (eventType === EmailProviderEventType.BOUNCED) {
    return {
      providerEventStatus: eventType,
      bouncedAt: now,
      status: EmailDeliveryStatus.FAILED,
      nextAttemptAt: null,
    };
  }
  if (eventType === EmailProviderEventType.COMPLAINED) {
    return {
      providerEventStatus: eventType,
      complainedAt: now,
      status: EmailDeliveryStatus.FAILED,
      nextAttemptAt: null,
    };
  }
  if (eventType === EmailProviderEventType.FAILED) {
    return {
      providerEventStatus: eventType,
      status: EmailDeliveryStatus.FAILED,
    };
  }
  return {
    providerEventStatus: eventType,
  };
}
