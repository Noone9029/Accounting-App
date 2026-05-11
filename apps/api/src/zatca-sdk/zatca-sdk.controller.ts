import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ValidateZatcaSdkXmlDto } from "./dto/validate-zatca-sdk-xml.dto";
import { ZatcaSdkService } from "./zatca-sdk.service";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class ZatcaSdkController {
  constructor(private readonly zatcaSdkService: ZatcaSdkService) {}

  @Get("zatca-sdk/readiness")
  readiness() {
    return this.zatcaSdkService.getReadiness();
  }

  @Post("zatca-sdk/validate-xml-dry-run")
  validateXmlDryRun(@CurrentOrganizationId() organizationId: string, @Body() dto: ValidateZatcaSdkXmlDto) {
    return this.zatcaSdkService.buildValidationDryRun(organizationId, dto);
  }

  @Post("zatca-sdk/validate-xml-local")
  validateXmlLocal(@CurrentOrganizationId() organizationId: string, @Body() dto: ValidateZatcaSdkXmlDto) {
    return this.zatcaSdkService.validateXmlLocal(organizationId, dto);
  }
}
