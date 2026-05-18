"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { EmailReadinessSafeStatus } from "@/components/email/email-readiness-safe-status";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  emailProviderLabel,
  emailProviderEventIngestionStatusLabel,
  emailProviderWarningText,
  emailReadinessClass,
  emailReadinessLabel,
  emailDiagnosticsStatusLabel,
  emailRelayDiagnosticsStatusLabel,
  emailRetryProcessorStatusLabel,
  emailSenderDomainEvidenceStatusLabel,
  emailSenderDomainStatusLabel,
  emailStatusClass,
  emailStatusLabel,
  emailTemplateLabel,
  isValidTestEmailAddress,
  smtpConfigStateLabel,
} from "@/lib/email";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  AuthTokenCleanupResponse,
  EmailDiagnosticsResponse,
  EmailOutboxDetail,
  EmailOutboxEntry,
  EmailProviderEventsPlan,
  EmailReadinessResponse,
  EmailRetryPlan,
  EmailSenderDomainEvidence,
  EmailSenderDomainEvidenceListResponse,
  EmailSenderDomainEvidenceResponse,
  EmailSenderDomainEvidenceType,
} from "@/lib/types";

const EVIDENCE_TYPES: EmailSenderDomainEvidenceType[] = ["SPF", "DKIM", "DMARC", "MX", "RETURN_PATH", "PROVIDER_VERIFICATION", "OTHER"];

export default function EmailOutboxPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManageEmail = can(PERMISSIONS.users.manage);
  const [emails, setEmails] = useState<EmailOutboxEntry[]>([]);
  const [readiness, setReadiness] = useState<EmailReadinessResponse | null>(null);
  const [senderEvidence, setSenderEvidence] = useState<EmailSenderDomainEvidence[]>([]);
  const [selected, setSelected] = useState<EmailOutboxDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<AuthTokenCleanupResponse | null>(null);
  const [diagnosticsEmail, setDiagnosticsEmail] = useState("");
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<EmailDiagnosticsResponse | null>(null);
  const [retryPlan, setRetryPlan] = useState<EmailRetryPlan | null>(null);
  const [retryPlanLoading, setRetryPlanLoading] = useState(false);
  const [eventPlan, setEventPlan] = useState<EmailProviderEventsPlan | null>(null);
  const [eventPlanLoading, setEventPlanLoading] = useState(false);
  const [evidenceDomain, setEvidenceDomain] = useState("");
  const [evidenceType, setEvidenceType] = useState<EmailSenderDomainEvidenceType>("SPF");
  const [evidenceProvider, setEvidenceProvider] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceLoading, setEvidenceLoading] = useState(false);
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
    Promise.all([apiRequest<EmailOutboxEntry[]>("/email/outbox"), apiRequest<EmailReadinessResponse>("/email/readiness"), evidenceRequest])
      .then(([outbox, emailReadiness, evidenceResponse]) => {
        setEmails(outbox);
        setReadiness(emailReadiness);
        setSenderEvidence(evidenceResponse.evidence);
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

  async function refreshReadinessAndEvidence() {
    const [emailReadiness, evidenceResponse] = await Promise.all([
      apiRequest<EmailReadinessResponse>("/email/readiness"),
      apiRequest<EmailSenderDomainEvidenceListResponse>("/email/sender-domain-evidence"),
    ]);
    setReadiness(emailReadiness);
    setSenderEvidence(evidenceResponse.evidence);
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

  const canCleanTokens = canManageEmail;
  const canRunDiagnostics = canManageEmail;
  const diagnosticsEmailValid = !readiness?.diagnostics.executionEnabled || isValidTestEmailAddress(diagnosticsEmail);
  const evidenceDomainValid = evidenceDomain.trim().includes(".");

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Email outbox</h1>
        <p className="mt-1 text-sm text-steel">Mock/local invite and password reset email records.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to review email outbox records.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading email outbox...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {readiness ? <StatusMessage type="info">{emailProviderWarningText(readiness.provider, readiness.mockMode, readiness.realSendingEnabled)}</StatusMessage> : null}
      </div>

      {readiness ? (
        <section className="mt-5 rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Email provider readiness</h2>
              <p className="mt-1 text-sm text-steel">Provider configuration and token-delivery safety checks.</p>
            </div>
            <span className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${emailReadinessClass(readiness.ready)}`}>
              {emailReadinessLabel(readiness.ready)}
            </span>
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
            <Detail label="Retry policy" value={readiness.retryPolicyConfigured ? "Configured" : "Missing"} />
            <Detail label="Retry processor" value={emailRetryProcessorStatusLabel(readiness.retryProcessorEnabled)} />
            <Detail label="Pending retries" value={String(readiness.retryPendingCount)} />
            <Detail label="Blocked retries" value={String(readiness.retryBlockedCount)} />
            <Detail label="Provider events" value={emailProviderEventIngestionStatusLabel(readiness.providerEventIngestionReady)} />
            <Detail label="Monitoring" value={readiness.monitoringConfigured ? "Configured" : "Missing"} />
          </div>
          {canManageEmail ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-ink">Retry and provider event readiness</h3>
              <p className="mt-1 text-sm text-steel">
                Retry processing is disabled by default and this page only shows safe plans. Provider event capture is mock-only until a signed webhook is
                implemented.
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
                  onClick={() => void viewEventReadiness()}
                  disabled={eventPlanLoading}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {eventPlanLoading ? "Loading..." : "View event readiness"}
                </button>
              </div>
              {retryPlan ? (
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                  <Detail label="Execution" value={retryPlan.executionEnabled ? "Enabled" : "Disabled"} />
                  <Detail label="Retryable failed" value={String(retryPlan.failedRetryableCount)} />
                  <Detail label="Due attempts" value={String(retryPlan.nextAttemptCount)} />
                  <Detail label="Max attempts" value={String(retryPlan.maxAttemptsPolicy.defaultMaxAttempts)} />
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
            </div>
          ) : null}
          {(readiness.blockers.length > 0 || readiness.blockingReasons.length > 0) ? (
            <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              {(readiness.blockers.length > 0 ? readiness.blockers : readiness.blockingReasons).map((reason) => (
                <div key={reason}>{reason}</div>
              ))}
            </div>
          ) : null}
          {readiness.warnings.length > 0 ? (
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-steel">
              {readiness.warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
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
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_1fr_110px_150px] border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
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
              className="grid w-full grid-cols-[1fr_1fr_110px_150px] items-center border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50"
            >
              <span className="truncate text-ink">{email.toEmail}</span>
              <span className="text-steel">{emailTemplateLabel(email.templateType)}</span>
              <span>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${emailStatusClass(email.status)}`}>{emailStatusLabel(email.status)}</span>
              </span>
              <span className="text-xs text-steel">{formatDate(email.createdAt)}</span>
            </button>
          ))}
          {!loading && emails.length === 0 ? <div className="px-4 py-6 text-sm text-steel">No email records found.</div> : null}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-ink">{selected.subject}</h2>
                <p className="mt-1 text-sm text-steel">{selected.toEmail}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Template" value={emailTemplateLabel(selected.templateType)} />
                <Detail label="Status" value={emailStatusLabel(selected.status)} />
                <Detail label="Provider" value={selected.provider} />
                <Detail label="Sent" value={selected.sentAt ? formatDate(selected.sentAt) : "-"} />
              </div>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-ink">{selected.bodyText}</pre>
            </div>
          ) : (
            <StatusMessage type="empty">Select an email to inspect the mock message body.</StatusMessage>
          )}
        </section>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
