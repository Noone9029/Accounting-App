import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { AttachmentService } from "./attachment.service";
import { AttachmentQueryDto } from "./dto/attachment-query.dto";
import { CreateAttachmentDto } from "./dto/create-attachment.dto";
import { UpdateAttachmentDto } from "./dto/update-attachment.dto";

@Controller("attachments")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.attachments.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: AttachmentQueryDto) {
    return this.attachmentService.list(organizationId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.attachments.upload)
  upload(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAttachmentDto,
  ) {
    return this.attachmentService.upload(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.attachments.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.attachmentService.get(organizationId, id);
  }

  @Get(":id/download")
  @RequirePermissions(PERMISSIONS.attachments.download)
  async download(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { filename, mimeType, buffer } = await this.attachmentService.download(organizationId, id);
    response.set({
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.attachments.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateAttachmentDto,
  ) {
    return this.attachmentService.update(organizationId, user.id, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.attachments.delete)
  softDelete(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.attachmentService.softDelete(organizationId, user.id, id);
  }
}
