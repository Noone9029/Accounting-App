"use client";

import { FormEvent, useEffect, useState } from "react";
import { SettingsImpactGuidance } from "@/components/documents/document-guidance";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  buildDocumentSettingsPayload,
  documentTemplateDescription,
  documentTemplateLabel,
  documentTemplateOptions,
  isValidOptionalHexColor,
  settingsToForm,
  type OrganizationDocumentSettingsForm,
} from "@/lib/document-settings";
import { PERMISSIONS } from "@/lib/permissions";
import type { OrganizationDocumentSettings } from "@/lib/types";

export default function DocumentSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [form, setForm] = useState<OrganizationDocumentSettingsForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManageSettings = can(PERMISSIONS.documentSettings.manage);

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Settings"
        title="Document settings"
        description="Branding, wording, and display defaults used by generated invoices, receipts, bills, and statements."
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to edit document settings.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading document settings" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!canManageSettings ? <LedgerAlert tone="info">Your role can view document settings but cannot save changes.</LedgerAlert> : null}

      {form ? (
        <form onSubmit={saveSettings} className="space-y-5">
          <SettingsImpactGuidance />

          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Titles and footer</h2>
            <p className="mt-1 text-sm text-steel">These labels appear in the header or footer of generated PDFs.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField label="Invoice title" helper="Shown on invoice, credit-note, bill, and debit-note PDFs where applicable." value={form.invoiceTitle} onChange={(value) => updateField("invoiceTitle", value)} />
              <TextField label="Receipt title" helper="Shown on customer and supplier payment receipt PDFs." value={form.receiptTitle} onChange={(value) => updateField("receiptTitle", value)} />
              <TextField label="Statement title" helper="Shown on customer and supplier statement PDFs." value={form.statementTitle} onChange={(value) => updateField("statementTitle", value)} />
              <TextField label="Footer text" helper="Optional footer copy for beta review documents." value={form.footerText} onChange={(value) => updateField("footerText", value)} />
            </div>
          </LedgerPanel>

          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Colors</h2>
            <p className="mt-1 text-sm text-steel">Use simple hex colors for PDF accents. Leave blank to use LedgerByte defaults.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField label="Primary color" helper="Used for prominent text and headings in generated PDFs." placeholder="#111827" value={form.primaryColor} onChange={(value) => updateField("primaryColor", value)} />
              <TextField label="Accent color" helper="Used for subtle backgrounds, dividers, and table accents." placeholder="#f3f4f6" value={form.accentColor} onChange={(value) => updateField("accentColor", value)} />
            </div>
          </LedgerPanel>

          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Display options</h2>
            <p className="mt-1 text-sm text-steel">Choose which business details appear on generated PDFs. Totals and posting data are not changed by these toggles.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Toggle label="Show tax numbers" helper="Displays available organization and contact tax numbers." checked={form.showTaxNumber} onChange={(value) => updateField("showTaxNumber", value)} />
              <Toggle label="Show payment summary" helper="Shows paid, unpaid, or unapplied amounts where the document supports it." checked={form.showPaymentSummary} onChange={(value) => updateField("showPaymentSummary", value)} />
              <Toggle label="Show notes" helper="Includes document notes when present on the source record." checked={form.showNotes} onChange={(value) => updateField("showNotes", value)} />
              <Toggle label="Show terms" helper="Includes invoice or bill terms when present on the source record." checked={form.showTerms} onChange={(value) => updateField("showTerms", value)} />
            </div>
          </LedgerPanel>

          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Templates</h2>
            <p className="mt-1 text-sm text-steel">Template choices adjust presentation density only. They do not change accounting values, VAT totals, or compliance status.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <TemplateField label="Invoice template" value={form.defaultInvoiceTemplate} onChange={(value) => updateField("defaultInvoiceTemplate", value)} />
              <TemplateField label="Receipt template" value={form.defaultReceiptTemplate} onChange={(value) => updateField("defaultReceiptTemplate", value)} />
              <TemplateField label="Statement template" value={form.defaultStatementTemplate} onChange={(value) => updateField("defaultStatementTemplate", value)} />
            </div>
          </LedgerPanel>

          {canManageSettings ? (
          <div className="flex justify-end">
            <LedgerButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </LedgerButton>
          </div>
          ) : null}
        </form>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function TextField({
  label,
  value,
  placeholder,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  helper?: string;
  onChange: (value: string) => void;
}) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerInput
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? <LedgerFieldHelp>{helper}</LedgerFieldHelp> : null}
    </LedgerFieldLabel>
  );
}

function Toggle({ label, helper, checked, onChange }: { label: string; helper?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-palm" />
      <span>
        <span className="block font-medium">{label}</span>
        {helper ? <span className="mt-1 block text-xs leading-5 text-steel">{helper}</span> : null}
      </span>
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
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerSelect
        value={value}
        onChange={(event) => onChange(event.target.value as OrganizationDocumentSettingsForm["defaultInvoiceTemplate"])}
      >
        {documentTemplateOptions.map((option) => (
          <option key={option} value={option}>
            {documentTemplateLabel(option)}
          </option>
        ))}
      </LedgerSelect>
      <LedgerFieldHelp>{documentTemplateDescription(value)}</LedgerFieldHelp>
    </LedgerFieldLabel>
  );
}
