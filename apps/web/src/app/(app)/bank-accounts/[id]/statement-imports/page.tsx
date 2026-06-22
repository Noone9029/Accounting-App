"use client";

import { useParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerInput,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
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
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
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
        setSuccess(`Loaded ${file.name}. Use server preview to validate the first worksheet before importing.`);
      } else {
        const text = await file.text();
        setXlsxBase64("");
        setRowsText(text);
        const parsed = parseStatementImportText(text, { accountCurrency: profile?.currency });
        setClientPreview(parsed);
        setSuccess(`Loaded ${file.name}. Review the preview before importing.`);
      }
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
      if (!xlsxBase64 && parsed?.rowCount === 0) {
        setError("Paste or upload at least one statement row.");
        return;
      }
      const result = await apiRequest<BankStatementImportPreview>(`/bank-accounts/${params.id}/statement-imports/preview`, {
        method: "POST",
        body: buildStatementImportPayload(filename, rowsText, xlsxBase64),
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
      if (!xlsxBase64 && parsed?.rowCount === 0) {
        setError("Paste or upload at least one statement row.");
        return;
      }
      payload = buildStatementImportPayload(filename, rowsText, xlsxBase64);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Unable to parse statement rows.");
      return;
    }
    if (!payload.xlsxBase64 && !payload.csvText.trim()) {
      setError("Paste at least one statement row.");
      return;
    }
    if ((preview?.summary?.blockedRowCount ?? 0) > 0 && !allowPartial) {
      setError("Full import is blocked by invalid, duplicate, or closed-reconciliation rows. Resolve the warnings or enable partial import to skip blocked rows.");
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking / Manual import"
        title="Statement imports"
        description={profile ? `${profile.displayName} statement batches` : "Bank statement batches for manual review."}
        actions={<LedgerButton href={`/bank-accounts/${params.id}`}>Back</LedgerButton>}
      />
      <LedgerSummaryBand tone="info">
        Statement import is manual. LedgerByte parses rows for review; it does not store bank credentials, connect to live bank feeds, or automatically reconcile imported rows.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to import bank statements.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading statement imports...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}

      {canImport ? (
        <form onSubmit={submitImport} className="space-y-5">
          <StatementImportGuidance profileId={params.id} />
          <LedgerPanel className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
              <span className="text-sm font-semibold text-ink">Upload a manual statement file</span>
              <span className="mt-1 block text-sm leading-6 text-steel">
                Use CSV, XLSX, JSON, OFX, CAMT XML, MT940, or text exports up to {Math.round(STATEMENT_IMPORT_MAX_FILE_BYTES / 1024 / 1024)} MB. Text files are read in your browser for local preview; XLSX workbooks are validated by the server preview. LedgerByte stores the import batch and parsed statement rows, not the raw file body.
              </span>
              <input type="file" accept={STATEMENT_IMPORT_FILE_ACCEPT} onChange={(event) => void handleFileChange(event)} className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-palm file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
            </label>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <StatementImportTemplateActions />
              <p className="mt-4 text-sm font-semibold text-ink">Accepted row shapes</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-steel">
                <li>date, description, debit, credit, balance</li>
                <li>date, description, amount, balance</li>
                <li>transactionDate, memo, amount</li>
                <li>postedDate, details, debitAmount, creditAmount</li>
                <li>XLSX first worksheet or OFX, CAMT XML, MT940 export rows</li>
              </ul>
            </div>
          </LedgerPanel>
          <LedgerSection title="Import details" description="Preview and import parsed statement rows for explicit review.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <LedgerFieldLabel>
              Filename
              <LedgerInput value={filename} onChange={(event) => setFilename(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              Opening balance
              <LedgerInput inputMode="decimal" value={openingStatementBalance} onChange={(event) => setOpeningStatementBalance(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              Closing balance
              <LedgerInput inputMode="decimal" value={closingStatementBalance} onChange={(event) => setClosingStatementBalance(event.target.value)} />
            </LedgerFieldLabel>
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">CSV text or JSON rows</span>
            <span className="mt-1 block text-xs leading-5 text-steel">
              Paste a bank export or use the sample. Signed amounts import as credits when positive and debits when negative. Debit/credit columns, OFX, CAMT XML, and MT940 parser previews are also supported. XLSX files use server preview from the uploaded workbook.
            </span>
            <textarea value={rowsText} onChange={(event) => handleRowsTextChange(event.target.value)} rows={8} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-palm" />
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={allowPartial} onChange={(event) => setAllowPartial(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-palm focus:ring-palm" />
              Import valid rows only when invalid rows exist
            </label>
            <LedgerActionBar>
              {canPreview ? (
                <LedgerButton type="button" disabled={previewing || submitting} onClick={() => void previewImport()}>
                  {previewing ? "Previewing..." : "Preview import"}
                </LedgerButton>
              ) : null}
              <LedgerButton type="submit" disabled={submitting || Boolean(preview && preview.validRows.length === 0)} variant="primary">
                {submitting ? "Importing..." : "Import valid rows"}
              </LedgerButton>
            </LedgerActionBar>
          </div>
          </LedgerSection>

          {clientPreview ? <ClientParserPreview preview={clientPreview} currency={profile?.currency ?? "SAR"} /> : null}

          {preview ? <ServerImportPreviewPanel preview={preview} currency={profile?.currency ?? "SAR"} /> : null}

          {importResult ? (
            <ImportResultPanel imported={importResult} profileId={params.id} />
          ) : null}
        </form>
      ) : null}

      <LedgerSection title="Import batches" description="Saved statement import metadata and row counts.">
        <LedgerDataTable minWidth="900px" className="shadow-none">
          <thead className="ledger-table-header">
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
                  <LedgerDate>{formatOptionalDate(statementImport.statementStartDate, "-")}</LedgerDate> to <LedgerDate>{formatOptionalDate(statementImport.statementEndDate, "-")}</LedgerDate>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{statementImport.rowCount}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{statementImport.closingStatementBalance ? formatMoneyAmount(statementImport.closingStatementBalance, profile?.currency ?? "SAR") : "-"}</td>
                <td className="px-4 py-3">
                  <LedgerStatusBadge tone={statementImport.status === "IMPORTED" ? "success" : statementImport.status === "VOIDED" ? "danger" : "neutral"}>
                    {bankStatementImportStatusLabel(statementImport.status)}
                  </LedgerStatusBadge>
                </td>
                <td className="px-4 py-3">
                  <LedgerActionBar>
                    <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions`} size="sm">Rows</LedgerButton>
                    {canManage && statementImport.status !== "VOIDED" ? (
                      <LedgerButton type="button" disabled={voidingId === statementImport.id} onClick={() => void voidImport(statementImport.id)} size="sm" variant="danger">
                        {voidingId === statementImport.id ? "Voiding..." : "Void"}
                      </LedgerButton>
                    ) : null}
                  </LedgerActionBar>
                </td>
              </tr>
            ))}
          </tbody>
        </LedgerDataTable>
        {!loading && imports.length === 0 ? (
          <LedgerEmptyState
            title="No statement imports found"
            description="Paste or upload dummy CSV, XLSX, JSON, OFX, CAMT XML, or MT940 rows to start a manual statement review. LedgerByte does not pull live transactions from your bank."
          />
        ) : null}
      </LedgerSection>
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function StatementImportGuidance({ profileId }: { profileId: string }) {
  return (
    <LedgerPanel>
      <h2 className="text-base font-semibold text-ink">Manual statement import</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        Paste bank-provided CSV, XLSX, JSON, OFX, CAMT XML, and MT940 rows, preview them, then import valid rows for manual matching. Imports create statement review records only; they do not create accounting journals until a row is categorized, and they do not connect to a live bank feed.
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        The template columns are {STATEMENT_IMPORT_TEMPLATE_COLUMNS.join(", ")}. Use either debit/credit columns or a signed amount, enter ISO dates such as 2026-01-31, and use ISO currency codes such as SAR, AED, or USD. No bank credentials are needed because this is manual statement import, not a live feed.
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        OFX/CAMT/MT940 and bank-specific XLSX layouts have limited parser support for variants. Unsupported files fail safely. Raw bank file bodies are not archived in beta; LedgerByte keeps parsed rows and import metadata only.
      </p>
      <LedgerActionBar className="mt-3">
        <LedgerButton href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`}>Review unmatched rows</LedgerButton>
        <LedgerButton href={`/bank-accounts/${profileId}/reconciliation`}>Reconciliation summary</LedgerButton>
      </LedgerActionBar>
    </LedgerPanel>
  );
}

export function StatementImportTemplateActions({ onDownload = downloadStatementTemplateCsv }: { onDownload?: () => void }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">Statement template</p>
      <p className="mt-1 text-sm leading-6 text-steel">
        Download the canonical CSV template, then upload it as CSV or copy the same columns into the first worksheet of an XLSX workbook. Manual import only; no live bank feed or credentials.
      </p>
      <LedgerButton type="button" onClick={onDownload} className="mt-3">
        Download template
      </LedgerButton>
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
            This browser preview checks the file shape before the server validates closed periods and existing duplicates. It does not upload bank credentials or connect to a live bank feed, and unsupported bank-specific variants fail safely without archiving raw file bodies.
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

export function ServerImportPreviewPanel({ preview, currency }: { preview: BankStatementImportPreview; currency: string }) {
  const rowWarningsByRow = groupRowWarningsByRow(preview.rowWarnings ?? []);
  const summary = preview.summary;

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PreviewStat label="Rows" value={String(preview.rowCount)} />
        <PreviewStat label="Valid" value={String(preview.validRows.length)} />
        <PreviewStat label="Invalid" value={String(preview.invalidRows.length)} />
        <PreviewStat label="Importable" value={String(summary?.importableRowCount ?? preview.validRows.length)} />
        <PreviewStat label="Duplicate rows" value={String((summary?.duplicateInFileCount ?? 0) + (summary?.duplicateExistingCount ?? 0))} />
        <PreviewStat label="Existing duplicates" value={String(summary?.duplicateExistingCount ?? 0)} />
        <PreviewStat label="Closed overlaps" value={String(summary?.closedReconciliationOverlapCount ?? 0)} />
        <PreviewStat label="Open overlaps" value={String(summary?.openReconciliationOverlapCount ?? 0)} />
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-steel">
        {statementImportPreviewSummary(preview)}
        {preview.sourceFormat ? ` Source ${preview.sourceFormat}${preview.sourceSheetName ? `, sheet ${preview.sourceSheetName}` : ""}.` : ""}
      </div>
      {(preview.warnings.length > 0 || (preview.rowWarnings?.length ?? 0) > 0) ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {preview.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          {(preview.rowWarnings ?? []).slice(0, 8).map((warning) => (
            <p key={`${warning.code}-${warning.rowNumber}-${warning.message}`}>
              {warning.rowNumber > 0 ? `Row ${warning.rowNumber}: ` : ""}
              {warningLabel(warning.code)} - {warning.message} {warning.action}
            </p>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="bg-slate-50 uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">Row</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Warnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.validRows.map((row) => {
              const rowWarnings = rowWarningsByRow.get(row.rowNumber) ?? [];
              return (
                <tr key={`${row.rowNumber}-${row.description}`}>
                  <td className="px-3 py-2 font-mono">{row.rowNumber}</td>
                  <td className="px-3 py-2">{formatOptionalDate(row.date, "-")}</td>
                  <td className="px-3 py-2 text-ink">{row.description}</td>
                  <td className="px-3 py-2 font-mono">{row.bankReference ?? row.reference ?? "-"}</td>
                  <td className="px-3 py-2">{bankStatementTransactionTypeLabel(row.type)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMoneyAmount(row.amount, currency)}</td>
                  <td className="px-3 py-2">
                    {rowWarnings.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {rowWarnings.map((warning) => (
                          <span key={`${warning.code}-${warning.message}`} className={`rounded-md px-2 py-1 font-medium ${warning.severity === "blocking" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                            {warningLabel(warning.code)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">Ready</span>
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
            <p key={row.rowNumber}>Row {row.rowNumber}: {row.errors.join(" ")}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ImportResultPanel({ imported, profileId }: { imported: BankStatementImport; profileId: string }) {
  const importedCount = imported.importSummary?.importedRowCount ?? imported.rowCount;
  const invalidCount = imported.importSummary?.invalidRowCount ?? imported.invalidRows?.length ?? 0;
  const skippedCount = imported.importSummary?.skippedRowCount ?? invalidCount;
  const duplicateCount = imported.importSummary?.duplicateExistingCount ?? 0;
  const closedOverlapCount = imported.importSummary?.blockedByClosedReconciliationCount ?? 0;
  const warnings = imported.importSummary?.warnings ?? [];
  return (
    <LedgerPanel className="mt-5 border-emerald-200 bg-emerald-50">
      <h2 className="text-base font-semibold text-emerald-900">Statement import saved</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900">
        LedgerByte created a manual statement batch with {importedCount} rows{skippedCount > 0 ? ` and skipped ${skippedCount} rows` : ""}. These are statement review records only; matching and categorization remain manual steps.
      </p>
      {duplicateCount > 0 || closedOverlapCount > 0 ? (
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          Skipped rows included {duplicateCount} existing duplicate rows and {closedOverlapCount} closed-reconciliation overlaps.
        </p>
      ) : null}
      {warnings.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900">
          {warnings.slice(0, 4).map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      <LedgerActionBar className="mt-4">
        <LedgerButton href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`}>Review unmatched rows</LedgerButton>
        <LedgerButton href={`/bank-accounts/${profileId}/reconciliation`}>Open reconciliation</LedgerButton>
        <LedgerButton href={`/bank-accounts/${profileId}`}>Bank account</LedgerButton>
      </LedgerActionBar>
    </LedgerPanel>
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
