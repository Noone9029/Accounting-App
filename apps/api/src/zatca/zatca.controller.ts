import { Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { CreateZatcaEgsUnitDto } from "./dto/create-zatca-egs-unit.dto";
import { UpdateZatcaEgsUnitDto } from "./dto/update-zatca-egs-unit.dto";
import { UpdateZatcaProfileDto } from "./dto/update-zatca-profile.dto";
import { ZatcaService } from "./zatca.service";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class ZatcaController {
  constructor(private readonly zatcaService: ZatcaService) {}

  @Get("zatca/profile")
  profile(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getProfile(organizationId);
  }

  @Patch("zatca/profile")
  updateProfile(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateZatcaProfileDto) {
    return this.zatcaService.updateProfile(organizationId, user.id, dto);
  }

  @Get("zatca/egs-units")
  listEgsUnits(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.listEgsUnits(organizationId);
  }

  @Post("zatca/egs-units")
  createEgsUnit(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateZatcaEgsUnitDto) {
    return this.zatcaService.createEgsUnit(organizationId, user.id, dto);
  }

  @Get("zatca/egs-units/:id")
  getEgsUnit(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnit(organizationId, id);
  }

  @Patch("zatca/egs-units/:id")
  updateEgsUnit(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateZatcaEgsUnitDto) {
    return this.zatcaService.updateEgsUnit(organizationId, user.id, id, dto);
  }

  @Post("zatca/egs-units/:id/activate-dev")
  activateDevEgsUnit(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.activateDevEgsUnit(organizationId, user.id, id);
  }

  @Get("sales-invoices/:id/zatca")
  invoiceCompliance(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getInvoiceCompliance(organizationId, id);
  }

  @Post("sales-invoices/:id/zatca/generate")
  generateInvoiceCompliance(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.generateInvoiceCompliance(organizationId, user.id, id);
  }

  @Get("sales-invoices/:id/zatca/xml")
  async invoiceXml(@CurrentOrganizationId() organizationId: string, @Param("id") id: string, @Res({ passthrough: true }) response: Response) {
    const buffer = await this.zatcaService.getInvoiceXml(organizationId, id);
    response.set({
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="zatca-${id}.xml"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Get("sales-invoices/:id/zatca/qr")
  invoiceQr(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getInvoiceQr(organizationId, id);
  }

  @Get("zatca/submissions")
  submissions(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.listSubmissions(organizationId);
  }
}
