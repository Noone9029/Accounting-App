import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { ObservabilityModule } from "../observability/observability.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WebhookOutboxController } from "./webhook-outbox.controller";
import { WebhookOutboxService } from "./webhook-outbox.service";

@Module({
  imports: [PrismaModule, AuditLogModule, ObservabilityModule],
  controllers: [WebhookOutboxController],
  providers: [WebhookOutboxService],
})
export class WebhookOutboxModule {}
