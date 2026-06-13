import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ChequeService } from "./cheque.service";
import { BounceChequeDto, ChequesQueryDto, CreateChequeDto, DepositChequeDto, MatchChequeDto, UpdateChequeDto, VoidChequeDto } from "./dto/cheque.dto";

@Controller("cheques")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ChequeController {
  constructor(private readonly chequeService: ChequeService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: ChequesQueryDto) {
    return this.chequeService.list(organizationId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateChequeDto) {
    return this.chequeService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.chequeService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateChequeDto,
  ) {
    return this.chequeService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/mark-received")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  markReceived(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.chequeService.markReceived(organizationId, user.id, id);
  }

  @Post(":id/mark-issued")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  markIssued(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.chequeService.markIssued(organizationId, user.id, id);
  }

  @Post(":id/deposit")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  deposit(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: DepositChequeDto) {
    return this.chequeService.deposit(organizationId, user.id, id, dto);
  }

  @Post(":id/clear")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  clear(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.chequeService.clear(organizationId, user.id, id);
  }

  @Post(":id/bounce")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  bounce(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: BounceChequeDto) {
    return this.chequeService.bounce(organizationId, user.id, id, dto);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: VoidChequeDto) {
    return this.chequeService.void(organizationId, user.id, id, dto);
  }

  @Get(":id/match-candidates")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  matchCandidates(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.chequeService.matchCandidates(organizationId, id);
  }

  @Post(":id/match-statement-transaction")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  match(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: MatchChequeDto,
  ) {
    return this.chequeService.matchStatementTransaction(organizationId, user.id, id, dto);
  }

  @Post(":id/unmatch-statement-transaction")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  unmatch(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.chequeService.unmatchStatementTransaction(organizationId, user.id, id);
  }
}
