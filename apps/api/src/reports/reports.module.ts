import { Module } from "@nestjs/common";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [GeneratedDocumentModule, OrganizationDocumentSettingsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
