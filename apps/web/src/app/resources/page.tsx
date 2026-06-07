import type { Metadata } from "next";
import { MarketingDetailPage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("en", "resources");

export default function ResourcesPage() {
  return <MarketingDetailPage locale="en" pageKey="resources" />;
}
