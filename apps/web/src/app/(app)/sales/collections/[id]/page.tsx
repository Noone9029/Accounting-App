"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
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
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { CollectionActivityType, CollectionCase } from "@/lib/types";

type CollectionAction = "start" | "mark-promised" | "mark-disputed" | "hold" | "close" | "cancel";

export default function CollectionCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
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
      setError(loadError instanceof Error ? loadError.message : "Unable to load collection case.");
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
      setMessage(`${collectionStatusLabel(updated.status)} status saved.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update collection case.");
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
      setMessage("Collection activity added.");
    } catch (activityError) {
      setError(activityError instanceof Error ? activityError.message : "Unable to add collection activity.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{collectionCase?.caseNumber ?? "Collection case"}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{collectionsSafeWording}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sales/collections" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to collections</Link>
          {canCreate ? <Link href="/sales/collections/new" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">New case</Link> : null}
          {collectionCase && canUpdate && !isTerminal ? <Link href={`/sales/collections/${collectionCase.id}/edit`} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">Edit</Link> : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load this collection case.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading collection case...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      </div>

      {collectionCase ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-wrap items-center gap-2">
                <Pill label={collectionStatusLabel(collectionCase.status)} className={collectionStatusBadgeClass(collectionCase.status)} />
                <Pill label={collectionPriorityLabel(collectionCase.priority)} className={collectionPriorityBadgeClass(collectionCase.priority)} />
                {collectionCase.invoiceSettled ? <Pill label="Invoice balance is zero" className="bg-emerald-50 text-emerald-700" /> : null}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <Summary label="Customer" value={collectionCase.customer ? collectionCase.customer.displayName ?? collectionCase.customer.name : "-"} href={collectionCase.customerId ? `/customers/${collectionCase.customerId}` : undefined} />
                <Summary label="Linked invoice" value={collectionCase.salesInvoice?.invoiceNumber ?? "Customer-level case"} href={collectionCase.salesInvoiceId ? `/sales/invoices/${collectionCase.salesInvoiceId}` : undefined} />
                <Summary label="Outstanding balance" value={formatMoneyAmount(collectionCase.salesInvoice?.balanceDue ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR")} />
                <Summary label="Invoice due date" value={formatOptionalDate(collectionCase.salesInvoice?.dueDate, "-")} />
                <Summary label="Aging bucket" value={agingBucketLabel(collectionCase.salesInvoice?.dueDate)} />
                <Summary label="Next follow-up" value={formatOptionalDate(collectionCase.nextActionAt ?? collectionCase.followUpDate, "-")} />
                <Summary label="Promise date" value={formatOptionalDate(collectionCase.promisedPaymentDate, "-")} />
                <Summary label="Promised amount" value={formatMoneyAmount(collectionCase.promisedAmount ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR")} />
                <Summary label="Latest activity" value={latestActivity ? collectionActivityTypeLabel(latestActivity.activityType) : "No activity"} />
              </div>
              {collectionCase.summary ? <p className="mt-5 text-sm leading-6 text-steel">{collectionCase.summary}</p> : null}
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Accounting boundary</h2>
              <p className="mt-2 text-sm leading-6 text-steel">
                This collection case reads outstanding invoice balances only. It does not post journals, allocate payments, create credit notes or refunds, send email or reminders, create payment links, file VAT, call ZATCA, or change invoice balances.
              </p>
              <div className="mt-4 space-y-2 text-sm text-steel">
                <div>Customer statement balance: unchanged by collection case records.</div>
                <div>AR aging math: unchanged by collection case records.</div>
                <div>Planned email/reminder entries: planned notes only; no sending or scheduler is connected.</div>
              </div>
            </div>
          </div>

          {canUpdate && !isTerminal ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Collection actions</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Next follow-up</span>
                  <input type="date" value={nextFollowUpDate} onChange={(event) => setNextFollowUpDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Promise date</span>
                  <input type="date" value={promisedPaymentDate} onChange={(event) => setPromisedPaymentDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Promised amount</span>
                  <input inputMode="decimal" value={promisedAmount} onChange={(event) => setPromisedAmount(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {collectionCase.status === "OPEN" || collectionCase.status === "ON_HOLD" ? <ActionButton label="Start" disabled={actionLoading} onClick={() => void runAction("start")} /> : null}
                <ActionButton label="Mark promised" disabled={actionLoading} onClick={() => void runAction("mark-promised")} />
                <ActionButton label="Mark disputed" disabled={actionLoading} onClick={() => void runAction("mark-disputed")} />
                <ActionButton label="Put on hold" disabled={actionLoading} onClick={() => void runAction("hold")} />
                <ActionButton label="Close" disabled={actionLoading} onClick={() => void runAction("close")} />
                <ActionButton label="Cancel" disabled={actionLoading} onClick={() => void runAction("cancel")} secondary />
              </div>
            </div>
          ) : null}

          {canUpdate && !isTerminal ? (
            <form onSubmit={addActivity} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Add activity</h2>
              <p className="mt-1 text-sm leading-6 text-steel">
                Planned email and planned reminder entries are internal planning records only; they do not send email, schedule reminders, or create payment links. Payment received note is an internal note only; it does not allocate or post payment.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[0.8fr_1.7fr]">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Activity type</span>
                  <select value={activityType} onChange={(event) => setActivityType(event.target.value as CollectionActivityType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                    {collectionActivityTypes.map((option) => (
                      <option key={option} value={option}>{collectionActivityTypeLabel(option)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Activity note</span>
                  <input value={activityNote} onChange={(event) => setActivityNote(event.target.value)} required placeholder="Short internal collection note" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
              </div>
              <button type="submit" disabled={actionLoading || !activityNote.trim()} className="mt-4 rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                Add activity
              </button>
            </form>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Activity timeline</h2>
            {collectionCase.activities?.length ? (
              <div className="mt-4 divide-y divide-slate-100">
                {collectionCase.activities.map((activity) => (
                  <div key={activity.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{collectionActivityTypeLabel(activity.activityType)}</span>
                      <span className="text-xs text-steel">{formatOptionalDate(activity.activityDate, "-")}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-steel">{activity.note}</p>
                    {activity.nextFollowUpDate || activity.promisedPaymentDate || activity.promisedAmount ? (
                      <div className="mt-2 text-xs text-steel">
                        Next follow-up {formatOptionalDate(activity.nextFollowUpDate, "-")} / Promise {formatOptionalDate(activity.promisedPaymentDate, "-")} / {formatMoneyAmount(activity.promisedAmount ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR")}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <StatusMessage type="empty">No collection activity has been recorded yet.</StatusMessage>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Summary({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = href ? <Link href={href} className="font-medium text-palm hover:text-teal-800">{value}</Link> : <span className="font-medium text-ink">{value}</span>;
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
