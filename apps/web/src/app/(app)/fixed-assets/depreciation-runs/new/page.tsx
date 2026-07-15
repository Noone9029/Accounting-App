"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { FixedAssetNav } from "@/components/fixed-assets/fixed-assets-page";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerInput,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
} from "@/components/ui/ledger-system";

type FiscalPeriod = { id: string; name: string; status: string };

export default function NewDepreciationRunPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [fiscalPeriodId, setFiscalPeriodId] = useState("");
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!organizationId) return () => { active = false; };
    setLoadingPeriods(true);
    setError("");
    apiRequest<FiscalPeriod[]>("/fiscal-periods")
      .then((result) => {
        if (!active) return;
        const openPeriods = result.filter((period) => period.status === "OPEN");
        setPeriods(openPeriods);
        setFiscalPeriodId((current) => current && openPeriods.some((period) => period.id === current) ? current : openPeriods[0]?.id ?? "");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load fiscal periods.");
      })
      .finally(() => { if (active) setLoadingPeriods(false); });
    return () => { active = false; };
  }, [organizationId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !fiscalPeriodId) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const run = await apiRequest<{ id: string }>("/fixed-assets/depreciation-runs/preview", {
        method: "POST",
        body: {
          fiscalPeriodId,
          depreciationDate: String(data.get("depreciationDate")),
          idempotencyKey: String(data.get("idempotencyKey")),
        },
      });
      router.push(`/fixed-assets/depreciation-runs/${run.id}`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to preview depreciation run.");
      setBusy(false);
    }
  }

  return <LedgerPage>
    <LedgerPageHeader eyebrow="Fixed assets" title="Preview depreciation run" description="Preview is non-posting. Review the generated lines before the accountant posts the run." />
    <LedgerPageBody>
      <FixedAssetNav />
      {error ? <LedgerAlert tone="danger" title="Preview unavailable">{error}</LedgerAlert> : null}
      {loadingPeriods ? <LedgerLoadingState title="Loading fiscal periods" description="Checking which accounting period can receive this preview." /> : null}
      {!loadingPeriods && periods.length === 0 ? <LedgerAlert tone="warning" title="No open fiscal period">Create or reopen an open fiscal period before previewing depreciation.</LedgerAlert> : null}
      {!loadingPeriods && periods.length > 0 ? <form onSubmit={submit} className="max-w-xl space-y-4 rounded-md border border-line bg-panel p-5 shadow-panel">
        <div><LedgerFieldLabel htmlFor="fiscalPeriodId">Fiscal period</LedgerFieldLabel><LedgerSelect id="fiscalPeriodId" aria-label="Fiscal period" value={fiscalPeriodId} onChange={(event) => setFiscalPeriodId(event.target.value)} required>{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</LedgerSelect></div>
        <div><LedgerFieldLabel htmlFor="depreciationDate">Depreciation date</LedgerFieldLabel><LedgerInput id="depreciationDate" name="depreciationDate" type="date" required /></div>
        <div><LedgerFieldLabel htmlFor="idempotencyKey">Review key</LedgerFieldLabel><LedgerInput id="idempotencyKey" name="idempotencyKey" required placeholder="2026-07-fixed-assets" /><p className="mt-1 text-xs text-steel">Reuse the same key to safely reopen the same preview.</p></div>
        <div className="flex justify-end gap-2"><LedgerButton href="/fixed-assets/depreciation-runs" variant="secondary">Cancel</LedgerButton><LedgerButton type="submit" variant="primary" disabled={busy || !fiscalPeriodId}>{busy ? "Building preview…" : "Build preview"}</LedgerButton></div>
      </form> : null}
    </LedgerPageBody>
  </LedgerPage>;
}
