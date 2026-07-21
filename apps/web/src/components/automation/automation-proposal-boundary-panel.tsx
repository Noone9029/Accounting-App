import { Bot, CircleSlash2, ListChecks, LockKeyhole, ShieldCheck } from "lucide-react";

import { PanelSection } from "@/components/ui-ledger/panel-section";
import { StatusBadge } from "@/components/ui-ledger/status-badge";
import type { AutomationProposalBoundaryResponse } from "@/lib/types";

interface AutomationProposalBoundaryPanelProps {
  boundary: AutomationProposalBoundaryResponse;
}

export function AutomationProposalBoundaryPanel({ boundary }: AutomationProposalBoundaryPanelProps) {
  return (
    <PanelSection
      title="Automation proposal boundary"
      description="Proposal-only automation posture for the active organization."
      action={<StatusBadge tone="info">Proposal-only</StatusBadge>}
      contentClassName="space-y-5"
    >
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={boundary.readOnly ? "success" : "danger"}>Read-only</StatusBadge>
        <StatusBadge tone={boundary.noMutation ? "success" : "danger"}>No mutation</StatusBadge>
        <StatusBadge tone={boundary.requiresHumanConfirmation ? "warning" : "danger"}>Human confirmation required</StatusBadge>
        <StatusBadge tone={boundary.auditRequiredForConfirmation ? "warning" : "danger"}>Audit required</StatusBadge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <BoundaryStateItem icon={Bot} label="Automation" value={boundary.automationEnabled ? "Enabled" : "Disabled"} />
        <BoundaryStateItem icon={ShieldCheck} label="AI authority" value={boundary.aiAuthoritative ? "Authoritative" : "Non-authoritative"} />
        <BoundaryStateItem icon={CircleSlash2} label="Provider mutation" value={boundary.providerMutationAllowed ? "Allowed" : "Blocked"} />
        <BoundaryStateItem icon={CircleSlash2} label="Hosted mutation" value={boundary.hostedMutationAllowed ? "Allowed" : "Blocked"} />
        <BoundaryStateItem icon={CircleSlash2} label="Production claim" value={boundary.productionClaimAllowed ? "Allowed" : "Blocked"} />
        <BoundaryStateItem icon={LockKeyhole} label="Tenant scope" value={boundary.scope.tenantScoped ? "Tenant-scoped" : "Review required"} />
      </div>

      <BoundaryList
        icon={ListChecks}
        title="Allowed proposal actions"
        items={boundary.allowedProposalActions}
        emptyText="No proposal actions configured"
      />
      <BoundaryList icon={CircleSlash2} title="Blocked actions" items={boundary.blockedActions} emptyText="No blocked actions configured" />
      <BoundaryList
        icon={ShieldCheck}
        title="Confirmation requirements"
        items={boundary.confirmationRequirements}
        emptyText="No confirmation requirements configured"
      />
    </PanelSection>
  );
}

function BoundaryStateItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs uppercase text-steel">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span>{label}</span>
      </div>
      <div className="mt-2 font-medium text-ink">{value}</div>
    </div>
  );
}

function BoundaryList({
  icon: Icon,
  title,
  items,
  emptyText,
}: {
  icon: typeof Bot;
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-steel" />
        <h3>{title}</h3>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-steel">
          {items.map((item) => (
            <li key={item} className="rounded-md border border-slate-200 bg-white px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-sm text-steel">{emptyText}</p>
      )}
    </section>
  );
}
