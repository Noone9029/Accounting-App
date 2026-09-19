import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { InventoryMovementAccountingService } from "./inventory-movement-accounting.service";
import { PostInventoryMovementDto } from "./dto/post-inventory-movement.dto";

@Controller("inventory/movement-accounting")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class InventoryMovementAccountingController {
  constructor(private readonly accounting: InventoryMovementAccountingService) {}

  @Get("pending")
  @RequirePermissions(PERMISSIONS.inventory.view, PERMISSIONS.journals.view)
  pending(@CurrentOrganizationId() organizationId: string) { return this.accounting.pending(organizationId); }

  @Get("reconciliation")
  @RequirePermissions(PERMISSIONS.inventory.view, PERMISSIONS.journals.view)
  reconciliation(@CurrentOrganizationId() organizationId: string) { return this.accounting.reconciliation(organizationId); }

  @Get(":id/preview")
  @RequirePermissions(PERMISSIONS.inventory.view, PERMISSIONS.journals.view)
  preview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string, @Query() dto: PostInventoryMovementDto) { return this.accounting.preview(organizationId, id, dto); }

  @Post(":id/post")
  @RequirePermissions(PERMISSIONS.inventory.manage, PERMISSIONS.journals.post)
  post(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: PostInventoryMovementDto) { return this.accounting.post(organizationId, user.id, id, dto); }
}
