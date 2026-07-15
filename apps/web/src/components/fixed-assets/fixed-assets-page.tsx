"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ClipboardCheck, Plus, RefreshCw, Settings2 } from "lucide-react";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetricGrid,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";

export type FixedAssetStatus = "DRAFT" | "READY_FOR_REVIEW" | "ACTIVE" | "FULLY_DEPRECIATED" | "DISPOSED" | "WRITTEN_OFF";

export interface FixedAsset {
  id: string;
  assetNumber: string;
  name: string;
  status: FixedAssetStatus;
  baseAcquisitionCost: string;
  accumulatedDepreciation: string;
  carryingAmount: string;
  baseSalvageValue: string;
  acquisitionDate: string;
  inServiceDate: string;
  capitalizationJournalEntryId?: string | null;
  disposalJournalEntryId?: string | null;
  costCenter?: { id: string; code: string; name: string } | null;
  project?: { id: string; code: string; name: string } | null;
  category?: { id: string; code: string; name: string };
}

export interface FixedAssetCategory { id: string; code: string; name: string; defaultUsefulLifeMonths: number; defaultSalvageValue: string; }
export interface DepreciationRun { id: string; runNumber: string; depreciationDate: string; status: string; totalDepreciation: string; lineCount?: number; }

const statusTone: Record<FixedAssetStatus | string, "neutral" | "success" | "warning" | "danger" | "info" | "draft"> = {
  DRAFT: "draft", READY_FOR_REVIEW: "warning", ACTIVE: "success", FULLY_DEPRECIATED: "info", DISPOSED: "neutral", WRITTEN_OFF: "danger",
};

function money(value: string | number | null | undefined) { return Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function date(value: string) { return value ? new Date(value).toLocaleDateString() : "—"; }

export function FixedAssetNav() {
  return <div className="flex flex-wrap gap-2" aria-label="Fixed asset navigation">
    <LedgerButton href="/fixed-assets" variant="secondary">Register</LedgerButton>
    <LedgerButton href="/fixed-assets/depreciation-runs" variant="secondary">Depreciation runs</LedgerButton>
    <LedgerButton href="/fixed-assets/categories" variant="secondary">Categories</LedgerButton>
    <LedgerButton href="/reports/fixed-assets" variant="secondary">Reports</LedgerButton>
    <LedgerButton href="/settings/fixed-assets" variant="quiet" icon={Settings2}>Settings</LedgerButton>
  </div>;
}

export function FixedAssetsPage() {
  const organizationId = useActiveOrganizationId();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const load = () => {
    const currentRequestId = ++requestId.current;
    setAssets([]);
    if (!organizationId) {
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true); setError("");
    apiRequest<{ data: FixedAsset[]; total: number }>(`/fixed-assets?search=${encodeURIComponent(search)}`)
      .then((result) => { if (currentRequestId === requestId.current) setAssets(result.data); })
      .catch((e: unknown) => { if (currentRequestId === requestId.current) { setAssets([]); setError(e instanceof Error ? e.message : "Unable to load fixed assets."); } })
      .finally(() => { if (currentRequestId === requestId.current) setLoading(false); });
  };
  useEffect(load, [organizationId, search]);
  const active = assets.filter((asset) => asset.status === "ACTIVE" || asset.status === "FULLY_DEPRECIATED").length;
  const carrying = assets.reduce((sum, asset) => sum + Number(asset.carryingAmount), 0);
  return <LedgerPage>
    <LedgerPageHeader eyebrow="Accounting / Fixed assets" title="Fixed asset register" description="Track acquisition, depreciation, carrying value, and disposal evidence in one tenant-scoped register." actions={<><LedgerButton href="/fixed-assets/new" variant="primary" icon={Plus}>Add asset</LedgerButton><LedgerButton onClick={load} variant="secondary" icon={RefreshCw}>Refresh</LedgerButton></>} />
    <LedgerPageBody>
      <FixedAssetNav />
      <LedgerMetricGrid><LedgerStatCard label="Visible assets" value={assets.length} detail="Current register result" /><LedgerStatCard label="In service" value={active} detail="Active or fully depreciated" /><LedgerStatCard label="Carrying value" value={money(carrying)} detail="Register total" /><LedgerStatCard label="Review queue" value={assets.filter((a) => a.status === "READY_FOR_REVIEW" || a.status === "DRAFT").length} detail="Needs accountant action" href="/fixed-assets" /></LedgerMetricGrid>
      <LedgerPanel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><LedgerFieldLabel htmlFor="fixed-asset-search">Search register</LedgerFieldLabel><LedgerInput id="fixed-asset-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Asset number, name, or tag" /></div><LedgerSummaryBand tone="info">Straight-line schedules begin the month after the in-service date.</LedgerSummaryBand></div>
      </LedgerPanel>
      {error ? <LedgerAlert tone="danger" title="Register unavailable">{error}</LedgerAlert> : null}
      {loading ? <LedgerLoadingState title="Loading fixed assets" description="Reading the active organization register." /> : assets.length === 0 ? <LedgerEmptyState title="No fixed assets yet" description="Create a draft asset, review it, then post its acquisition evidence." action={<LedgerButton href="/fixed-assets/new" variant="primary" icon={Plus}>Add first asset</LedgerButton>} /> : <LedgerDataTable minWidth="900px"><thead className="bg-mist text-left text-xs uppercase tracking-wide text-steel"><tr>{["Asset", "Category", "Acquired", "Cost", "Accum. depreciation", "Carrying value", "Status", ""].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-line">{assets.map((asset) => <tr key={asset.id} className="hover:bg-mist/50"><td className="px-4 py-3"><Link href={`/fixed-assets/${asset.id}`} className="font-semibold text-palm hover:underline">{asset.assetNumber}</Link><div className="text-xs text-steel">{asset.name}</div></td><td className="px-4 py-3 text-sm text-steel">{asset.category?.name ?? "—"}</td><td className="px-4 py-3 text-sm text-steel">{date(asset.acquisitionDate)}</td><td className="px-4 py-3 text-right font-mono text-xs">{money(asset.baseAcquisitionCost)}</td><td className="px-4 py-3 text-right font-mono text-xs">{money(asset.accumulatedDepreciation)}</td><td className="px-4 py-3 text-right font-mono text-xs font-semibold">{money(asset.carryingAmount)}</td><td className="px-4 py-3"><LedgerStatusBadge tone={statusTone[asset.status]}>{asset.status.replaceAll("_", " ")}</LedgerStatusBadge></td><td className="px-4 py-3 text-right"><Link href={`/fixed-assets/${asset.id}`} aria-label={`Open ${asset.assetNumber}`} className="text-palm"><ArrowRight className="h-4 w-4" /></Link></td></tr>)}</tbody></LedgerDataTable>}
    </LedgerPageBody>
  </LedgerPage>;
}

export function FixedAssetDetailPage({ id }: { id: string }) {
  const organizationId = useActiveOrganizationId();
  const [asset, setAsset] = useState<FixedAsset & { scheduleLines?: Array<{ id: string; depreciationDate: string; depreciationAmount: string; status: string; closingCarryingAmount: string }>; movements?: Array<{ id: string; movementType: string; effectiveDate: string; baseAmount: string }> }>();
  const [error, setError] = useState("");
  useEffect(() => { if (organizationId) apiRequest<typeof asset>(`/fixed-assets/${id}`).then(setAsset).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load fixed asset.")); }, [id, organizationId]);
  if (error) return <LedgerPage><LedgerAlert tone="danger" title="Asset unavailable">{error}</LedgerAlert></LedgerPage>;
  if (!asset) return <LedgerPage><LedgerLoadingState title="Loading asset" /></LedgerPage>;
  return <LedgerPage><LedgerPageHeader eyebrow="Fixed asset register" title={asset.name} description={`${asset.assetNumber} · ${asset.category?.name ?? "Uncategorised"}`} badge={<LedgerStatusBadge tone={statusTone[asset.status]}>{asset.status.replaceAll("_", " ")}</LedgerStatusBadge>} actions={<><LedgerButton href="/fixed-assets" variant="secondary">Back to register</LedgerButton>{asset.status === "DRAFT" ? <LedgerButton href={`/fixed-assets/${asset.id}/edit`} variant="secondary">Edit draft</LedgerButton> : null}<LedgerButton href={`/fixed-assets/${asset.id}/schedule`} variant="secondary" icon={ClipboardCheck}>Schedule evidence</LedgerButton></>} /><LedgerPageBody><FixedAssetNav /><LedgerSection title="Accounting snapshot" description="Values are tenant-scoped and shown in the organization base currency."><div className="grid gap-3 sm:grid-cols-4">{[["Cost", asset.baseAcquisitionCost], ["Accumulated depreciation", asset.accumulatedDepreciation], ["Carrying value", asset.carryingAmount], ["Salvage floor", asset.baseSalvageValue]].map(([label, value]) => <div key={label} className="rounded-md bg-mist p-3"><div className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</div><div className="mt-1 font-mono text-sm font-semibold">{money(value)}</div></div>)}</div></LedgerSection><LedgerSection title="Lifecycle evidence" description="Every posting and reversal is represented in the movement trail."><dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs uppercase text-steel">Acquisition date</dt><dd className="mt-1">{date(asset.acquisitionDate)}</dd></div><div><dt className="text-xs uppercase text-steel">In service</dt><dd className="mt-1">{date(asset.inServiceDate)}</dd></div><div><dt className="text-xs uppercase text-steel">Depreciation method</dt><dd className="mt-1">Straight-line / monthly</dd></div><div><dt className="text-xs uppercase text-steel">Cost center</dt><dd className="mt-1">{asset.costCenter?.name ?? "—"}</dd></div><div><dt className="text-xs uppercase text-steel">Project</dt><dd className="mt-1">{asset.project?.name ?? "—"}</dd></div><div><dt className="text-xs uppercase text-steel">Capitalization journal</dt><dd className="mt-1 font-mono text-xs">{asset.capitalizationJournalEntryId ?? "—"}</dd></div></dl></LedgerSection></LedgerPageBody></LedgerPage>;
}

export function DepreciationRunsPage() {
  const organizationId = useActiveOrganizationId();
  const [runs, setRuns] = useState<DepreciationRun[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { if (organizationId) apiRequest<DepreciationRun[]>("/fixed-assets/depreciation-runs").then(setRuns).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load depreciation runs.")); }, [organizationId]);
  return <LedgerPage><LedgerPageHeader eyebrow="Accounting / Fixed assets" title="Depreciation runs" description="Preview, review, post, and reverse monthly straight-line depreciation with explicit review gates." actions={<LedgerButton href="/fixed-assets/depreciation-runs/new" variant="primary" icon={Plus}>Preview run</LedgerButton>} /><LedgerPageBody><FixedAssetNav />{error ? <LedgerAlert tone="danger" title="Runs unavailable">{error}</LedgerAlert> : null}<LedgerPanel><div className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-palm" /><div><h2 className="font-semibold">Review before posting</h2><p className="text-sm text-steel">A posted run creates the expense and accumulated-depreciation journal and advances each asset version.</p></div></div></LedgerPanel>{runs.length === 0 ? <LedgerEmptyState title="No depreciation runs" description="Preview a month to build an auditable review package." action={<LedgerButton href="/fixed-assets/depreciation-runs/new" variant="primary">Preview first run</LedgerButton>} /> : <LedgerDataTable minWidth="760px"><thead className="bg-mist text-left text-xs uppercase tracking-wide text-steel"><tr>{["Run", "Depreciation date", "Lines", "Amount", "Status", ""].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-line">{runs.map((run) => <tr key={run.id}><td className="px-4 py-3 font-semibold">{run.runNumber}</td><td className="px-4 py-3 text-steel">{date(run.depreciationDate)}</td><td className="px-4 py-3">{run.lineCount ?? "—"}</td><td className="px-4 py-3 text-right font-mono text-xs">{money(run.totalDepreciation)}</td><td className="px-4 py-3"><LedgerStatusBadge tone={run.status === "POSTED" ? "success" : run.status === "FAILED" ? "danger" : "warning"}>{run.status.replaceAll("_", " ")}</LedgerStatusBadge></td><td className="px-4 py-3 text-right"><Link href={`/fixed-assets/depreciation-runs/${run.id}`} className="text-palm">Review</Link></td></tr>)}</tbody></LedgerDataTable>}</LedgerPageBody></LedgerPage>;
}

export function FixedAssetCategoriesPage() {
  const organizationId = useActiveOrganizationId();
  const [categories, setCategories] = useState<FixedAssetCategory[]>([]);
  useEffect(() => { if (organizationId) apiRequest<FixedAssetCategory[]>("/fixed-assets/categories").then(setCategories).catch(() => setCategories([])); }, [organizationId]);
  return <LedgerPage><LedgerPageHeader eyebrow="Settings / Fixed assets" title="Asset categories" description="Each category maps cost, accumulated depreciation, expense, and disposal accounts." actions={<LedgerButton href="/settings/fixed-assets" variant="secondary" icon={Settings2}>Account mappings</LedgerButton>} /><LedgerPageBody><FixedAssetNav /><LedgerDataTable minWidth="760px"><thead className="bg-mist text-left text-xs uppercase tracking-wide text-steel"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Useful life</th><th className="px-4 py-3">Default salvage</th></tr></thead><tbody className="divide-y divide-line">{categories.map((category) => <tr key={category.id}><td className="px-4 py-3 font-mono text-xs">{category.code}</td><td className="px-4 py-3 font-semibold">{category.name}</td><td className="px-4 py-3">{category.defaultUsefulLifeMonths} months</td><td className="px-4 py-3 font-mono text-xs">{money(category.defaultSalvageValue)}</td></tr>)}</tbody></LedgerDataTable></LedgerPageBody></LedgerPage>;
}
