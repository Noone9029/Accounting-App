"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  buildDocumentSettingsPayload,
  documentTemplateOptions,
  isValidOptionalHexColor,
  settingsToForm,
  type OrganizationDocumentSettingsForm,
} from "@/lib/document-settings";
import type { OrganizationDocumentSettings } from "@/lib/types";

export default function DocumentSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const [form, setForm] = useState<OrganizationDocumentSettingsForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<OrganizationDocumentSettings>("/organization-document-settings")
      .then((settings) => {
        if (!cancelled) {
          setForm(settingsToForm(settings));
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load document settings.");
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

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) {
      return;
    }

    setError("");
    setSuccess("");

    if (!isValidOptionalHexColor(form.primaryColor) || !isValidOptionalHexColor(form.accentColor)) {
      setError("Colors must be blank or a hex value like #111827.");
      return;
    }

    setSaving(true);
    try {
      const updated = await apiRequest<OrganizationDocumentSettings>("/organization-document-settings", {
        method: "PATCH",
        body: buildDocumentSettingsPayload(form),
      });
      setForm(settingsToForm(updated));
      setSuccess("Document settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save document settings.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof OrganizationDocumentSettingsForm>(field: K, value: OrganizationDocumentSettingsForm[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Document settings</h1>
        <p className="mt-1 text-sm text-steel">Branding and display defaults used by generated invoices, receipts, and statements.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit document settings.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading document settings...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {form ? (
        <form onSubmit={saveSettings} className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Titles and footer</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField label="Invoice title" value={form.invoiceTitle} onChange={(value) => updateField("invoiceTitle", value)} />
              <TextField label="Receipt title" value={form.receiptTitle} onChange={(value) => updateField("receiptTitle", value)} />
              <TextField label="Statement title" value={form.statementTitle} onChange={(value) => updateField("statementTitle", value)} />
              <TextField label="Footer text" value={form.footerText} onChange={(value) => updateField("footerText", value)} />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Colors</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField label="Primary color" placeholder="#111827" value={form.primaryColor} onChange={(value) => updateField("primaryColor", value)} />
              <TextField label="Accent color" placeholder="#f3f4f6" value={form.accentColor} onChange={(value) => updateField("accentColor", value)} />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Display options</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Toggle label="Show tax numbers" checked={form.showTaxNumber} onChange={(value) => updateField("showTaxNumber", value)} />
              <Toggle label="Show payment summary" checked={form.showPaymentSummary} onChange={(value) => updateField("showPaymentSummary", value)} />
              <Toggle label="Show notes" checked={form.showNotes} onChange={(value) => updateField("showNotes", value)} />
              <Toggle label="Show terms" checked={form.showTerms} onChange={(value) => updateField("showTerms", value)} />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Templates</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <TemplateField label="Invoice template" value={form.defaultInvoiceTemplate} onChange={(value) => updateField("defaultInvoiceTemplate", value)} />
              <TemplateField label="Receipt template" value={form.defaultReceiptTemplate} onChange={(value) => updateField("defaultReceiptTemplate", value)} />
              <TemplateField label="Statement template" value={form.defaultStatementTemplate} onChange={(value) => updateField("defaultStatementTemplate", value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-palm" />
      <span>{label}</span>
    </label>
  );
}

function TemplateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: OrganizationDocumentSettingsForm["defaultInvoiceTemplate"];
  onChange: (value: OrganizationDocumentSettingsForm["defaultInvoiceTemplate"]) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as OrganizationDocumentSettingsForm["defaultInvoiceTemplate"])}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
      >
        {documentTemplateOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
