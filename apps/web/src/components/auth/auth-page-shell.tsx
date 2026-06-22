import Link from "next/link";
import type { ReactNode } from "react";
import { LedgerPageHeader, LedgerPanel, LedgerStatusBadge } from "@/components/ui/ledger-system";

export function AuthPageShell({
  title,
  description,
  children,
  footer,
}: Readonly<{
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-4 py-10">
      <LedgerPanel className="w-full max-w-md">
        <LedgerPageHeader
          eyebrow="Private beta access"
          title={title}
          badge={<LedgerStatusBadge tone="draft">Beta</LedgerStatusBadge>}
          description={description}
        />
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-4 space-y-2 text-sm text-steel">{footer}</div> : null}
      </LedgerPanel>
    </main>
  );
}

export function AuthTextLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <Link href={href} className="font-semibold text-palm hover:text-palm-dark">
      {children}
    </Link>
  );
}
