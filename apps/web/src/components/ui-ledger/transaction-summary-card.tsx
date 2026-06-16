import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TransactionSummaryRow {
  label: ReactNode;
  value: ReactNode;
  emphasized?: boolean;
}

interface TransactionSummaryCardProps {
  title?: ReactNode;
  description?: ReactNode;
  rows: readonly TransactionSummaryRow[];
  className?: string;
}

export function TransactionSummaryCard({
  title = "Transaction summary",
  description,
  rows,
  className,
}: TransactionSummaryCardProps) {
  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start justify-between gap-4 text-sm",
                row.emphasized ? "border-t pt-3 font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              <dt>{row.label}</dt>
              <dd className="font-mono tabular-nums text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
