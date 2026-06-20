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
import { CreateSalesQuoteDto } from "./dto/create-sales-quote.dto";
import { UpdateSalesQuoteDto } from "./dto/update-sales-quote.dto";
import { SalesQuoteService } from "./sales-quote.service";

@Controller("sales-quotes")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class SalesQuoteController {
  constructor(private readonly salesQuoteService: SalesQuoteService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  list(@CurrentOrganizationId() organizationId: string, @Query("status") status?: string, @Query("customerId") customerId?: string) {
    return this.salesQuoteService.list(organizationId, { status, customerId });
  }

  @Get("next-number")
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  nextNumberPreview(@CurrentOrganizationId() organizationId: string) {
    return this.salesQuoteService.nextNumberPreview(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalesQuoteDto,
  ) {
    return this.salesQuoteService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesQuoteService.get(organizationId, id);
  }

  @Get(":id/workflow-summary")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  workflowSummary(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesQuoteService.workflowSummary(organizationId, id);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesQuoteService.pdfData(organizationId, id);
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
    const { buffer, filename } = await this.salesQuoteService.pdf(organizationId, user.id, id);
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
    return this.salesQuoteService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSalesQuoteDto,
  ) {
    return this.salesQuoteService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/mark-sent")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  markSent(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesQuoteService.markSent(organizationId, user.id, id);
  }

  @Post(":id/accept")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  accept(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesQuoteService.accept(organizationId, user.id, id);
  }

  @Post(":id/reject")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  reject(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesQuoteService.reject(organizationId, user.id, id);
  }

  @Post(":id/expire")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  expire(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesQuoteService.expire(organizationId, user.id, id);
  }

  @Post(":id/cancel")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  cancel(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesQuoteService.cancel(organizationId, user.id, id);
  }

  @Post(":id/convert-to-invoice")
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  convertToInvoice(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesQuoteService.convertToInvoice(organizationId, user.id, id);
  }
}
