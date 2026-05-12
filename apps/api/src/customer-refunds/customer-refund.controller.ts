import { Body, Controller, Delete, Get, Param, Post, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CustomerRefundService } from "./customer-refund.service";
import { CreateCustomerRefundDto } from "./dto/create-customer-refund.dto";

@Controller("customer-refunds")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class CustomerRefundController {
  constructor(private readonly customerRefundService: CustomerRefundService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.customerRefunds.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.customerRefundService.list(organizationId);
  }

  @Get("refundable-sources")
  @RequirePermissions(PERMISSIONS.customerRefunds.view)
  refundableSources(@CurrentOrganizationId() organizationId: string, @Query("customerId") customerId: string) {
    return this.customerRefundService.refundableSources(organizationId, customerId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.customerRefunds.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerRefundDto,
  ) {
    return this.customerRefundService.create(organizationId, user.id, dto);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.customerRefunds.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerRefundService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
  @RequirePermissions(PERMISSIONS.customerRefunds.view)
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
  @RequirePermissions(PERMISSIONS.customerRefunds.view)
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerRefundService.generatePdf(organizationId, user.id, id);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.customerRefunds.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerRefundService.get(organizationId, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.customerRefunds.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerRefundService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.customerRefunds.void)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerRefundService.remove(organizationId, user.id, id);
  }
}
