import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ValidateZatcaSdkFixtureDto, ValidateZatcaSdkXmlDto } from "./dto/validate-zatca-sdk-xml.dto";
import { ZatcaSdkService } from "./zatca-sdk.service";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ZatcaSdkController {
  constructor(private readonly zatcaSdkService: ZatcaSdkService) {}

  @Get("zatca-sdk/readiness")
  @RequirePermissions(PERMISSIONS.zatca.view)
  readiness() {
    return this.zatcaSdkService.getReadiness();
  }

  @Post("zatca-sdk/validate-xml-dry-run")
  @RequirePermissions(PERMISSIONS.zatca.runChecks)
  validateXmlDryRun(@CurrentOrganizationId() organizationId: string, @Body() dto: ValidateZatcaSdkXmlDto) {
    return this.zatcaSdkService.buildValidationDryRun(organizationId, dto);
  }

  @Post("zatca-sdk/validate-xml-local")
  @RequirePermissions(PERMISSIONS.zatca.runChecks, PERMISSIONS.zatca.manage)
  validateXmlLocal(@CurrentOrganizationId() organizationId: string, @Body() dto: ValidateZatcaSdkXmlDto) {
    return this.zatcaSdkService.validateXmlLocal(organizationId, dto);
  }

  @Post("zatca-sdk/validate-reference-fixture")
  @RequirePermissions(PERMISSIONS.zatca.runChecks, PERMISSIONS.zatca.manage)
  validateReferenceFixture(@CurrentOrganizationId() organizationId: string, @Body() dto: ValidateZatcaSdkFixtureDto) {
    return this.zatcaSdkService.validateReferenceFixtureLocal(organizationId, dto);
  }

  @Post("sales-invoices/:id/zatca/sdk-validate")
  @RequirePermissions(PERMISSIONS.zatca.runChecks, PERMISSIONS.zatca.manage)
  validateInvoiceXmlLocal(@CurrentOrganizationId() organizationId: string, @Param("id") invoiceId: string) {
    return this.zatcaSdkService.validateInvoiceXmlLocal(organizationId, invoiceId);
  }
}
