import { EmailDeliveryStatus } from "@prisma/client";
import { salesInvoiceDeliveryStatusLabel } from "./email-delivery-status";

describe("sales invoice delivery status labels", () => {
  it.each([
    [EmailDeliveryStatus.QUEUED, "Queued"],
    [EmailDeliveryStatus.SENT_MOCK, "Simulated locally"],
    [EmailDeliveryStatus.SENT_PROVIDER, "Accepted by email provider"],
    [EmailDeliveryStatus.FAILED, "Delivery failed"],
  ])("maps %s without claiming delivery", (status, label) => {
    expect(salesInvoiceDeliveryStatusLabel(status)).toBe(label);
  });

  it("distinguishes retry, suppression, bounce, and complaint states", () => {
    expect(salesInvoiceDeliveryStatusLabel(EmailDeliveryStatus.FAILED, { nextAttemptAt: new Date() })).toBe("Delivery attempt failed, retry scheduled");
    expect(salesInvoiceDeliveryStatusLabel(EmailDeliveryStatus.FAILED, { suppressed: true })).toBe("Blocked by suppression");
    expect(salesInvoiceDeliveryStatusLabel(EmailDeliveryStatus.SENT_PROVIDER, { providerEventStatus: "BOUNCED" })).toBe("Bounced");
    expect(salesInvoiceDeliveryStatusLabel(EmailDeliveryStatus.SENT_PROVIDER, { providerEventStatus: "COMPLAINED" })).toBe("Recipient complaint");
  });
});
