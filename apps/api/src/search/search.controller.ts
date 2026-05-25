import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.dashboard.view)
  search(@CurrentOrganizationId() organizationId: string, @Req() request: AuthenticatedRequest, @Query("query") query?: string) {
    return this.searchService.search(organizationId, query, request.membership?.role.permissions ?? []);
  }
}
