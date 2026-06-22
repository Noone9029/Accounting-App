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
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { Branch } from "@/lib/types";

export default function BranchesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canUpdateOrganization = can(PERMISSIONS.organization.update);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<Branch[]>("/branches")
      .then((result) => {
        if (!cancelled) {
          setBranches(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load branches.");
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

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const created = await apiRequest<Branch>("/branches", {
        method: "POST",
        body: {
          name: String(formData.get("name")),
          displayName: String(formData.get("displayName") || "") || undefined,
          phone: String(formData.get("phone") || "") || undefined,
          taxNumber: String(formData.get("taxNumber") || "") || undefined,
          city: String(formData.get("city") || "") || undefined,
          countryCode: String(formData.get("countryCode") || "SA"),
          isDefault: formData.get("isDefault") === "on",
        },
      });
      setBranches((current) => [...current, created].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)));
      setSuccess(`Created branch ${created.name}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create branch.");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Admin" title="Branches" description="Tenant branch records used later for documents, taxes, and ZATCA EGS units." />

      <LedgerPageBody>
        {canUpdateOrganization ? (
          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Create branch</h2>
            <form onSubmit={createBranch} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <Field label="Name">
                <LedgerInput name="name" required placeholder="Name" />
              </Field>
              <Field label="Display name">
                <LedgerInput name="displayName" placeholder="Display name" />
              </Field>
              <Field label="Phone">
                <LedgerInput name="phone" placeholder="Phone" />
              </Field>
              <Field label="VAT number">
                <LedgerInput name="taxNumber" placeholder="VAT number" />
              </Field>
              <Field label="City">
                <LedgerInput name="city" placeholder="City" />
              </Field>
              <Field label="Country">
                <LedgerInput name="countryCode" defaultValue="SA" placeholder="Country" />
              </Field>
              <label className="flex min-h-[68px] items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink">
                <input name="isDefault" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-palm focus:ring-palm/20" />
                Default branch
              </label>
              <div className="flex items-end">
                <LedgerButton type="submit" variant="primary" disabled={!organizationId}>
                  Add branch
                </LedgerButton>
              </div>
            </form>
          </LedgerPanel>
        ) : null}

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load branches.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading branches" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && branches.length === 0 ? <LedgerEmptyState title="No branches found." /> : null}

        {branches.length > 0 ? (
          <LedgerDataTable minWidth="840px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Display</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">VAT number</th>
                <th className="px-4 py-3">Default</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td className="px-4 py-3 font-medium text-ink">{branch.name}</td>
                  <td className="px-4 py-3 text-steel">{branch.displayName ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{branch.city ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{branch.taxNumber ?? "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={branch.isDefault ? "info" : "neutral"}>{branch.isDefault ? "Default" : "No"}</LedgerStatusBadge>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      {children}
    </LedgerFieldLabel>
  );
}
