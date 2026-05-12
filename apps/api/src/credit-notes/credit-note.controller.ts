import { Body, Controller, Delete, Get, Param, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreditNoteService } from "./credit-note.service";
import { ApplyCreditNoteDto } from "./dto/apply-credit-note.dto";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";
import { ReverseCreditNoteAllocationDto } from "./dto/reverse-credit-note-allocation.dto";
import { UpdateCreditNoteDto } from "./dto/update-credit-note.dto";

@Controller("credit-notes")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class CreditNoteController {
  constructor(private readonly creditNoteService: CreditNoteService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.creditNotes.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.creditNoteService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.creditNotes.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCreditNoteDto,
  ) {
    return this.creditNoteService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.creditNotes.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.creditNoteService.get(organizationId, id);
  }

  @Get(":id/pdf-data")
  @RequirePermissions(PERMISSIONS.creditNotes.view)
  pdfData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.creditNoteService.pdfData(organizationId, id);
  }

  @Get(":id/allocations")
  @RequirePermissions(PERMISSIONS.creditNotes.view)
  allocations(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.creditNoteService.allocations(organizationId, id);
  }

  @Post(":id/apply")
  @RequirePermissions(PERMISSIONS.creditNotes.finalize)
  apply(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ApplyCreditNoteDto,
  ) {
    return this.creditNoteService.apply(organizationId, user.id, id, dto);
  }

  @Post(":id/allocations/:allocationId/reverse")
  @RequirePermissions(PERMISSIONS.creditNotes.void)
  reverseAllocation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("allocationId") allocationId: string,
    @Body() dto: ReverseCreditNoteAllocationDto,
  ) {
    return this.creditNoteService.reverseAllocation(organizationId, user.id, id, allocationId, dto);
  }

  @Get(":id/pdf")
  @RequirePermissions(PERMISSIONS.creditNotes.view)
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
  @RequirePermissions(PERMISSIONS.creditNotes.view)
  generatePdf(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.creditNoteService.generatePdf(organizationId, user.id, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.creditNotes.create)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCreditNoteDto,
  ) {
    return this.creditNoteService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/finalize")
  @RequirePermissions(PERMISSIONS.creditNotes.finalize)
  finalize(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.creditNoteService.finalize(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.creditNotes.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.creditNoteService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.creditNotes.create)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.creditNoteService.remove(organizationId, user.id, id);
  }
}
