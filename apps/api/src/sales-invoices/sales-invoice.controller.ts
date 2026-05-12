import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreditNoteService } from "../credit-notes/credit-note.service";
import { CreateSalesInvoiceDto } from "./dto/create-sales-invoice.dto";
import { UpdateSalesInvoiceDto } from "./dto/update-sales-invoice.dto";
import { SalesInvoiceService } from "./sales-invoice.service";

@Controller("sales-invoices")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class SalesInvoiceController {
  constructor(
    private readonly salesInvoiceService: SalesInvoiceService,
    private readonly creditNoteService: CreditNoteService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.salesInvoiceService.list(organizationId);
  }

  @Get("open")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  open(@CurrentOrganizationId() organizationId: string, @Query("customerId") customerId?: string) {
    return this.salesInvoiceService.open(organizationId, customerId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalesInvoiceDto,
  ) {
    return this.salesInvoiceService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesInvoiceService.get(organizationId, id);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesInvoiceService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.salesInvoiceService.pdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Get(":id/credit-notes")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  creditNotes(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.creditNoteService.listForInvoice(organizationId, id);
  }

  @Get(":id/credit-note-allocations")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  creditNoteAllocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.creditNoteService.allocationsForInvoice(organizationId, id);
  }

  @Get(":id/customer-payment-unapplied-allocations")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  customerPaymentUnappliedAllocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesInvoiceService.paymentUnappliedAllocations(organizationId, id);
  }

  @Post(":id/generate-pdf")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInvoiceService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSalesInvoiceDto,
  ) {
    return this.salesInvoiceService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/finalize")
  @RequirePermissions(PERMISSIONS.salesInvoices.finalize)
  finalize(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInvoiceService.finalize(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.salesInvoices.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInvoiceService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInvoiceService.remove(organizationId, user.id, id);
  }
}
