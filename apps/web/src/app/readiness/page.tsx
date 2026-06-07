import type { Metadata } from "next";
import { MarketingDetailPage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("en", "readiness");

export default function ReadinessPage() {
  return <MarketingDetailPage locale="en" pageKey="readiness" />;
}
