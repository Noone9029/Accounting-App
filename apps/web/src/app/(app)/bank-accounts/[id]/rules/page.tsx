"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankRuleActionLabel, bankRuleDirectionLabel } from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { Account, BankAccountSummary, BankRule, BankRuleActionType, BankRuleDirection, BankRuleDryRunResponse } from "@/lib/types";

type RuleFormState = {
  id?: string;
  name: string;
  enabled: boolean;
  priority: string;
  direction: BankRuleDirection;
  descriptionContains: string;
  descriptionRegex: string;
  referenceContains: string;
  bankReferenceContains: string;
  counterpartyContains: string;
  amountEquals: string;
  amountMin: string;
  amountMax: string;
  currencyEquals: string;
  sourceFormat: string;
  startDate: string;
  endDate: string;
  actionType: BankRuleActionType;
  categorizeAccountId: string;
  ignoreReason: string;
};

const emptyForm: RuleFormState = {
  name: "",
  enabled: true,
  priority: "100",
  direction: "ANY",
  descriptionContains: "",
  descriptionRegex: "",
  referenceContains: "",
  bankReferenceContains: "",
  counterpartyContains: "",
  amountEquals: "",
  amountMin: "",
  amountMax: "",
  currencyEquals: "",
  sourceFormat: "",
  startDate: "",
  endDate: "",
  actionType: "SUGGEST_CATEGORIZE",
  categorizeAccountId: "",
  ignoreReason: "",
};

export default function BankRulesPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [rules, setRules] = useState<BankRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [dryRun, setDryRun] = useState<BankRuleDryRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "loading"; text: string } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setMessage(null);
    Promise.all([
      apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`),
      apiRequest<BankRule[]>(`/bank-rules?bankAccountProfileId=${params.id}`),
      canManage ? apiRequest<Account[]>("/accounts") : Promise.resolve([]),
    ])
      .then(([profileResult, rulesResult, accountsResult]) => {
        if (cancelled) {
          return;
        }
        setProfile(profileResult);
        const loadedRules = Array.isArray(rulesResult) ? rulesResult : [];
        const loadedAccounts = Array.isArray(accountsResult) ? accountsResult : [];
        setRules(loadedRules);
        const postingAccounts = loadedAccounts.filter((account) => account.isActive && account.allowPosting);
        setAccounts(postingAccounts);
        setForm((current) => ({ ...current, categorizeAccountId: current.categorizeAccountId || postingAccounts[0]?.id || "" }));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to load bank rules." });
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
  }, [canManage, organizationId, params.id, reloadToken]);

  const sortedRules = useMemo(() => [...rules].sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name)), [rules]);

  function updateForm<K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editRule(rule: BankRule) {
    setForm({
      id: rule.id,
      name: rule.name,
      enabled: rule.enabled,
      priority: String(rule.priority),
      direction: rule.direction,
      descriptionContains: rule.descriptionContains ?? "",
      descriptionRegex: rule.descriptionRegex ?? "",
      referenceContains: rule.referenceContains ?? "",
      bankReferenceContains: rule.bankReferenceContains ?? "",
      counterpartyContains: rule.counterpartyContains ?? "",
      amountEquals: rule.amountEquals ?? "",
      amountMin: rule.amountMin ?? "",
      amountMax: rule.amountMax ?? "",
      currencyEquals: rule.currencyEquals ?? "",
      sourceFormat: rule.sourceFormat ?? "",
      startDate: rule.startDate?.slice(0, 10) ?? "",
      endDate: rule.endDate?.slice(0, 10) ?? "",
      actionType: rule.actionType,
      categorizeAccountId: rule.categorizeAccountId ?? accounts[0]?.id ?? "",
      ignoreReason: rule.ignoreReason ?? "",
    });
    setDryRun(null);
  }

  async function submitRule() {
    const validation = validateRuleForm(form);
    if (validation) {
      setMessage({ type: "error", text: validation });
      return;
    }
    setSubmitting(true);
    setMessage({ type: "loading", text: form.id ? "Updating bank rule..." : "Creating bank rule..." });
    try {
      const body = formPayload(form, params.id);
      const saved = await apiRequest<BankRule>(form.id ? `/bank-rules/${form.id}` : "/bank-rules", {
        method: form.id ? "PATCH" : "POST",
        body,
      });
      setMessage({ type: "success", text: `${saved.name} saved. Rules still create suggestions until an operator explicitly applies one.` });
      setForm({ ...emptyForm, categorizeAccountId: accounts[0]?.id ?? "" });
      setDryRun(null);
      setReloadToken((current) => current + 1);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to save bank rule." });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleRule(rule: BankRule) {
    setMessage({ type: "loading", text: `${rule.enabled ? "Disabling" : "Enabling"} ${rule.name}...` });
    try {
      if (rule.enabled) {
        await apiRequest<BankRule>(`/bank-rules/${rule.id}`, { method: "DELETE" });
      } else {
        await apiRequest<BankRule>(`/bank-rules/${rule.id}`, { method: "PATCH", body: { enabled: true } });
      }
      setReloadToken((current) => current + 1);
      setMessage({ type: "success", text: `${rule.name} ${rule.enabled ? "disabled" : "enabled"}.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to update bank rule." });
    }
  }

  async function dryRunRule(rule: BankRule) {
    setMessage({ type: "loading", text: `Dry-running ${rule.name}...` });
    try {
      const result = await apiRequest<BankRuleDryRunResponse>(`/bank-rules/${rule.id}/dry-run`, {
        method: "POST",
        body: { bankAccountProfileId: params.id, limit: 25 },
      });
      setDryRun(result);
      setMessage({ type: "success", text: `${result.suggestions.length} suggestions found across ${result.checkedCount} recent unmatched rows.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to dry-run bank rule." });
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Bank rules</h1>
          <p className="mt-1 text-sm text-steel">{profile ? `${profile.displayName} statement automation` : "Manual statement automation"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/statement-transactions`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Statement rows
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage bank rules.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank rules...</StatusMessage> : null}
        {message ? <StatusMessage type={message.type === "loading" ? "loading" : message.type}>{message.text}</StatusMessage> : null}
        {!canManage ? <StatusMessage type="info">Your role can view bank rules, but rule changes require bank statement manage permission.</StatusMessage> : null}
      </div>

      <BankRulesGuidance />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Rule list</h2>
          <div className="mt-4 space-y-3">
            {sortedRules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{rule.name}</h3>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${rule.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <span className="rounded-md bg-mist px-2 py-1 text-xs font-medium text-ink">Priority {rule.priority}</span>
                    </div>
                    <p className="mt-2 text-sm text-steel">
                      {bankRuleDirectionLabel(rule.direction)} - {bankRuleActionLabel(rule.actionType)}
                    </p>
                    <p className="mt-1 text-xs text-steel">{ruleSummary(rule)}</p>
                    <p className="mt-1 text-xs text-steel">Last applied: {formatOptionalDate(rule.lastAppliedAt, "Never")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => dryRunRule(rule)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Dry run
                    </button>
                    {canManage ? (
                      <>
                        <button type="button" onClick={() => editRule(rule)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          Edit
                        </button>
                        <button type="button" onClick={() => toggleRule(rule)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          {rule.enabled ? "Disable" : "Enable"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {!loading && sortedRules.length === 0 ? <StatusMessage type="empty">No bank rules exist for this bank account yet.</StatusMessage> : null}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">{form.id ? "Edit rule" : "Create rule"}</h2>
          <RuleForm form={form} accounts={accounts} canManage={canManage} onChange={updateForm} onSubmit={submitRule} submitting={submitting} onReset={() => setForm({ ...emptyForm, categorizeAccountId: accounts[0]?.id ?? "" })} />
        </div>
      </div>

      {dryRun ? <DryRunPanel dryRun={dryRun} currency={profile?.currency ?? "SAR"} /> : null}
    </section>
  );
}

export function BankRulesGuidance() {
  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-ink">Rule behavior</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-steel">
        Bank rules evaluate imported manual statement rows and create review suggestions. Applying a suggestion is always an explicit operator action.
      </p>
      <p className="mt-2 max-w-4xl text-xs leading-5 text-steel">
        This does not add live bank feeds, bank API calls, payment initiation, silent auto-reconciliation, silent auto-ignore, deposits, cards, or cheques.
      </p>
    </div>
  );
}

function RuleForm({
  form,
  accounts,
  canManage,
  submitting,
  onChange,
  onSubmit,
  onReset,
}: {
  form: RuleFormState;
  accounts: Account[];
  canManage: boolean;
  submitting: boolean;
  onChange: <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => void;
  onSubmit: () => Promise<void>;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-steel">Rule name</span>
        <input value={form.name} onChange={(event) => onChange("name", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Direction</span>
          <select value={form.direction} onChange={(event) => onChange("direction", event.target.value as BankRuleDirection)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            <option value="ANY">Any</option>
            <option value="DEBIT">Debit</option>
            <option value="CREDIT">Credit</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Priority</span>
          <input type="number" value={form.priority} onChange={(event) => onChange("priority", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-steel">
          <input type="checkbox" checked={form.enabled} onChange={(event) => onChange("enabled", event.target.checked)} />
          Enabled
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextField label="Description contains" value={form.descriptionContains} onChange={(value) => onChange("descriptionContains", value)} />
        <TextField label="Description regex" value={form.descriptionRegex} onChange={(value) => onChange("descriptionRegex", value)} />
        <TextField label="Reference contains" value={form.referenceContains} onChange={(value) => onChange("referenceContains", value)} />
        <TextField label="Bank reference contains" value={form.bankReferenceContains} onChange={(value) => onChange("bankReferenceContains", value)} />
        <TextField label="Counterparty contains" value={form.counterpartyContains} onChange={(value) => onChange("counterpartyContains", value)} />
        <TextField label="Currency" value={form.currencyEquals} onChange={(value) => onChange("currencyEquals", value)} />
        <TextField label="Amount equals" value={form.amountEquals} onChange={(value) => onChange("amountEquals", value)} />
        <TextField label="Amount min" value={form.amountMin} onChange={(value) => onChange("amountMin", value)} />
        <TextField label="Amount max" value={form.amountMax} onChange={(value) => onChange("amountMax", value)} />
        <TextField label="Source format" value={form.sourceFormat} onChange={(value) => onChange("sourceFormat", value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextField label="Start date" type="date" value={form.startDate} onChange={(value) => onChange("startDate", value)} />
        <TextField label="End date" type="date" value={form.endDate} onChange={(value) => onChange("endDate", value)} />
      </div>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-steel">Action</span>
        <select value={form.actionType} onChange={(event) => onChange("actionType", event.target.value as BankRuleActionType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
          <option value="SUGGEST_CATEGORIZE">Suggest categorize</option>
          <option value="SUGGEST_IGNORE">Suggest ignore</option>
          <option value="SUGGEST_MATCH_CANDIDATES">Suggest match candidates</option>
          <option value="CATEGORIZE">Categorize on explicit apply</option>
          <option value="IGNORE">Ignore on explicit apply</option>
        </select>
      </label>
      {(form.actionType === "SUGGEST_CATEGORIZE" || form.actionType === "CATEGORIZE") ? (
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Categorize account</span>
          <select value={form.categorizeAccountId} onChange={(event) => onChange("categorizeAccountId", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {account.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {(form.actionType === "SUGGEST_IGNORE" || form.actionType === "IGNORE") ? <TextField label="Ignore reason" value={form.ignoreReason} onChange={(value) => onChange("ignoreReason", value)} /> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!canManage || submitting} onClick={() => void onSubmit()} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
          {submitting ? "Saving..." : form.id ? "Update rule" : "Create rule"}
        </button>
        <button type="button" onClick={onReset} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Clear
        </button>
      </div>
    </div>
  );
}

function TextField({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
    </label>
  );
}

function DryRunPanel({ dryRun, currency }: { dryRun: BankRuleDryRunResponse; currency: string }) {
  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Dry-run results</h2>
      <p className="mt-1 text-sm text-steel">
        {dryRun.rule.name}: {dryRun.suggestions.length} suggestions from {dryRun.checkedCount} checked unmatched rows.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Suggestion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dryRun.suggestions.map(({ transaction, suggestion }) => (
              <tr key={transaction.id}>
                <td className="px-3 py-2 text-steel">{formatOptionalDate(transaction.transactionDate, "-")}</td>
                <td className="px-3 py-2 font-medium text-ink">{transaction.description}</td>
                <td className="px-3 py-2 font-mono text-xs">{formatMoneyAmount(transaction.amount, currency)}</td>
                <td className="px-3 py-2 text-steel">{bankRuleActionLabel(suggestion.actionType)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function validateRuleForm(form: RuleFormState): string | null {
  if (!form.name.trim()) {
    return "Rule name is required.";
  }
  if ((form.actionType === "SUGGEST_CATEGORIZE" || form.actionType === "CATEGORIZE") && !form.categorizeAccountId) {
    return "Categorize rules require an account.";
  }
  if ((form.actionType === "SUGGEST_IGNORE" || form.actionType === "IGNORE") && !form.ignoreReason.trim()) {
    return "Ignore rules require a reason.";
  }
  return null;
}

function formPayload(form: RuleFormState, bankAccountProfileId: string) {
  return {
    name: form.name.trim(),
    bankAccountProfileId,
    enabled: form.enabled,
    priority: Number(form.priority || "100"),
    direction: form.direction,
    descriptionContains: optional(form.descriptionContains),
    descriptionRegex: optional(form.descriptionRegex),
    referenceContains: optional(form.referenceContains),
    bankReferenceContains: optional(form.bankReferenceContains),
    counterpartyContains: optional(form.counterpartyContains),
    amountEquals: optional(form.amountEquals),
    amountMin: optional(form.amountMin),
    amountMax: optional(form.amountMax),
    currencyEquals: optional(form.currencyEquals)?.toUpperCase(),
    sourceFormat: optional(form.sourceFormat)?.toUpperCase(),
    startDate: optional(form.startDate),
    endDate: optional(form.endDate),
    actionType: form.actionType,
    categorizeAccountId: optional(form.categorizeAccountId),
    ignoreReason: optional(form.ignoreReason),
    autoApply: false,
  };
}

function ruleSummary(rule: BankRule): string {
  const parts = [
    rule.descriptionContains ? `description: ${rule.descriptionContains}` : null,
    rule.referenceContains ? `reference: ${rule.referenceContains}` : null,
    rule.bankReferenceContains ? `bank ref: ${rule.bankReferenceContains}` : null,
    rule.counterpartyContains ? `counterparty: ${rule.counterpartyContains}` : null,
    rule.amountEquals ? `amount = ${rule.amountEquals}` : null,
    rule.amountMin ? `amount >= ${rule.amountMin}` : null,
    rule.amountMax ? `amount <= ${rule.amountMax}` : null,
    rule.currencyEquals ? `currency ${rule.currencyEquals}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No optional conditions; scoped rows can match.";
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
