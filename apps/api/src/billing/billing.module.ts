import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { BillingAccessInterceptor } from "./billing-access.interceptor";
import { BillingEntitlementService } from "./billing-entitlement.service";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BillingLifecycleService } from "./billing-lifecycle.service";
import { BillingProviderRegistry } from "./billing-provider.registry";
import { FakeBillingProvider } from "./fake-billing.provider";
import { BillingWebhookService } from "./billing-webhook.service";
import { BillingWebhookController } from "./billing-webhook.controller";
import { BillingManagementController } from "./billing-management.controller";
import { BillingManagementService } from "./billing-management.service";
import { SelfServiceBillingService } from "./self-service-billing.service";
import { BillingCatalogController } from "./billing-catalog.controller";

@Module({
  imports: [AuditLogModule],
  controllers: [BillingWebhookController, BillingManagementController, BillingCatalogController],
  providers: [BillingEntitlementService, BillingLifecycleService, { provide: FakeBillingProvider, useFactory: () => new FakeBillingProvider() }, BillingProviderRegistry, BillingWebhookService, BillingManagementService, SelfServiceBillingService, { provide: APP_INTERCEPTOR, useClass: BillingAccessInterceptor }],
  exports: [BillingEntitlementService, BillingLifecycleService, BillingProviderRegistry, BillingWebhookService],
})
export class BillingModule {}
