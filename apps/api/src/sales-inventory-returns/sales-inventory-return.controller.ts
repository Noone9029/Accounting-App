import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateSalesInventoryReturnDto } from "./dto/create-sales-inventory-return.dto";
import { UpdateSalesInventoryReturnDto } from "./dto/update-sales-inventory-return.dto";
import { SalesInventoryReturnService } from "./sales-inventory-return.service";

@Controller("sales-inventory-returns")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class SalesInventoryReturnController {
  constructor(private readonly salesInventoryReturnService: SalesInventoryReturnService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: Record<string, string | string[] | undefined>) {
    return this.salesInventoryReturnService.list(organizationId, query);
  }

  @Get("next-number")
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  nextNumberPreview(@CurrentOrganizationId() organizationId: string) {
    return this.salesInventoryReturnService.nextNumberPreview(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalesInventoryReturnDto,
  ) {
    return this.salesInventoryReturnService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesInventoryReturnService.get(organizationId, id);
  }

  @Get(":id/inventory-return-preview")
  @RequirePermissions(PERMISSIONS.inventory.view)
  inventoryReturnPreview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesInventoryReturnService.inventoryReturnPreview(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSalesInventoryReturnDto,
  ) {
    return this.salesInventoryReturnService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/submit")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  submit(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInventoryReturnService.submit(organizationId, user.id, id);
  }

  @Post(":id/approve")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  approve(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInventoryReturnService.approve(organizationId, user.id, id);
  }

  @Post(":id/receive")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  receive(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInventoryReturnService.receive(organizationId, user.id, id);
  }

  @Post(":id/cancel")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  cancel(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInventoryReturnService.cancel(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInventoryReturnService.void(organizationId, user.id, id);
  }

  @Post(":id/post-inventory-return")
  @RequirePermissions(PERMISSIONS.stockMovements.create)
  postInventoryReturnMovement(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInventoryReturnService.postInventoryReturnMovement(organizationId, user.id, id);
  }
}
