import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LedgerByte",
  description: "Accounting SaaS foundation for Saudi and GCC businesses",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
