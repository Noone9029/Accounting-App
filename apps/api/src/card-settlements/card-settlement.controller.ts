import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CardSettlementService } from "./card-settlement.service";
import { CardSettlementsQueryDto, CreateCardSettlementDto, MatchCardSettlementDto, UpdateCardSettlementDto } from "./dto/card-settlement.dto";

@Controller("card-settlements")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class CardSettlementController {
  constructor(private readonly cardSettlementService: CardSettlementService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: CardSettlementsQueryDto) {
    return this.cardSettlementService.list(organizationId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCardSettlementDto) {
    return this.cardSettlementService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.cardSettlementService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCardSettlementDto,
  ) {
    return this.cardSettlementService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/post")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  post(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cardSettlementService.post(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cardSettlementService.void(organizationId, user.id, id);
  }

  @Get(":id/match-candidates")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  matchCandidates(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.cardSettlementService.matchCandidates(organizationId, id);
  }

  @Post(":id/match-statement-transaction")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  match(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: MatchCardSettlementDto,
  ) {
    return this.cardSettlementService.matchStatementTransaction(organizationId, user.id, id, dto);
  }

  @Post(":id/unmatch-statement-transaction")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  unmatch(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cardSettlementService.unmatchStatementTransaction(organizationId, user.id, id);
  }
}
