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
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { fiscalPeriodLockWarning, fiscalPeriodStatusClass, fiscalPeriodStatusLabel, validateFiscalPeriodForm } from "@/lib/fiscal-periods";
import { formatOptionalDate } from "@/lib/invoice-display";
import { PERMISSIONS } from "@/lib/permissions";
import type { FiscalPeriod } from "@/lib/types";

export default function FiscalPeriodsPage() {
  const organizationId = useActiveOrganizationId();
  const { canAny } = usePermissions();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canManagePeriods = canAny(PERMISSIONS.fiscalPeriods.manage);
  const canLockPeriods = canAny(PERMISSIONS.fiscalPeriods.lock, PERMISSIONS.fiscalPeriods.manage);

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    void loadPeriods();
  }, [organizationId]);

  async function loadPeriods() {
    setLoading(true);
    setError("");
    try {
      setPeriods(await apiRequest<FiscalPeriod[]>("/fiscal-periods"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load fiscal periods.");
    } finally {
      setLoading(false);
    }
  }

  async function createPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      startsOn: String(formData.get("startsOn") ?? ""),
      endsOn: String(formData.get("endsOn") ?? ""),
    };
    const validationError = validateFiscalPeriodForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiRequest<FiscalPeriod>("/fiscal-periods", { method: "POST", body: payload });
      setPeriods((current) => [...current, created].sort((a, b) => a.startsOn.localeCompare(b.startsOn)));
      setSuccess(`Created fiscal period ${created.name}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create fiscal period.");
    } finally {
      setSubmitting(false);
    }
  }

  async function transitionPeriod(period: FiscalPeriod, action: "close" | "reopen" | "lock") {
    const confirmed = action !== "lock" || window.confirm("Locking is irreversible in this MVP. Continue?");
    if (!confirmed) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<FiscalPeriod>(`/fiscal-periods/${period.id}/${action}`, { method: "POST" });
      setPeriods((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess(`${updated.name} is now ${updated.status}.`);
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : "Unable to update fiscal period.");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Accounting controls" title="Fiscal periods" description="Close or lock posting windows for accountant-controlled periods." />

      <LedgerPageBody>
        <LedgerAlert tone="warning">
          Closed and locked periods block finalized, posted, voided, and reversal accounting entries. {fiscalPeriodLockWarning()}
        </LedgerAlert>

        {canManagePeriods ? (
          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Create fiscal period</h2>
            <form onSubmit={createPeriod} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_0.8fr_0.8fr_auto]">
              <Field label="Name">
                <LedgerInput name="name" required placeholder="FY 2026" />
              </Field>
              <Field label="Start">
                <LedgerInput name="startsOn" type="date" required />
              </Field>
              <Field label="End">
                <LedgerInput name="endsOn" type="date" required />
              </Field>
              <div className="flex items-end">
                <LedgerButton type="submit" variant="primary" disabled={!organizationId || submitting}>
                  {submitting ? "Creating..." : "Create"}
                </LedgerButton>
              </div>
            </form>
          </LedgerPanel>
        ) : null}

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load fiscal periods.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading fiscal periods" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && periods.length === 0 ? (
          <LedgerEmptyState title="No fiscal periods exist." description="Posting remains allowed until periods are configured." />
        ) : null}

        {periods.length > 0 ? (
          <LedgerDataTable minWidth="860px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((period) => (
                <tr key={period.id}>
                  <td className="px-4 py-3 font-medium text-ink">{period.name}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(period.startsOn)}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(period.endsOn)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${fiscalPeriodStatusClass(period.status)}`}>
                      {fiscalPeriodStatusLabel(period.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {period.status === "OPEN" && canManagePeriods ? (
                        <LedgerButton type="button" size="sm" onClick={() => transitionPeriod(period, "close")}>
                          Close
                        </LedgerButton>
                      ) : null}
                      {period.status === "CLOSED" && canManagePeriods ? (
                        <LedgerButton type="button" size="sm" onClick={() => transitionPeriod(period, "reopen")}>
                          Reopen
                        </LedgerButton>
                      ) : null}
                      {period.status !== "LOCKED" && canLockPeriods ? (
                        <LedgerButton type="button" size="sm" variant="danger" onClick={() => transitionPeriod(period, "lock")}>
                          Lock
                        </LedgerButton>
                      ) : null}
                    </div>
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
