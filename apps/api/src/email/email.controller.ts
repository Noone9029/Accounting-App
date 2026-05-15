import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { SendTestEmailDto } from "./dto/send-test-email.dto";
import { EmailService } from "./email.service";

@Controller("email")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.emailOutbox.view, PERMISSIONS.users.manage)
  readiness() {
    return this.emailService.readiness();
  }

  @Post("test-send")
  @RequirePermissions(PERMISSIONS.users.manage)
  sendTestEmail(@CurrentOrganizationId() organizationId: string, @Body() dto: SendTestEmailDto) {
    return this.emailService.sendTestEmail({
      organizationId,
      toEmail: dto.toEmail,
    });
  }

  @Get("outbox")
  @RequirePermissions(PERMISSIONS.emailOutbox.view)
  listOutbox(@CurrentOrganizationId() organizationId: string) {
    return this.emailService.list(organizationId);
  }

  @Get("outbox/:id")
  @RequirePermissions(PERMISSIONS.emailOutbox.view)
  getOutbox(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.emailService.get(organizationId, id);
  }
}
