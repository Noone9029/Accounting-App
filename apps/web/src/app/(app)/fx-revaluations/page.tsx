"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import {
  getFxRevaluationContext,
  getFxRevaluation,
  listCurrencyRates,
  listFxRevaluations,
  postFxRevaluation,
  previewFxRevaluation,
  reviewFxRevaluation,
  reverseFxRevaluation,
  type CurrencyRateSnapshot,
  type FxCurrencyCatalog,
  type FxReadiness,
  type FxRevaluationRun,
} from "@/lib/foreign-exchange";
import { PERMISSIONS } from "@/lib/permissions";
import { RevaluationDetail } from "./revaluation-detail";
import { RevaluationPreviewForm } from "./revaluation-preview-form";
import { RevaluationRunList } from "./revaluation-run-list";

const today = () => new Date().toISOString().slice(0, 10);
const idempotencyKey = (action: string) => `fx-revaluation-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function FxRevaluationsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canRun = can(PERMISSIONS.fxRevaluation.run);
  const canReverse = can(PERMISSIONS.fxRevaluation.reverse);
  const canReadRates = can(PERMISSIONS.fxRates.read);
  const [catalog, setCatalog] = useState<FxCurrencyCatalog | null>(null);
  const [readiness, setReadiness] = useState<FxReadiness | null>(null);
  const [rates, setRates] = useState<CurrencyRateSnapshot[]>([]);
  const [runs, setRuns] = useState<FxRevaluationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<FxRevaluationRun | null>(null);
  const [revaluationDate, setRevaluationDate] = useState(today);
  const [rateDate, setRateDate] = useState(today);
  const [selectedRateIds, setSelectedRateIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"post" | "reverse" | null>(null);

  useEffect(() => {
    setCatalog(null);
    setReadiness(null);
    setRates([]);
    setRuns([]);
    setSelectedRun(null);
    setSelectedRateIds({});
    setError("");
    setMessage("");
    if (!organizationId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getFxRevaluationContext(),
      listFxRevaluations({ limit: 25 }),
      canReadRates ? listCurrencyRates({ limit: 100 }) : Promise.resolve({ data: [], pagination: { page: 1, limit: 100, hasMore: false } }),
    ])
      .then(async ([contextResult, runResult, rateResult]) => {
        const detail = runResult.data[0] ? await getFxRevaluation(runResult.data[0].id) : null;
        if (cancelled) return;
        setCatalog(contextResult.catalog);
        setReadiness(contextResult.readiness);
        setRuns(runResult.data);
        setRates(rateResult.data);
        setSelectedRun(detail);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load FX revaluations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [canReadRates, organizationId]);

  async function selectRun(id: string) {
    setError("");
    try {
      setSelectedRun(await getFxRevaluation(id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the FX revaluation run.");
    }
  }

  async function createPreview() {
    if (!canRun || !readiness?.fxRevaluationEnabled) return;
    return mutate(async () => {
      const created = await previewFxRevaluation({
        revaluationDate,
        rateDate,
        rates: Object.entries(selectedRateIds).sort(([a], [b]) => a.localeCompare(b)).map(([currencyCode, rateSnapshotId]) => ({ currencyCode, rateSnapshotId })),
        idempotencyKey: idempotencyKey("preview"),
      });
      setSelectedRun(created);
      setRuns((current) => [created, ...current.filter((run) => run.id !== created.id)]);
      setMessage("Draft revaluation preview created. Review the frozen evidence before posting.");
    });
  }

  async function transition(action: "review" | "post" | "reverse"): Promise<boolean> {
    if (!selectedRun) return false;
    const executor = action === "review" ? reviewFxRevaluation : action === "post" ? postFxRevaluation : reverseFxRevaluation;
    return mutate(async () => {
      const updated = await executor(selectedRun.id, idempotencyKey(action));
      setSelectedRun(updated);
      setRuns((current) => current.map((run) => (run.id === updated.id ? { ...run, ...updated } : run)));
      setMessage(action === "review" ? "Revaluation reviewed and frozen for posting." : action === "post" ? "Revaluation posted." : "Revaluation reversed.");
    });
  }

  async function mutate(operation: () => Promise<void>): Promise<boolean> {
    setMutating(true);
    setError("");
    setMessage("");
    try {
      await operation();
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to update the FX revaluation.");
      return false;
    } finally {
      setMutating(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Accountant close"
        title="FX revaluation"
        description="Revalue open foreign receivables and payables without rewriting source documents."
        badge={<LedgerStatusBadge tone="warning">Controlled posting</LedgerStatusBadge>}
      />
      <LedgerPageBody>
        <LedgerAlert tone="warning" title="Manual accounting control">
          Manual captured rates only. Nothing posts silently. Every run requires preview, review, and an explicit posting action; live rate providers remain disabled.
        </LedgerAlert>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to review FX revaluations.</LedgerAlert> : null}
        {organizationId && !canRun && !canReverse ? <StatusMessage type="info">View-only access</StatusMessage> : null}
        {loading ? <LedgerLoadingState title="Loading FX revaluation workspace" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {message ? <StatusMessage type="success">{message}</StatusMessage> : null}

        {organizationId && catalog && readiness ? (
          <>
            {!readiness.fxRevaluationEnabled ? (
              <LedgerAlert tone="danger" title="Revaluation is blocked">{readiness.blockers.join(" ") || "Complete FX account configuration before creating a run."}</LedgerAlert>
            ) : null}
            {!canReadRates ? <LedgerAlert tone="warning">FX rate read permission is required to select closing-rate evidence.</LedgerAlert> : null}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)]">
              <RevaluationPreviewForm
                catalog={catalog}
                rates={rates}
                revaluationDate={revaluationDate}
                rateDate={rateDate}
                selectedRateIds={selectedRateIds}
                disabled={!canRun || !canReadRates || !readiness.fxRevaluationEnabled}
                submitting={mutating}
                onRevaluationDateChange={setRevaluationDate}
                onRateDateChange={(value) => { setRateDate(value); setSelectedRateIds({}); }}
                onRateSelect={(currency, rateId) => setSelectedRateIds((current) => ({ ...current, [currency]: rateId }))}
                onSubmit={() => void createPreview()}
              />
              <LedgerPanel>
                <h2 className="text-base font-semibold text-ink">Revaluation runs</h2>
                <p className="mt-1 mb-3 text-sm text-steel">Select a run to inspect frozen accounting evidence and lifecycle state.</p>
                <RevaluationRunList runs={runs} selectedId={selectedRun?.id ?? null} onSelect={(id) => void selectRun(id)} />
              </LedgerPanel>
            </div>
            {selectedRun ? <RevaluationDetail run={selectedRun} canRun={canRun} canReverse={canReverse} mutating={mutating} onAction={(action) => { if (action === "post" || action === "reverse") setPendingAction(action); else void transition(action); }} /> : null}
          </>
        ) : null}

        <LedgerActionDialog
          open={Boolean(pendingAction && selectedRun)}
          onOpenChange={(open) => {
            if (!open && !mutating) setPendingAction(null);
          }}
          tone="danger"
          title={pendingAction === "reverse" ? "Reverse FX revaluation" : "Post FX revaluation"}
          description={pendingAction === "reverse" ? "Create a reversal journal and restore the prior monetary carrying values?" : "Post a balanced unrealized FX journal and update monetary carrying values?"}
          confirmLabel={pendingAction === "reverse" ? "Reverse" : "Post"}
          busy={mutating}
          onConfirm={async () => {
            if (pendingAction && (await transition(pendingAction))) setPendingAction(null);
          }}
        />
      </LedgerPageBody>
    </LedgerPage>
  );
}
