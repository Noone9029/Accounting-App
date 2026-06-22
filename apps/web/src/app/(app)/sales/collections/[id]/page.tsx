"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Edit3, Plus } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDate,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import {
  collectionActivityTypeLabel,
  collectionActivityTypes,
  collectionPriorityLabel,
  collectionStatusLabel,
  collectionsSafeWording,
} from "@/lib/collections";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { CollectionActivityType, CollectionCase, CollectionCaseStatus, CollectionPriority } from "@/lib/types";

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales collections"
        title={collectionCase?.caseNumber ?? "Collection case"}
        description={collectionsSafeWording}
        actions={
          <>
            <LedgerButton href="/sales/collections" icon={ArrowLeft}>Back to collections</LedgerButton>
            {canCreate ? <LedgerButton href="/sales/collections/new" icon={Plus}>New case</LedgerButton> : null}
            {collectionCase && canUpdate && !isTerminal ? (
              <LedgerButton href={`/sales/collections/${collectionCase.id}/edit`} variant="primary" icon={Edit3}>
                Edit
              </LedgerButton>
            ) : null}
          </>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load this collection case.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading collection case...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
          {message ? <LedgerAlert tone="success">{message}</LedgerAlert> : null}
        </div>

      {collectionCase ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <LedgerPanel>
              <div className="flex flex-wrap items-center gap-2">
                <CollectionStatusPill status={collectionCase.status} />
                <CollectionPriorityPill priority={collectionCase.priority} />
                {collectionCase.invoiceSettled ? <LedgerStatusBadge tone="success">Invoice balance is zero</LedgerStatusBadge> : null}
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
            </LedgerPanel>

            <LedgerPanel>
              <h2 className="text-base font-semibold text-ink">Accounting boundary</h2>
              <p className="mt-2 text-sm leading-6 text-steel">
                This collection case reads outstanding invoice balances only. It does not post journals, allocate payments, create credit notes or refunds, send email or reminders, create payment links, file VAT, call ZATCA, or change invoice balances.
              </p>
              <div className="mt-4">
                <LedgerSummaryBand tone="info">
                  <div>Customer statement balance: unchanged by collection case records.</div>
                  <div>AR aging math: unchanged by collection case records.</div>
                  <div>Planned email/reminder entries: planned notes only; no sending or scheduler is connected.</div>
                </LedgerSummaryBand>
              </div>
            </LedgerPanel>
          </div>

          {canUpdate && !isTerminal ? (
            <LedgerSection title="Collection actions">
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <LedgerFieldLabel>
                  <LedgerFieldText>Next follow-up</LedgerFieldText>
                  <LedgerInput type="date" value={nextFollowUpDate} onChange={(event) => setNextFollowUpDate(event.target.value)} />
                </LedgerFieldLabel>
                <LedgerFieldLabel>
                  <LedgerFieldText>Promise date</LedgerFieldText>
                  <LedgerInput type="date" value={promisedPaymentDate} onChange={(event) => setPromisedPaymentDate(event.target.value)} />
                </LedgerFieldLabel>
                <LedgerFieldLabel>
                  <LedgerFieldText>Promised amount</LedgerFieldText>
                  <LedgerInput inputMode="decimal" value={promisedAmount} onChange={(event) => setPromisedAmount(event.target.value)} />
                </LedgerFieldLabel>
              </div>
              <LedgerActionBar className="mt-4">
                {collectionCase.status === "OPEN" || collectionCase.status === "ON_HOLD" ? <ActionButton label="Start" disabled={actionLoading} onClick={() => void runAction("start")} /> : null}
                <ActionButton label="Mark promised" disabled={actionLoading} onClick={() => void runAction("mark-promised")} />
                <ActionButton label="Mark disputed" disabled={actionLoading} onClick={() => void runAction("mark-disputed")} />
                <ActionButton label="Put on hold" disabled={actionLoading} onClick={() => void runAction("hold")} />
                <ActionButton label="Close" disabled={actionLoading} onClick={() => void runAction("close")} />
                <ActionButton label="Cancel" disabled={actionLoading} onClick={() => void runAction("cancel")} secondary />
              </LedgerActionBar>
            </LedgerSection>
          ) : null}

          {canUpdate && !isTerminal ? (
            <form onSubmit={addActivity}>
              <LedgerSection
                title="Add activity"
                description="Planned email and planned reminder entries are internal planning records only; they do not send email, schedule reminders, or create payment links. Payment received note is an internal note only; it does not allocate or post payment."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[0.8fr_1.7fr]">
                  <LedgerFieldLabel>
                    <LedgerFieldText>Activity type</LedgerFieldText>
                    <LedgerSelect value={activityType} onChange={(event) => setActivityType(event.target.value as CollectionActivityType)}>
                      {collectionActivityTypes.map((option) => (
                        <option key={option} value={option}>{collectionActivityTypeLabel(option)}</option>
                      ))}
                    </LedgerSelect>
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Activity note</LedgerFieldText>
                    <LedgerInput value={activityNote} onChange={(event) => setActivityNote(event.target.value)} required placeholder="Short internal collection note" />
                  </LedgerFieldLabel>
                </div>
                <LedgerButton type="submit" disabled={actionLoading || !activityNote.trim()} variant="primary" className="mt-4">
                  Add activity
                </LedgerButton>
              </LedgerSection>
            </form>
          ) : null}

          <LedgerSection title="Activity timeline">
            {collectionCase.activities?.length ? (
              <div className="divide-y divide-slate-100">
                {collectionCase.activities.map((activity) => (
                  <div key={activity.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{collectionActivityTypeLabel(activity.activityType)}</span>
                      <LedgerDate>{formatOptionalDate(activity.activityDate, "-")}</LedgerDate>
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
          </LedgerSection>
        </div>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function Summary({ label, value, href }: { label: string; value: string; href?: string }) {
  let content = <span className="font-medium text-ink">{value}</span>;
  if (href) {
    content = <Link href={href} className="font-medium text-palm hover:text-teal-800">{value}</Link>;
  } else if (label === "Outstanding balance" || label === "Promised amount") {
    content = <LedgerMoney>{value}</LedgerMoney>;
  } else if (label.includes("date") || label === "Next follow-up") {
    content = <LedgerDate>{value}</LedgerDate>;
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words">{content}</div>
    </div>
  );
}

function CollectionStatusPill({ status }: { status: CollectionCaseStatus }) {
  return <LedgerStatusBadge tone={collectionStatusTone(status)}>{collectionStatusLabel(status)}</LedgerStatusBadge>;
}

function CollectionPriorityPill({ priority }: { priority: CollectionPriority }) {
  return <LedgerStatusBadge tone={collectionPriorityTone(priority)}>{collectionPriorityLabel(priority)}</LedgerStatusBadge>;
}

function collectionStatusTone(status: CollectionCaseStatus): LedgerStatusTone {
  switch (status) {
    case "OPEN":
      return "draft";
    case "IN_PROGRESS":
    case "PROMISED_TO_PAY":
      return "info";
    case "PAID":
    case "CLOSED":
      return "success";
    case "ON_HOLD":
    case "DISPUTED":
      return "warning";
    case "CANCELLED":
      return "danger";
  }
}

function collectionPriorityTone(priority: CollectionPriority): LedgerStatusTone {
  switch (priority) {
    case "LOW":
      return "neutral";
    case "NORMAL":
      return "info";
    case "HIGH":
      return "warning";
    case "URGENT":
      return "danger";
  }
}

function ActionButton({ label, disabled, onClick, secondary = false }: { label: string; disabled: boolean; onClick: () => void; secondary?: boolean }) {
  return (
    <LedgerButton type="button" disabled={disabled} onClick={onClick} variant={secondary ? "secondary" : "primary"}>
      {label}
    </LedgerButton>
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
