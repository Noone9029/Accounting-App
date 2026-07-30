import { Module } from "@nestjs/common";
import { BillingEntitlementService } from "./billing-entitlement.service";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BillingLifecycleService } from "./billing-lifecycle.service";
import { BillingProviderRegistry } from "./billing-provider.registry";
import { FakeBillingProvider } from "./fake-billing.provider";
import { BillingWebhookService } from "./billing-webhook.service";
import { BillingWebhookController } from "./billing-webhook.controller";

@Module({
  imports: [AuditLogModule],
  controllers: [BillingWebhookController],
  providers: [BillingEntitlementService, BillingLifecycleService, FakeBillingProvider, BillingProviderRegistry, BillingWebhookService],
  exports: [BillingEntitlementService, BillingLifecycleService, BillingProviderRegistry, BillingWebhookService],
})
export class BillingModule {}
