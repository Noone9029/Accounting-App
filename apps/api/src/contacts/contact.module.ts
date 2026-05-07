import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { ContactLedgerService } from "./contact-ledger.service";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";

@Module({
  imports: [AuditLogModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule],
  controllers: [ContactController],
  providers: [ContactService, ContactLedgerService],
})
export class ContactModule {}
