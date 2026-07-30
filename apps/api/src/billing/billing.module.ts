import { Module } from "@nestjs/common";
import { BillingEntitlementService } from "./billing-entitlement.service";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BillingLifecycleService } from "./billing-lifecycle.service";
import { BillingProviderRegistry } from "./billing-provider.registry";
import { FakeBillingProvider } from "./fake-billing.provider";
import { BillingWebhookService } from "./billing-webhook.service";
import { BillingWebhookController } from "./billing-webhook.controller";
import { BillingManagementController } from "./billing-management.controller";
import { BillingManagementService } from "./billing-management.service";

@Module({
  imports: [AuditLogModule],
  controllers: [BillingWebhookController, BillingManagementController],
  providers: [BillingEntitlementService, BillingLifecycleService, FakeBillingProvider, BillingProviderRegistry, BillingWebhookService, BillingManagementService],
  exports: [BillingEntitlementService, BillingLifecycleService, BillingProviderRegistry, BillingWebhookService],
})
export class BillingModule {}
