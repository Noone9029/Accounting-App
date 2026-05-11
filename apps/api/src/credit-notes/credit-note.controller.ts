import { Body, Controller, Delete, Get, Param, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { CreditNoteService } from "./credit-note.service";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";
import { UpdateCreditNoteDto } from "./dto/update-credit-note.dto";

@Controller("credit-notes")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class CreditNoteController {
  constructor(private readonly creditNoteService: CreditNoteService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.creditNoteService.list(organizationId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCreditNoteDto,
  ) {
    return this.creditNoteService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.creditNoteService.get(organizationId, id);
  }

  @Get(":id/pdf-data")
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.creditNoteService.pdfData(organizationId, id);
  }

  @Get(":id/pdf")
  async pdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.creditNoteService.pdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-pdf")
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.creditNoteService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCreditNoteDto,
  ) {
    return this.creditNoteService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/finalize")
  finalize(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.creditNoteService.finalize(organizationId, user.id, id);
  }

  @Post(":id/void")
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.creditNoteService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.creditNoteService.remove(organizationId, user.id, id);
  }
}
