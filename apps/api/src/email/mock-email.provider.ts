import { Injectable } from "@nestjs/common";
import { EmailDeliveryStatus } from "@prisma/client";
import type { EmailMessage, EmailProvider, EmailProviderResult } from "./email-provider";

@Injectable()
export class MockEmailProvider implements EmailProvider {
  readonly provider = "mock";
  readonly isMock = true;

  async send(_message: EmailMessage): Promise<EmailProviderResult> {
    return {
      provider: this.provider,
      status: EmailDeliveryStatus.SENT_MOCK,
      providerMessageId: null,
      errorMessage: null,
      sentAt: new Date(),
    };
  }
}
