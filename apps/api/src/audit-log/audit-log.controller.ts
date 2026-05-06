import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { AuditLogService } from "./audit-log.service";

@Controller("audit-logs")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.auditLogService.list(organizationId);
  }
}
