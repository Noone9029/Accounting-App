import type { Metadata } from "next";
import { MarketingHomePage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("ar", "home");

export default function ArabicHomePage() {
  return <MarketingHomePage locale="ar" />;
}
