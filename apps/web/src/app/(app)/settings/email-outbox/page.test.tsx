import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import EmailOutboxPage from "./page";

const apiRequestMock = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: () => true,
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("EmailOutboxPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/email/outbox") {
        return Promise.resolve([]);
      }
      if (path === "/email/readiness") {
        return Promise.resolve(emailReadiness());
      }
      if (path === "/email/sender-domain-evidence") {
        return Promise.resolve({ metadataOnly: true, noCustomerEmail: true, noEmailSent: true, noOutboxRecord: true, redactionGuarantees: [], evidence: [] });
      }
      if (path === "/email/suppressions") {
        return Promise.resolve({ metadataOnly: true, noCustomerEmail: true, noEmailSent: true, noOutboxRecord: true, redactionGuarantees: [], suppressions: [] });
      }
      if (path === "/email/monitoring-evidence") {
        return Promise.resolve({ metadataOnly: true, noCustomerEmail: true, noEmailSent: true, noOutboxRecord: true, redactionGuarantees: [], evidence: [] });
      }
      if (path === "/email/invoice-payment/readiness") {
        return Promise.resolve({
          providerState: "NONE",
          status: "Disabled",
          configured: false,
          localMockOnly: false,
          sendEnabled: false,
          actualSendBlocked: true,
          noProviderCalls: true,
          noCredentialsStored: true,
          noCustomerEmailSent: true,
          previewEnabled: false,
          supportedTemplates: [
            { templateType: "SALES_INVOICE", label: "Invoice email", previewAvailable: true, deliveryStatus: "Blocked" },
            { templateType: "INVOICE_PAYMENT_LINK", label: "Payment link email", previewAvailable: true, deliveryStatus: "Blocked" },
            { templateType: "PAYMENT_RECEIPT", label: "Receipt/payment confirmation email", previewAvailable: true, deliveryStatus: "Blocked" },
            { templateType: "FAILED_DELIVERY_NOTIFICATION", label: "Failed delivery notification", previewAvailable: true, deliveryStatus: "Blocked" },
          ],
          recentEventCount: 0,
          blockers: ["Actual invoice/payment email delivery is blocked until a production provider, credential custody, and operational approval exist."],
          warnings: ["Preview rendering uses fake local data only."],
          redactionGuarantees: [],
        });
      }
      return Promise.resolve({});
    });
  });

  it("renders invoice and payment email readiness as blocked without credential entry", async () => {
    render(<EmailOutboxPage />);

    expect(await screen.findByRole("heading", { name: "Invoice and payment email readiness" })).toBeInTheDocument();
    expect(screen.getByText("Payment link email")).toBeInTheDocument();
    expect(screen.getByText("Receipt/payment confirmation email")).toBeInTheDocument();
    expect(screen.getByText("Actual invoice/payment email delivery is blocked until a production provider, credential custody, and operational approval exist.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview payment-link template" })).toBeDisabled();

    const text = document.body.textContent ?? "";
    expect(text).toContain("Actual sending");
    expect(text).toContain("Blocked");
    expect(text).not.toContain("smtp-password-secret");
    expect(screen.queryByPlaceholderText(/SMTP password/i)).not.toBeInTheDocument();
  });
});

function emailReadiness() {
  return {
    provider: "mock",
    ready: true,
    blockingReasons: [],
    warnings: ["Mock email provider is active. No real email will be sent."],
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
    blockers: [],
    redactionGuarantees: [],
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
      blockers: [],
      warnings: [],
    },
    relayDiagnosticsStatus: "SKIPPED_DISABLED",
    relayDiagnosticsRequired: true,
    retryPolicyConfigured: true,
    retryProcessorEnabled: false,
    retryWorkerConfigured: false,
    retryWorkerEnabled: false,
    retryPendingCount: 0,
    retryBlockedCount: 0,
    retrySuppressedCount: 0,
    bounceWebhookConfigured: false,
    bounceWebhookSignatureVerified: false,
    webhookVerificationConfigured: false,
    webhookVerificationEnabled: false,
    webhookSecretConfigured: false,
    providerWebhookSignatureVerified: false,
    suppressionListConfigured: true,
    activeSuppressionCount: 0,
    providerEventIngestionReady: false,
    monitoringEvidenceStatus: "BLOCKED",
    monitoringConfigured: false,
    alertingConfigured: false,
    retryThroughputMonitoringConfigured: false,
    bounceAlertThresholdConfigured: false,
    complaintAlertThresholdConfigured: false,
    suppressionTrendMonitoringConfigured: false,
    providerWebhookHealthMonitoringConfigured: false,
    providerWebhookAlertsReady: false,
  };
}
