import { Module } from "@nestjs/common";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { CreditNoteModule } from "../credit-notes/credit-note.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SalesInvoiceController } from "./sales-invoice.controller";
import { SalesInvoiceService } from "./sales-invoice.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, AccountingModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule, CreditNoteModule],
  controllers: [SalesInvoiceController],
  providers: [SalesInvoiceService],
})
export class SalesInvoiceModule {}
