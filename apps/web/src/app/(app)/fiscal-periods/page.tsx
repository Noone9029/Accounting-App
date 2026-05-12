"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { fiscalPeriodLockWarning, fiscalPeriodStatusClass, fiscalPeriodStatusLabel, validateFiscalPeriodForm } from "@/lib/fiscal-periods";
import { formatOptionalDate } from "@/lib/invoice-display";
import type { FiscalPeriod } from "@/lib/types";

export default function FiscalPeriodsPage() {
  const organizationId = useActiveOrganizationId();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Fiscal periods</h1>
        <p className="mt-1 text-sm text-steel">Close or lock posting windows for accountant-controlled periods.</p>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Closed and locked periods block finalized, posted, voided, and reversal accounting entries. {fiscalPeriodLockWarning()}
      </div>

      <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Create fiscal period</h2>
        <form onSubmit={createPeriod} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_0.8fr_0.8fr_auto]">
          <input name="name" required placeholder="FY 2026" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="startsOn" type="date" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="endsOn" type="date" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <button type="submit" disabled={!organizationId || submitting} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load fiscal periods.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading fiscal periods...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && periods.length === 0 ? <StatusMessage type="empty">No fiscal periods exist. Posting remains allowed until periods are configured.</StatusMessage> : null}
      </div>

      {periods.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full text-left text-sm">
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
                      {period.status === "OPEN" ? (
                        <button type="button" onClick={() => transitionPeriod(period, "close")} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Close
                        </button>
                      ) : null}
                      {period.status === "CLOSED" ? (
                        <button type="button" onClick={() => transitionPeriod(period, "reopen")} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Reopen
                        </button>
                      ) : null}
                      {period.status !== "LOCKED" ? (
                        <button type="button" onClick={() => transitionPeriod(period, "lock")} className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                          Lock
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
