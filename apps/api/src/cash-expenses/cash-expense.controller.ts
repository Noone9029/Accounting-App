import { Body, Controller, Delete, Get, Param, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { CashExpenseService } from "./cash-expense.service";
import { CreateCashExpenseDto } from "./dto/create-cash-expense.dto";

@Controller("cash-expenses")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class CashExpenseController {
  constructor(private readonly cashExpenseService: CashExpenseService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.cashExpenseService.list(organizationId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCashExpenseDto,
  ) {
    return this.cashExpenseService.create(organizationId, user.id, dto);
  }

  @Get(":id/pdf-data")
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.cashExpenseService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
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
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cashExpenseService.generatePdf(organizationId, user.id, id);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.cashExpenseService.get(organizationId, id);
  }

  @Post(":id/void")
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cashExpenseService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.cashExpenseService.remove(organizationId, user.id, id);
  }
}
