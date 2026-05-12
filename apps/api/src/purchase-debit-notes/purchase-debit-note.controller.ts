import { Body, Controller, Delete, Get, Param, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ApplyPurchaseDebitNoteDto } from "./dto/apply-purchase-debit-note.dto";
import { CreatePurchaseDebitNoteDto } from "./dto/create-purchase-debit-note.dto";
import { ReversePurchaseDebitNoteAllocationDto } from "./dto/reverse-purchase-debit-note-allocation.dto";
import { UpdatePurchaseDebitNoteDto } from "./dto/update-purchase-debit-note.dto";
import { PurchaseDebitNoteService } from "./purchase-debit-note.service";

@Controller("purchase-debit-notes")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class PurchaseDebitNoteController {
  constructor(private readonly purchaseDebitNoteService: PurchaseDebitNoteService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.purchaseDebitNoteService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseDebitNoteDto,
  ) {
    return this.purchaseDebitNoteService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseDebitNoteService.get(organizationId, id);
  }

  @Get(":id/allocations")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.view)
  allocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseDebitNoteService.allocations(organizationId, id);
  }

  @Post(":id/apply")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.finalize)
  apply(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ApplyPurchaseDebitNoteDto,
  ) {
    return this.purchaseDebitNoteService.apply(organizationId, user.id, id, dto);
  }

  @Post(":id/allocations/:allocationId/reverse")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.void)
  reverseAllocation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("allocationId") allocationId: string,
    @Body() dto: ReversePurchaseDebitNoteAllocationDto,
  ) {
    return this.purchaseDebitNoteService.reverseAllocation(organizationId, user.id, id, allocationId, dto);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseDebitNoteService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.view)
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.purchaseDebitNoteService.pdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-pdf")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.view)
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseDebitNoteService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.create)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseDebitNoteDto,
  ) {
    return this.purchaseDebitNoteService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/finalize")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.finalize)
  finalize(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseDebitNoteService.finalize(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseDebitNoteService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.purchaseDebitNotes.create)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseDebitNoteService.remove(organizationId, user.id, id);
  }
}
