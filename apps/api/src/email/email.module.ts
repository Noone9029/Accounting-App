import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailController } from "./email.controller";
import { EMAIL_PROVIDER, type EmailProvider } from "./email-provider";
import { EmailService } from "./email.service";
import { MockEmailProvider } from "./mock-email.provider";

@Global()
@Module({
  controllers: [EmailController],
  providers: [
    EmailService,
    MockEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (_config: ConfigService, mockProvider: MockEmailProvider): EmailProvider => mockProvider,
      inject: [ConfigService, MockEmailProvider],
    },
  ],
  exports: [EmailService, EMAIL_PROVIDER],
})
export class EmailModule {}
