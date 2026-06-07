import type { Metadata } from "next";
import { MarketingDetailPage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("en", "workflows");

export default function WorkflowsPage() {
  return <MarketingDetailPage locale="en" pageKey="workflows" />;
}
