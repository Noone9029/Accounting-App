import type { ReactNode } from "react";
import { LedgerAlert, LedgerEmptyState, LedgerErrorState, LedgerLoadingState } from "@/components/ui/ledger-system";

interface StatusMessageProps {
  type: "loading" | "empty" | "success" | "error" | "info";
  children: ReactNode;
}

export function StatusMessage({ type, children }: StatusMessageProps) {
  if (type === "loading") {
    return <LedgerLoadingState title={messageTitle(children, "Loading")} />;
  }

  if (type === "empty") {
    return <LedgerEmptyState title={messageTitle(children, "No records found")} description={messageDescription(children)} />;
  }

  if (type === "error") {
    return <LedgerErrorState title="Unable to continue" description={children} />;
  }

  return <LedgerAlert tone={type === "success" ? "success" : "info"}>{children}</LedgerAlert>;
}

function messageTitle(children: ReactNode, fallback: string): string {
  return typeof children === "string" && children.trim() ? children.trim() : fallback;
}

function messageDescription(children: ReactNode): ReactNode | undefined {
  return typeof children === "string" ? undefined : children;
}
