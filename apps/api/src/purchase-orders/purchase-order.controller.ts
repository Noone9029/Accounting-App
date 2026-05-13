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
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";
import { PurchaseOrderService } from "./purchase-order.service";

@Controller("purchase-orders")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.purchaseOrders.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.purchaseOrderService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.purchaseOrders.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.purchaseOrders.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseOrderService.get(organizationId, id);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.purchaseOrders.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseOrderService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
  @RequirePermissions(PERMISSIONS.purchaseOrders.view)
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.purchaseOrderService.pdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-pdf")
  @RequirePermissions(PERMISSIONS.purchaseOrders.view)
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseOrderService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/approve")
  @RequirePermissions(PERMISSIONS.purchaseOrders.approve)
  approve(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseOrderService.approve(organizationId, user.id, id);
  }

  @Post(":id/mark-sent")
  @RequirePermissions(PERMISSIONS.purchaseOrders.approve)
  markSent(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseOrderService.markSent(organizationId, user.id, id);
  }

  @Post(":id/close")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update)
  close(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseOrderService.close(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.purchaseOrders.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseOrderService.void(organizationId, user.id, id);
  }

  @Post(":id/convert-to-bill")
  @RequirePermissions(PERMISSIONS.purchaseOrders.convertToBill)
  convertToBill(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseOrderService.convertToBill(organizationId, user.id, id);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseOrderService.remove(organizationId, user.id, id);
  }
}
