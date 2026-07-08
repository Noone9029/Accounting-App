import { Bell, Clock3, MailCheck, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { PanelSection } from "@/components/ui-ledger/panel-section";
import { StatusBadge } from "@/components/ui-ledger/status-badge";
import type { EmailNotificationCenterSummary } from "@/lib/types";

interface NotificationCenterSummaryPanelProps {
  summary: EmailNotificationCenterSummary;
}

export function NotificationCenterSummaryPanel({ summary }: NotificationCenterSummaryPanelProps) {
  return (
    <PanelSection
      title="Notification center"
      description="Operational delivery metadata for review queues, retry attention, provider events, and suppressions."
      action={
        <div className="flex flex-wrap justify-end gap-2">
          <StatusBadge tone="muted">read-only</StatusBadge>
          <StatusBadge tone="info">No customer email sent</StatusBadge>
          <StatusBadge tone="warning">No retry or provider action</StatusBadge>
        </div>
      }
      contentClassName="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryMetric icon={<Bell className="size-4" aria-hidden="true" />} label="Queued" value={summary.outboxCounts.queuedCount} />
        <SummaryMetric icon={<Clock3 className="size-4" aria-hidden="true" />} label="Due retries" value={summary.outboxCounts.dueRetryCount} />
        <SummaryMetric icon={<MailCheck className="size-4" aria-hidden="true" />} label="Delivered events" value={summary.providerEventCounts.deliveredCount} />
        <SummaryMetric
          icon={<ShieldCheck className="size-4" aria-hidden="true" />}
          label="Active suppressions"
          value={summary.activeSuppressionCount}
        />
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-4">
        <Detail label="Mock sends" value={summary.outboxCounts.sentMockCount} />
        <Detail label="Provider sends recorded" value={summary.outboxCounts.sentProviderCount} />
        <Detail label="Failed outbox" value={summary.outboxCounts.failedCount} />
        <Detail label="Provider failures" value={summary.providerEventCounts.failedEventCount} />
        <Detail label="Bounces" value={summary.providerEventCounts.bouncedCount} />
        <Detail label="Complaints" value={summary.providerEventCounts.complainedCount} />
        <Detail label="Generated" value={formatDateTime(summary.generatedAt)} />
        <Detail label="Review state" value={summary.productionReady ? "Ready for review" : "Review gated"} />
      </div>

      <p className="text-sm leading-6 text-muted-foreground">{summary.reviewNotice}</p>

      {summary.recentItems.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[1.15fr_0.9fr_0.75fr_0.8fr] gap-3 border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
            <span>Template</span>
            <span>Status</span>
            <span>Provider</span>
            <span>Updated</span>
          </div>
          <ul className="divide-y divide-border" aria-label="Recent notification metadata">
            {summary.recentItems.map((item) => (
              <li key={item.id} className="grid grid-cols-[1.15fr_0.9fr_0.75fr_0.8fr] gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-medium text-foreground">{item.templateType}</span>
                <span className="min-w-0 truncate text-muted-foreground">{item.status}</span>
                <span className="min-w-0 truncate text-muted-foreground">{item.provider}</span>
                <span className="min-w-0 truncate text-muted-foreground">{formatDateTime(item.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">No recent notification metadata</div>
          <div className="mt-1">No provider, retry, or customer-send action is available from this panel.</div>
        </div>
      )}

      {summary.blockedActions.length > 0 ? (
        <div className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          {summary.blockedActions.slice(0, 3).map((action) => (
            <div key={action}>{action}</div>
          ))}
        </div>
      ) : null}
    </PanelSection>
  );
}

function SummaryMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted/30 p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium text-foreground">{value}</div>
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}
