import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SupplierPaymentController } from "./supplier-payment.controller";
import { SupplierPaymentService } from "./supplier-payment.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule],
  controllers: [SupplierPaymentController],
  providers: [SupplierPaymentService],
  exports: [SupplierPaymentService],
})
export class SupplierPaymentModule {}
