import type { Metadata } from "next";
import { MarketingDetailPage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("en", "product");

export default function ProductPage() {
  return <MarketingDetailPage locale="en" pageKey="product" />;
}
