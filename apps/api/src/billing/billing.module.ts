import { Module } from "@nestjs/common";
import { BillingEntitlementService } from "./billing-entitlement.service";

@Module({
  providers: [BillingEntitlementService],
  exports: [BillingEntitlementService],
})
export class BillingModule {}
