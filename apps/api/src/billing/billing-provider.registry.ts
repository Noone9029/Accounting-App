import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BillingProvider } from "@prisma/client";
import { DisabledBillingProvider } from "./disabled-billing.provider";
import { FakeBillingProvider } from "./fake-billing.provider";
import { StripeBillingProvider } from "./stripe-billing.provider";
import type { LedgerByteBillingProvider } from "./billing-provider.types";

@Injectable()
export class BillingProviderRegistry {
  private readonly disabled = new DisabledBillingProvider();
  private readonly stripe = new StripeBillingProvider();

  constructor(
    private readonly config: ConfigService,
    private readonly fake: FakeBillingProvider,
  ) {}

  active(): LedgerByteBillingProvider {
    const configured = this.config.get<string>("LEDGERBYTE_BILLING_PROVIDER")?.trim().toUpperCase();
    if (configured === BillingProvider.FAKE && this.isLocalOrTest()) return this.fake;
    if (configured === BillingProvider.STRIPE) return this.stripe;
    return this.disabled;
  }

  forProvider(provider: BillingProvider): LedgerByteBillingProvider {
    // A fake provider event must never become an accepted production ingress
    // path merely because the caller supplied FAKE as its provider name.
    if (provider === BillingProvider.FAKE) return this.isLocalOrTest() ? this.fake : this.disabled;
    if (provider === BillingProvider.STRIPE) return this.stripe;
    return this.disabled;
  }

  private isLocalOrTest(): boolean {
    const environment = this.config.get<string>("APP_ENV") ?? process.env.NODE_ENV ?? "development";
    return ["development", "dev", "local", "test"].includes(environment.toLowerCase());
  }
}
