import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { EmailModule } from "../email/email.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PurchaseDebitNoteController } from "./purchase-debit-note.controller";
import { PurchaseDebitNoteEmailDeliveryService } from "./purchase-debit-note-email-delivery.service";
import { PurchaseDebitNoteService } from "./purchase-debit-note.service";

@Module({
  imports: [PrismaModule, AuditLogModule, FiscalPeriodModule, NumberSequenceModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule, EmailModule],
  controllers: [PurchaseDebitNoteController],
  providers: [PurchaseDebitNoteService, PurchaseDebitNoteEmailDeliveryService],
  exports: [PurchaseDebitNoteService],
})
export class PurchaseDebitNoteModule {}
