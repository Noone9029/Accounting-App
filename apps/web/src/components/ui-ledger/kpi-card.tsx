import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  href?: string;
  tone?: "default" | "positive" | "warning" | "info";
  className?: string;
}

const toneClassName: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-primary bg-primary/10",
  positive: "text-emerald-700 bg-emerald-50",
  warning: "text-amber-700 bg-amber-50",
  info: "text-sky-700 bg-sky-50",
};

export function KpiCard({ icon, label, value, detail, href, tone = "default", className }: KpiCardProps) {
  const content = (
    <Card className={cn("h-full transition hover:ring-primary/25", href ? "cursor-pointer" : "", className)} size="sm">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
            <div className="mt-2 truncate text-xl font-semibold tabular-nums text-foreground">{value}</div>
            {detail ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</div> : null}
          </div>
          {icon ? <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneClassName[tone])}>{icon}</span> : null}
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      {content}
    </Link>
  ) : (
    content
  );
}
