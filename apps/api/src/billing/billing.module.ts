import { Module } from "@nestjs/common";
import { BillingEntitlementService } from "./billing-entitlement.service";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BillingLifecycleService } from "./billing-lifecycle.service";

@Module({
  imports: [AuditLogModule],
  providers: [BillingEntitlementService, BillingLifecycleService],
  exports: [BillingEntitlementService, BillingLifecycleService],
})
export class BillingModule {}
