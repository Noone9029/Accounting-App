import type { Metadata } from "next";
import { MarketingPricingShell, marketingMetadata } from "@/components/marketing/marketing-site";
import { PublicPricingCatalog } from "@/components/marketing/public-pricing-catalog";

export const metadata: Metadata = marketingMetadata("ar", "pricing");

export default function ArabicPricingPage() {
  return <MarketingPricingShell locale="ar"><PublicPricingCatalog locale="ar" /></MarketingPricingShell>;
}
