import { Controller, Get, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { StorageService } from "./storage.service";

@Controller("storage")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.documentSettings.view, PERMISSIONS.attachments.manage)
  readiness() {
    return this.storageService.readiness();
  }

  @Get("migration-plan")
  @RequirePermissions(PERMISSIONS.documentSettings.view, PERMISSIONS.attachments.manage)
  migrationPlan(@CurrentOrganizationId() organizationId: string) {
    return this.storageService.migrationPlan(organizationId);
  }
}
