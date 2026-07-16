import { BadRequestException } from "@nestjs/common";

export function normalizeCustomerDocumentRecipient(value: string | null | undefined, sourceLabel: string): string {
  const recipient = value?.trim().toLowerCase() ?? "";
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new BadRequestException(`A valid recipient email is required for ${sourceLabel} delivery.`);
  }
  return recipient;
}

export function normalizeCustomerDocumentSubject(value: string | undefined, fallback: string, sourceLabel: string): string {
  const subject = value?.trim() || fallback;
  if (subject.length > 200 || /[\r\n]/.test(subject)) {
    throw new BadRequestException(`${sourceLabel} email subject must be 200 characters or fewer and cannot contain line breaks.`);
  }
  return subject;
}

export function normalizeCustomerDocumentMessage(value: string | undefined): string | undefined {
  const message = value?.trim();
  if (message && message.length > 5000) {
    throw new BadRequestException("Email message must be 5,000 characters or fewer.");
  }
  return message || undefined;
}
