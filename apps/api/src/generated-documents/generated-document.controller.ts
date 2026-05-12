import { Controller, Get, Param, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { GeneratedDocumentQueryDto } from "./dto/generated-document-query.dto";
import { GeneratedDocumentService } from "./generated-document.service";

@Controller("generated-documents")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class GeneratedDocumentController {
  constructor(private readonly generatedDocumentService: GeneratedDocumentService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.generatedDocuments.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: GeneratedDocumentQueryDto) {
    return this.generatedDocumentService.list(organizationId, query);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.generatedDocuments.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.generatedDocumentService.get(organizationId, id);
  }

  @Get(":id/download")
  @RequirePermissions(PERMISSIONS.generatedDocuments.download)
  async download(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { filename, mimeType, buffer } = await this.generatedDocumentService.download(organizationId, id);
    response.set({
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }
}
