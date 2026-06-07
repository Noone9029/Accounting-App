import type { Metadata } from "next";
import { MarketingDetailPage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("ar", "readiness");

export default function ArabicReadinessPage() {
  return <MarketingDetailPage locale="ar" pageKey="readiness" />;
}
