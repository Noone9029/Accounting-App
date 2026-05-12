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
import { CreateSupplierRefundDto } from "./dto/create-supplier-refund.dto";
import { SupplierRefundService } from "./supplier-refund.service";

@Controller("supplier-refunds")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class SupplierRefundController {
  constructor(private readonly supplierRefundService: SupplierRefundService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.supplierRefunds.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.supplierRefundService.list(organizationId);
  }

  @Get("refundable-sources")
  @RequirePermissions(PERMISSIONS.supplierRefunds.view)
  refundableSources(@CurrentOrganizationId() organizationId: string, @Query("supplierId") supplierId: string) {
    return this.supplierRefundService.refundableSources(organizationId, supplierId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.supplierRefunds.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierRefundDto,
  ) {
    return this.supplierRefundService.create(organizationId, user.id, dto);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.supplierRefunds.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.supplierRefundService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
  @RequirePermissions(PERMISSIONS.supplierRefunds.view)
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.supplierRefundService.pdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-pdf")
  @RequirePermissions(PERMISSIONS.supplierRefunds.view)
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.supplierRefundService.generatePdf(organizationId, user.id, id);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.supplierRefunds.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.supplierRefundService.get(organizationId, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.supplierRefunds.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.supplierRefundService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.supplierRefunds.void)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.supplierRefundService.remove(organizationId, user.id, id);
  }
}
