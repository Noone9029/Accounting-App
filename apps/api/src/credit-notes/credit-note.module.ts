import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CreditNoteController } from "./credit-note.controller";
import { CreditNoteService } from "./credit-note.service";

@Module({
  imports: [PrismaModule, AuditLogModule, FiscalPeriodModule, NumberSequenceModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule],
  controllers: [CreditNoteController],
  providers: [CreditNoteService],
  exports: [CreditNoteService],
})
export class CreditNoteModule {}
