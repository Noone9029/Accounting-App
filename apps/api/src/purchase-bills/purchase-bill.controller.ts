import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { CreatePurchaseBillDto } from "./dto/create-purchase-bill.dto";
import { UpdatePurchaseBillDto } from "./dto/update-purchase-bill.dto";
import { PurchaseBillService } from "./purchase-bill.service";

@Controller("purchase-bills")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class PurchaseBillController {
  constructor(private readonly purchaseBillService: PurchaseBillService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.purchaseBillService.list(organizationId);
  }

  @Get("open")
  listOpen(@CurrentOrganizationId() organizationId: string, @Query("supplierId") supplierId?: string) {
    return this.purchaseBillService.listOpen(organizationId, supplierId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseBillDto,
  ) {
    return this.purchaseBillService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseBillService.get(organizationId, id);
  }

  @Get(":id/pdf-data")
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseBillService.pdfData(organizationId, id);
  }

  @Get(":id/debit-notes")
  debitNotes(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseBillService.debitNotes(organizationId, id);
  }

  @Get(":id/debit-note-allocations")
  debitNoteAllocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseBillService.debitNoteAllocations(organizationId, id);
  }

  @Get(":id/pdf")
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
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseBillService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseBillDto,
  ) {
    return this.purchaseBillService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/finalize")
  finalize(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseBillService.finalize(organizationId, user.id, id);
  }

  @Post(":id/void")
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseBillService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseBillService.remove(organizationId, user.id, id);
  }
}
