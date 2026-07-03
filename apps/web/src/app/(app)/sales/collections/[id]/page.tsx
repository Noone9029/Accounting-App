"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import {
  collectionActivityTypeLabel,
  collectionActivityTypes,
  collectionPriorityBadgeClass,
  collectionPriorityLabel,
  collectionStatusBadgeClass,
  collectionStatusLabel,
  collectionsSafeWording,
} from "@/lib/collections";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import type { CollectionActivityType, CollectionCase } from "@/lib/types";

type CollectionAction = "start" | "mark-promised" | "mark-disputed" | "hold" | "close" | "cancel";

export default function CollectionCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [collectionCase, setCollectionCase] = useState<CollectionCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activityType, setActivityType] = useState<CollectionActivityType>("NOTE");
  const [activityNote, setActivityNote] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [promisedPaymentDate, setPromisedPaymentDate] = useState("");
  const [promisedAmount, setPromisedAmount] = useState("");
  const canUpdate = can(PERMISSIONS.salesInvoices.update);
  const canCreate = can(PERMISSIONS.salesInvoices.create);
  const isTerminal = collectionCase ? collectionCase.status === "CLOSED" || collectionCase.status === "CANCELLED" : false;
  const latestActivity = useMemo(() => collectionCase?.activities?.[0] ?? null, [collectionCase?.activities]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, params.id]);

  async function load() {
    if (!organizationId || !params.id) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      setCollectionCase(await apiRequest<CollectionCase>(`/collections/${params.id}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tc("Unable to load collection case."));
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: CollectionAction) {
    if (!collectionCase) {
      return;
    }
    setActionLoading(true);
    setError("");
    setMessage("");
    const body = action === "mark-promised"
      ? { promisedPaymentDate: promisedPaymentDate || null, promisedAmount: promisedAmount || null, nextActionAt: nextFollowUpDate || null, summary: "Promise to pay recorded from collections workspace." }
      : { nextActionAt: nextFollowUpDate || null };
    try {
      const updated = await apiRequest<CollectionCase>(`/collections/${collectionCase.id}/${action}`, { method: "POST", body });
      setCollectionCase(updated);
      setMessage(tc("{status} status saved.", { status: tc(collectionStatusLabel(updated.status)) }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to update collection case."));
    } finally {
      setActionLoading(false);
    }
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!collectionCase) {
      return;
    }
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const updated = await apiRequest<CollectionCase>(`/collections/${collectionCase.id}/activities`, {
        method: "POST",
        body: {
          activityType,
          note: activityNote,
          nextFollowUpDate: nextFollowUpDate || null,
          promisedPaymentDate: promisedPaymentDate || null,
          promisedAmount: promisedAmount || null,
        },
      });
      setCollectionCase(updated);
      setActivityNote("");
      setMessage(tc("Collection activity added."));
    } catch (activityError) {
      setError(activityError instanceof Error ? activityError.message : tc("Unable to add collection activity."));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{collectionCase?.caseNumber ? <bdi dir="ltr">{collectionCase.caseNumber}</bdi> : tc("Collection case")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc(collectionsSafeWording)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sales/collections" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{tc("Back to collections")}</Link>
          {canCreate ? <Link href="/sales/collections/new" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{tc("New case")}</Link> : null}
          {collectionCase && canUpdate && !isTerminal ? <Link href={`/sales/collections/${collectionCase.id}/edit`} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">{tc("Edit")}</Link> : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load this collection case.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading collection case...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      </div>

      {collectionCase ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-wrap items-center gap-2">
                <Pill label={tc(collectionStatusLabel(collectionCase.status))} className={collectionStatusBadgeClass(collectionCase.status)} />
                <Pill label={tc(collectionPriorityLabel(collectionCase.priority))} className={collectionPriorityBadgeClass(collectionCase.priority)} />
                {collectionCase.invoiceSettled ? <Pill label={tc("Invoice balance is zero")} className="bg-emerald-50 text-emerald-700" /> : null}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <Summary label={tc("Customer")} value={collectionCase.customer ? collectionCase.customer.displayName ?? collectionCase.customer.name : "-"} href={collectionCase.customerId ? `/customers/${collectionCase.customerId}` : undefined} />
                <Summary label={tc("Linked invoice")} value={collectionCase.salesInvoice?.invoiceNumber ?? tc("Customer-level case")} href={collectionCase.salesInvoiceId ? `/sales/invoices/${collectionCase.salesInvoiceId}` : undefined} code={Boolean(collectionCase.salesInvoice?.invoiceNumber)} />
                <Summary label={tc("Outstanding balance")} value={formatAppMoney(collectionCase.salesInvoice?.balanceDue ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR", locale)} />
                <Summary label={tc("Invoice due date")} value={formatAppDate(collectionCase.salesInvoice?.dueDate, locale, "-")} />
                <Summary label={tc("Aging bucket")} value={tc(agingBucketLabel(collectionCase.salesInvoice?.dueDate))} />
                <Summary label={tc("Next follow-up")} value={formatAppDate(collectionCase.nextActionAt ?? collectionCase.followUpDate, locale, "-")} />
                <Summary label={tc("Promise date")} value={formatAppDate(collectionCase.promisedPaymentDate, locale, "-")} />
                <Summary label={tc("Promised amount")} value={formatAppMoney(collectionCase.promisedAmount ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR", locale)} />
                <Summary label={tc("Latest activity")} value={latestActivity ? tc(collectionActivityTypeLabel(latestActivity.activityType)) : tc("No activity")} />
              </div>
              {collectionCase.summary ? <p className="mt-5 text-sm leading-6 text-steel">{collectionCase.summary}</p> : null}
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Accounting boundary")}</h2>
              <p className="mt-2 text-sm leading-6 text-steel">
                {tc("This collection case reads outstanding invoice balances only. It does not post journals, allocate payments, create credit notes or refunds, send email or reminders, create payment links, file VAT, call ZATCA, or change invoice balances.")}
              </p>
              <div className="mt-4 space-y-2 text-sm text-steel">
                <div>{tc("Customer statement balance: unchanged by collection case records.")}</div>
                <div>{tc("AR aging math: unchanged by collection case records.")}</div>
                <div>{tc("Planned email/reminder entries: planned notes only; no sending or scheduler is connected.")}</div>
              </div>
            </div>
          </div>

          {canUpdate && !isTerminal ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Collection actions")}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Next follow-up")}</span>
                  <input type="date" value={nextFollowUpDate} onChange={(event) => setNextFollowUpDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Promise date")}</span>
                  <input type="date" value={promisedPaymentDate} onChange={(event) => setPromisedPaymentDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Promised amount")}</span>
                  <input inputMode="decimal" value={promisedAmount} onChange={(event) => setPromisedAmount(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {collectionCase.status === "OPEN" || collectionCase.status === "ON_HOLD" ? <ActionButton label={tc("Start")} disabled={actionLoading} onClick={() => void runAction("start")} /> : null}
                <ActionButton label={tc("Mark promised")} disabled={actionLoading} onClick={() => void runAction("mark-promised")} />
                <ActionButton label={tc("Mark disputed")} disabled={actionLoading} onClick={() => void runAction("mark-disputed")} />
                <ActionButton label={tc("Put on hold")} disabled={actionLoading} onClick={() => void runAction("hold")} />
                <ActionButton label={tc("Close")} disabled={actionLoading} onClick={() => void runAction("close")} />
                <ActionButton label={tc("Cancel")} disabled={actionLoading} onClick={() => void runAction("cancel")} secondary />
              </div>
            </div>
          ) : null}

          {canUpdate && !isTerminal ? (
            <form onSubmit={addActivity} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Add activity")}</h2>
              <p className="mt-1 text-sm leading-6 text-steel">
                {tc("Planned email and planned reminder entries are internal planning records only; they do not send email, schedule reminders, or create payment links. Payment received note is an internal note only; it does not allocate or post payment.")}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[0.8fr_1.7fr]">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Activity type")}</span>
                  <select value={activityType} onChange={(event) => setActivityType(event.target.value as CollectionActivityType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                    {collectionActivityTypes.map((option) => (
                      <option key={option} value={option}>{tc(collectionActivityTypeLabel(option))}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Activity note")}</span>
                  <input value={activityNote} onChange={(event) => setActivityNote(event.target.value)} required placeholder={tc("Short internal collection note")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
              </div>
              <button type="submit" disabled={actionLoading || !activityNote.trim()} className="mt-4 rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {tc("Add activity")}
              </button>
            </form>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">{tc("Activity timeline")}</h2>
            {collectionCase.activities?.length ? (
              <div className="mt-4 divide-y divide-slate-100">
                {collectionCase.activities.map((activity) => (
                  <div key={activity.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{tc(collectionActivityTypeLabel(activity.activityType))}</span>
                      <span className="text-xs text-steel">{formatAppDate(activity.activityDate, locale, "-")}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-steel">{activity.note}</p>
                    {activity.nextFollowUpDate || activity.promisedPaymentDate || activity.promisedAmount ? (
                      <div className="mt-2 text-xs text-steel">
                        {tc("Next follow-up {date} / Promise {promiseDate} / {amount}", {
                          date: formatAppDate(activity.nextFollowUpDate, locale, "-"),
                          promiseDate: formatAppDate(activity.promisedPaymentDate, locale, "-"),
                          amount: formatAppMoney(activity.promisedAmount ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR", locale),
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <StatusMessage type="empty">{tc("No collection activity has been recorded yet.")}</StatusMessage>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Summary({ label, value, href, code = false }: { label: string; value: string; href?: string; code?: boolean }) {
  const displayValue = code ? <bdi dir="ltr">{value}</bdi> : value;
  const content = href ? <Link href={href} className="font-medium text-palm hover:text-teal-800">{displayValue}</Link> : <span className="font-medium text-ink">{displayValue}</span>;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words">{content}</div>
    </div>
  );
}

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}>{label}</span>;
}

function ActionButton({ label, disabled, onClick, secondary = false }: { label: string; disabled: boolean; onClick: () => void; secondary?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${secondary ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" : "bg-palm text-white hover:bg-teal-800"} rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-300`}>
      {label}
    </button>
  );
}

function agingBucketLabel(dueDate: string | null | undefined): string {
  if (!dueDate) {
    return "No due date";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  if (days <= 0) {
    return "Current";
  }
  if (days <= 30) {
    return "1-30 days";
  }
  if (days <= 60) {
    return "31-60 days";
  }
  if (days <= 90) {
    return "61-90 days";
  }
  return "90+ days";
}
