import { Body, Controller, Get, Param, Patch, Post, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ContactLedgerService } from "./contact-ledger.service";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

@Controller("contacts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly contactLedgerService: ContactLedgerService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.contacts.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.contactService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.contacts.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContactDto) {
    return this.contactService.create(organizationId, user.id, dto);
  }

  @Get(":id/ledger")
  @RequirePermissions(PERMISSIONS.contacts.view)
  ledger(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactLedgerService.ledger(organizationId, id);
  }

  @Get(":id/statement")
  @RequirePermissions(PERMISSIONS.contacts.view)
  statement(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.statement(organizationId, id, from, to);
  }

  @Get(":id/statement-pdf-data")
  @RequirePermissions(PERMISSIONS.contacts.view)
  statementPdfData(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.statementPdfData(organizationId, id, from, to);
  }

  @Get(":id/statement.pdf")
  @RequirePermissions(PERMISSIONS.contacts.view)
  async statementPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.contactLedgerService.statementPdf(organizationId, user.id, id, from, to);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-statement-pdf")
  @RequirePermissions(PERMISSIONS.contacts.view)
  generateStatementPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.generateStatementPdf(organizationId, user.id, id, from, to);
  }

  @Get(":id/supplier-ledger")
  @RequirePermissions(PERMISSIONS.contacts.view)
  supplierLedger(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactLedgerService.supplierLedger(organizationId, id);
  }

  @Get(":id/supplier-statement")
  @RequirePermissions(PERMISSIONS.contacts.view)
  supplierStatement(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.supplierStatement(organizationId, id, from, to);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.contacts.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.contacts.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactService.update(organizationId, user.id, id, dto);
  }
}
