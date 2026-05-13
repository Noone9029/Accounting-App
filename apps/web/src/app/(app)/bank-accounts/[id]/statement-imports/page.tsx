"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankStatementTransactionTypeLabel, parseStatementRowsText, statementImportPreviewSummary } from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankStatementImport, BankStatementImportPreview } from "@/lib/types";

const EXAMPLE_ROWS = `date,description,reference,debit,credit
2026-05-13,Payment from customer,ABC123,0.0000,100.0000
2026-05-14,Bank fee,FEE001,15.0000,0.0000`;

export default function BankStatementImportsPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [imports, setImports] = useState<BankStatementImport[]>([]);
  const [filename, setFilename] = useState("bank-statement.csv");
  const [openingStatementBalance, setOpeningStatementBalance] = useState("");
  const [closingStatementBalance, setClosingStatementBalance] = useState("");
  const [rowsText, setRowsText] = useState(EXAMPLE_ROWS);
  const [preview, setPreview] = useState<BankStatementImportPreview | null>(null);
  const [allowPartial, setAllowPartial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voidingId, setVoidingId] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canImport = can(PERMISSIONS.bankStatements.import);
  const canPreview = can(PERMISSIONS.bankStatements.previewImport);
  const canManage = can(PERMISSIONS.bankStatements.manage);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`),
      apiRequest<BankStatementImport[]>(`/bank-accounts/${params.id}/statement-imports`),
    ])
      .then(([profileResult, importsResult]) => {
        if (!cancelled) {
          setProfile(profileResult);
          setImports(importsResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load statement imports.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, reloadToken]);

  async function previewImport() {
    setError("");
    setSuccess("");
    setPreviewing(true);
    try {
      const result = await apiRequest<BankStatementImportPreview>(`/bank-accounts/${params.id}/statement-imports/preview`, {
        method: "POST",
        body: buildStatementImportPayload(filename, rowsText),
      });
      setPreview(result);
      setSuccess("Statement import preview is ready.");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Unable to preview statement rows.");
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    let payload;
    try {
      payload = buildStatementImportPayload(filename, rowsText);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Unable to parse statement rows.");
      return;
    }
    if (!payload.csvText && (!payload.rows || payload.rows.length === 0)) {
      setError("Paste at least one statement row.");
      return;
    }

    setSubmitting(true);
    try {
      const imported = await apiRequest<BankStatementImport>(`/bank-accounts/${params.id}/statement-imports`, {
        method: "POST",
        body: {
          ...payload,
          openingStatementBalance: openingStatementBalance || undefined,
          closingStatementBalance: closingStatementBalance || undefined,
          allowPartial,
        },
      });
      setSuccess(`Imported ${imported.rowCount} statement rows.`);
      setPreview(null);
      setReloadToken((current) => current + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to import statement rows.");
    } finally {
      setSubmitting(false);
    }
  }

  async function voidImport(id: string) {
    setVoidingId(id);
    setError("");
    setSuccess("");
    try {
      await apiRequest<BankStatementImport>(`/bank-statement-imports/${id}/void`, { method: "POST" });
      setSuccess("Statement import has been voided.");
      setReloadToken((current) => current + 1);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void statement import.");
    } finally {
      setVoidingId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Statement imports</h1>
          <p className="mt-1 text-sm text-steel">{profile ? `${profile.displayName} statement batches` : "Bank statement batches"}</p>
        </div>
        <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to import bank statements.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading statement imports...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {canImport ? (
        <form onSubmit={submitImport} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Filename</span>
              <input value={filename} onChange={(event) => setFilename(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Opening balance</span>
              <input inputMode="decimal" value={openingStatementBalance} onChange={(event) => setOpeningStatementBalance(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Closing balance</span>
              <input inputMode="decimal" value={closingStatementBalance} onChange={(event) => setClosingStatementBalance(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">CSV text or JSON rows</span>
            <textarea value={rowsText} onChange={(event) => setRowsText(event.target.value)} rows={8} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-palm" />
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={allowPartial} onChange={(event) => setAllowPartial(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-palm focus:ring-palm" />
              Import valid rows only when invalid rows exist
            </label>
            <div className="flex flex-wrap gap-2">
              {canPreview ? (
                <button type="button" disabled={previewing || submitting} onClick={() => void previewImport()} className="rounded-md border border-palm px-4 py-2 text-sm font-semibold text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {previewing ? "Previewing..." : "Preview import"}
                </button>
              ) : null}
              <button type="submit" disabled={submitting || Boolean(preview && preview.validRows.length === 0)} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                {submitting ? "Importing..." : "Import valid rows"}
              </button>
            </div>
          </div>

          {preview ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <PreviewStat label="Rows" value={String(preview.rowCount)} />
                <PreviewStat label="Valid" value={String(preview.validRows.length)} />
                <PreviewStat label="Invalid" value={String(preview.invalidRows.length)} />
                <PreviewStat label="Detected columns" value={preview.detectedColumns.join(", ") || "-"} />
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-steel">
                {statementImportPreviewSummary(preview)}
              </div>
              {preview.warnings.length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {preview.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.validRows.map((row) => (
                      <tr key={`${row.rowNumber}-${row.description}`}>
                        <td className="px-3 py-2 font-mono">{row.rowNumber}</td>
                        <td className="px-3 py-2">{formatOptionalDate(row.date, "-")}</td>
                        <td className="px-3 py-2 text-ink">{row.description}</td>
                        <td className="px-3 py-2 font-mono">{row.reference ?? "-"}</td>
                        <td className="px-3 py-2">{bankStatementTransactionTypeLabel(row.type)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatMoneyAmount(row.amount, profile?.currency ?? "SAR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.invalidRows.length > 0 ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {preview.invalidRows.map((row) => (
                    <p key={row.rowNumber}>Row {row.rowNumber}: {row.errors.join(" ")}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Filename</th>
              <th className="px-4 py-3">Statement period</th>
              <th className="px-4 py-3 text-right">Rows</th>
              <th className="px-4 py-3 text-right">Closing balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {imports.map((statementImport) => (
              <tr key={statementImport.id}>
                <td className="px-4 py-3 font-medium text-ink">{statementImport.filename}</td>
                <td className="px-4 py-3 text-steel">
                  {formatOptionalDate(statementImport.statementStartDate, "-")} to {formatOptionalDate(statementImport.statementEndDate, "-")}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{statementImport.rowCount}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{statementImport.closingStatementBalance ? formatMoneyAmount(statementImport.closingStatementBalance, profile?.currency ?? "SAR") : "-"}</td>
                <td className="px-4 py-3 text-steel">{statementImport.status.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/bank-accounts/${params.id}/statement-transactions`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Rows
                    </Link>
                    {canManage && statementImport.status !== "VOIDED" ? (
                      <button type="button" disabled={voidingId === statementImport.id} onClick={() => void voidImport(statementImport.id)} className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
                        {voidingId === statementImport.id ? "Voiding..." : "Void"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && imports.length === 0 ? <StatusMessage type="empty">No statement imports found.</StatusMessage> : null}
      </div>
    </section>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function buildStatementImportPayload(filename: string, rowsText: string): { filename: string; csvText?: string; rows?: ReturnType<typeof parseStatementRowsText> } {
  const trimmed = rowsText.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return { filename, rows: parseStatementRowsText(trimmed) };
  }
  return { filename, csvText: rowsText };
}
