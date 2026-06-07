import type { Metadata } from "next";
import { MarketingDetailPage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("ar", "product");

export default function ArabicProductPage() {
  return <MarketingDetailPage locale="ar" pageKey="product" />;
}
