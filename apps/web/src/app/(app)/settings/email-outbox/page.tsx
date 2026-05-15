"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  emailProviderLabel,
  emailProviderWarningText,
  emailReadinessClass,
  emailReadinessLabel,
  emailStatusClass,
  emailStatusLabel,
  emailTemplateLabel,
  isValidTestEmailAddress,
  smtpConfigStateLabel,
} from "@/lib/email";
import { PERMISSIONS } from "@/lib/permissions";
import type { AuthTokenCleanupResponse, EmailOutboxDetail, EmailOutboxEntry, EmailReadinessResponse } from "@/lib/types";

export default function EmailOutboxPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [emails, setEmails] = useState<EmailOutboxEntry[]>([]);
  const [readiness, setReadiness] = useState<EmailReadinessResponse | null>(null);
  const [selected, setSelected] = useState<EmailOutboxDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<AuthTokenCleanupResponse | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSendResult, setTestSendResult] = useState<EmailOutboxDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    setLoading(true);
    setError("");
    Promise.all([apiRequest<EmailOutboxEntry[]>("/email/outbox"), apiRequest<EmailReadinessResponse>("/email/readiness")])
      .then(([outbox, emailReadiness]) => {
        setEmails(outbox);
        setReadiness(emailReadiness);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load email outbox."))
      .finally(() => setLoading(false));
  }, [organizationId]);

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

  async function sendTestEmail() {
    setTestSending(true);
    setTestSendResult(null);
    setError("");
    try {
      const result = await apiRequest<EmailOutboxDetail>("/email/test-send", {
        method: "POST",
        body: { toEmail: testEmail.trim() },
      });
      setTestSendResult(result);
      setSelected(result);
      setEmails((current) => [result, ...current.filter((email) => email.id !== result.id)]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send test email.");
    } finally {
      setTestSending(false);
    }
  }

  const canCleanTokens = can(PERMISSIONS.users.manage);
  const canSendTestEmail = can(PERMISSIONS.users.manage);
  const testEmailValid = isValidTestEmailAddress(testEmail);

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
            <Detail label="SMTP secure" value={readiness.smtp.secure ? "True" : "False"} />
          </div>
          {readiness.blockingReasons.length > 0 ? (
            <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              {readiness.blockingReasons.map((reason) => (
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
          {canSendTestEmail ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-ink">Send test email</h3>
              <p className="mt-1 text-sm text-steel">Uses the active provider. Mock mode records the message in this outbox only.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="ops@example.com"
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void sendTestEmail()}
                  disabled={testSending || !testEmailValid}
                  className="rounded-md bg-palm px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {testSending ? "Sending..." : "Send test email"}
                </button>
              </div>
              {testEmail && !testEmailValid ? <p className="mt-2 text-sm text-rose-700">Enter a valid email address.</p> : null}
              {testSendResult ? (
                <p className="mt-2 text-sm text-steel">
                  Test email recorded with status <span className="font-medium text-ink">{emailStatusLabel(testSendResult.status)}</span>.
                </p>
              ) : null}
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
