import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankDepositService } from "./bank-deposit.service";
import {
  AddBankDepositBatchLineDto,
  BankDepositBatchesQueryDto,
  BankDepositSourceCandidatesQueryDto,
  CreateBankDepositBatchDto,
  MatchBankDepositBatchDto,
  UpdateBankDepositBatchDto,
} from "./dto/bank-deposit.dto";

@Controller("bank-deposits")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankDepositController {
  constructor(private readonly bankDepositService: BankDepositService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: BankDepositBatchesQueryDto) {
    return this.bankDepositService.list(organizationId, query);
  }

  @Get("source-candidates")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  sourceCandidates(@CurrentOrganizationId() organizationId: string, @Query() query: BankDepositSourceCandidatesQueryDto) {
    return this.bankDepositService.sourceCandidates(organizationId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBankDepositBatchDto) {
    return this.bankDepositService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankDepositService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateBankDepositBatchDto,
  ) {
    return this.bankDepositService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/lines")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  addLine(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddBankDepositBatchLineDto,
  ) {
    return this.bankDepositService.addLine(organizationId, user.id, id, dto);
  }

  @Delete(":id/lines/:lineId")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  removeLine(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("lineId") lineId: string,
  ) {
    return this.bankDepositService.removeLine(organizationId, user.id, id, lineId);
  }

  @Post(":id/post")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  post(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankDepositService.post(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankDepositService.void(organizationId, user.id, id);
  }

  @Get(":id/match-candidates")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  matchCandidates(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankDepositService.matchCandidates(organizationId, id);
  }

  @Post(":id/match-statement-transaction")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  match(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: MatchBankDepositBatchDto,
  ) {
    return this.bankDepositService.matchStatementTransaction(organizationId, user.id, id, dto);
  }

  @Post(":id/unmatch-statement-transaction")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  unmatch(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankDepositService.unmatchStatementTransaction(organizationId, user.id, id);
  }
}
