import { render, screen } from "@testing-library/react";
import { EmailReadinessSafeStatus } from "./email-readiness-safe-status";
import type { EmailReadinessResponse } from "@/lib/types";

describe("EmailReadinessSafeStatus", () => {
  it("renders safe production and diagnostics status without secret values", () => {
    render(
      <EmailReadinessSafeStatus
        readiness={{
          provider: "mock",
          ready: true,
          blockingReasons: [],
          blockers: ["SMTP provider must be enabled before production email delivery is considered ready."],
          warnings: [],
          fromEmail: "no-reply@ledgerbyte.local",
          localOnly: true,
          noCustomerEmailSent: true,
          readOnly: true,
          noMutation: true,
          providerConfigured: true,
          fromAddressConfigured: true,
          replyToConfigured: false,
          smtpHostConfigured: false,
          smtpPortConfigured: false,
          smtpSecureModeConfigured: false,
          credentialsConfigured: false,
          productionReady: false,
          redactionGuarantees: ["Secrets are redacted."],
          diagnostics: {
            executionEnabled: false,
            allowedRecipientsConfigured: false,
            allowedDomainsConfigured: true,
            provider: "mock",
            smtpConfigured: false,
            wouldSendToRedactedRecipient: null,
            noCustomerEmailSentByDefault: true,
            noMutationByDefault: true,
            productionReady: false,
          },
          senderDomain: {
            fromDomain: "ledgerbyte.local",
            replyToDomain: null,
            evidenceRequired: true,
            requiredEvidenceTypes: ["SPF", "DKIM", "DMARC"],
            verifiedEvidenceTypes: [],
            missingEvidenceTypes: ["SPF", "DKIM", "DMARC"],
            evidenceStatus: "BLOCKED",
            productionReadyContribution: false,
            blockers: ["SPF, DKIM, and DMARC evidence must be captured before production email readiness review."],
            warnings: ["Sender-domain evidence is metadata-only. No DNS provider secrets are stored."],
          },
          relayDiagnosticsStatus: "SKIPPED_DISABLED",
          relayDiagnosticsRequired: true,
          bounceWebhookConfigured: false,
          bounceWebhookSignatureVerified: false,
          webhookVerificationConfigured: false,
          webhookVerificationEnabled: false,
          webhookSecretConfigured: false,
          providerWebhookSignatureVerified: false,
          providerEventIngestionReady: false,
          suppressionListConfigured: true,
          activeSuppressionCount: 0,
          retryPolicyConfigured: false,
          retryProcessorEnabled: false,
          retryWorkerConfigured: false,
          retryWorkerEnabled: false,
          retryPendingCount: 0,
          retryBlockedCount: 0,
          retrySuppressedCount: 0,
          monitoringEvidenceStatus: "BLOCKED",
          retryThroughputMonitoringConfigured: false,
          suppressionTrendMonitoringConfigured: false,
          providerWebhookHealthMonitoringConfigured: false,
          monitoringConfigured: false,
          alertingConfigured: false,
          bounceAlertThresholdConfigured: false,
          complaintAlertThresholdConfigured: false,
          providerWebhookAlertsReady: false,
          smtp: {
            hostConfigured: false,
            portConfigured: false,
            userConfigured: false,
            passwordConfigured: false,
            secureModeConfigured: false,
            secure: false,
          },
          mockMode: true,
          realSendingEnabled: false,
        }}
        diagnosticsResult={{
          status: "SKIPPED_DISABLED",
          executionEnabled: false,
          executionAttempted: false,
          noEmailSent: true,
          noCustomerEmailSent: true,
          noMutation: true,
          provider: "mock",
          message: "Email diagnostics sending is disabled by default.",
          redactionGuarantees: ["Secrets are redacted."],
        }}
      />,
    );

    expect(screen.getByText("Production email not ready")).toBeTruthy();
    expect(screen.getByText("No customer email sent")).toBeTruthy();
    expect(screen.getByText("Disabled by default")).toBeTruthy();
    expect(screen.getByText("SPF/DKIM/DMARC required")).toBeTruthy();
    expect(screen.getByText("Bounce webhooks missing")).toBeTruthy();
    expect(screen.getByText("Webhook verification disabled")).toBeTruthy();
    expect(screen.getByText("0 active suppressions")).toBeTruthy();
    expect(screen.getByText("Retry processor disabled")).toBeTruthy();
    expect(screen.getByText("Retry worker disabled")).toBeTruthy();
    expect(screen.getByText("Mock-only event ingestion")).toBeTruthy();
    expect(screen.getByText("Monitoring evidence missing")).toBeTruthy();
    expect(screen.getByText("Monitoring missing")).toBeTruthy();
    expect(screen.getAllByText(/Diagnostics disabled/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("smtp-password-secret");
    expect(document.body.textContent).not.toContain("PRIVATE KEY");
  });
});
