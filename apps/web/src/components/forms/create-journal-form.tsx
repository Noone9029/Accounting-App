"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { calculateTotals, formatUnits, parseDecimalToUnits } from "@/lib/money";
import type { Account, JournalEntry, TaxRate } from "@/lib/types";

interface LineState {
  id: string;
  accountId: string;
  taxRateId: string;
  description: string;
  debit: string;
  credit: string;
}

function makeLine(accountId = ""): LineState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random()}`,
    accountId,
    taxRateId: "",
    description: "",
    debit: "0.0000",
    credit: "0.0000",
  };
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CreateJournalForm() {
  const organizationId = useActiveOrganizationId();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [lines, setLines] = useState<LineState[]>([makeLine(), makeLine()]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const postingAccounts = accounts.filter((account) => account.isActive && account.allowPosting);
  const totals = useMemo(() => calculateTotals(lines), [lines]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<Account[]>("/accounts"), apiRequest<TaxRate[]>("/tax-rates")])
      .then(([accountResult, taxRateResult]) => {
        if (cancelled) {
          return;
        }

        setAccounts(accountResult);
        setTaxRates(taxRateResult.filter((taxRate) => taxRate.isActive));
        const firstPostingAccount = accountResult.find((account) => account.isActive && account.allowPosting);
        const secondPostingAccount = accountResult.find((account) => account.isActive && account.allowPosting && account.id !== firstPostingAccount?.id);
        setLines((current) =>
          current.map((line, index) => ({
            ...line,
            accountId: line.accountId || (index === 0 ? firstPostingAccount?.id ?? "" : secondPostingAccount?.id ?? firstPostingAccount?.id ?? ""),
          })),
        );
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load journal setup data.");
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
  }, [organizationId]);

  function updateLine(lineId: string, patch: Partial<LineState>) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 2 ? current.filter((line) => line.id !== lineId) : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = getValidationError(lines, totals.balanced);
    if (validationError) {
      setError(validationError);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);

    try {
      const created = await apiRequest<JournalEntry>("/journal-entries", {
        method: "POST",
        body: {
          entryDate: `${String(formData.get("entryDate"))}T00:00:00.000Z`,
          description: String(formData.get("description")),
          reference: String(formData.get("reference") || "") || undefined,
          currency: "SAR",
          lines: lines.map((line) => ({
            accountId: line.accountId,
            description: line.description || undefined,
            debit: formatUnits(parseDecimalToUnits(line.debit)),
            credit: formatUnits(parseDecimalToUnits(line.credit)),
            currency: "SAR",
            exchangeRate: "1.00000000",
            taxRateId: line.taxRateId || undefined,
          })),
        },
      });

      setSuccess(`Draft journal ${created.entryNumber} created.`);
      form.reset();
      const firstAccountId = postingAccounts[0]?.id ?? "";
      const secondAccountId = postingAccounts[1]?.id ?? firstAccountId;
      setLines([makeLine(firstAccountId), makeLine(secondAccountId)]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create journal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <input name="entryDate" type="date" required defaultValue={todayInputValue()} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <input name="description" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Reference</span>
          <input name="reference" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization before creating journals.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading accounts and tax rates...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <div className="grid min-w-[980px] grid-cols-[1.2fr_1.2fr_1.2fr_0.7fr_0.7fr_0.4fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
          <div>Account</div>
          <div>Tax rate</div>
          <div>Description</div>
          <div>Debit</div>
          <div>Credit</div>
          <div></div>
        </div>
        {lines.map((line) => (
          <div key={line.id} className="grid min-w-[980px] grid-cols-[1.2fr_1.2fr_1.2fr_0.7fr_0.7fr_0.4fr] gap-3 border-b border-slate-100 px-4 py-3">
            <select value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              <option value="">Select account</option>
              {postingAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </select>
            <select value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              <option value="">No tax</option>
              {taxRates.map((taxRate) => (
                <option key={taxRate.id} value={taxRate.id}>
                  {taxRate.name}
                </option>
              ))}
            </select>
            <input value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
            <input inputMode="decimal" value={line.debit} onChange={(event) => updateLine(line.id, { debit: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
            <input inputMode="decimal" value={line.credit} onChange={(event) => updateLine(line.id, { credit: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
            <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 2} className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
              Remove
            </button>
          </div>
        ))}
        <div className="flex min-w-[980px] items-center justify-between px-4 py-3 text-sm">
          <button type="button" onClick={() => setLines((current) => [...current, makeLine(postingAccounts[0]?.id ?? "")])} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
            Add line
          </button>
          <div className={totals.balanced ? "font-semibold text-palm" : "font-semibold text-rosewood"}>
            Debit {totals.debit} / Credit {totals.credit}
          </div>
        </div>
      </div>

      <button type="submit" disabled={!organizationId || loading || submitting || !totals.balanced} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
        {submitting ? "Saving..." : "Save draft journal"}
      </button>
    </form>
  );
}

function getValidationError(lines: LineState[], balanced: boolean): string {
  if (lines.length < 2) {
    return "A journal entry needs at least two lines.";
  }

  for (const [index, line] of lines.entries()) {
    const debit = parseDecimalToUnits(line.debit);
    const credit = parseDecimalToUnits(line.credit);

    if (!line.accountId) {
      return `Line ${index + 1} needs an account.`;
    }

    if (debit < 0 || credit < 0) {
      return `Line ${index + 1} cannot contain negative amounts.`;
    }

    if (debit > 0 && credit > 0) {
      return `Line ${index + 1} cannot contain both debit and credit.`;
    }

    if (debit === 0 && credit === 0) {
      return `Line ${index + 1} needs a debit or credit amount.`;
    }
  }

  return balanced ? "" : "Total debits must equal total credits.";
}
