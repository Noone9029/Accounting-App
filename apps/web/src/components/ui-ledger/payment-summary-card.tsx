import type { ReactNode } from "react";

import { TransactionSummaryCard } from "@/components/ui-ledger/transaction-summary-card";

interface PaymentSummaryRow {
  label: ReactNode;
  value: ReactNode;
  emphasized?: boolean;
}

interface PaymentSummaryCardProps {
  title?: ReactNode;
  description?: ReactNode;
  rows: readonly PaymentSummaryRow[];
  className?: string;
}

export function PaymentSummaryCard({ title = "Payment summary", description, rows, className }: PaymentSummaryCardProps) {
  return <TransactionSummaryCard title={title} description={description} rows={rows} className={className} />;
}
