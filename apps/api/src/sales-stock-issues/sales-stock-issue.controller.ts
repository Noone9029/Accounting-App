import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateSalesStockIssueDto } from "./dto/create-sales-stock-issue.dto";
import { SalesStockIssueService } from "./sales-stock-issue.service";

@Controller("sales-stock-issues")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class SalesStockIssueController {
  constructor(private readonly salesStockIssueService: SalesStockIssueService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.salesStockIssue.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.salesStockIssueService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.salesStockIssue.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalesStockIssueDto,
  ) {
    return this.salesStockIssueService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.salesStockIssue.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesStockIssueService.get(organizationId, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.salesStockIssue.create)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesStockIssueService.void(organizationId, user.id, id);
  }
}
