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
            noCustomerEmailSentByDefault: true,
          },
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
    expect(screen.getByText(/Diagnostics disabled/)).toBeTruthy();
    expect(document.body.textContent).not.toContain("smtp-password-secret");
  });
});
