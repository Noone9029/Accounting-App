import type { Metadata } from "next";
import { MarketingDetailPage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("en", "pricing");

export default function PricingPage() {
  return <MarketingDetailPage locale="en" pageKey="pricing" />;
}
