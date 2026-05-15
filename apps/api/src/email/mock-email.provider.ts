import { Injectable } from "@nestjs/common";
import { EmailDeliveryStatus } from "@prisma/client";
import type { EmailMessage, EmailProvider, EmailProviderReadiness, EmailProviderResult } from "./email-provider";

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

  readiness(): EmailProviderReadiness {
    return {
      provider: this.provider,
      ready: true,
      blockingReasons: [],
      warnings: ["Mock email provider is active. No real email will be sent."],
      smtp: {
        hostConfigured: false,
        portConfigured: false,
        userConfigured: false,
        passwordConfigured: false,
        secure: false,
      },
      mockMode: true,
      realSendingEnabled: false,
    };
  }
}
