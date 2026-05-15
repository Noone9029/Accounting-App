import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailController } from "./email.controller";
import { EMAIL_PROVIDER, type EmailProvider } from "./email-provider";
import { EmailService } from "./email.service";
import { MockEmailProvider } from "./mock-email.provider";
import { SmtpEmailProvider } from "./smtp-email.provider";

@Global()
@Module({
  controllers: [EmailController],
  providers: [
    EmailService,
    MockEmailProvider,
    SmtpEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (config: ConfigService, mockProvider: MockEmailProvider, smtpProvider: SmtpEmailProvider): EmailProvider => {
        const provider = config.get<string>("EMAIL_PROVIDER")?.trim().toLowerCase() || "mock";
        return provider === "mock" ? mockProvider : smtpProvider;
      },
      inject: [ConfigService, MockEmailProvider, SmtpEmailProvider],
    },
  ],
  exports: [EmailService, EMAIL_PROVIDER],
})
export class EmailModule {}
