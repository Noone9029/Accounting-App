import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateLocalWebhookEventDto } from "./dto/create-local-webhook-event.dto";
import { WebhookOutboxService } from "./webhook-outbox.service";

@Controller("webhooks")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class WebhookOutboxController {
  constructor(private readonly webhookOutboxService: WebhookOutboxService) {}

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.users.manage)
  readiness() {
    return this.webhookOutboxService.readiness();
  }

  @Get("event-catalog")
  @RequirePermissions(PERMISSIONS.users.manage)
  eventCatalog() {
    return this.webhookOutboxService.eventCatalog();
  }

  @Post("local-mock-events")
  @RequirePermissions(PERMISSIONS.users.manage)
  createLocalMockEvent(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLocalWebhookEventDto,
  ) {
    return this.webhookOutboxService.createLocalMockEvent(organizationId, user.id, dto);
  }
}
