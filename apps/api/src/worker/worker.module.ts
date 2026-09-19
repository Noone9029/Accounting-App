import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { validateLedgerByteConfig } from "../config/production-config";
import { EmailModule } from "../email/email.module";
import { ObservabilityModule } from "../observability/observability.module";
import { PrismaModule } from "../prisma/prisma.module";
import { OutboxSchedulerService } from "./outbox-scheduler.service";

// An application context, not an HTTP application: workers expose no routes.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateLedgerByteConfig }), PrismaModule, ObservabilityModule, AuthModule, EmailModule, BillingModule],
  providers: [OutboxSchedulerService],
})
export class WorkerModule {}
