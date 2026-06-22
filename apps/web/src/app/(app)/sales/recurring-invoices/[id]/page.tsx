"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Edit3 } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerMetadataRow,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import { recurringInvoiceFrequencyLabel, recurringInvoiceStatusLabel } from "@/lib/recurring-invoices";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title={template ? template.templateNumber : "Recurring invoice"}
        description="Manual recurring invoice template workspace. No automatic scheduler, email, payment, posting, VAT filing, or ZATCA submission runs from templates."
        badge={template ? <LedgerStatusBadge tone={recurringInvoiceStatusTone(template.status)}>{recurringInvoiceStatusLabel(template.status)}</LedgerStatusBadge> : null}
        actions={
          <LedgerButton href="/sales/recurring-invoices" icon={ArrowLeft}>
            Back to recurring invoices
          </LedgerButton>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load this recurring invoice template.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading recurring invoice template...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
          {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        </div>

        {template ? (
          <>
            <LedgerAlert tone="info">Recurring templates do not post accounting entries. Generated invoices are created as drafts and must be finalized separately.</LedgerAlert>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <LedgerPanel>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-ink">{template.name}</h2>
                      <LedgerStatusBadge tone={recurringInvoiceStatusTone(template.status)}>{recurringInvoiceStatusLabel(template.status)}</LedgerStatusBadge>
                    </div>
                    <LedgerMetadataRow
                      items={[
                        { label: "Customer", value: template.customer?.displayName ?? template.customer?.name ?? "-" },
                        { label: "Frequency", value: recurringInvoiceFrequencyLabel(template.frequency, template.interval) },
                        { label: "Start date", value: <LedgerDate>{formatOptionalDate(template.startDate)}</LedgerDate> },
                        { label: "Next run", value: <LedgerDate>{formatOptionalDate(template.nextRunDate)}</LedgerDate> },
                        { label: "Last run", value: <LedgerDate>{formatOptionalDate(template.lastRunDate, "No runs yet")}</LedgerDate> },
                        { label: "End date", value: <LedgerDate>{formatOptionalDate(template.endDate)}</LedgerDate> },
                        { label: "Payment terms", value: `${template.paymentTermsDays} days` },
                      ]}
                    />
                  </div>
                  <LedgerActionBar className="md:justify-end">
                    {template.status === "DRAFT" && canUpdateTemplate ? (
                      <LedgerButton href={`/sales/recurring-invoices/${template.id}/edit`} icon={Edit3}>
                        Edit
                      </LedgerButton>
                    ) : null}
                    {template.status === "DRAFT" && canUpdateTemplate ? <ActionButton label="Activate" onClick={() => void runAction("activate")} disabled={actionLoading} /> : null}
                    {template.status === "ACTIVE" && canUpdateTemplate ? <ActionButton label="Pause" onClick={() => void runAction("pause")} disabled={actionLoading} /> : null}
                    {template.status === "PAUSED" && canUpdateTemplate ? <ActionButton label="Resume" onClick={() => void runAction("resume")} disabled={actionLoading} /> : null}
                    {(template.status === "DRAFT" || template.status === "ACTIVE" || template.status === "PAUSED") && canUpdateTemplate ? <ActionButton label="End" onClick={() => void runAction("end")} disabled={actionLoading} /> : null}
                    {(template.status === "DRAFT" || template.status === "ACTIVE" || template.status === "PAUSED") && canUpdateTemplate ? <ActionButton label="Cancel" onClick={() => void runAction("cancel")} disabled={actionLoading} /> : null}
                    {template.status === "ACTIVE" && canCreateInvoice ? <ActionButton label="Generate invoice now" onClick={() => void generateNow()} disabled={actionLoading || Boolean(preview?.blockers.length)} primary /> : null}
                  </LedgerActionBar>
                </div>
              </LedgerPanel>

              <LedgerPanel>
                <div className="text-xs font-semibold uppercase tracking-wide text-steel">Template totals</div>
                <div className="mt-3 space-y-3">
                  <BalanceLine label="Subtotal" value={formatMoneyAmount(template.subtotal, template.currency)} />
                  <BalanceLine label="Discount" value={formatMoneyAmount(template.discountTotal, template.currency)} />
                  <BalanceLine label="Taxable" value={formatMoneyAmount(template.taxableTotal, template.currency)} />
                  <BalanceLine label="VAT" value={formatMoneyAmount(template.taxTotal, template.currency)} />
                  <BalanceLine label="Total" value={formatMoneyAmount(template.total, template.currency)} emphasized />
                </div>
              </LedgerPanel>
            </div>

            <LedgerSection title="Preview">
              {preview?.blockers.length ? (
                <LedgerSummaryBand tone="warning">
                  {preview.blockers.map((blocker) => (
                    <div key={blocker}>{blocker}</div>
                  ))}
                </LedgerSummaryBand>
              ) : null}
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <Summary label="Next invoice date" value={formatOptionalDate(preview?.nextInvoiceDate)} />
                <Summary label="Due date" value={formatOptionalDate(preview?.dueDate)} />
                <Summary label="Period covered" value={preview ? `${formatOptionalDate(preview.periodCovered.startDate)} to ${formatOptionalDate(preview.periodCovered.endDate)}` : "-"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(preview?.nextOccurrences ?? []).map((date) => (
                  <LedgerStatusBadge key={date} tone="neutral">
                    {formatOptionalDate(date)}
                  </LedgerStatusBadge>
                ))}
              </div>
            </LedgerSection>

            <LedgerDataTable minWidth="1040px">
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
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.unitPrice, template.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3 font-mono text-xs">{line.discountRate}%</td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.taxAmount, template.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.lineTotal, template.currency)}</LedgerMoney></td>
                  </tr>
                ))}
              </tbody>
            </LedgerDataTable>

            <LedgerSection title="Generation history">
              {(template.runs ?? []).length === 0 ? (
                <LedgerEmptyState title="No draft invoices have been generated from this template yet." />
              ) : (
                <div className="space-y-2">
                  {(template.runs ?? []).map((run) => (
                    <div key={run.id} className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium text-ink">Run date {formatOptionalDate(run.runDate)}</div>
                        <div className="text-xs text-steel">Period {formatOptionalDate(run.periodStart)} to {formatOptionalDate(run.periodEnd)}</div>
                      </div>
                      {run.generatedInvoice ? (
                        <LedgerButton href={`/sales/invoices/${run.generatedInvoice.id}`}>
                          Open draft invoice {run.generatedInvoice.invoiceNumber}
                        </LedgerButton>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </LedgerSection>
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function ActionButton({ label, onClick, disabled, primary = false }: { label: string; onClick: () => void; disabled: boolean; primary?: boolean }) {
  return (
    <LedgerButton type="button" onClick={onClick} disabled={disabled} variant={primary ? "primary" : "secondary"}>
      {label}
    </LedgerButton>
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
      <LedgerMoney>
        <span className={emphasized ? "text-lg font-semibold" : "text-sm font-medium"}>{value}</span>
      </LedgerMoney>
    </div>
  );
}

function recurringInvoiceStatusTone(status: RecurringInvoiceTemplate["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "ACTIVE":
      return "success";
    case "PAUSED":
      return "warning";
    case "ENDED":
      return "neutral";
    case "CANCELLED":
      return "danger";
  }
}
