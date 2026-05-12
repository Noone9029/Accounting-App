import { Body, Controller, Delete, Get, Param, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CashExpenseService } from "./cash-expense.service";
import { CreateCashExpenseDto } from "./dto/create-cash-expense.dto";

@Controller("cash-expenses")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class CashExpenseController {
  constructor(private readonly cashExpenseService: CashExpenseService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.cashExpenses.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.cashExpenseService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.cashExpenses.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCashExpenseDto,
  ) {
    return this.cashExpenseService.create(organizationId, user.id, dto);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.cashExpenses.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.cashExpenseService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
  @RequirePermissions(PERMISSIONS.cashExpenses.view)
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.cashExpenseService.pdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-pdf")
  @RequirePermissions(PERMISSIONS.cashExpenses.view)
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cashExpenseService.generatePdf(organizationId, user.id, id);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.cashExpenses.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.cashExpenseService.get(organizationId, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.cashExpenses.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cashExpenseService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.cashExpenses.void)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cashExpenseService.remove(organizationId, user.id, id);
  }
}
