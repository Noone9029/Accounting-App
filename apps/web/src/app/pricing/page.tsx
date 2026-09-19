import type { Metadata } from "next";
import { MarketingPricingShell, marketingMetadata } from "@/components/marketing/marketing-site";
import { PublicPricingCatalog } from "@/components/marketing/public-pricing-catalog";

export const metadata: Metadata = marketingMetadata("en", "pricing");

export default function PricingPage() {
  return <MarketingPricingShell locale="en"><PublicPricingCatalog locale="en" /></MarketingPricingShell>;
}
