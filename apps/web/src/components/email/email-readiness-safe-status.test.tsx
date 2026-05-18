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
          retryPolicyConfigured: false,
          monitoringConfigured: false,
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
    expect(screen.getByText("Retry policy missing")).toBeTruthy();
    expect(screen.getByText("Monitoring missing")).toBeTruthy();
    expect(screen.getAllByText(/Diagnostics disabled/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("smtp-password-secret");
    expect(document.body.textContent).not.toContain("PRIVATE KEY");
  });
});
