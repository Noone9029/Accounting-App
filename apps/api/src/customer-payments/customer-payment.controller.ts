import { Body, Controller, Delete, Get, Param, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { CustomerPaymentService } from "./customer-payment.service";
import { ApplyUnappliedPaymentDto } from "./dto/apply-unapplied-payment.dto";
import { CreateCustomerPaymentDto } from "./dto/create-customer-payment.dto";
import { ReverseUnappliedPaymentAllocationDto } from "./dto/reverse-unapplied-payment-allocation.dto";

@Controller("customer-payments")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class CustomerPaymentController {
  constructor(private readonly customerPaymentService: CustomerPaymentService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.customerPaymentService.list(organizationId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerPaymentDto,
  ) {
    return this.customerPaymentService.create(organizationId, user.id, dto);
  }

  @Get(":id/receipt-data")
  receiptData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerPaymentService.receiptData(organizationId, id);
  }

  @Get(":id/receipt-pdf-data")
  receiptPdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerPaymentService.receiptPdfData(organizationId, id);
  }

  @Get(":id/receipt.pdf")
  async receiptPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.customerPaymentService.receiptPdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-receipt-pdf")
  generateReceiptPdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerPaymentService.generateReceiptPdf(organizationId, user.id, id);
  }

  @Get(":id/unapplied-allocations")
  unappliedAllocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerPaymentService.listUnappliedAllocations(organizationId, id);
  }

  @Post(":id/apply-unapplied")
  applyUnapplied(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ApplyUnappliedPaymentDto,
  ) {
    return this.customerPaymentService.applyUnapplied(organizationId, user.id, id, dto);
  }

  @Post(":id/unapplied-allocations/:allocationId/reverse")
  reverseUnappliedAllocation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("allocationId") allocationId: string,
    @Body() dto: ReverseUnappliedPaymentAllocationDto,
  ) {
    return this.customerPaymentService.reverseUnappliedAllocation(organizationId, user.id, id, allocationId, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerPaymentService.get(organizationId, id);
  }

  @Post(":id/void")
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerPaymentService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerPaymentService.remove(organizationId, user.id, id);
  }
}
