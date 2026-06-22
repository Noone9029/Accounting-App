"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSidePanel,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  buildNumberSequencePayload,
  canEditNumberSequences,
  formatSequenceExample,
  numberSequenceScopeLabel,
  sequenceToForm,
  validateNumberSequenceForm,
  type NumberSequenceForm,
} from "@/lib/number-sequences";
import { PERMISSIONS } from "@/lib/permissions";
import type { NumberSequenceSetting } from "@/lib/types";

export default function NumberSequencesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = canEditNumberSequences(can(PERMISSIONS.numberSequences.manage));
  const [sequences, setSequences] = useState<NumberSequenceSetting[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<NumberSequenceForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selected = useMemo(() => sequences.find((sequence) => sequence.id === selectedId) ?? null, [selectedId, sequences]);
  const clientExample = useMemo(() => {
    if (!form) {
      return "";
    }
    const nextNumber = Number(form.nextNumber);
    const padding = Number(form.padding);
    return Number.isInteger(nextNumber) && Number.isInteger(padding)
      ? formatSequenceExample(form.prefix.trim(), nextNumber, padding)
      : "";
  }, [form]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setSuccess("");

    apiRequest<NumberSequenceSetting[]>("/number-sequences")
      .then((items) => {
        if (cancelled) {
          return;
        }
        setSequences(items);
        const nextSelected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
        setSelectedId(nextSelected?.id ?? "");
        setForm(nextSelected ? sequenceToForm(nextSelected) : null);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load number sequences.");
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

  function selectSequence(sequence: NumberSequenceSetting) {
    setSelectedId(sequence.id);
    setForm(sequenceToForm(sequence));
    setError("");
    setSuccess("");
  }

  function updateField<K extends keyof NumberSequenceForm>(field: K, value: NumberSequenceForm[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function saveSequence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !form) {
      return;
    }

    setError("");
    setSuccess("");
    const validationErrors = validateNumberSequenceForm(form, selected.nextNumber);
    if (validationErrors.length) {
      setError(validationErrors.join(" "));
      return;
    }

    setSaving(true);
    try {
      const updated = await apiRequest<NumberSequenceSetting>(`/number-sequences/${selected.id}`, {
        method: "PATCH",
        body: buildNumberSequencePayload(form),
      });
      setSequences((current) => current.map((sequence) => (sequence.id === updated.id ? updated : sequence)));
      setSelectedId(updated.id);
      setForm(sequenceToForm(updated));
      setSuccess("Number sequence settings saved. Existing document numbers were not changed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save number sequence.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Administration"
        title="Number sequences"
        description="Review and safely edit future document numbering prefixes, next numbers, and padding."
      />

      <LedgerSummaryBand>
        <h2 className="text-base font-semibold text-ink">Numbering safety</h2>
        <p className="mt-2 text-sm leading-6 text-steel">
          Sequence changes affect future generated documents only. Existing invoices, receipts, statements, bills, debit
          notes, credit notes, and archived PDFs keep the numbers they already received.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/documents" className="ledger-focus rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Open generated archive
          </Link>
          <Link href="/settings/documents" className="ledger-focus rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Document settings
          </Link>
        </div>
      </LedgerSummaryBand>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to view number sequences.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading number sequences...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!canManage ? <StatusMessage type="info">Your role can view number sequences but cannot save changes.</StatusMessage> : null}
      </div>

      <LedgerPageBody className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
        <LedgerPanel className="p-0">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-base font-semibold text-ink">Configured sequences</h2>
          </div>
          <LedgerDataTable minWidth="920px" className="border-0 shadow-none">
            <thead className="border-b border-line bg-mist text-xs font-semibold uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Prefix</th>
                <th className="px-4 py-3">Next number</th>
                <th className="px-4 py-3">Padding</th>
                <th className="px-4 py-3">Example</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sequences.map((sequence) => (
                <tr key={sequence.id} className={sequence.id === selectedId ? "bg-emerald-50/70" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => selectSequence(sequence)}
                      className="ledger-focus text-left font-medium text-palm hover:text-palm-dark"
                    >
                      {numberSequenceScopeLabel(sequence.scope)}
                    </button>
                    <div className="mt-0.5 text-xs text-steel">{sequence.scope}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink">{sequence.prefix}</td>
                  <td className="px-4 py-3 text-ink">{sequence.nextNumber}</td>
                  <td className="px-4 py-3 text-ink">{sequence.padding}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink">{sequence.exampleNextNumber}</td>
                  <td className="px-4 py-3 text-xs text-steel">{formatDateTime(sequence.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
          {!loading && sequences.length === 0 ? (
            <LedgerEmptyState
              title="No number sequences found"
              description="Create or generate documents after setup to review numbering here."
            />
          ) : null}
        </LedgerPanel>

        <LedgerSidePanel
          title="Edit future numbering"
          description="Changes affect future documents only. Existing document numbers are not changed. Lowering next number is blocked to avoid duplicates."
        >
          {selected && form ? (
            <form onSubmit={saveSequence} className="space-y-4">
              <LedgerMetadataRow
                items={[
                  { label: "Selected", value: numberSequenceScopeLabel(selected.scope) },
                  { label: "Scope", value: selected.scope },
                ]}
              />

              <TextField label="Prefix" value={form.prefix} onChange={(value) => updateField("prefix", value)} />
              <TextField label="Next number" type="number" min="1" value={form.nextNumber} onChange={(value) => updateField("nextNumber", value)} />
              <TextField label="Padding" type="number" min="3" max="10" value={form.padding} onChange={(value) => updateField("padding", value)} />

              <div className="rounded-md border border-line bg-mist p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-steel">Example next number</div>
                <div className="mt-1 font-mono text-sm font-semibold text-ink">{clientExample || selected.exampleNextNumber}</div>
              </div>

              {canManage ? (
                <LedgerButton type="submit" disabled={saving} variant="primary" className="w-full">
                  {saving ? "Saving..." : "Save sequence"}
                </LedgerButton>
              ) : null}
            </form>
          ) : (
            <p className="mt-4 text-sm text-steel">Select a number sequence to review its settings.</p>
          )}
        </LedgerSidePanel>
      </LedgerPageBody>
    </LedgerPage>
  );
}

function TextField({
  label,
  value,
  type = "text",
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerInput
        value={value}
        type={type}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
      />
      <LedgerFieldHelp>Preview updates before saving to avoid duplicate future document numbers.</LedgerFieldHelp>
    </LedgerFieldLabel>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function StatusMessage({ children, type }: Readonly<{ children: React.ReactNode; type: "error" | "info" | "loading" | "success" }>) {
  if (type === "loading") {
    return <LedgerLoadingState title="Loading" description={children} />;
  }
  if (type === "error") {
    return <LedgerAlert tone="danger">{children}</LedgerAlert>;
  }
  return <LedgerAlert tone={type === "success" ? "success" : "info"}>{children}</LedgerAlert>;
}
