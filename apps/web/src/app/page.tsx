import type { Metadata } from "next";
import { MarketingHomePage, marketingMetadata } from "@/components/marketing/marketing-site";

export const metadata: Metadata = marketingMetadata("en", "home");

export default function HomePage() {
  return <MarketingHomePage locale="en" />;
}
