import type { Metadata } from "next";
import { MarketingDetailPage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("ar", "workflows");

export default function ArabicWorkflowsPage() {
  return <MarketingDetailPage locale="ar" pageKey="workflows" />;
}
