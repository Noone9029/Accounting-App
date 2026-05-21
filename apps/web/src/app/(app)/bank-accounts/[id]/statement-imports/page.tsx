"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankStatementImportStatusBadgeClass,
  bankStatementImportStatusLabel,
  bankStatementTransactionTypeLabel,
  parseStatementImportText,
  statementImportPreviewSummary,
  STATEMENT_IMPORT_MAX_FILE_BYTES,
  validateStatementImportFile,
} from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankStatementImport, BankStatementImportPreview } from "@/lib/types";
import type { StatementImportClientPreview } from "@/lib/bank-statements";

const EXAMPLE_ROWS = `date,description,reference,amount,balance,currency
2026-05-13,Payment from customer,ABC123,100.0000,1250.0000,SAR
2026-05-14,Bank fee,FEE001,-15.0000,1235.0000,SAR`;

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
  const [clientPreview, setClientPreview] = useState<StatementImportClientPreview | null>(null);
  const [preview, setPreview] = useState<BankStatementImportPreview | null>(null);
  const [importResult, setImportResult] = useState<BankStatementImport | null>(null);
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

  function prepareClientPreview(text = rowsText) {
    const parsed = parseStatementImportText(text, { accountCurrency: profile?.currency });
    setClientPreview(parsed);
    return parsed;
  }

  function handleRowsTextChange(value: string) {
    setRowsText(value);
    setClientPreview(null);
    setPreview(null);
    setImportResult(null);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError("");
    setSuccess("");
    setPreview(null);
    setImportResult(null);
    const validationError = validateStatementImportFile(file);
    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }
    try {
      const text = await file.text();
      setFilename(file.name);
      setRowsText(text);
      const parsed = parseStatementImportText(text, { accountCurrency: profile?.currency });
      setClientPreview(parsed);
      setSuccess(`Loaded ${file.name}. Review the preview before importing.`);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Unable to read the statement file.");
      setClientPreview(null);
    } finally {
      event.target.value = "";
    }
  }

  async function previewImport() {
    setError("");
    setSuccess("");
    setPreviewing(true);
    try {
      const parsed = prepareClientPreview();
      if (parsed.rowCount === 0) {
        setError("Paste or upload at least one statement row.");
        return;
      }
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
      const parsed = prepareClientPreview();
      if (parsed.rowCount === 0) {
        setError("Paste or upload at least one statement row.");
        return;
      }
      payload = buildStatementImportPayload(filename, rowsText);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Unable to parse statement rows.");
      return;
    }
    if (!payload.csvText.trim()) {
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
      const importedCount = imported.importSummary?.importedRowCount ?? imported.rowCount;
      const skippedCount = imported.importSummary?.invalidRowCount ?? imported.invalidRows?.length ?? 0;
      setSuccess(`Imported ${importedCount} statement rows${skippedCount > 0 ? ` and skipped ${skippedCount}` : ""}.`);
      setImportResult(imported);
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          <StatementImportGuidance profileId={params.id} />
          <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
              <span className="text-sm font-semibold text-ink">Upload a manual statement file</span>
              <span className="mt-1 block text-sm leading-6 text-steel">
                Use CSV, JSON, OFX, CAMT XML, MT940, or text exports up to {Math.round(STATEMENT_IMPORT_MAX_FILE_BYTES / 1024 / 1024)} MB. The file is read in your browser for preview; LedgerByte stores the import batch and parsed statement rows, not the raw file body.
              </span>
              <input type="file" accept=".csv,.json,.txt,.ofx,.xml,.camt,.mt940,.940,.sta,text/csv,application/json,text/plain,application/xml,text/xml" onChange={(event) => void handleFileChange(event)} className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-palm file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
            </label>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink">Accepted row shapes</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-steel">
                <li>date, description, debit, credit, balance</li>
                <li>date, description, amount, balance</li>
                <li>transactionDate, memo, amount</li>
                <li>postedDate, details, debitAmount, creditAmount</li>
                <li>OFX, CAMT XML, or MT940 bank export rows</li>
              </ul>
            </div>
          </div>
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
            <span className="mt-1 block text-xs leading-5 text-steel">
              Paste a bank export or use the sample. Signed amounts import as credits when positive and debits when negative. Debit/credit columns, OFX, CAMT XML, and MT940 parser previews are also supported.
            </span>
            <textarea value={rowsText} onChange={(event) => handleRowsTextChange(event.target.value)} rows={8} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-palm" />
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

          {clientPreview ? <ClientParserPreview preview={clientPreview} currency={profile?.currency ?? "SAR"} /> : null}

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

          {importResult ? (
            <ImportResultPanel imported={importResult} profileId={params.id} />
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
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankStatementImportStatusBadgeClass(statementImport.status)}`}>
                    {bankStatementImportStatusLabel(statementImport.status)}
                  </span>
                </td>
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
        {!loading && imports.length === 0 ? (
          <div className="p-4">
            <StatusMessage type="empty">No statement imports found.</StatusMessage>
            <p className="mt-2 text-sm leading-6 text-steel">
              Paste CSV or JSON rows to start a manual statement review. LedgerByte does not pull live transactions from your bank.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StatementImportGuidance({ profileId }: { profileId: string }) {
  return (
    <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-ink">Manual statement import</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        Paste bank-provided CSV, JSON, OFX, CAMT XML, and MT940 rows, preview them, then import valid rows for manual matching. Imports create statement review records only; they do not create accounting journals until a row is categorized, and they do not connect to a live bank feed.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Review unmatched rows
        </Link>
        <Link href={`/bank-accounts/${profileId}/reconciliation`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Reconciliation summary
        </Link>
      </div>
    </div>
  );
}

export function ClientParserPreview({ preview, currency }: { preview: StatementImportClientPreview; currency: string }) {
  const visibleRows = preview.rows.slice(0, 8);
  return (
    <div className="mt-5 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Local parser preview</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            This browser preview checks the file shape before the server validates closed periods and existing duplicates. It does not upload bank credentials or connect to a live bank feed.
          </p>
        </div>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-medium text-steel">{preview.format} input</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <PreviewStat label="Rows read" value={String(preview.rowCount)} />
        <PreviewStat label="Locally valid" value={String(preview.validRowCount)} />
        <PreviewStat label="Needs fixes" value={String(preview.invalidRowCount)} />
        <PreviewStat label="Duplicate candidates" value={String(preview.duplicateCandidateCount)} />
        <PreviewStat label="Detected columns" value={preview.detectedColumns.slice(0, 4).join(", ") || "-"} />
      </div>
      {preview.errors.length > 0 ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {preview.errors.slice(0, 6).map((issue) => (
            <p key={`error-${issue.rowNumber}-${issue.message}`}>Row {issue.rowNumber || "-"}: {issue.message}</p>
          ))}
          {preview.errors.length > 6 ? <p>{preview.errors.length - 6} more row issues hidden in this preview.</p> : null}
        </div>
      ) : null}
      {preview.warnings.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {preview.warnings.slice(0, 6).map((issue) => (
            <p key={`warning-${issue.rowNumber}-${issue.message}`}>Row {issue.rowNumber || "-"}: {issue.message}</p>
          ))}
          {preview.warnings.length > 6 ? <p>{preview.warnings.length - 6} more warnings hidden in this preview.</p> : null}
        </div>
      ) : null}
      {visibleRows.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="bg-slate-50 uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">Row</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2 text-right">Debit</th>
                <th className="px-3 py-2 text-right">Credit</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row) => (
                <tr key={`client-preview-${row.rowNumber}`}>
                  <td className="px-3 py-2 font-mono">{row.rowNumber}</td>
                  <td className="px-3 py-2">{row.date || "-"}</td>
                  <td className="px-3 py-2 text-ink">{row.description || "-"}</td>
                  <td className="px-3 py-2 font-mono">{row.reference ?? row.bankReference ?? "-"}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMoneyAmount(row.debit ?? "0.0000", currency)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMoneyAmount(row.credit ?? "0.0000", currency)}</td>
                  <td className="px-3 py-2">
                    {row.errors.length > 0 ? (
                      <span className="rounded-md bg-rose-50 px-2 py-1 font-medium text-rose-700">Fix required</span>
                    ) : row.duplicateCandidate ? (
                      <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">Duplicate candidate</span>
                    ) : (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">Ready</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export function ImportResultPanel({ imported, profileId }: { imported: BankStatementImport; profileId: string }) {
  const importedCount = imported.importSummary?.importedRowCount ?? imported.rowCount;
  const invalidCount = imported.importSummary?.invalidRowCount ?? imported.invalidRows?.length ?? 0;
  const warnings = imported.importSummary?.warnings ?? [];
  return (
    <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <h2 className="text-base font-semibold text-emerald-900">Statement import saved</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900">
        LedgerByte created a manual statement batch with {importedCount} rows{invalidCount > 0 ? ` and skipped ${invalidCount} invalid rows` : ""}. These are statement review records only; matching and categorization remain manual steps.
      </p>
      {warnings.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900">
          {warnings.slice(0, 4).map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100">
          Review unmatched rows
        </Link>
        <Link href={`/bank-accounts/${profileId}/reconciliation`} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100">
          Open reconciliation
        </Link>
        <Link href={`/bank-accounts/${profileId}`} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100">
          Bank account
        </Link>
      </div>
    </div>
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

function buildStatementImportPayload(filename: string, rowsText: string): { filename: string; csvText: string } {
  return { filename, csvText: rowsText };
}
