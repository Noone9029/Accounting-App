"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerSelect,
  LedgerTableShell,
} from "@/components/ui/ledger-system";
import { useActiveOrganization } from "@/hooks/use-active-organization";
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
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.id ?? null;
  const baseCurrency = activeOrganization?.baseCurrency ?? null;
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
    if (!baseCurrency) {
      setError("Select an organization with a base currency before creating journals.");
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
          currency: baseCurrency,
          lines: lines.map((line) => ({
            accountId: line.accountId,
            description: line.description || undefined,
            debit: formatUnits(parseDecimalToUnits(line.debit)),
            credit: formatUnits(parseDecimalToUnits(line.credit)),
            currency: baseCurrency,
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
        <Field label="Date">
          <LedgerInput name="entryDate" type="date" required defaultValue={todayInputValue()} />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <LedgerInput name="description" required />
        </Field>
        <Field label="Reference">
          <LedgerInput name="reference" />
        </Field>
      </div>

      {!organizationId ? <LedgerAlert tone="info">Log in and select an organization before creating journals.</LedgerAlert> : null}
      {loading ? <LedgerLoadingState title="Loading accounts and tax rates" /> : null}
      {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

      <LedgerTableShell minWidth="980px">
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
            <LedgerSelect value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })}>
              <option value="">Select account</option>
              {postingAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </LedgerSelect>
            <LedgerSelect value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })}>
              <option value="">No tax</option>
              {taxRates.map((taxRate) => (
                <option key={taxRate.id} value={taxRate.id}>
                  {taxRate.name}
                </option>
              ))}
            </LedgerSelect>
            <LedgerInput value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} />
            <LedgerInput inputMode="decimal" value={line.debit} onChange={(event) => updateLine(line.id, { debit: event.target.value })} />
            <LedgerInput inputMode="decimal" value={line.credit} onChange={(event) => updateLine(line.id, { credit: event.target.value })} />
            <LedgerButton type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 2}>
              Remove
            </LedgerButton>
          </div>
        ))}
        <div className="flex min-w-[980px] items-center justify-between px-4 py-3 text-sm">
          <LedgerButton type="button" onClick={() => setLines((current) => [...current, makeLine(postingAccounts[0]?.id ?? "")])}>
            Add line
          </LedgerButton>
          <div className={totals.balanced ? "font-semibold text-palm" : "font-semibold text-rosewood"}>
            Debit <LedgerMoney>{totals.debit}</LedgerMoney> / Credit <LedgerMoney>{totals.credit}</LedgerMoney>
          </div>
        </div>
      </LedgerTableShell>

      <LedgerButton type="submit" variant="primary" disabled={!organizationId || !baseCurrency || loading || submitting || !totals.balanced}>
        {submitting ? "Saving..." : "Save draft journal"}
      </LedgerButton>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <LedgerFieldLabel className={className}>
      <LedgerFieldText>{label}</LedgerFieldText>
      {children}
    </LedgerFieldLabel>
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
