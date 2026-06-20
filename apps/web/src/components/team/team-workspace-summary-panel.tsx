import { ShieldCheck, UserRoundCheck, UserRoundX, UsersRound } from "lucide-react";

import { PanelSection } from "@/components/ui-ledger/panel-section";
import { StatusBadge } from "@/components/ui-ledger/status-badge";
import type { TeamWorkspaceSummary } from "@/lib/types";

interface TeamWorkspaceSummaryPanelProps {
  summary: TeamWorkspaceSummary;
}

export function TeamWorkspaceSummaryPanel({ summary }: TeamWorkspaceSummaryPanelProps) {
  const metrics = [
    { label: "Total members", value: summary.totalMemberCount, icon: UsersRound },
    { label: "Active", value: summary.activeMemberCount, icon: UserRoundCheck },
    { label: "Invited", value: summary.invitedMemberCount, icon: UsersRound },
    { label: "Suspended", value: summary.suspendedMemberCount, icon: UserRoundX },
  ];

  const safeguardRows = [
    {
      label: summary.safeguards.lastFullAccessRemovalBlocked ? "Last full-access removal blocked" : "Full-access safeguard missing",
      passed: summary.safeguards.lastFullAccessRemovalBlocked,
    },
    {
      label: summary.safeguards.lastUserManagerRemovalBlocked ? "Last user-manager removal blocked" : "User-manager safeguard missing",
      passed: summary.safeguards.lastUserManagerRemovalBlocked,
    },
    {
      label: summary.safeguards.hasActiveFullAccessMember ? "Active full-access member" : "No active full-access member",
      passed: summary.safeguards.hasActiveFullAccessMember,
    },
    {
      label: summary.safeguards.hasActiveUserManager ? "Active user manager" : "No active user manager",
      passed: summary.safeguards.hasActiveUserManager,
    },
  ];

  return (
    <PanelSection
      title="Team workspace summary"
      description="Read-only membership and role posture for the active organization."
      action={<StatusBadge tone="info">Read-only review</StatusBadge>}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="muted">No invite or email</StatusBadge>
          <StatusBadge tone="muted">No role or ownership change</StatusBadge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-steel">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {metric.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-ink">{metric.value}</div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <section className="rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <ShieldCheck className="h-4 w-4 text-palm" aria-hidden="true" />
              Safeguards
            </div>
            <div className="mt-3 space-y-2">
              {safeguardRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 text-steel">{row.label}</span>
                  <StatusBadge tone={row.passed ? "success" : "warning"}>{row.passed ? "Present" : "Review"}</StatusBadge>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-background p-4">
            <div className="text-sm font-medium text-ink">Role distribution</div>
            {summary.roleDistribution.length > 0 ? (
              <div className="mt-3 divide-y divide-border">
                {summary.roleDistribution.map((role) => (
                  <article key={role.roleId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink">{role.roleName}</div>
                        <div className="mt-1 text-xs text-steel">
                          {role.totalMemberCount} members / {role.permissionCount} permissions
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {role.hasFullAccess ? <StatusBadge tone="success">Full access</StatusBadge> : null}
                        {role.canManageUsers ? <StatusBadge tone="info">User manager</StatusBadge> : null}
                        <StatusBadge tone="muted">{role.isSystem ? "System" : "Custom"}</StatusBadge>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <SummaryCount label="Active" value={role.activeMemberCount} />
                      <SummaryCount label="Invited" value={role.invitedMemberCount} />
                      <SummaryCount label="Suspended" value={role.suspendedMemberCount} />
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-dashed border-border p-4 text-sm">
                <div className="font-medium text-ink">No role distribution available</div>
                <div className="mt-1 text-steel">Review can continue after members and roles load.</div>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-md border border-border bg-muted/30 p-4 text-sm">
          <div className="font-medium text-ink">Review boundary</div>
          <p className="mt-2 leading-6 text-steel">{summary.reviewNotice}</p>
          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-steel">
            {summary.blockedActions.slice(0, 3).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
      </div>
    </PanelSection>
  );
}

function SummaryCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-2">
      <dt className="text-steel">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
