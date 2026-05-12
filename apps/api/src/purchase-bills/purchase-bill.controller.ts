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
import { CreatePurchaseBillDto } from "./dto/create-purchase-bill.dto";
import { UpdatePurchaseBillDto } from "./dto/update-purchase-bill.dto";
import { PurchaseBillService } from "./purchase-bill.service";

@Controller("purchase-bills")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class PurchaseBillController {
  constructor(private readonly purchaseBillService: PurchaseBillService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.purchaseBillService.list(organizationId);
  }

  @Get("open")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  listOpen(@CurrentOrganizationId() organizationId: string, @Query("supplierId") supplierId?: string) {
    return this.purchaseBillService.listOpen(organizationId, supplierId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.purchaseBills.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseBillDto,
  ) {
    return this.purchaseBillService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseBillService.get(organizationId, id);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseBillService.pdfData(organizationId, id);
  }

  @Get(":id/debit-notes")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  debitNotes(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseBillService.debitNotes(organizationId, id);
  }

  @Get(":id/debit-note-allocations")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  debitNoteAllocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseBillService.debitNoteAllocations(organizationId, id);
  }

  @Get(":id/supplier-payment-unapplied-allocations")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  supplierPaymentUnappliedAllocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseBillService.supplierPaymentUnappliedAllocations(organizationId, id);
  }

  @Get(":id/pdf")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.purchaseBillService.pdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-pdf")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseBillService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.purchaseBills.update)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseBillDto,
  ) {
    return this.purchaseBillService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/finalize")
  @RequirePermissions(PERMISSIONS.purchaseBills.finalize)
  finalize(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseBillService.finalize(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.purchaseBills.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseBillService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.purchaseBills.update)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseBillService.remove(organizationId, user.id, id);
  }
}
