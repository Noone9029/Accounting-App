import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { EmailController } from "./email.controller";
import { DocumentDeliveryService } from "./document-delivery.service";
import { EmailRetryWorkerService } from "./email-retry-worker.service";
import { EMAIL_PROVIDER, type EmailProvider } from "./email-provider";
import { EmailService } from "./email.service";
import { MockEmailProvider } from "./mock-email.provider";
import { SmtpEmailProvider } from "./smtp-email.provider";

@Global()
@Module({
  imports: [AuditLogModule, GeneratedDocumentModule],
  controllers: [EmailController],
  providers: [
    EmailService,
    DocumentDeliveryService,
    EmailRetryWorkerService,
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
  exports: [EmailService, DocumentDeliveryService, EMAIL_PROVIDER],
})
export class EmailModule {}
