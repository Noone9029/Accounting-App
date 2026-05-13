import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankTransferService } from "./bank-transfer.service";
import { CreateBankTransferDto } from "./dto/create-bank-transfer.dto";

@Controller("bank-transfers")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankTransferController {
  constructor(private readonly bankTransferService: BankTransferService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.bankTransfers.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.bankTransferService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.bankTransfers.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBankTransferDto,
  ) {
    return this.bankTransferService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.bankTransfers.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankTransferService.get(organizationId, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.bankTransfers.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankTransferService.void(organizationId, user.id, id);
  }
}
