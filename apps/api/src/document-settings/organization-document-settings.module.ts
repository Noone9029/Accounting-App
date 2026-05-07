import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { OrganizationDocumentSettingsController } from "./organization-document-settings.controller";
import { OrganizationDocumentSettingsService } from "./organization-document-settings.service";

@Module({
  imports: [AuditLogModule],
  controllers: [OrganizationDocumentSettingsController],
  providers: [OrganizationDocumentSettingsService],
  exports: [OrganizationDocumentSettingsService],
})
export class OrganizationDocumentSettingsModule {}
