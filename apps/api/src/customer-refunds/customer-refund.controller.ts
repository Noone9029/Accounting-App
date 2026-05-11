import { Body, Controller, Delete, Get, Param, Post, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { CustomerRefundService } from "./customer-refund.service";
import { CreateCustomerRefundDto } from "./dto/create-customer-refund.dto";

@Controller("customer-refunds")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class CustomerRefundController {
  constructor(private readonly customerRefundService: CustomerRefundService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.customerRefundService.list(organizationId);
  }

  @Get("refundable-sources")
  refundableSources(@CurrentOrganizationId() organizationId: string, @Query("customerId") customerId: string) {
    return this.customerRefundService.refundableSources(organizationId, customerId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerRefundDto,
  ) {
    return this.customerRefundService.create(organizationId, user.id, dto);
  }

  @Get(":id/pdf-data")
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerRefundService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.customerRefundService.pdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-pdf")
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerRefundService.generatePdf(organizationId, user.id, id);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerRefundService.get(organizationId, id);
  }

  @Post(":id/void")
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerRefundService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerRefundService.remove(organizationId, user.id, id);
  }
}
