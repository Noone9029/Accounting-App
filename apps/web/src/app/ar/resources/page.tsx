import type { Metadata } from "next";
import { MarketingDetailPage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("ar", "resources");

export default function ArabicResourcesPage() {
  return <MarketingDetailPage locale="ar" pageKey="resources" />;
}
