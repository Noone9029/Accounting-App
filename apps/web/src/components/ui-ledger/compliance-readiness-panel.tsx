import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import type { ReactNode } from "react";

import { PanelSection } from "@/components/ui-ledger/panel-section";
import { StatusBadge } from "@/components/ui-ledger/status-badge";

interface ComplianceReadinessCheck {
  label: string;
  status: "pass" | "warning" | "pending";
  detail: ReactNode;
}

interface ComplianceReadinessPanelProps {
  title?: string;
  status?: string;
  checks: readonly ComplianceReadinessCheck[];
}

export function ComplianceReadinessPanel({
  title = "UAE eInvoicing-ready",
  status = "Controlled beta",
  checks,
}: ComplianceReadinessPanelProps) {
  return (
    <PanelSection
      title={title}
      description="Local readiness validation only. ASP validation not connected. No FTA reporting yet."
      action={<StatusBadge tone="info">{status}</StatusBadge>}
    >
      <div className="space-y-3">
        {checks.map((check) => {
          const Icon = check.status === "pass" ? CheckCircle2 : check.status === "warning" ? AlertTriangle : CircleDashed;
          const color = check.status === "pass" ? "text-palm" : check.status === "warning" ? "text-amber-700" : "text-steel";
          return (
            <div key={check.label} className="flex gap-3 text-sm">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
              <div>
                <div className="font-medium text-ink">{check.label}</div>
                <div className="mt-0.5 text-xs leading-5 text-steel">{check.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </PanelSection>
  );
}
