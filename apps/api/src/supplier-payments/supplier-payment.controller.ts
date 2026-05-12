import { Body, Controller, Delete, Get, Param, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ApplyUnappliedSupplierPaymentDto } from "./dto/apply-unapplied-supplier-payment.dto";
import { CreateSupplierPaymentDto } from "./dto/create-supplier-payment.dto";
import { ReverseUnappliedSupplierPaymentAllocationDto } from "./dto/reverse-unapplied-supplier-payment-allocation.dto";
import { SupplierPaymentService } from "./supplier-payment.service";

@Controller("supplier-payments")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class SupplierPaymentController {
  constructor(private readonly supplierPaymentService: SupplierPaymentService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.supplierPaymentService.list(organizationId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierPaymentDto,
  ) {
    return this.supplierPaymentService.create(organizationId, user.id, dto);
  }

  @Get(":id/allocations")
  allocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.supplierPaymentService.allocations(organizationId, id);
  }

  @Get(":id/unapplied-allocations")
  unappliedAllocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.supplierPaymentService.unappliedAllocations(organizationId, id);
  }

  @Post(":id/apply-unapplied")
  applyUnapplied(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ApplyUnappliedSupplierPaymentDto,
  ) {
    return this.supplierPaymentService.applyUnapplied(organizationId, user.id, id, dto);
  }

  @Post(":id/unapplied-allocations/:allocationId/reverse")
  reverseUnappliedAllocation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("allocationId") allocationId: string,
    @Body() dto: ReverseUnappliedSupplierPaymentAllocationDto,
  ) {
    return this.supplierPaymentService.reverseUnappliedAllocation(organizationId, user.id, id, allocationId, dto);
  }

  @Get(":id/receipt-data")
  receiptData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.supplierPaymentService.receiptData(organizationId, id);
  }

  @Get(":id/receipt-pdf-data")
  receiptPdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.supplierPaymentService.receiptPdfData(organizationId, id);
  }

  @Get(":id/receipt.pdf")
  async receiptPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.supplierPaymentService.receiptPdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-receipt-pdf")
  generateReceiptPdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.supplierPaymentService.generateReceiptPdf(organizationId, user.id, id);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.supplierPaymentService.get(organizationId, id);
  }

  @Post(":id/void")
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.supplierPaymentService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.supplierPaymentService.remove(organizationId, user.id, id);
  }
}
