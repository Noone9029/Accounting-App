"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import { recurringInvoiceFrequencyLabel, recurringInvoiceStatusBadgeClass, recurringInvoiceStatusLabel } from "@/lib/recurring-invoices";
import type { RecurringInvoiceGenerationResponse, RecurringInvoicePreview, RecurringInvoiceTemplate } from "@/lib/types";

type TemplateAction = "activate" | "pause" | "resume" | "end" | "cancel";

export default function RecurringInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [template, setTemplate] = useState<RecurringInvoiceTemplate | null>(null);
  const [preview, setPreview] = useState<RecurringInvoicePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canUpdateTemplate = can(PERMISSIONS.salesInvoices.update);
  const canCreateInvoice = can(PERMISSIONS.salesInvoices.create);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<RecurringInvoiceTemplate>(`/recurring-invoices/${params.id}`), apiRequest<RecurringInvoicePreview>(`/recurring-invoices/${params.id}/preview`)])
      .then(([templateResult, previewResult]) => {
        if (!cancelled) {
          setTemplate(templateResult);
          setPreview(previewResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load recurring invoice template."));
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
  }, [organizationId, params.id, tc]);

  async function refreshPreview(templateId: string) {
    const previewResult = await apiRequest<RecurringInvoicePreview>(`/recurring-invoices/${templateId}/preview`);
    setPreview(previewResult);
  }

  async function runAction(action: TemplateAction) {
    if (!template) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<RecurringInvoiceTemplate>(`/recurring-invoices/${template.id}/${action}`, { method: "POST" });
      setTemplate(updated);
      await refreshPreview(updated.id);
      setSuccess(tc("Recurring template {number} is now {status}.", { number: updated.templateNumber, status: tc(recurringInvoiceStatusLabel(updated.status)).toLowerCase() }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to update recurring invoice template."));
    } finally {
      setActionLoading(false);
    }
  }

  async function generateNow() {
    if (!template) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest<RecurringInvoiceGenerationResponse>(`/recurring-invoices/${template.id}/generate-now`, { method: "POST" });
      setTemplate(result.template);
      await refreshPreview(result.template.id);
      setSuccess(tc("Generated draft invoice {number}. Review and finalize it separately when ready.", { number: result.invoice.invoiceNumber }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to generate draft invoice."));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{template ? <bdi dir="ltr">{template.templateNumber}</bdi> : tc("Recurring invoice")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc("Manual recurring invoice template workspace. No automatic scheduler, email, payment, posting, VAT filing, or ZATCA submission runs from templates.")}</p>
        </div>
        <Link href="/sales/recurring-invoices" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back to recurring invoices")}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load this recurring invoice template.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading recurring invoice template...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {template ? (
        <div className="mt-5 space-y-5">
          <StatusMessage type="info">{tc("Recurring templates do not post accounting entries. Generated invoices are created as drafts and must be finalized separately.")}</StatusMessage>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">{template.name}</h2>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${recurringInvoiceStatusBadgeClass(template.status)}`}>{tc(recurringInvoiceStatusLabel(template.status))}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-steel md:grid-cols-2">
                    <Summary label={tc("Customer")} value={template.customer?.displayName ?? template.customer?.name ?? "-"} />
                    <Summary label={tc("Frequency")} value={frequencyLabel(template.frequency, template.interval, tc)} />
                    <Summary label={tc("Start date")} value={formatAppDate(template.startDate, locale, "-")} />
                    <Summary label={tc("Next run")} value={formatAppDate(template.nextRunDate, locale, "-")} />
                    <Summary label={tc("Last run")} value={formatAppDate(template.lastRunDate, locale, "No runs yet")} />
                    <Summary label={tc("End date")} value={formatAppDate(template.endDate, locale, "-")} />
                    <Summary label={tc("Payment terms")} value={tc("{count} days", { count: template.paymentTermsDays })} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {template.status === "DRAFT" && canUpdateTemplate ? (
                    <Link href={`/sales/recurring-invoices/${template.id}/edit`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      {tc("Edit")}
                    </Link>
                  ) : null}
                  {template.status === "DRAFT" && canUpdateTemplate ? <ActionButton label={tc("Activate")} onClick={() => void runAction("activate")} disabled={actionLoading} /> : null}
                  {template.status === "ACTIVE" && canUpdateTemplate ? <ActionButton label={tc("Pause")} onClick={() => void runAction("pause")} disabled={actionLoading} /> : null}
                  {template.status === "PAUSED" && canUpdateTemplate ? <ActionButton label={tc("Resume")} onClick={() => void runAction("resume")} disabled={actionLoading} /> : null}
                  {(template.status === "DRAFT" || template.status === "ACTIVE" || template.status === "PAUSED") && canUpdateTemplate ? <ActionButton label={tc("End")} onClick={() => void runAction("end")} disabled={actionLoading} /> : null}
                  {(template.status === "DRAFT" || template.status === "ACTIVE" || template.status === "PAUSED") && canUpdateTemplate ? <ActionButton label={tc("Cancel")} onClick={() => void runAction("cancel")} disabled={actionLoading} /> : null}
                  {template.status === "ACTIVE" && canCreateInvoice ? <ActionButton label={tc("Generate invoice now")} onClick={() => void generateNow()} disabled={actionLoading || Boolean(preview?.blockers.length)} primary /> : null}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="text-xs font-semibold uppercase tracking-wide text-steel">{tc("Template totals")}</div>
              <div className="mt-3 space-y-3">
                <BalanceLine label={tc("Subtotal")} value={formatAppMoney(template.subtotal, template.currency, locale)} />
                <BalanceLine label={tc("Discount")} value={formatAppMoney(template.discountTotal, template.currency, locale)} />
                <BalanceLine label={tc("Taxable")} value={formatAppMoney(template.taxableTotal, template.currency, locale)} />
                <BalanceLine label={tc("VAT")} value={formatAppMoney(template.taxTotal, template.currency, locale)} />
                <BalanceLine label={tc("Total")} value={formatAppMoney(template.total, template.currency, locale)} emphasized />
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">{tc("Preview")}</h2>
            {preview?.blockers.length ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {preview.blockers.map((blocker) => (
                  <div key={blocker}>{tc(blocker)}</div>
                ))}
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <Summary label={tc("Next invoice date")} value={formatAppDate(preview?.nextInvoiceDate, locale, "-")} />
              <Summary label={tc("Due date")} value={formatAppDate(preview?.dueDate, locale, "-")} />
              <Summary label={tc("Period covered")} value={preview ? tc("{start} to {end}", { start: formatAppDate(preview.periodCovered.startDate, locale, "-"), end: formatAppDate(preview.periodCovered.endDate, locale, "-") }) : "-"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(preview?.nextOccurrences ?? []).map((date) => (
                <span key={date} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {formatAppDate(date, locale, "-")}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[1040px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Description")}</th>
                  <th className="px-4 py-3">{tc("Account")}</th>
                  <th className="px-4 py-3">{tc("Qty")}</th>
                  <th className="px-4 py-3">{tc("Price")}</th>
                  <th className="px-4 py-3">{tc("Discount")}</th>
                  <th className="px-4 py-3">{tc("Tax")}</th>
                  <th className="px-4 py-3">{tc("Line total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(template.lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? <><bdi dir="ltr">{line.account.code}</bdi> {line.account.name}</> : <bdi dir="ltr">{line.accountId}</bdi>}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.unitPrice, template.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.discountRate}%</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.taxAmount, template.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.lineTotal, template.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">{tc("Generation history")}</h2>
            {(template.runs ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-steel">{tc("No draft invoices have been generated from this template yet.")}</p>
            ) : (
              <div className="mt-3 space-y-2">
                {(template.runs ?? []).map((run) => (
                  <div key={run.id} className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium text-ink">{tc("Run date {date}", { date: formatAppDate(run.runDate, locale, "-") })}</div>
                      <div className="text-xs text-steel">{tc("Period {start} to {end}", { start: formatAppDate(run.periodStart, locale, "-"), end: formatAppDate(run.periodEnd, locale, "-") })}</div>
                    </div>
                    {run.generatedInvoice ? (
                      <Link href={`/sales/invoices/${run.generatedInvoice.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
                        {tc("Open draft invoice")} <bdi dir="ltr">{run.generatedInvoice.invoiceNumber}</bdi>
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ActionButton({ label, onClick, disabled, primary = false }: { label: string; onClick: () => void; disabled: boolean; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${primary ? "border-palm bg-palm text-white hover:bg-teal-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"} rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`}>
      {label}
    </button>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function BalanceLine({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-steel">{label}</span>
      <span className={`${emphasized ? "text-lg font-semibold" : "text-sm font-medium"} font-mono text-ink`}>{value}</span>
    </div>
  );
}

function frequencyLabel(frequency: RecurringInvoiceTemplate["frequency"], interval: number, tc: (value: string, params?: Record<string, string | number>) => string): string {
  if (interval <= 1) {
    return tc(recurringInvoiceFrequencyLabel(frequency, interval));
  }
  const unit = frequency === "WEEKLY" ? "weeks" : frequency === "MONTHLY" ? "months" : frequency === "QUARTERLY" ? "quarters" : "years";
  return tc("Every {interval} {unit}", { interval, unit: tc(unit) });
}
