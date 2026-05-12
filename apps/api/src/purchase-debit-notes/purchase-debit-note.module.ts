import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PurchaseDebitNoteController } from "./purchase-debit-note.controller";
import { PurchaseDebitNoteService } from "./purchase-debit-note.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule],
  controllers: [PurchaseDebitNoteController],
  providers: [PurchaseDebitNoteService],
  exports: [PurchaseDebitNoteService],
})
export class PurchaseDebitNoteModule {}
