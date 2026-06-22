"use client";

import { useEffect, useState } from "react";
import { EmailReadinessSafeStatus } from "@/components/email/email-readiness-safe-status";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerEmptyState,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  emailProviderLabel,
  emailProviderEventIngestionStatusLabel,
  emailProviderWarningText,
  emailReadinessLabel,
  emailDiagnosticsStatusLabel,
  emailMonitoringEvidenceStatusLabel,
  emailRelayDiagnosticsStatusLabel,
  emailRetryProcessorStatusLabel,
  emailRetryWorkerStatusLabel,
  emailSenderDomainEvidenceStatusLabel,
  emailSenderDomainStatusLabel,
  emailSuppressionStatusLabel,
  emailStatusClass,
  emailStatusLabel,
  emailTemplateLabel,
  emailWebhookVerificationStatusLabel,
  isValidTestEmailAddress,
  smtpConfigStateLabel,
} from "@/lib/email";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  AuthTokenCleanupResponse,
  EmailDeliveryMonitoringEvidence,
  EmailDeliveryMonitoringEvidenceListResponse,
  EmailDeliveryMonitoringEvidenceResponse,
  EmailDeliveryMonitoringEvidenceType,
  EmailDiagnosticsResponse,
  EmailMonitoringPlan,
  EmailOutboxDetail,
  EmailOutboxEntry,
  EmailProviderEventsPlan,
  EmailProviderWebhookPlan,
  EmailReadinessResponse,
  EmailRetryPlan,
  EmailRetryWorkerPlan,
  EmailSenderDomainEvidence,
  EmailSenderDomainEvidenceListResponse,
  EmailSenderDomainEvidenceResponse,
  EmailSenderDomainEvidenceType,
  EmailSuppression,
  EmailSuppressionListResponse,
  EmailSuppressionResponse,
} from "@/lib/types";

const EVIDENCE_TYPES: EmailSenderDomainEvidenceType[] = ["SPF", "DKIM", "DMARC", "MX", "RETURN_PATH", "PROVIDER_VERIFICATION", "OTHER"];
const MONITORING_EVIDENCE_TYPES: EmailDeliveryMonitoringEvidenceType[] = [
  "RETRY_WORKER",
  "BOUNCE_ALERTS",
  "COMPLAINT_ALERTS",
  "SUPPRESSION_TRENDS",
  "DELIVERY_DASHBOARD",
  "PROVIDER_WEBHOOK_HEALTH",
  "OTHER",
];

export default function EmailOutboxPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManageEmail = can(PERMISSIONS.users.manage);
  const [emails, setEmails] = useState<EmailOutboxEntry[]>([]);
  const [readiness, setReadiness] = useState<EmailReadinessResponse | null>(null);
  const [senderEvidence, setSenderEvidence] = useState<EmailSenderDomainEvidence[]>([]);
  const [monitoringEvidence, setMonitoringEvidence] = useState<EmailDeliveryMonitoringEvidence[]>([]);
  const [suppressions, setSuppressions] = useState<EmailSuppression[]>([]);
  const [selected, setSelected] = useState<EmailOutboxDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<AuthTokenCleanupResponse | null>(null);
  const [diagnosticsEmail, setDiagnosticsEmail] = useState("");
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<EmailDiagnosticsResponse | null>(null);
  const [retryPlan, setRetryPlan] = useState<EmailRetryPlan | null>(null);
  const [retryPlanLoading, setRetryPlanLoading] = useState(false);
  const [retryWorkerPlan, setRetryWorkerPlan] = useState<EmailRetryWorkerPlan | null>(null);
  const [retryWorkerPlanLoading, setRetryWorkerPlanLoading] = useState(false);
  const [monitoringPlan, setMonitoringPlan] = useState<EmailMonitoringPlan | null>(null);
  const [monitoringPlanLoading, setMonitoringPlanLoading] = useState(false);
  const [eventPlan, setEventPlan] = useState<EmailProviderEventsPlan | null>(null);
  const [eventPlanLoading, setEventPlanLoading] = useState(false);
  const [webhookPlan, setWebhookPlan] = useState<EmailProviderWebhookPlan | null>(null);
  const [webhookPlanLoading, setWebhookPlanLoading] = useState(false);
  const [evidenceDomain, setEvidenceDomain] = useState("");
  const [evidenceType, setEvidenceType] = useState<EmailSenderDomainEvidenceType>("SPF");
  const [evidenceProvider, setEvidenceProvider] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [monitoringEvidenceType, setMonitoringEvidenceType] = useState<EmailDeliveryMonitoringEvidenceType>("RETRY_WORKER");
  const [monitoringEvidenceProvider, setMonitoringEvidenceProvider] = useState("");
  const [monitoringEvidenceSummary, setMonitoringEvidenceSummary] = useState("");
  const [monitoringEvidenceNote, setMonitoringEvidenceNote] = useState("");
  const [monitoringEvidenceLoading, setMonitoringEvidenceLoading] = useState(false);
  const [suppressionEmail, setSuppressionEmail] = useState("");
  const [suppressionNote, setSuppressionNote] = useState("");
  const [suppressionLoading, setSuppressionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    setLoading(true);
    setError("");
    const evidenceRequest = canManageEmail
      ? apiRequest<EmailSenderDomainEvidenceListResponse>("/email/sender-domain-evidence")
      : Promise.resolve({
          metadataOnly: true,
          noCustomerEmail: true,
          noEmailSent: true,
          noOutboxRecord: true,
          redactionGuarantees: [],
          evidence: [],
        } as EmailSenderDomainEvidenceListResponse);
    const suppressionRequest = canManageEmail
      ? apiRequest<EmailSuppressionListResponse>("/email/suppressions")
      : Promise.resolve({
          metadataOnly: true,
          noCustomerEmail: true,
          noEmailSent: true,
          noOutboxRecord: true,
          redactionGuarantees: [],
          suppressions: [],
        } as EmailSuppressionListResponse);
    const monitoringEvidenceRequest = canManageEmail
      ? apiRequest<EmailDeliveryMonitoringEvidenceListResponse>("/email/monitoring-evidence")
      : Promise.resolve({
          metadataOnly: true,
          noCustomerEmail: true,
          noEmailSent: true,
          noOutboxRecord: true,
          redactionGuarantees: [],
          evidence: [],
        } as EmailDeliveryMonitoringEvidenceListResponse);
    Promise.all([
      apiRequest<EmailOutboxEntry[]>("/email/outbox"),
      apiRequest<EmailReadinessResponse>("/email/readiness"),
      evidenceRequest,
      suppressionRequest,
      monitoringEvidenceRequest,
    ])
      .then(([outbox, emailReadiness, evidenceResponse, suppressionResponse, monitoringEvidenceResponse]) => {
        setEmails(outbox);
        setReadiness(emailReadiness);
        setSenderEvidence(evidenceResponse.evidence);
        setSuppressions(suppressionResponse.suppressions);
        setMonitoringEvidence(monitoringEvidenceResponse.evidence);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load email outbox."))
      .finally(() => setLoading(false));
  }, [canManageEmail, organizationId]);

  async function openDetail(id: string) {
    setError("");
    try {
      setSelected(await apiRequest<EmailOutboxDetail>(`/email/outbox/${id}`));
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Unable to load email detail.");
    }
  }

  async function cleanupExpiredTokens() {
    setCleanupLoading(true);
    setCleanupResult(null);
    setError("");
    try {
      setCleanupResult(await apiRequest<AuthTokenCleanupResponse>("/auth/tokens/cleanup-expired", { method: "POST" }));
    } catch (cleanupError) {
      setError(cleanupError instanceof Error ? cleanupError.message : "Unable to clean expired tokens.");
    } finally {
      setCleanupLoading(false);
    }
  }

  async function runDiagnostics() {
    setDiagnosticsLoading(true);
    setDiagnosticsResult(null);
    setError("");
    try {
      const body = diagnosticsEmail.trim() ? { toEmail: diagnosticsEmail.trim() } : {};
      const result = await apiRequest<EmailDiagnosticsResponse>("/email/diagnostics", {
        method: "POST",
        body,
      });
      setDiagnosticsResult(result);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to run email diagnostics.");
    } finally {
      setDiagnosticsLoading(false);
    }
  }

  async function viewRetryPlan() {
    setRetryPlanLoading(true);
    setError("");
    try {
      setRetryPlan(await apiRequest<EmailRetryPlan>("/email/retry-plan"));
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to load email retry plan.");
    } finally {
      setRetryPlanLoading(false);
    }
  }

  async function viewRetryWorkerPlan() {
    setRetryWorkerPlanLoading(true);
    setError("");
    try {
      setRetryWorkerPlan(await apiRequest<EmailRetryWorkerPlan>("/email/retry-worker/plan"));
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to load email retry worker plan.");
    } finally {
      setRetryWorkerPlanLoading(false);
    }
  }

  async function viewMonitoringPlan() {
    setMonitoringPlanLoading(true);
    setError("");
    try {
      setMonitoringPlan(await apiRequest<EmailMonitoringPlan>("/email/monitoring-plan"));
    } catch (monitoringError) {
      setError(monitoringError instanceof Error ? monitoringError.message : "Unable to load email monitoring plan.");
    } finally {
      setMonitoringPlanLoading(false);
    }
  }

  async function viewEventReadiness() {
    setEventPlanLoading(true);
    setError("");
    try {
      setEventPlan(await apiRequest<EmailProviderEventsPlan>("/email/provider-events/plan"));
    } catch (eventError) {
      setError(eventError instanceof Error ? eventError.message : "Unable to load provider event readiness.");
    } finally {
      setEventPlanLoading(false);
    }
  }

  async function viewWebhookPlan() {
    setWebhookPlanLoading(true);
    setError("");
    try {
      setWebhookPlan(await apiRequest<EmailProviderWebhookPlan>("/email/provider-events/webhook-plan"));
    } catch (webhookError) {
      setError(webhookError instanceof Error ? webhookError.message : "Unable to load provider webhook readiness.");
    } finally {
      setWebhookPlanLoading(false);
    }
  }

  async function refreshReadinessAndEvidence() {
    const [emailReadiness, evidenceResponse, suppressionResponse, monitoringEvidenceResponse] = await Promise.all([
      apiRequest<EmailReadinessResponse>("/email/readiness"),
      apiRequest<EmailSenderDomainEvidenceListResponse>("/email/sender-domain-evidence"),
      apiRequest<EmailSuppressionListResponse>("/email/suppressions"),
      apiRequest<EmailDeliveryMonitoringEvidenceListResponse>("/email/monitoring-evidence"),
    ]);
    setReadiness(emailReadiness);
    setSenderEvidence(evidenceResponse.evidence);
    setSuppressions(suppressionResponse.suppressions);
    setMonitoringEvidence(monitoringEvidenceResponse.evidence);
  }

  async function createEvidence() {
    setEvidenceLoading(true);
    setError("");
    try {
      await apiRequest<EmailSenderDomainEvidenceResponse>("/email/sender-domain-evidence", {
        method: "POST",
        body: {
          domain: evidenceDomain,
          evidenceType,
          provider: evidenceProvider || undefined,
          evidenceSummaryJson: {
            summary: evidenceSummary || "Manual sender-domain evidence captured for review.",
          },
          note: evidenceNote || undefined,
        },
      });
      setEvidenceSummary("");
      setEvidenceNote("");
      await refreshReadinessAndEvidence();
    } catch (evidenceError) {
      setError(evidenceError instanceof Error ? evidenceError.message : "Unable to save sender-domain evidence.");
    } finally {
      setEvidenceLoading(false);
    }
  }

  async function verifyEvidence(id: string) {
    setEvidenceLoading(true);
    setError("");
    try {
      await apiRequest<EmailSenderDomainEvidenceResponse>(`/email/sender-domain-evidence/${id}/verify`, {
        method: "POST",
        body: {},
      });
      await refreshReadinessAndEvidence();
    } catch (evidenceError) {
      setError(evidenceError instanceof Error ? evidenceError.message : "Unable to verify sender-domain evidence.");
    } finally {
      setEvidenceLoading(false);
    }
  }

  async function revokeEvidence(id: string) {
    setEvidenceLoading(true);
    setError("");
    try {
      await apiRequest<EmailSenderDomainEvidenceResponse>(`/email/sender-domain-evidence/${id}/revoke`, {
        method: "POST",
        body: {},
      });
      await refreshReadinessAndEvidence();
    } catch (evidenceError) {
      setError(evidenceError instanceof Error ? evidenceError.message : "Unable to revoke sender-domain evidence.");
    } finally {
      setEvidenceLoading(false);
    }
  }

  async function createMonitoringEvidence() {
    setMonitoringEvidenceLoading(true);
    setError("");
    try {
      await apiRequest<EmailDeliveryMonitoringEvidenceResponse>("/email/monitoring-evidence", {
        method: "POST",
        body: {
          evidenceType: monitoringEvidenceType,
          provider: monitoringEvidenceProvider || undefined,
          evidenceSummaryJson: {
            summary: monitoringEvidenceSummary || "Manual delivery monitoring evidence captured for review.",
          },
          note: monitoringEvidenceNote || undefined,
        },
      });
      setMonitoringEvidenceSummary("");
      setMonitoringEvidenceNote("");
      await refreshReadinessAndEvidence();
      setMonitoringPlan(null);
    } catch (monitoringError) {
      setError(monitoringError instanceof Error ? monitoringError.message : "Unable to save monitoring evidence.");
    } finally {
      setMonitoringEvidenceLoading(false);
    }
  }

  async function verifyMonitoringEvidence(id: string) {
    setMonitoringEvidenceLoading(true);
    setError("");
    try {
      await apiRequest<EmailDeliveryMonitoringEvidenceResponse>(`/email/monitoring-evidence/${id}/verify`, {
        method: "POST",
        body: {},
      });
      await refreshReadinessAndEvidence();
      setMonitoringPlan(null);
    } catch (monitoringError) {
      setError(monitoringError instanceof Error ? monitoringError.message : "Unable to verify monitoring evidence.");
    } finally {
      setMonitoringEvidenceLoading(false);
    }
  }

  async function revokeMonitoringEvidence(id: string) {
    setMonitoringEvidenceLoading(true);
    setError("");
    try {
      await apiRequest<EmailDeliveryMonitoringEvidenceResponse>(`/email/monitoring-evidence/${id}/revoke`, {
        method: "POST",
        body: {},
      });
      await refreshReadinessAndEvidence();
      setMonitoringPlan(null);
    } catch (monitoringError) {
      setError(monitoringError instanceof Error ? monitoringError.message : "Unable to revoke monitoring evidence.");
    } finally {
      setMonitoringEvidenceLoading(false);
    }
  }

  async function createSuppression() {
    setSuppressionLoading(true);
    setError("");
    try {
      await apiRequest<EmailSuppressionResponse>("/email/suppressions", {
        method: "POST",
        body: {
          email: suppressionEmail.trim(),
          reason: "MANUAL",
          note: suppressionNote || undefined,
        },
      });
      setSuppressionEmail("");
      setSuppressionNote("");
      await refreshReadinessAndEvidence();
    } catch (suppressionError) {
      setError(suppressionError instanceof Error ? suppressionError.message : "Unable to save email suppression.");
    } finally {
      setSuppressionLoading(false);
    }
  }

  async function revokeSuppression(id: string) {
    setSuppressionLoading(true);
    setError("");
    try {
      await apiRequest<EmailSuppressionResponse>(`/email/suppressions/${id}/revoke`, {
        method: "POST",
        body: {},
      });
      await refreshReadinessAndEvidence();
    } catch (suppressionError) {
      setError(suppressionError instanceof Error ? suppressionError.message : "Unable to revoke email suppression.");
    } finally {
      setSuppressionLoading(false);
    }
  }

  const canCleanTokens = canManageEmail;
  const canRunDiagnostics = canManageEmail;
  const diagnosticsEmailValid = !readiness?.diagnostics.executionEnabled || isValidTestEmailAddress(diagnosticsEmail);
  const evidenceDomainValid = evidenceDomain.trim().includes(".");
  const suppressionEmailValid = isValidTestEmailAddress(suppressionEmail);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Administration"
        title="Email outbox"
        description="Mock/local invite and password reset email records."
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to review email outbox records.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading email outbox...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {readiness ? <StatusMessage type="info">{emailProviderWarningText(readiness.provider, readiness.mockMode, readiness.realSendingEnabled)}</StatusMessage> : null}
      </div>

      <LedgerPageBody>
      {readiness ? (
        <LedgerPanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Email provider readiness</h2>
              <p className="mt-1 text-sm text-steel">Provider configuration and token-delivery safety checks.</p>
            </div>
            <LedgerStatusBadge tone={readiness.ready ? "success" : "warning"}>
              {emailReadinessLabel(readiness.ready)}
            </LedgerStatusBadge>
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
            <Detail label="Provider" value={emailProviderLabel(readiness.provider)} />
            <Detail label="From email" value={readiness.fromEmail} />
            <Detail label="Mock mode" value={readiness.mockMode ? "Yes" : "No"} />
            <Detail label="Real sending" value={readiness.realSendingEnabled ? "Enabled" : "Disabled"} />
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-5">
            <Detail label="SMTP host" value={smtpConfigStateLabel(readiness.smtp.hostConfigured)} />
            <Detail label="SMTP port" value={smtpConfigStateLabel(readiness.smtp.portConfigured)} />
            <Detail label="SMTP user" value={smtpConfigStateLabel(readiness.smtp.userConfigured)} />
            <Detail label="SMTP password" value={smtpConfigStateLabel(readiness.smtp.passwordConfigured)} />
            <Detail label="SMTP secure mode" value={readiness.smtp.secureModeConfigured ? (readiness.smtp.secure ? "Secure" : "Non-secure") : "Missing"} />
          </div>
          <div className="mt-4">
            <EmailReadinessSafeStatus readiness={readiness} diagnosticsResult={diagnosticsResult} />
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
            <Detail label="Sender domain" value={emailSenderDomainStatusLabel(readiness.senderDomain.evidenceStatus)} />
            <Detail label="Required evidence" value={readiness.senderDomain.requiredEvidenceTypes.join(", ")} />
            <Detail label="Relay diagnostics" value={emailRelayDiagnosticsStatusLabel(readiness.relayDiagnosticsStatus)} />
            <Detail label="Production email" value={readiness.productionReady ? "Ready" : "Not ready"} />
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <Detail label="Allowed recipients" value={readiness.diagnostics.allowedRecipientsConfigured ? "Configured" : "Missing"} />
            <Detail label="Allowed domains" value={readiness.diagnostics.allowedDomainsConfigured ? "Configured" : "Missing"} />
            <Detail label="Default behavior" value={readiness.diagnostics.noCustomerEmailSentByDefault ? "No customer email sent" : "Review required"} />
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <Detail label="Bounce webhook" value={readiness.bounceWebhookConfigured ? "Configured" : "Missing"} />
            <Detail
              label="Webhook verification"
              value={emailWebhookVerificationStatusLabel(readiness.webhookVerificationEnabled, readiness.webhookSecretConfigured)}
            />
            <Detail label="Webhook secret" value={readiness.webhookSecretConfigured ? "Configured" : "Missing"} />
            <Detail label="Suppressions" value={emailSuppressionStatusLabel(readiness.suppressionListConfigured, readiness.activeSuppressionCount)} />
            <Detail label="Retry policy" value={readiness.retryPolicyConfigured ? "Configured" : "Missing"} />
            <Detail label="Retry processor" value={emailRetryProcessorStatusLabel(readiness.retryProcessorEnabled)} />
            <Detail label="Retry worker" value={emailRetryWorkerStatusLabel(readiness.retryWorkerEnabled, readiness.retryWorkerConfigured)} />
            <Detail label="Pending retries" value={String(readiness.retryPendingCount)} />
            <Detail label="Blocked retries" value={String(readiness.retryBlockedCount)} />
            <Detail label="Suppressed retries" value={String(readiness.retrySuppressedCount)} />
            <Detail label="Provider events" value={emailProviderEventIngestionStatusLabel(readiness.providerEventIngestionReady)} />
            <Detail label="Monitoring evidence" value={emailMonitoringEvidenceStatusLabel(readiness.monitoringEvidenceStatus)} />
            <Detail label="Monitoring" value={readiness.monitoringConfigured ? "Configured" : "Missing"} />
            <Detail label="Alerting" value={readiness.alertingConfigured ? "Configured" : "Missing"} />
            <Detail label="Bounce threshold" value={readiness.bounceAlertThresholdConfigured ? "Configured" : "Missing"} />
            <Detail label="Complaint threshold" value={readiness.complaintAlertThresholdConfigured ? "Configured" : "Missing"} />
            <Detail label="Suppression trends" value={readiness.suppressionTrendMonitoringConfigured ? "Configured" : "Missing"} />
            <Detail label="Webhook health" value={readiness.providerWebhookHealthMonitoringConfigured ? "Configured" : "Missing"} />
          </div>
          {canManageEmail ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-ink">Retry and provider event readiness</h3>
              <p className="mt-1 text-sm text-steel">
                Retry processing is disabled by default and this page only shows safe plans. Provider event capture is mock-only until a signed webhook is
                configured, and webhook secrets are never displayed.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void viewRetryPlan()}
                  disabled={retryPlanLoading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {retryPlanLoading ? "Loading..." : "View retry plan"}
                </button>
                <button
                  type="button"
                  onClick={() => void viewRetryWorkerPlan()}
                  disabled={retryWorkerPlanLoading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {retryWorkerPlanLoading ? "Loading..." : "View worker plan"}
                </button>
                <button
                  type="button"
                  onClick={() => void viewMonitoringPlan()}
                  disabled={monitoringPlanLoading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {monitoringPlanLoading ? "Loading..." : "View monitoring plan"}
                </button>
                <button
                  type="button"
                  onClick={() => void viewEventReadiness()}
                  disabled={eventPlanLoading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {eventPlanLoading ? "Loading..." : "View event readiness"}
                </button>
                <button
                  type="button"
                  onClick={() => void viewWebhookPlan()}
                  disabled={webhookPlanLoading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {webhookPlanLoading ? "Loading..." : "View webhook plan"}
                </button>
              </div>
              {retryPlan ? (
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                  <Detail label="Execution" value={retryPlan.executionEnabled ? "Enabled" : "Disabled"} />
                  <Detail label="Retryable failed" value={String(retryPlan.failedRetryableCount)} />
                  <Detail label="Due attempts" value={String(retryPlan.nextAttemptCount)} />
                  <Detail label="Suppressed outbox" value={String(retryPlan.suppressedOutboxCount)} />
                  <Detail label="Max attempts" value={String(retryPlan.maxAttemptsPolicy.defaultMaxAttempts)} />
                </div>
              ) : null}
              {retryWorkerPlan ? (
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                  <Detail label="Worker" value={emailRetryWorkerStatusLabel(retryWorkerPlan.workerEnabled, retryWorkerPlan.workerConfigured)} />
                  <Detail label="Scheduler" value={retryWorkerPlan.schedulerProvider} />
                  <Detail label="Due retries" value={String(retryWorkerPlan.dueRetryCount)} />
                  <Detail label="Suppressed" value={String(retryWorkerPlan.suppressedCount)} />
                  <Detail label="Recommended schedule" value={retryWorkerPlan.recommendedSchedule} />
                </div>
              ) : null}
              {monitoringPlan ? (
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                  <Detail label="Evidence" value={emailMonitoringEvidenceStatusLabel(monitoringPlan.evidenceStatus)} />
                  <Detail label="Retry throughput" value={monitoringPlan.retryThroughputMonitoringConfigured ? "Configured" : "Missing"} />
                  <Detail label="Bounce threshold" value={monitoringPlan.bounceAlertThresholdConfigured ? "Configured" : "Missing"} />
                  <Detail label="Complaint threshold" value={monitoringPlan.complaintAlertThresholdConfigured ? "Configured" : "Missing"} />
                  <Detail label="Suppression trends" value={monitoringPlan.suppressionTrendMonitoringConfigured ? "Configured" : "Missing"} />
                  <Detail label="Webhook health" value={monitoringPlan.providerWebhookHealthMonitoringConfigured ? "Configured" : "Missing"} />
                </div>
              ) : null}
              {eventPlan ? (
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                  <Detail label="Mock ingestion" value={eventPlan.mockIngestionAvailable ? "Available" : "Missing"} />
                  <Detail label="Signature verified" value={eventPlan.bounceWebhookSignatureVerified ? "Yes" : "No"} />
                  <Detail label="Webhook" value={eventPlan.bounceWebhookConfigured ? "Configured" : "Missing"} />
                  <Detail label="Production contribution" value={eventPlan.productionReadyContribution ? "Yes" : "No"} />
                </div>
              ) : null}
              {webhookPlan ? (
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                  <Detail
                    label="Verification"
                    value={emailWebhookVerificationStatusLabel(webhookPlan.webhookVerificationEnabled, webhookPlan.webhookSecretConfigured)}
                  />
                  <Detail label="Allowed providers" value={webhookPlan.allowedProvidersConfigured ? webhookPlan.allowedProviders.join(", ") : "Missing"} />
                  <Detail label="Verified events" value={String(webhookPlan.verifiedEventCount)} />
                  <Detail label="Raw secret" value={webhookPlan.webhookSecretReturned ? "Returned" : "Not returned"} />
                </div>
              ) : null}
            </div>
          ) : null}
          {(readiness.blockers.length > 0 || readiness.blockingReasons.length > 0) ? (
            <div className="mt-4">
              <LedgerSummaryBand tone="warning">
              {(readiness.blockers.length > 0 ? readiness.blockers : readiness.blockingReasons).map((reason) => (
                <div key={reason}>{reason}</div>
              ))}
              </LedgerSummaryBand>
            </div>
          ) : null}
          {readiness.warnings.length > 0 ? (
            <div className="mt-4">
              <LedgerSummaryBand>
              {readiness.warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
              </LedgerSummaryBand>
            </div>
            ) : null}
          {canRunDiagnostics ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-ink">Safe email diagnostics</h3>
              <p className="mt-1 text-sm text-steel">
                Disabled by default. It sends no customer email unless server diagnostics are explicitly enabled and the recipient is allowlisted.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={diagnosticsEmail}
                  onChange={(event) => setDiagnosticsEmail(event.target.value)}
                  placeholder={readiness.diagnostics.executionEnabled ? "ops@example.test" : "Optional while disabled"}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void runDiagnostics()}
                  disabled={diagnosticsLoading || !diagnosticsEmailValid}
                  className="rounded-md bg-palm px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {diagnosticsLoading ? "Checking..." : "Run diagnostics"}
                </button>
              </div>
              {diagnosticsEmail && !diagnosticsEmailValid ? <p className="mt-2 text-sm text-rose-700">Enter a valid diagnostics email address.</p> : null}
              {diagnosticsResult ? (
                <p className="mt-2 text-sm text-steel">
                  {emailDiagnosticsStatusLabel(diagnosticsResult.status)} with provider{" "}
                  <span className="font-medium text-ink">{diagnosticsResult.provider}</span>;{" "}
                  {diagnosticsResult.noEmailSent ? "no email sent" : "delivery was attempted"}.
                </p>
              ) : null}
            </div>
          ) : null}
          {canManageEmail ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-ink">Sender-domain evidence</h3>
              <p className="mt-1 text-sm text-steel">
                Capture SPF, DKIM, DMARC, and provider-verification metadata only. Do not paste SMTP credentials, API keys, DNS provider tokens, auth
                headers, connection URLs, private DKIM keys, or customer email content.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_170px_1fr]">
                <input
                  type="text"
                  value={evidenceDomain}
                  onChange={(event) => setEvidenceDomain(event.target.value)}
                  placeholder={readiness.senderDomain.fromDomain ?? "example.test"}
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={evidenceType}
                  onChange={(event) => setEvidenceType(event.target.value as EmailSenderDomainEvidenceType)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {EVIDENCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={evidenceProvider}
                  onChange={(event) => setEvidenceProvider(event.target.value)}
                  placeholder="Provider"
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                value={evidenceSummary}
                onChange={(event) => setEvidenceSummary(event.target.value)}
                placeholder="Short metadata summary, no secrets"
                className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={evidenceNote}
                onChange={(event) => setEvidenceNote(event.target.value)}
                placeholder="Optional review note"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void createEvidence()}
                disabled={evidenceLoading || !evidenceDomainValid}
                className="mt-3 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {evidenceLoading ? "Saving..." : "Create draft evidence"}
              </button>
              {senderEvidence.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
                  {senderEvidence.map((evidence) => (
                    <div key={evidence.id} className="grid gap-2 border-b border-slate-100 p-3 text-sm md:grid-cols-[1fr_110px_120px_160px]">
                      <div>
                        <div className="font-medium text-ink">{evidence.domain}</div>
                        <div className="text-steel">{evidence.evidenceType}</div>
                      </div>
                      <div>{emailSenderDomainEvidenceStatusLabel(evidence.status)}</div>
                      <div>{evidence.provider ?? "Manual"}</div>
                      <div className="flex gap-2">
                        {evidence.status === "DRAFT" ? (
                          <button
                            type="button"
                            onClick={() => void verifyEvidence(evidence.id)}
                            disabled={evidenceLoading}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Verify
                          </button>
                        ) : null}
                        {evidence.status !== "REVOKED" ? (
                          <button
                            type="button"
                            onClick={() => void revokeEvidence(evidence.id)}
                            disabled={evidenceLoading}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">No sender-domain evidence captured yet.</p>
              )}
            </div>
          ) : null}
          {canManageEmail ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-ink">Delivery monitoring evidence</h3>
              <p className="mt-1 text-sm text-steel">
                Capture retry throughput, bounce and complaint threshold, suppression trend, delivery dashboard, and webhook-health evidence as metadata only.
                Do not paste SMTP credentials, API keys, webhook secrets, auth headers, raw provider payloads, customer recipient lists, or customer message
                bodies.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-[210px_1fr]">
                <select
                  value={monitoringEvidenceType}
                  onChange={(event) => setMonitoringEvidenceType(event.target.value as EmailDeliveryMonitoringEvidenceType)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {MONITORING_EVIDENCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={monitoringEvidenceProvider}
                  onChange={(event) => setMonitoringEvidenceProvider(event.target.value)}
                  placeholder="Provider or dashboard"
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                value={monitoringEvidenceSummary}
                onChange={(event) => setMonitoringEvidenceSummary(event.target.value)}
                placeholder="Short metadata summary, no secrets or recipients"
                className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={monitoringEvidenceNote}
                onChange={(event) => setMonitoringEvidenceNote(event.target.value)}
                placeholder="Optional review note"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void createMonitoringEvidence()}
                disabled={monitoringEvidenceLoading}
                className="mt-3 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {monitoringEvidenceLoading ? "Saving..." : "Create monitoring evidence"}
              </button>
              {monitoringEvidence.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
                  {monitoringEvidence.map((evidence) => (
                    <div key={evidence.id} className="grid gap-2 border-b border-slate-100 p-3 text-sm md:grid-cols-[1fr_110px_120px_160px]">
                      <div>
                        <div className="font-medium text-ink">{evidence.evidenceType}</div>
                        <div className="text-steel">{evidence.provider ?? "Manual"}</div>
                      </div>
                      <div>{emailSenderDomainEvidenceStatusLabel(evidence.status)}</div>
                      <div>{evidence.productionReadyContribution ? "Contributes" : "Review only"}</div>
                      <div className="flex gap-2">
                        {evidence.status === "DRAFT" ? (
                          <button
                            type="button"
                            onClick={() => void verifyMonitoringEvidence(evidence.id)}
                            disabled={monitoringEvidenceLoading}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Verify
                          </button>
                        ) : null}
                        {evidence.status !== "REVOKED" ? (
                          <button
                            type="button"
                            onClick={() => void revokeMonitoringEvidence(evidence.id)}
                            disabled={monitoringEvidenceLoading}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">No delivery monitoring evidence captured yet.</p>
              )}
            </div>
          ) : null}
          {canManageEmail ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-ink">Suppression list</h3>
              <p className="mt-1 text-sm text-steel">
                Manual entries and verified bounce/complaint events store masked and hashed email metadata only. Active suppressions block future send attempts;
                no customer email is sent by default.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input
                  type="email"
                  value={suppressionEmail}
                  onChange={(event) => setSuppressionEmail(event.target.value)}
                  placeholder="recipient@example.test"
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={suppressionNote}
                  onChange={(event) => setSuppressionNote(event.target.value)}
                  placeholder="Optional metadata note, no secrets"
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void createSuppression()}
                  disabled={suppressionLoading || !suppressionEmailValid}
                  className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {suppressionLoading ? "Saving..." : "Add suppression"}
                </button>
              </div>
              {suppressionEmail && !suppressionEmailValid ? <p className="mt-2 text-sm text-rose-700">Enter a valid suppression email address.</p> : null}
              {suppressions.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
                  {suppressions.map((suppression) => (
                    <div key={suppression.id} className="grid gap-2 border-b border-slate-100 p-3 text-sm md:grid-cols-[1fr_130px_90px_110px]">
                      <div>
                        <div className="font-medium text-ink">{suppression.emailMasked}</div>
                        <div className="text-xs text-steel">Hash {suppression.emailHash.slice(0, 12)}...</div>
                      </div>
                      <div>{suppression.reason}</div>
                      <div>{suppression.active ? "Active" : "Revoked"}</div>
                      <div>
                        {suppression.active ? (
                          <button
                            type="button"
                            onClick={() => void revokeSuppression(suppression.id)}
                            disabled={suppressionLoading}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">No email suppressions captured yet.</p>
              )}
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            {canCleanTokens ? (
              <button
                type="button"
                onClick={() => void cleanupExpiredTokens()}
                disabled={cleanupLoading}
                className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {cleanupLoading ? "Cleaning..." : "Clean expired tokens"}
              </button>
            ) : null}
            {cleanupResult ? (
              <span className="text-sm text-steel">
                Deleted {cleanupResult.deletedCount} expired unconsumed token{cleanupResult.deletedCount === 1 ? "" : "s"} older than{" "}
                {cleanupResult.olderThanDays} days.
              </span>
            ) : null}
          </div>
        </LedgerPanel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <LedgerPanel className="p-0">
          <div aria-label="Email outbox table" className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[1fr_1fr_110px_150px] border-b border-line bg-mist px-4 py-2 text-xs font-semibold uppercase text-steel">
            <div>To</div>
            <div>Template</div>
            <div>Status</div>
            <div>Created</div>
          </div>
          {emails.map((email) => (
            <button
              key={email.id}
              type="button"
              onClick={() => void openDetail(email.id)}
              className="ledger-focus grid w-full min-w-[760px] grid-cols-[1fr_1fr_110px_150px] items-center border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50"
            >
              <span className="truncate text-ink">{email.toEmail}</span>
              <span className="text-steel">{emailTemplateLabel(email.templateType)}</span>
              <span>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${emailStatusClass(email.status)}`}>{emailStatusLabel(email.status)}</span>
              </span>
              <span className="text-xs text-steel">{formatDate(email.createdAt)}</span>
            </button>
          ))}
          </div>
          {!loading && emails.length === 0 ? <LedgerEmptyState title="No email records found" description="Mock invite and password reset email records will appear here." /> : null}
        </LedgerPanel>

        <LedgerPanel>
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-ink">{selected.subject}</h2>
                <p className="mt-1 text-sm text-steel">{selected.toEmail}</p>
              </div>
              <LedgerMetadataRow
                items={[
                  { label: "Template", value: emailTemplateLabel(selected.templateType) },
                  { label: "Status", value: emailStatusLabel(selected.status) },
                  { label: "Provider", value: selected.provider },
                  { label: "Sent", value: selected.sentAt ? formatDate(selected.sentAt) : "-" },
                ]}
              />
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-mist p-3 text-sm text-ink">{selected.bodyText}</pre>
            </div>
          ) : (
            <StatusMessage type="empty">Select an email to inspect the mock message body.</StatusMessage>
          )}
        </LedgerPanel>
      </div>
      </LedgerPageBody>
    </LedgerPage>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-mist px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function StatusMessage({ children, type }: Readonly<{ children: React.ReactNode; type: "empty" | "error" | "info" | "loading" }>) {
  if (type === "loading") {
    return <LedgerLoadingState title="Loading" description={children} />;
  }
  if (type === "empty") {
    return <LedgerEmptyState title="No email selected" description={children} />;
  }
  if (type === "error") {
    return <LedgerAlert tone="danger">{children}</LedgerAlert>;
  }
  return <LedgerAlert tone="info">{children}</LedgerAlert>;
}
