import { EmailDeliveryStatus } from "@prisma/client";

export interface EmailDeliveryStatusDetails {
  nextAttemptAt?: Date | null;
  suppressed?: boolean;
  providerEventStatus?: string | null;
}

export function salesInvoiceDeliveryStatusLabel(status: EmailDeliveryStatus, details: EmailDeliveryStatusDetails = {}): string {
  if (details.suppressed || details.providerEventStatus === "SUPPRESSED") {
    return "Blocked by suppression";
  }
  if (details.providerEventStatus === "BOUNCED") {
    return "Bounced";
  }
  if (details.providerEventStatus === "COMPLAINED") {
    return "Recipient complaint";
  }
  if (status === EmailDeliveryStatus.QUEUED) {
    return "Queued";
  }
  if (status === EmailDeliveryStatus.SENT_MOCK) {
    return "Simulated locally";
  }
  if (status === EmailDeliveryStatus.SENT_PROVIDER) {
    return "Accepted by email provider";
  }
  if (details.nextAttemptAt) {
    return "Delivery attempt failed, retry scheduled";
  }
  return "Delivery failed";
}
