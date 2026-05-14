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
import { ReverseSalesStockIssueCogsDto } from "./dto/reverse-sales-stock-issue-cogs.dto";
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

  @Get(":id/accounting-preview")
  @RequirePermissions(PERMISSIONS.inventory.view)
  accountingPreview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesStockIssueService.accountingPreview(organizationId, id);
  }

  @Post(":id/post-cogs")
  @RequirePermissions(PERMISSIONS.inventory.cogsPost)
  postCogs(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesStockIssueService.postCogs(organizationId, user.id, id);
  }

  @Post(":id/reverse-cogs")
  @RequirePermissions(PERMISSIONS.inventory.cogsReverse)
  reverseCogs(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReverseSalesStockIssueCogsDto,
  ) {
    return this.salesStockIssueService.reverseCogs(organizationId, user.id, id, dto);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.salesStockIssue.create)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesStockIssueService.void(organizationId, user.id, id);
  }
}
