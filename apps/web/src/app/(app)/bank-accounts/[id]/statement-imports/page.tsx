"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { parseStatementRowsText } from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankStatementImport } from "@/lib/types";

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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voidingId, setVoidingId] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canImport = can(PERMISSIONS.bankStatements.import);
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

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    let rows;
    try {
      rows = parseStatementRowsText(rowsText);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Unable to parse statement rows.");
      return;
    }
    if (rows.length === 0) {
      setError("Paste at least one statement row.");
      return;
    }

    setSubmitting(true);
    try {
      const imported = await apiRequest<BankStatementImport>(`/bank-accounts/${params.id}/statement-imports`, {
        method: "POST",
        body: {
          filename,
          openingStatementBalance: openingStatementBalance || undefined,
          closingStatementBalance: closingStatementBalance || undefined,
          rows,
        },
      });
      setSuccess(`Imported ${imported.rowCount} statement rows.`);
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
            <span className="text-sm font-medium text-slate-700">Rows</span>
            <textarea value={rowsText} onChange={(event) => setRowsText(event.target.value)} rows={8} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-palm" />
          </label>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={submitting} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {submitting ? "Importing..." : "Import rows"}
            </button>
          </div>
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
