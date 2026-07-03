"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankStatementImportStatusBadgeClass,
  bankStatementImportStatusLabel,
  buildStatementImportTemplateCsv,
  isXlsxStatementImportFile,
  bankStatementTransactionTypeLabel,
  parseStatementImportText,
  statementImportPreviewSummary,
  STATEMENT_IMPORT_MAX_FILE_BYTES,
  STATEMENT_IMPORT_TEMPLATE_COLUMNS,
  STATEMENT_IMPORT_TEMPLATE_FILENAME,
  validateStatementImportFile,
} from "@/lib/bank-statements";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankStatementImport, BankStatementImportPreview } from "@/lib/types";
import type { StatementImportClientPreview } from "@/lib/bank-statements";

const EXAMPLE_ROWS = `date,description,reference,amount,balance,currency
2026-05-13,Payment from customer,ABC123,100.0000,1250.0000,SAR
2026-05-14,Bank fee,FEE001,-15.0000,1235.0000,SAR`;

export const STATEMENT_IMPORT_FILE_ACCEPT =
  ".csv,.xlsx,.json,.txt,.ofx,.xml,.camt,.mt940,.940,.sta,text/csv,application/json,text/plain,application/xml,text/xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function BankStatementImportsPage() {
  const params = useParams<{ id: string }>();
  const { locale, tc } = useAppLocale();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [imports, setImports] = useState<BankStatementImport[]>([]);
  const [filename, setFilename] = useState("bank-statement.csv");
  const [openingStatementBalance, setOpeningStatementBalance] = useState("");
  const [closingStatementBalance, setClosingStatementBalance] = useState("");
  const [rowsText, setRowsText] = useState(EXAMPLE_ROWS);
  const [xlsxBase64, setXlsxBase64] = useState("");
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load statement imports."));
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
    if (xlsxBase64) {
      setClientPreview(null);
      return null;
    }
    const parsed = parseStatementImportText(text, { accountCurrency: profile?.currency });
    setClientPreview(parsed);
    return parsed;
  }

  function handleRowsTextChange(value: string) {
    setRowsText(value);
    setXlsxBase64("");
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
      setFilename(file.name);
      if (isXlsxStatementImportFile(file)) {
        setXlsxBase64(arrayBufferToBase64(await file.arrayBuffer()));
        setRowsText("");
        setClientPreview(null);
        setSuccess(tc("Loaded {name}. Use server preview to validate the first worksheet before importing.", { name: file.name }));
      } else {
        const text = await file.text();
        setXlsxBase64("");
        setRowsText(text);
        const parsed = parseStatementImportText(text, { accountCurrency: profile?.currency });
        setClientPreview(parsed);
        setSuccess(tc("Loaded {name}. Review the preview before importing.", { name: file.name }));
      }
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : tc("Unable to read the statement file."));
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
      if (!xlsxBase64 && parsed?.rowCount === 0) {
        setError(tc("Paste or upload at least one statement row."));
        return;
      }
      const result = await apiRequest<BankStatementImportPreview>(`/bank-accounts/${params.id}/statement-imports/preview`, {
        method: "POST",
        body: buildStatementImportPayload(filename, rowsText, xlsxBase64),
      });
      setPreview(result);
      setSuccess(tc("Statement import preview is ready."));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : tc("Unable to preview statement rows."));
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
      if (!xlsxBase64 && parsed?.rowCount === 0) {
        setError(tc("Paste or upload at least one statement row."));
        return;
      }
      payload = buildStatementImportPayload(filename, rowsText, xlsxBase64);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : tc("Unable to parse statement rows."));
      return;
    }
    if (!payload.xlsxBase64 && !payload.csvText.trim()) {
      setError(tc("Paste at least one statement row."));
      return;
    }
    if ((preview?.summary?.blockedRowCount ?? 0) > 0 && !allowPartial) {
      setError(tc("Full import is blocked by invalid, duplicate, or closed-reconciliation rows. Resolve the warnings or enable partial import to skip blocked rows."));
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
      const skippedCount = imported.importSummary?.skippedRowCount ?? imported.importSummary?.invalidRowCount ?? imported.invalidRows?.length ?? 0;
      setSuccess(skippedCount > 0 ? tc("Imported {importedCount} statement rows and skipped {skippedCount}.", { importedCount, skippedCount }) : tc("Imported {importedCount} statement rows.", { importedCount }));
      setImportResult(imported);
      setPreview(null);
      setReloadToken((current) => current + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("Unable to import statement rows."));
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
      setSuccess(tc("Statement import has been voided."));
      setReloadToken((current) => current + 1);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : tc("Unable to void statement import."));
    } finally {
      setVoidingId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Statement imports")}</h1>
          <p className="mt-1 text-sm text-steel">{profile ? tc("{name} statement batches", { name: profile.displayName }) : tc("Bank statement batches")}</p>
        </div>
        <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back")}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to import bank statements.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading statement imports...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {canImport ? (
        <form onSubmit={submitImport} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <StatementImportGuidance profileId={params.id} />
          <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
              <span className="text-sm font-semibold text-ink">{tc("Upload a manual statement file")}</span>
              <span className="mt-1 block text-sm leading-6 text-steel">
                {tc("Use CSV, XLSX, JSON, OFX, CAMT XML, MT940, or text exports up to {maxMb} MB. Text files are read in your browser for local preview; XLSX workbooks are validated by the server preview. LedgerByte stores the import batch and parsed statement rows, not the raw file body.", { maxMb: Math.round(STATEMENT_IMPORT_MAX_FILE_BYTES / 1024 / 1024) })}
              </span>
              <input type="file" accept={STATEMENT_IMPORT_FILE_ACCEPT} onChange={(event) => void handleFileChange(event)} className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-palm file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
            </label>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <StatementImportTemplateActions />
              <p className="mt-4 text-sm font-semibold text-ink">{tc("Accepted row shapes")}</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-steel">
                <li>date, description, debit, credit, balance</li>
                <li>date, description, amount, balance</li>
                <li>transactionDate, memo, amount</li>
                <li>postedDate, details, debitAmount, creditAmount</li>
                <li>XLSX first worksheet or OFX, CAMT XML, MT940 export rows</li>
              </ul>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Filename")}</span>
              <input value={filename} onChange={(event) => setFilename(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Opening balance")}</span>
              <input inputMode="decimal" value={openingStatementBalance} onChange={(event) => setOpeningStatementBalance(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Closing balance")}</span>
              <input inputMode="decimal" value={closingStatementBalance} onChange={(event) => setClosingStatementBalance(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">{tc("CSV text or JSON rows")}</span>
            <span className="mt-1 block text-xs leading-5 text-steel">
              {tc("Paste a bank export or use the sample. Signed amounts import as credits when positive and debits when negative. Debit/credit columns, OFX, CAMT XML, and MT940 parser previews are also supported. XLSX files use server preview from the uploaded workbook.")}
            </span>
            <textarea value={rowsText} onChange={(event) => handleRowsTextChange(event.target.value)} rows={8} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-palm" />
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={allowPartial} onChange={(event) => setAllowPartial(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-palm focus:ring-palm" />
              {tc("Import valid rows only when invalid rows exist")}
            </label>
            <div className="flex flex-wrap gap-2">
              {canPreview ? (
                <button type="button" disabled={previewing || submitting} onClick={() => void previewImport()} className="rounded-md border border-palm px-4 py-2 text-sm font-semibold text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {previewing ? tc("Previewing...") : tc("Preview import")}
                </button>
              ) : null}
              <button type="submit" disabled={submitting || Boolean(preview && preview.validRows.length === 0)} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                {submitting ? tc("Importing...") : tc("Import valid rows")}
              </button>
            </div>
          </div>

          {clientPreview ? <ClientParserPreview preview={clientPreview} currency={profile?.currency ?? "SAR"} /> : null}

          {preview ? <ServerImportPreviewPanel preview={preview} currency={profile?.currency ?? "SAR"} /> : null}

          {importResult ? (
            <ImportResultPanel imported={importResult} profileId={params.id} />
          ) : null}
        </form>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[900px] text-start text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">{tc("Filename")}</th>
              <th className="px-4 py-3">{tc("Statement period")}</th>
              <th className="px-4 py-3 text-end">{tc("Rows")}</th>
              <th className="px-4 py-3 text-end">{tc("Closing balance")}</th>
              <th className="px-4 py-3">{tc("Status")}</th>
              <th className="px-4 py-3">{tc("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {imports.map((statementImport) => (
              <tr key={statementImport.id}>
                <td className="px-4 py-3 font-medium text-ink"><bdi dir="ltr">{statementImport.filename}</bdi></td>
                <td className="px-4 py-3 text-steel">
                  {formatAppDate(statementImport.statementStartDate, locale, "-")} {tc("to")} {formatAppDate(statementImport.statementEndDate, locale, "-")}
                </td>
                <td className="px-4 py-3 text-end font-mono text-xs">{statementImport.rowCount}</td>
                <td className="px-4 py-3 text-end font-mono text-xs">{statementImport.closingStatementBalance ? formatAppMoney(statementImport.closingStatementBalance, profile?.currency ?? "SAR", locale) : "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankStatementImportStatusBadgeClass(statementImport.status)}`}>
                    {tc(bankStatementImportStatusLabel(statementImport.status))}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/bank-accounts/${params.id}/statement-transactions`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      {tc("Rows")}
                    </Link>
                    {canManage && statementImport.status !== "VOIDED" ? (
                      <button type="button" disabled={voidingId === statementImport.id} onClick={() => void voidImport(statementImport.id)} className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
                        {voidingId === statementImport.id ? tc("Voiding...") : tc("Void")}
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
            <StatusMessage type="empty">{tc("No statement imports found.")}</StatusMessage>
            <p className="mt-2 text-sm leading-6 text-steel">
              {tc("Paste or upload dummy CSV, XLSX, JSON, OFX, CAMT XML, or MT940 rows to start a manual statement review. LedgerByte does not pull live transactions from your bank.")}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StatementImportGuidance({ profileId }: { profileId: string }) {
  const { tc } = useAppLocale();

  return (
    <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-ink">{tc("Manual statement import")}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        {tc("Paste bank-provided CSV, XLSX, JSON, OFX, CAMT XML, and MT940 rows, preview them, then import valid rows for manual matching. Imports create statement review records only; they do not create accounting journals until a row is categorized, and they do not connect to a live bank feed.")}
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        {tc("The template columns are {columns}. Use either debit/credit columns or a signed amount, enter ISO dates such as 2026-01-31, and use ISO currency codes such as SAR, AED, or USD. No bank credentials are needed because this is manual statement import, not a live feed.", { columns: STATEMENT_IMPORT_TEMPLATE_COLUMNS.join(", ") })}
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        {tc("OFX/CAMT/MT940 and bank-specific XLSX layouts have limited parser support for variants. Unsupported files fail safely. Raw bank file bodies are not archived in beta; LedgerByte keeps parsed rows and import metadata only.")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Review unmatched rows")}
        </Link>
        <Link href={`/bank-accounts/${profileId}/reconciliation`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Reconciliation summary")}
        </Link>
      </div>
    </div>
  );
}

export function StatementImportTemplateActions({ onDownload = downloadStatementTemplateCsv }: { onDownload?: () => void }) {
  const { tc } = useAppLocale();

  return (
    <div>
      <p className="text-sm font-semibold text-ink">{tc("Statement template")}</p>
      <p className="mt-1 text-sm leading-6 text-steel">
        {tc("Download the canonical CSV template, then upload it as CSV or copy the same columns into the first worksheet of an XLSX workbook. Manual import only; no live bank feed or credentials.")}
      </p>
      <button type="button" onClick={onDownload} className="mt-3 rounded-md border border-palm px-3 py-2 text-sm font-semibold text-palm hover:bg-emerald-50">
        {tc("Download template")}
      </button>
    </div>
  );
}

export function ClientParserPreview({ preview, currency }: { preview: StatementImportClientPreview; currency: string }) {
  const { locale, tc } = useAppLocale();
  const visibleRows = preview.rows.slice(0, 8);
  return (
    <div className="mt-5 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Local parser preview")}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            {tc("This browser preview checks the file shape before the server validates closed periods and existing duplicates. It does not upload bank credentials or connect to a live bank feed, and unsupported bank-specific variants fail safely without archiving raw file bodies.")}
          </p>
        </div>
        <span className="rounded-md bg-white px-3 py-2 text-xs font-medium text-steel"><bdi dir="ltr">{preview.format}</bdi> {tc("input")}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <PreviewStat label={tc("Rows read")} value={String(preview.rowCount)} />
        <PreviewStat label={tc("Locally valid")} value={String(preview.validRowCount)} />
        <PreviewStat label={tc("Needs fixes")} value={String(preview.invalidRowCount)} />
        <PreviewStat label={tc("Duplicate candidates")} value={String(preview.duplicateCandidateCount)} />
        <PreviewStat label={tc("Detected columns")} value={preview.detectedColumns.slice(0, 4).join(", ") || "-"} />
      </div>
      {preview.errors.length > 0 ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {preview.errors.slice(0, 6).map((issue) => (
            <p key={`error-${issue.rowNumber}-${issue.message}`}>{tc("Row")} {issue.rowNumber || "-"}: {issue.message}</p>
          ))}
          {preview.errors.length > 6 ? <p>{tc("{count} more row issues hidden in this preview.", { count: preview.errors.length - 6 })}</p> : null}
        </div>
      ) : null}
      {preview.warnings.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {preview.warnings.slice(0, 6).map((issue) => (
            <p key={`warning-${issue.rowNumber}-${issue.message}`}>{tc("Row")} {issue.rowNumber || "-"}: {issue.message}</p>
          ))}
          {preview.warnings.length > 6 ? <p>{tc("{count} more warnings hidden in this preview.", { count: preview.warnings.length - 6 })}</p> : null}
        </div>
      ) : null}
      {visibleRows.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] text-start text-xs">
            <thead className="bg-slate-50 uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">{tc("Row")}</th>
                <th className="px-3 py-2">{tc("Date")}</th>
                <th className="px-3 py-2">{tc("Description")}</th>
                <th className="px-3 py-2">{tc("Reference")}</th>
                <th className="px-3 py-2 text-end">{tc("Debit")}</th>
                <th className="px-3 py-2 text-end">{tc("Credit")}</th>
                <th className="px-3 py-2">{tc("Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row) => (
                <tr key={`client-preview-${row.rowNumber}`}>
                  <td className="px-3 py-2 font-mono">{row.rowNumber}</td>
                  <td className="px-3 py-2">{row.date ? <bdi dir="ltr">{row.date}</bdi> : "-"}</td>
                  <td className="px-3 py-2 text-ink">{row.description || "-"}</td>
                  <td className="px-3 py-2 font-mono">{row.reference ?? row.bankReference ? <bdi dir="ltr">{row.reference ?? row.bankReference}</bdi> : "-"}</td>
                  <td className="px-3 py-2 text-end font-mono">{formatAppMoney(row.debit ?? "0.0000", currency, locale)}</td>
                  <td className="px-3 py-2 text-end font-mono">{formatAppMoney(row.credit ?? "0.0000", currency, locale)}</td>
                  <td className="px-3 py-2">
                    {row.errors.length > 0 ? (
                      <span className="rounded-md bg-rose-50 px-2 py-1 font-medium text-rose-700">{tc("Fix required")}</span>
                    ) : row.duplicateCandidate ? (
                      <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">{tc("Duplicate candidate")}</span>
                    ) : (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">{tc("Ready")}</span>
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

export function ServerImportPreviewPanel({ preview, currency }: { preview: BankStatementImportPreview; currency: string }) {
  const { locale, tc } = useAppLocale();
  const rowWarningsByRow = groupRowWarningsByRow(preview.rowWarnings ?? []);
  const summary = preview.summary;

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PreviewStat label={tc("Rows")} value={String(preview.rowCount)} />
        <PreviewStat label={tc("Valid")} value={String(preview.validRows.length)} />
        <PreviewStat label={tc("Invalid")} value={String(preview.invalidRows.length)} />
        <PreviewStat label={tc("Importable")} value={String(summary?.importableRowCount ?? preview.validRows.length)} />
        <PreviewStat label={tc("Duplicate rows")} value={String((summary?.duplicateInFileCount ?? 0) + (summary?.duplicateExistingCount ?? 0))} />
        <PreviewStat label={tc("Existing duplicates")} value={String(summary?.duplicateExistingCount ?? 0)} />
        <PreviewStat label={tc("Closed overlaps")} value={String(summary?.closedReconciliationOverlapCount ?? 0)} />
        <PreviewStat label={tc("Open overlaps")} value={String(summary?.openReconciliationOverlapCount ?? 0)} />
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-steel">
        {tc(statementImportPreviewSummary(preview))}
        {preview.sourceFormat ? ` ${tc("Source")} ${preview.sourceFormat}${preview.sourceSheetName ? `, ${tc("sheet")} ${preview.sourceSheetName}` : ""}.` : ""}
      </div>
      {(preview.warnings.length > 0 || (preview.rowWarnings?.length ?? 0) > 0) ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {preview.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          {(preview.rowWarnings ?? []).slice(0, 8).map((warning) => (
            <p key={`${warning.code}-${warning.rowNumber}-${warning.message}`}>
              {warning.rowNumber > 0 ? `Row ${warning.rowNumber}: ` : ""}
              {tc(warningLabel(warning.code))} - {warning.message} {warning.action}
            </p>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[920px] text-start text-xs">
          <thead className="bg-slate-50 uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">{tc("Row")}</th>
              <th className="px-3 py-2">{tc("Date")}</th>
              <th className="px-3 py-2">{tc("Description")}</th>
              <th className="px-3 py-2">{tc("Reference")}</th>
              <th className="px-3 py-2">{tc("Type")}</th>
              <th className="px-3 py-2 text-end">{tc("Amount")}</th>
              <th className="px-3 py-2">{tc("Warnings")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.validRows.map((row) => {
              const rowWarnings = rowWarningsByRow.get(row.rowNumber) ?? [];
              return (
                <tr key={`${row.rowNumber}-${row.description}`}>
                  <td className="px-3 py-2 font-mono">{row.rowNumber}</td>
                  <td className="px-3 py-2">{formatAppDate(row.date, locale, "-")}</td>
                  <td className="px-3 py-2 text-ink">{row.description}</td>
                  <td className="px-3 py-2 font-mono">{row.bankReference ?? row.reference ? <bdi dir="ltr">{row.bankReference ?? row.reference}</bdi> : "-"}</td>
                  <td className="px-3 py-2">{tc(bankStatementTransactionTypeLabel(row.type))}</td>
                  <td className="px-3 py-2 text-end font-mono">{formatAppMoney(row.amount, currency, locale)}</td>
                  <td className="px-3 py-2">
                    {rowWarnings.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {rowWarnings.map((warning) => (
                          <span key={`${warning.code}-${warning.message}`} className={`rounded-md px-2 py-1 font-medium ${warning.severity === "blocking" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                            {tc(warningLabel(warning.code))}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">{tc("Ready")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {preview.invalidRows.length > 0 ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {preview.invalidRows.map((row) => (
            <p key={row.rowNumber}>{tc("Row")} {row.rowNumber}: {row.errors.join(" ")}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ImportResultPanel({ imported, profileId }: { imported: BankStatementImport; profileId: string }) {
  const { tc } = useAppLocale();
  const importedCount = imported.importSummary?.importedRowCount ?? imported.rowCount;
  const invalidCount = imported.importSummary?.invalidRowCount ?? imported.invalidRows?.length ?? 0;
  const skippedCount = imported.importSummary?.skippedRowCount ?? invalidCount;
  const duplicateCount = imported.importSummary?.duplicateExistingCount ?? 0;
  const closedOverlapCount = imported.importSummary?.blockedByClosedReconciliationCount ?? 0;
  const warnings = imported.importSummary?.warnings ?? [];
  return (
    <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <h2 className="text-base font-semibold text-emerald-900">{tc("Statement import saved")}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900">
        {skippedCount > 0
          ? tc("LedgerByte created a manual statement batch with {importedCount} rows and skipped {skippedCount} rows. These are statement review records only; matching and categorization remain manual steps.", { importedCount, skippedCount })
          : tc("LedgerByte created a manual statement batch with {importedCount} rows. These are statement review records only; matching and categorization remain manual steps.", { importedCount })}
      </p>
      {duplicateCount > 0 || closedOverlapCount > 0 ? (
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          {tc("Skipped rows included {duplicateCount} existing duplicate rows and {closedOverlapCount} closed-reconciliation overlaps.", { duplicateCount, closedOverlapCount })}
        </p>
      ) : null}
      {warnings.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900">
          {warnings.slice(0, 4).map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100">
          {tc("Review unmatched rows")}
        </Link>
        <Link href={`/bank-accounts/${profileId}/reconciliation`} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100">
          {tc("Open reconciliation")}
        </Link>
        <Link href={`/bank-accounts/${profileId}`} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100">
          {tc("Bank account")}
        </Link>
      </div>
    </div>
  );
}

function groupRowWarningsByRow(warnings: NonNullable<BankStatementImportPreview["rowWarnings"]>) {
  const byRow = new Map<number, typeof warnings>();
  for (const warning of warnings) {
    if (warning.rowNumber <= 0) {
      continue;
    }
    byRow.set(warning.rowNumber, [...(byRow.get(warning.rowNumber) ?? []), warning]);
  }
  return byRow;
}

function warningLabel(code: string): string {
  switch (code) {
    case "DUPLICATE_IN_FILE":
      return "Duplicate in file";
    case "DUPLICATE_EXISTING_HIGH_CONFIDENCE":
      return "Existing duplicate";
    case "DUPLICATE_EXISTING_POSSIBLE":
      return "Possible duplicate";
    case "CLOSED_RECONCILIATION_OVERLAP":
      return "Closed period";
    case "OPEN_RECONCILIATION_OVERLAP":
      return "Open reconciliation";
    case "CURRENCY_MISMATCH":
      return "Currency mismatch";
    case "PARTIAL_IMPORT_REQUIRED":
      return "Partial import needed";
    default:
      return "Warning";
  }
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function buildStatementImportPayload(filename: string, rowsText: string, xlsxBase64 = ""): { filename: string; csvText: string; xlsxBase64?: string } {
  return xlsxBase64 ? { filename, csvText: "", xlsxBase64 } : { filename, csvText: rowsText };
}

function downloadStatementTemplateCsv() {
  const blob = new Blob([buildStatementImportTemplateCsv()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = STATEMENT_IMPORT_TEMPLATE_FILENAME;
  anchor.click();
  URL.revokeObjectURL(url);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
