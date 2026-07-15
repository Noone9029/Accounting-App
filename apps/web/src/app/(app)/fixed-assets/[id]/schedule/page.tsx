"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FixedAssetNav } from "@/components/fixed-assets/fixed-assets-page";
import { apiRequest } from "@/lib/api";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { LedgerAlert, LedgerDataTable, LedgerLoadingState, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerStatusBadge } from "@/components/ui/ledger-system";

type ScheduleLine = { id: string; depreciationDate: string; openingCarryingAmount: string; depreciationAmount: string; accumulatedDepreciationAfter: string; closingCarryingAmount: string; status: string };
export default function FixedAssetSchedulePage() {
  const params = useParams<{ id: string }>(); const organizationId = useActiveOrganizationId(); const [lines, setLines] = useState<ScheduleLine[] | null>(null); const [error, setError] = useState("");
  useEffect(() => { if (organizationId) apiRequest<{ data: ScheduleLine[] }>(`/fixed-assets/${params.id}/schedule`).then((result) => setLines(result.data)).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load schedule.")); }, [organizationId, params.id]);
  return <LedgerPage><LedgerPageHeader eyebrow="Fixed asset register" title="Depreciation schedule" description="The schedule is a review artifact; it becomes accounting evidence only when a run is posted." /><LedgerPageBody><FixedAssetNav />{error ? <LedgerAlert tone="danger" title="Schedule unavailable">{error}</LedgerAlert> : null}{!lines ? <LedgerLoadingState title="Loading schedule" /> : <LedgerDataTable minWidth="860px"><thead className="bg-mist text-left text-xs uppercase tracking-wide text-steel"><tr>{["Month", "Opening carrying", "Depreciation", "Accumulated after", "Closing carrying", "Status"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-line">{lines.map((line) => <tr key={line.id}><td className="px-4 py-3">{new Date(line.depreciationDate).toLocaleDateString(undefined, { year: "numeric", month: "short" })}</td><td className="px-4 py-3 text-right font-mono text-xs">{line.openingCarryingAmount}</td><td className="px-4 py-3 text-right font-mono text-xs">{line.depreciationAmount}</td><td className="px-4 py-3 text-right font-mono text-xs">{line.accumulatedDepreciationAfter}</td><td className="px-4 py-3 text-right font-mono text-xs font-semibold">{line.closingCarryingAmount}</td><td className="px-4 py-3"><LedgerStatusBadge tone={line.status === "POSTED" ? "success" : line.status === "REVERSED" ? "warning" : "draft"}>{line.status}</LedgerStatusBadge></td></tr>)}</tbody></LedgerDataTable>}</LedgerPageBody></LedgerPage>;
}
