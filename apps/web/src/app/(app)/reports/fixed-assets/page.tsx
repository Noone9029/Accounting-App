"use client";

import { useEffect, useState } from "react";
import { FixedAssetNav } from "@/components/fixed-assets/fixed-assets-page";
import { apiRequest } from "@/lib/api";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { downloadPdf, fixedAssetDepreciationReportPdfPath, fixedAssetReconciliationReportPdfPath, fixedAssetRegisterPdfPath } from "@/lib/pdf-download";
import { LedgerAlert, LedgerButton, LedgerDataTable, LedgerLoadingState, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerSection, LedgerStatusBadge } from "@/components/ui/ledger-system";

type Register = Array<{ assetNumber: string; name: string; status: string; originalCost: string; accumulatedDepreciation: string; carryingAmount: string }>;
type DepreciationReport = Array<{ period: string; assetNumber: string; assetName: string; openingCarryingAmount: string; depreciationAmount: string; closingCarryingAmount: string; status: string }>;
type DisposalReport = Array<{ assetNumber: string; assetName: string; disposalDate: string; movementType: string; cost: string; accumulatedDepreciation: string; carryingAmount: string; proceeds: string; gain: string; loss: string; reason?: string | null }>;
type Reconciliation = { register: { cost: string; accumulatedDepreciation: string; carryingAmount: string; depreciationExpense?: string }; generalLedger: { fixedAssetCost: string; accumulatedDepreciation: string; depreciationExpense: string }; differences: { cost: string; accumulatedDepreciation: string; depreciationExpense: string }; reconciled: boolean };

export default function FixedAssetReportsPage() {
  const organizationId = useActiveOrganizationId();
  const [register, setRegister] = useState<Register | null>(null);
  const [depreciation, setDepreciation] = useState<DepreciationReport | null>(null);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [disposals, setDisposals] = useState<DisposalReport | null>(null);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState("");

  useEffect(() => {
    let active = true;
    if (!organizationId) return () => { active = false; };
    Promise.all([apiRequest<Register>("/reports/fixed-assets/register"), apiRequest<DepreciationReport>("/reports/fixed-assets/depreciation"), apiRequest<DisposalReport>("/reports/fixed-assets/disposals"), apiRequest<Reconciliation>("/reports/fixed-assets/reconciliation")])
      .then(([nextRegister, nextDepreciation, nextDisposals, nextReconciliation]) => { if (active) { setRegister(nextRegister); setDepreciation(nextDepreciation); setDisposals(nextDisposals); setReconciliation(nextReconciliation); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load fixed-asset reports."); });
    return () => { active = false; };
  }, [organizationId]);

  async function downloadReport(key: string, path: string, filename: string) {
    setPdfLoading(key);
    setError("");
    try {
      await downloadPdf(path, filename);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to download report PDF.");
    } finally {
      setPdfLoading("");
    }
  }

  return <LedgerPage>
    <LedgerPageHeader
      eyebrow="Reports / Fixed assets"
      title="Fixed asset reports"
      description="Register, depreciation, disposal, and GL reconciliation evidence for accountant review."
      actions={<div className="flex flex-wrap gap-2"><LedgerButton type="button" variant="secondary" onClick={() => void downloadReport("register", fixedAssetRegisterPdfPath(), "fixed-asset-register.pdf")} disabled={Boolean(pdfLoading)}>{pdfLoading === "register" ? "Preparing…" : "Register PDF"}</LedgerButton><LedgerButton type="button" variant="secondary" onClick={() => void downloadReport("depreciation", fixedAssetDepreciationReportPdfPath(), "fixed-asset-depreciation.pdf")} disabled={Boolean(pdfLoading)}>{pdfLoading === "depreciation" ? "Preparing…" : "Depreciation PDF"}</LedgerButton><LedgerButton type="button" variant="secondary" onClick={() => void downloadReport("reconciliation", fixedAssetReconciliationReportPdfPath(), "fixed-asset-reconciliation.pdf")} disabled={Boolean(pdfLoading)}>{pdfLoading === "reconciliation" ? "Preparing…" : "Reconciliation PDF"}</LedgerButton></div>}
    />
    <LedgerPageBody>
      <FixedAssetNav />
      {error ? <LedgerAlert tone="danger" title="Reports unavailable">{error}</LedgerAlert> : null}
      {!register || !depreciation || !disposals || !reconciliation ? <LedgerLoadingState title="Loading reports" /> : <>
        <LedgerSection title="Register report" description={`${register.length} assets in the current register.`}>
          <LedgerDataTable minWidth="820px"><thead className="bg-mist text-left text-xs uppercase tracking-wide text-steel"><tr>{["Asset", "Status", "Cost", "Accumulated depreciation", "Carrying value"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-line">{register.map((row) => <tr key={row.assetNumber}><td className="px-4 py-3 font-semibold">{row.assetNumber}<div className="text-xs font-normal text-steel">{row.name}</div></td><td className="px-4 py-3"><LedgerStatusBadge>{row.status}</LedgerStatusBadge></td><td className="px-4 py-3 text-right font-mono text-xs">{row.originalCost}</td><td className="px-4 py-3 text-right font-mono text-xs">{row.accumulatedDepreciation}</td><td className="px-4 py-3 text-right font-mono text-xs font-semibold">{row.carryingAmount}</td></tr>)}</tbody></LedgerDataTable>
        </LedgerSection>
        <LedgerSection title="Depreciation report" description={`${depreciation.length} schedule lines in the current bounded report.`}>
          {depreciation.length === 0 ? <p className="text-sm text-steel">No depreciation schedule lines.</p> : <LedgerDataTable minWidth="980px"><thead className="bg-mist text-left text-xs uppercase tracking-wide text-steel"><tr>{["Period", "Asset", "Opening", "Depreciation", "Closing", "Status"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-line">{depreciation.map((row) => <tr key={`${row.assetNumber}-${row.period}`}><td className="px-4 py-3 text-steel">{row.period}</td><td className="px-4 py-3 font-semibold">{row.assetNumber}<div className="text-xs font-normal text-steel">{row.assetName}</div></td><td className="px-4 py-3 text-right font-mono text-xs">{row.openingCarryingAmount}</td><td className="px-4 py-3 text-right font-mono text-xs">{row.depreciationAmount}</td><td className="px-4 py-3 text-right font-mono text-xs">{row.closingCarryingAmount}</td><td className="px-4 py-3"><LedgerStatusBadge>{row.status}</LedgerStatusBadge></td></tr>)}</tbody></LedgerDataTable>}
        </LedgerSection>
        <LedgerSection title="Disposal report" description={`${disposals.length} sale or write-off movements with proceeds and gain/loss evidence.`}>
          {disposals.length === 0 ? <p className="text-sm text-steel">No disposal or write-off movements.</p> : <LedgerDataTable minWidth="1180px"><thead className="bg-mist text-left text-xs uppercase tracking-wide text-steel"><tr>{["Asset", "Date", "Type", "Cost", "Accum. depreciation", "Carrying", "Proceeds", "Gain", "Loss"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-line">{disposals.map((row) => <tr key={`${row.assetNumber}-${row.disposalDate}-${row.movementType}`}><td className="px-4 py-3 font-semibold">{row.assetNumber}<div className="text-xs font-normal text-steel">{row.assetName}</div></td><td className="px-4 py-3 text-steel">{new Date(row.disposalDate).toLocaleDateString()}</td><td className="px-4 py-3"><LedgerStatusBadge>{row.movementType.replaceAll("_", " ")}</LedgerStatusBadge></td><td className="px-4 py-3 text-right font-mono text-xs">{row.cost}</td><td className="px-4 py-3 text-right font-mono text-xs">{row.accumulatedDepreciation}</td><td className="px-4 py-3 text-right font-mono text-xs">{row.carryingAmount}</td><td className="px-4 py-3 text-right font-mono text-xs">{row.proceeds}</td><td className="px-4 py-3 text-right font-mono text-xs">{row.gain}</td><td className="px-4 py-3 text-right font-mono text-xs">{row.loss}</td></tr>)}</tbody></LedgerDataTable>}
        </LedgerSection>
        <LedgerSection title="GL reconciliation" description="Register balances are compared with mapped fixed-asset accounts; differences stay visible until resolved."><div className="grid gap-3 sm:grid-cols-3">{[["Register cost", reconciliation.register.cost, reconciliation.differences.cost], ["Accumulated depreciation", reconciliation.register.accumulatedDepreciation, reconciliation.differences.accumulatedDepreciation], ["Depreciation expense", reconciliation.generalLedger.depreciationExpense, reconciliation.differences.depreciationExpense]].map(([label, value, difference]) => <div key={label} className="rounded-md border border-line bg-mist p-3"><div className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</div><div className="mt-1 font-mono text-sm">{value}</div><div className="mt-1 text-xs text-steel">Difference: {difference}</div></div>)}</div><div className="mt-4"><LedgerStatusBadge tone={reconciliation.reconciled ? "success" : "danger"}>{reconciliation.reconciled ? "Reconciled" : "Difference requires review"}</LedgerStatusBadge></div></LedgerSection>
      </>}
    </LedgerPageBody>
  </LedgerPage>;
}
