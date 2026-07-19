import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { EmailModule } from "../email/email.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { ForeignExchangeModule } from "../foreign-exchange/foreign-exchange.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SupplierPaymentController } from "./supplier-payment.controller";
import { SupplierPaymentEmailDeliveryService } from "./supplier-payment-email-delivery.service";
import { SupplierPaymentService } from "./supplier-payment.service";

@Module({
  imports: [PrismaModule, AuditLogModule, FiscalPeriodModule, ForeignExchangeModule, NumberSequenceModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule, EmailModule],
  controllers: [SupplierPaymentController],
  providers: [SupplierPaymentService, SupplierPaymentEmailDeliveryService],
  exports: [SupplierPaymentService],
})
export class SupplierPaymentModule {}
