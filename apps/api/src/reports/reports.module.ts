import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { FxReportingService } from "./fx-reporting.service";

@Module({
  imports: [AuditLogModule, GeneratedDocumentModule, OrganizationDocumentSettingsModule],
  controllers: [ReportsController],
  providers: [ReportsService, FxReportingService],
  exports: [ReportsService, FxReportingService],
})
export class ReportsModule {}
