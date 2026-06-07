import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import type { AuthenticatedRequest, AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { assertGeneratedDocumentDownloadPermission } from "../generated-documents/generated-document-permissions";
import { CreateDeliveryNoteDto } from "./dto/create-delivery-note.dto";
import { UpdateDeliveryNoteDto } from "./dto/update-delivery-note.dto";
import { DeliveryNoteService } from "./delivery-note.service";

@Controller("delivery-notes")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class DeliveryNoteController {
  constructor(private readonly deliveryNoteService: DeliveryNoteService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  list(@CurrentOrganizationId() organizationId: string, @Query("status") status?: string, @Query("customerId") customerId?: string) {
    return this.deliveryNoteService.list(organizationId, { status, customerId });
  }

  @Get("next-number")
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  nextNumberPreview(@CurrentOrganizationId() organizationId: string) {
    return this.deliveryNoteService.nextNumberPreview(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliveryNoteDto,
  ) {
    return this.deliveryNoteService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.deliveryNoteService.get(organizationId, id);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.deliveryNoteService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertGeneratedDocumentDownloadPermission(request);
    const { buffer, filename } = await this.deliveryNoteService.pdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-pdf")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  generatePdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    assertGeneratedDocumentDownloadPermission(request);
    return this.deliveryNoteService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateDeliveryNoteDto,
  ) {
    return this.deliveryNoteService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/issue")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  issue(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.deliveryNoteService.issue(organizationId, user.id, id);
  }

  @Post(":id/mark-delivered")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  markDelivered(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.deliveryNoteService.markDelivered(organizationId, user.id, id);
  }

  @Post(":id/cancel")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  cancel(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.deliveryNoteService.cancel(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.deliveryNoteService.void(organizationId, user.id, id);
  }
}
