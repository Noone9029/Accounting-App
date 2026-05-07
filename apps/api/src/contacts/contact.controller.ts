import { Body, Controller, Get, Param, Patch, Post, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ContactLedgerService } from "./contact-ledger.service";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

@Controller("contacts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly contactLedgerService: ContactLedgerService,
  ) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.contactService.list(organizationId);
  }

  @Post()
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContactDto) {
    return this.contactService.create(organizationId, user.id, dto);
  }

  @Get(":id/ledger")
  ledger(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactLedgerService.ledger(organizationId, id);
  }

  @Get(":id/statement")
  statement(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.statement(organizationId, id, from, to);
  }

  @Get(":id/statement-pdf-data")
  statementPdfData(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.statementPdfData(organizationId, id, from, to);
  }

  @Get(":id/statement.pdf")
  async statementPdf(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { data, buffer } = await this.contactLedgerService.statementPdf(organizationId, id, from, to);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename(`statement-${data.contact.displayName ?? data.contact.name}.pdf`)}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactService.get(organizationId, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactService.update(organizationId, user.id, id, dto);
  }
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}
