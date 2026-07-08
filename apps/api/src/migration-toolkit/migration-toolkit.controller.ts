import { Body, Controller, Get, Param, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { ImportEntityType } from "@prisma/client";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CommitImportJobDto, CreateImportJobDto } from "./dto/migration-toolkit.dto";
import { MigrationToolkitService } from "./migration-toolkit.service";

@Controller("migration-toolkit")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class MigrationToolkitController {
  constructor(private readonly migrationToolkitService: MigrationToolkitService) {}

  @Get("templates")
  @RequirePermissions(PERMISSIONS.migrationToolkit.view)
  templates() {
    return this.migrationToolkitService.templates();
  }

  @Get("templates/:entityType.csv")
  @RequirePermissions(PERMISSIONS.migrationToolkit.view)
  templateCsv(@Param("entityType") entityType: ImportEntityType, @Res({ passthrough: true }) response: Response) {
    const file = this.migrationToolkitService.templateCsv(entityType);
    return csvResponse(file.filename, file.content, response);
  }

  @Get("import-jobs")
  @RequirePermissions(PERMISSIONS.migrationToolkit.view)
  listImportJobs(@CurrentOrganizationId() organizationId: string) {
    return this.migrationToolkitService.listImportJobs(organizationId);
  }

  @Post("import-jobs")
  @RequirePermissions(PERMISSIONS.migrationToolkit.import)
  createImportJob(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateImportJobDto,
  ) {
    return this.migrationToolkitService.createImportJob(organizationId, user.id, dto);
  }

  @Get("import-jobs/:id")
  @RequirePermissions(PERMISSIONS.migrationToolkit.view)
  getImportJob(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.migrationToolkitService.getImportJob(organizationId, id);
  }

  @Post("import-jobs/:id/commit")
  @RequirePermissions(PERMISSIONS.migrationToolkit.commit)
  commitImportJob(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CommitImportJobDto,
  ) {
    return this.migrationToolkitService.commitImportJob(organizationId, user.id, id, dto);
  }

  @Get("exports/:entityType.csv")
  @RequirePermissions(PERMISSIONS.migrationToolkit.export)
  async exportCsv(@CurrentOrganizationId() organizationId: string, @Param("entityType") entityType: ImportEntityType, @Res({ passthrough: true }) response: Response) {
    const file = await this.migrationToolkitService.exportCsv(organizationId, entityType);
    return csvResponse(file.filename, file.content, response);
  }
}

function csvResponse(filename: string, content: string, response: Response) {
  response.setHeader("content-type", "text/csv; charset=utf-8");
  response.setHeader("content-disposition", `attachment; filename="${filename}"`);
  return new StreamableFile(Buffer.from(content, "utf8"));
}
