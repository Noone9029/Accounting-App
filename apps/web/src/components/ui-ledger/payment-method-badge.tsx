import { StatusBadge } from "@/components/ui-ledger/status-badge";
import type { CustomerPaymentStatus, SupplierPaymentStatus } from "@/lib/types";

type PaymentStatus = CustomerPaymentStatus | SupplierPaymentStatus;

interface PaymentStatusBadgeProps {
  status: PaymentStatus | null | undefined;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const normalizedStatus = status ?? "DRAFT";
  return <StatusBadge tone={paymentStatusTone(normalizedStatus)}>{paymentStatusLabel(normalizedStatus)}</StatusBadge>;
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "POSTED":
      return "Posted";
    case "VOIDED":
      return "Voided";
  }
}

function paymentStatusTone(status: PaymentStatus): "muted" | "success" | "danger" {
  switch (status) {
    case "DRAFT":
      return "muted";
    case "POSTED":
      return "success";
    case "VOIDED":
      return "danger";
  }
}
