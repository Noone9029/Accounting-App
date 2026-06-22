"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { TaxRate, TaxRateCategory, TaxRateScope } from "@/lib/types";

const scopes: TaxRateScope[] = ["SALES", "PURCHASES", "BOTH"];
const categories: TaxRateCategory[] = ["STANDARD", "ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE", "REVERSE_CHARGE"];

export default function TaxRatesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManageTaxRates = can(PERMISSIONS.taxRates.manage);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<TaxRate[]>("/tax-rates")
      .then((result) => {
        if (!cancelled) {
          setTaxRates(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load tax rates.");
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

  async function createTaxRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const created = await apiRequest<TaxRate>("/tax-rates", {
        method: "POST",
        body: {
          name: String(formData.get("name")),
          scope: String(formData.get("scope")) as TaxRateScope,
          category: String(formData.get("category")) as TaxRateCategory,
          rate: String(formData.get("rate")),
          description: String(formData.get("description") || "") || undefined,
        },
      });
      setTaxRates((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccess(`Created tax rate ${created.name}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create tax rate.");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Accounting" title="Tax rates" description="Live VAT rate setup for the active organization." />

      <LedgerPageBody>
        {canManageTaxRates ? (
          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Create tax rate</h2>
            <form onSubmit={createTaxRate} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_0.8fr_0.9fr_0.5fr]">
              <Field label="Name">
                <LedgerInput name="name" required placeholder="Name" />
              </Field>
              <Field label="Scope">
                <LedgerSelect name="scope" required>
                  {scopes.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  ))}
                </LedgerSelect>
              </Field>
              <Field label="Category">
                <LedgerSelect name="category" required>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.replaceAll("_", " ")}
                    </option>
                  ))}
                </LedgerSelect>
              </Field>
              <Field label="Rate">
                <LedgerInput name="rate" required defaultValue="15.0000" placeholder="15.0000" />
              </Field>
              <Field label="Description" className="md:col-span-3">
                <LedgerInput name="description" placeholder="Description" />
              </Field>
              <div className="flex items-end">
                <LedgerButton type="submit" variant="primary" disabled={!organizationId}>
                  Add tax rate
                </LedgerButton>
              </div>
            </form>
          </LedgerPanel>
        ) : null}

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load tax rates.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading tax rates" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && taxRates.length === 0 ? <LedgerEmptyState title="No tax rates found." /> : null}

        {taxRates.length > 0 ? (
          <LedgerDataTable minWidth="820px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxRates.map((taxRate) => (
                <tr key={taxRate.id}>
                  <td className="px-4 py-3 font-medium text-ink">{taxRate.name}</td>
                  <td className="px-4 py-3 text-steel">{taxRate.scope}</td>
                  <td className="px-4 py-3 text-steel">{taxRate.category.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{taxRate.rate}%</td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={taxRate.isActive ? "success" : "neutral"}>{taxRate.isActive ? "Active" : "Inactive"}</LedgerStatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
