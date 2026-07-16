import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { ForeignExchangeModule } from "../foreign-exchange/foreign-exchange.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CustomerPaymentController } from "./customer-payment.controller";
import { CustomerPaymentEmailDeliveryService } from "./customer-payment-email-delivery.service";
import { CustomerPaymentService } from "./customer-payment.service";

@Module({
  imports: [PrismaModule, AuditLogModule, FiscalPeriodModule, ForeignExchangeModule, NumberSequenceModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule],
  controllers: [CustomerPaymentController],
  providers: [CustomerPaymentService, CustomerPaymentEmailDeliveryService],
})
export class CustomerPaymentModule {}
