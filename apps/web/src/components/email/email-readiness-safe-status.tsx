import {
  emailDiagnosticsStatusLabel,
  emailProductionReadinessLabel,
  emailRelayDiagnosticsStatusLabel,
  emailSenderDomainStatusLabel,
} from "@/lib/email";
import type { EmailDiagnosticsResponse, EmailReadinessResponse } from "@/lib/types";

export function EmailReadinessSafeStatus({
  readiness,
  diagnosticsResult,
}: {
  readiness: EmailReadinessResponse;
  diagnosticsResult?: EmailDiagnosticsResponse | null;
}) {
  const blockers = readiness.blockers.length > 0 ? readiness.blockers : readiness.blockingReasons;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <SafeStatusItem label="Production readiness" value={emailProductionReadinessLabel(readiness.productionReady)} />
        <SafeStatusItem label="Readiness sends email" value={readiness.noCustomerEmailSent ? "No customer email sent" : "Review required"} />
        <SafeStatusItem
          label="Diagnostics gate"
          value={readiness.diagnostics.executionEnabled ? "Allowlist required" : "Disabled by default"}
        />
        <SafeStatusItem label="Sender domain" value={emailSenderDomainStatusLabel(readiness.senderDomain.evidenceStatus)} />
        <SafeStatusItem label="Relay diagnostics" value={emailRelayDiagnosticsStatusLabel(readiness.relayDiagnosticsStatus)} />
        <SafeStatusItem label="Bounces" value={readiness.bounceWebhookConfigured ? "Webhook configured" : "Bounce webhooks missing"} />
        <SafeStatusItem label="Retries" value={readiness.retryPolicyConfigured ? "Retry policy configured" : "Retry policy missing"} />
        <SafeStatusItem label="Monitoring" value={readiness.monitoringConfigured ? "Monitoring configured" : "Monitoring missing"} />
      </div>
      <p className="mt-3 text-steel">
        Password reset and invite reliability depend on production SMTP, from/reply-to addresses, credentials, and provider delivery checks. Diagnostic
        execution is disabled unless the server flag and recipient allowlist are configured.
      </p>
      <p className="mt-2 text-steel">
        Sender-domain readiness requires SPF, DKIM, and DMARC evidence for the configured sender domain. Evidence capture is metadata-only and does not
        perform DNS provider actions or send customer email.
      </p>
      {diagnosticsResult ? (
        <p className="mt-2 font-medium text-ink">
          {emailDiagnosticsStatusLabel(diagnosticsResult.status)}:{" "}
          {diagnosticsResult.noEmailSent ? "no email sent" : "provider delivery attempted"}.
        </p>
      ) : null}
      {blockers.length > 0 ? (
        <div className="mt-3 rounded-md bg-amber-50 p-3 text-amber-800">
          {blockers.slice(0, 3).map((blocker) => (
            <div key={blocker}>{blocker}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SafeStatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}
