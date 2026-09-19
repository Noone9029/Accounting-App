import { Controller, Get } from "@nestjs/common";
import { SelfServiceBillingService } from "./self-service-billing.service";

@Controller("billing")
export class BillingCatalogController {
  constructor(private readonly billing: SelfServiceBillingService) {}
  @Get("catalog") catalog() { return this.billing.catalog(); }
}
