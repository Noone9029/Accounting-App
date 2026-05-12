import { Body, Controller, Delete, Get, Param, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ApplyPurchaseDebitNoteDto } from "./dto/apply-purchase-debit-note.dto";
import { CreatePurchaseDebitNoteDto } from "./dto/create-purchase-debit-note.dto";
import { ReversePurchaseDebitNoteAllocationDto } from "./dto/reverse-purchase-debit-note-allocation.dto";
import { UpdatePurchaseDebitNoteDto } from "./dto/update-purchase-debit-note.dto";
import { PurchaseDebitNoteService } from "./purchase-debit-note.service";

@Controller("purchase-debit-notes")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class PurchaseDebitNoteController {
  constructor(private readonly purchaseDebitNoteService: PurchaseDebitNoteService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.purchaseDebitNoteService.list(organizationId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseDebitNoteDto,
  ) {
    return this.purchaseDebitNoteService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseDebitNoteService.get(organizationId, id);
  }

  @Get(":id/allocations")
  allocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseDebitNoteService.allocations(organizationId, id);
  }

  @Post(":id/apply")
  apply(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ApplyPurchaseDebitNoteDto,
  ) {
    return this.purchaseDebitNoteService.apply(organizationId, user.id, id, dto);
  }

  @Post(":id/allocations/:allocationId/reverse")
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
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseDebitNoteService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
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
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseDebitNoteService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseDebitNoteDto,
  ) {
    return this.purchaseDebitNoteService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/finalize")
  finalize(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseDebitNoteService.finalize(organizationId, user.id, id);
  }

  @Post(":id/void")
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseDebitNoteService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseDebitNoteService.remove(organizationId, user.id, id);
  }
}
