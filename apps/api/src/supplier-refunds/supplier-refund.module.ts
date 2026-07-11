import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { ForeignExchangeModule } from "../foreign-exchange/foreign-exchange.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SupplierRefundController } from "./supplier-refund.controller";
import { SupplierRefundService } from "./supplier-refund.service";

@Module({
  imports: [PrismaModule, AuditLogModule, FiscalPeriodModule, ForeignExchangeModule, NumberSequenceModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule],
  controllers: [SupplierRefundController],
  providers: [SupplierRefundService],
  exports: [SupplierRefundService],
})
export class SupplierRefundModule {}
