"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import { recurringInvoiceFrequencyLabel, recurringInvoiceStatusBadgeClass, recurringInvoiceStatusLabel } from "@/lib/recurring-invoices";
import type { RecurringInvoiceGenerationResponse, RecurringInvoicePreview, RecurringInvoiceTemplate } from "@/lib/types";

type TemplateAction = "activate" | "pause" | "resume" | "end" | "cancel";

export default function RecurringInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load recurring invoice template.");
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
  }, [organizationId, params.id]);

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
      setSuccess(`Recurring template ${updated.templateNumber} is now ${recurringInvoiceStatusLabel(updated.status).toLowerCase()}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update recurring invoice template.");
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
      setSuccess(`Generated draft invoice ${result.invoice.invoiceNumber}. Review and finalize it separately when ready.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to generate draft invoice.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{template ? template.templateNumber : "Recurring invoice"}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Manual recurring invoice template workspace. No automatic scheduler, email, payment, posting, VAT filing, or ZATCA submission runs from templates.</p>
        </div>
        <Link href="/sales/recurring-invoices" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back to recurring invoices
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load this recurring invoice template.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading recurring invoice template...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {template ? (
        <div className="mt-5 space-y-5">
          <StatusMessage type="info">Recurring templates do not post accounting entries. Generated invoices are created as drafts and must be finalized separately.</StatusMessage>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">{template.name}</h2>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${recurringInvoiceStatusBadgeClass(template.status)}`}>{recurringInvoiceStatusLabel(template.status)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-steel md:grid-cols-2">
                    <Summary label="Customer" value={template.customer?.displayName ?? template.customer?.name ?? "-"} />
                    <Summary label="Frequency" value={recurringInvoiceFrequencyLabel(template.frequency, template.interval)} />
                    <Summary label="Start date" value={formatOptionalDate(template.startDate)} />
                    <Summary label="Next run" value={formatOptionalDate(template.nextRunDate)} />
                    <Summary label="Last run" value={formatOptionalDate(template.lastRunDate, "No runs yet")} />
                    <Summary label="End date" value={formatOptionalDate(template.endDate)} />
                    <Summary label="Payment terms" value={`${template.paymentTermsDays} days`} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {template.status === "DRAFT" && canUpdateTemplate ? (
                    <Link href={`/sales/recurring-invoices/${template.id}/edit`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Edit
                    </Link>
                  ) : null}
                  {template.status === "DRAFT" && canUpdateTemplate ? <ActionButton label="Activate" onClick={() => void runAction("activate")} disabled={actionLoading} /> : null}
                  {template.status === "ACTIVE" && canUpdateTemplate ? <ActionButton label="Pause" onClick={() => void runAction("pause")} disabled={actionLoading} /> : null}
                  {template.status === "PAUSED" && canUpdateTemplate ? <ActionButton label="Resume" onClick={() => void runAction("resume")} disabled={actionLoading} /> : null}
                  {(template.status === "DRAFT" || template.status === "ACTIVE" || template.status === "PAUSED") && canUpdateTemplate ? <ActionButton label="End" onClick={() => void runAction("end")} disabled={actionLoading} /> : null}
                  {(template.status === "DRAFT" || template.status === "ACTIVE" || template.status === "PAUSED") && canUpdateTemplate ? <ActionButton label="Cancel" onClick={() => void runAction("cancel")} disabled={actionLoading} /> : null}
                  {template.status === "ACTIVE" && canCreateInvoice ? <ActionButton label="Generate invoice now" onClick={() => void generateNow()} disabled={actionLoading || Boolean(preview?.blockers.length)} primary /> : null}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="text-xs font-semibold uppercase tracking-wide text-steel">Template totals</div>
              <div className="mt-3 space-y-3">
                <BalanceLine label="Subtotal" value={formatMoneyAmount(template.subtotal, template.currency)} />
                <BalanceLine label="Discount" value={formatMoneyAmount(template.discountTotal, template.currency)} />
                <BalanceLine label="Taxable" value={formatMoneyAmount(template.taxableTotal, template.currency)} />
                <BalanceLine label="VAT" value={formatMoneyAmount(template.taxTotal, template.currency)} />
                <BalanceLine label="Total" value={formatMoneyAmount(template.total, template.currency)} emphasized />
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Preview</h2>
            {preview?.blockers.length ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {preview.blockers.map((blocker) => (
                  <div key={blocker}>{blocker}</div>
                ))}
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <Summary label="Next invoice date" value={formatOptionalDate(preview?.nextInvoiceDate)} />
              <Summary label="Due date" value={formatOptionalDate(preview?.dueDate)} />
              <Summary label="Period covered" value={preview ? `${formatOptionalDate(preview.periodCovered.startDate)} to ${formatOptionalDate(preview.periodCovered.endDate)}` : "-"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(preview?.nextOccurrences ?? []).map((date) => (
                <span key={date} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {formatOptionalDate(date)}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Tax</th>
                  <th className="px-4 py-3">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(template.lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? `${line.account.code} ${line.account.name}` : line.accountId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.unitPrice, template.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.discountRate}%</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxAmount, template.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineTotal, template.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Generation history</h2>
            {(template.runs ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-steel">No draft invoices have been generated from this template yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {(template.runs ?? []).map((run) => (
                  <div key={run.id} className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium text-ink">Run date {formatOptionalDate(run.runDate)}</div>
                      <div className="text-xs text-steel">Period {formatOptionalDate(run.periodStart)} to {formatOptionalDate(run.periodEnd)}</div>
                    </div>
                    {run.generatedInvoice ? (
                      <Link href={`/sales/invoices/${run.generatedInvoice.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
                        Open draft invoice {run.generatedInvoice.invoiceNumber}
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

function Summary({ label, value }: { label: string; value: string }) {
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
