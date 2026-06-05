"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { collectionActivityTypeLabel, collectionStatusBadgeClass, collectionStatusLabel, collectionsSafeWording } from "@/lib/collections";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import {
  filterPartyTransactions,
  filterPartySummaries,
  getCustomer,
  getSupplier,
  listCustomers,
  listSuppliers,
  partyStatusBadgeClass,
  partyTransactionActionHref,
  partyTransactionsCsv,
  partyTransactionTypeOptions,
  type PartyKind,
  type PartyTransactionFilters,
  type PartyTransactionStatusFilter,
} from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type { CollectionCase, Contact, CustomerPartyDetail, CustomerPartySummary, PartyTransaction, SupplierPartyDetail, SupplierPartySummary } from "@/lib/types";
import { PartyNewTransactionMenu } from "./party-new-transaction-menu";

type PartySummary = CustomerPartySummary | SupplierPartySummary;
type PartyDetail = CustomerPartyDetail | SupplierPartyDetail;
type PartyTab = "transactions" | "details" | "notes";

const defaultFilters: PartyTransactionFilters = {
  status: "ALL",
  type: "ALL",
  fromDate: "",
  toDate: "",
};

export function PartyListPage({ kind }: { kind: PartyKind }) {
  const organizationId = useActiveOrganizationId();
  const [rows, setRows] = useState<PartySummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const copy = partyCopy(kind);
  const filteredRows = useMemo(() => filterPartySummaries(rows, search), [rows, search]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const load = kind === "customer" ? listCustomers : listSuppliers;
    load()
      .then((result) => {
        if (!cancelled) {
          setRows(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : `Unable to load ${copy.pluralLower}.`);
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
  }, [copy.pluralLower, kind, organizationId]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{copy.pluralTitle}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{copy.listDescription}</p>
        </div>
        <Link href={`/contacts?type=${copy.contactType}`} className="self-start rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          Add {copy.singularLower}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load {copy.pluralLower}.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading {copy.pluralLower}...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && rows.length === 0 ? (
          <StatusMessage type="empty">
            No {copy.pluralLower} yet. Add a {copy.singularLower} first; they can appear here before they have any transactions.
          </StatusMessage>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Search {copy.pluralLower}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${copy.pluralLower} by name, email, phone, TRN, or balance`}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm focus:ring-2 focus:ring-palm/20"
            />
          </label>
        </div>
      ) : null}

      {rows.length > 0 && filteredRows.length === 0 ? (
        <div className="mt-5">
          <StatusMessage type="empty">No matching {copy.pluralLower} found.</StatusMessage>
        </div>
      ) : null}

      {filteredRows.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{copy.singularTitle}</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Email / phone</th>
                <th className="px-4 py-3">{copy.openLabel}</th>
                <th className="px-4 py-3">{copy.overdueLabel}</th>
                <th className="px-4 py-3">Last transaction</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.contact.id}>
                  <td className="px-4 py-3 font-medium text-ink">{displayName(row.contact)}</td>
                  <td className="px-4 py-3 text-steel">{copy.singularTitle}</td>
                  <td className="px-4 py-3 text-steel">{contactReach(row.contact)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(openBalance(row), "SAR")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(overdueBalance(row), "SAR")}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(row.lastTransactionDate, "No transactions")}</td>
                  <td className="px-4 py-3">
                    <StatusBadge isActive={row.contact.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/${copy.routeSegment}/${row.contact.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Open
                    </Link>
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

export function PartyDetailPage({ kind }: { kind: PartyKind }) {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { activeMembership, can } = usePermissions();
  const [detail, setDetail] = useState<PartyDetail | null>(null);
  const [activeTab, setActiveTab] = useState<PartyTab>("transactions");
  const [filters, setFilters] = useState<PartyTransactionFilters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [collectionCases, setCollectionCases] = useState<CollectionCase[]>([]);
  const [collectionCasesLoading, setCollectionCasesLoading] = useState(false);
  const copy = partyCopy(kind);
  const canViewCollections = can(PERMISSIONS.salesInvoices.view);
  const canCreateCollectionCase = can(PERMISSIONS.salesInvoices.create);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const load = kind === "customer" ? getCustomer : getSupplier;
    load(params.id)
      .then((result) => {
        if (!cancelled) {
          setDetail(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : `Unable to load ${copy.singularLower}.`);
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
  }, [copy.singularLower, kind, organizationId, params.id]);

  useEffect(() => {
    if (kind !== "customer" || !organizationId || !params.id || !canViewCollections) {
      setCollectionCases([]);
      setCollectionCasesLoading(false);
      return;
    }

    let cancelled = false;
    setCollectionCasesLoading(true);
    apiRequest<CollectionCase[]>(`/collections/customer/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setCollectionCases(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollectionCases([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCollectionCasesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canViewCollections, kind, organizationId, params.id]);

  const filteredTransactions = useMemo(
    () => filterPartyTransactions(detail?.transactions ?? [], filters),
    [detail?.transactions, filters],
  );
  const transactionTypeOptions = useMemo(
    () => partyTransactionTypeOptions(detail?.transactions ?? []),
    [detail?.transactions],
  );

  function updateFilter<K extends keyof PartyTransactionFilters>(key: K, value: PartyTransactionFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportTransactions() {
    if (!detail) {
      return;
    }
    const csv = partyTransactionsCsv(filteredTransactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${copy.routeSegment}-${detail.contact.id}-transactions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{detail ? displayName(detail.contact) : copy.singularTitle}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{copy.detailDescription}</p>
        </div>
        <Link href={`/${copy.routeSegment}`} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back to {copy.pluralLower}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load this {copy.singularLower}.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading {copy.singularLower}...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {detail ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.7fr]">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-ink">{displayName(detail.contact)}</h2>
                    <StatusBadge isActive={detail.contact.isActive} />
                  </div>
                  <div className="mt-2 text-sm leading-6 text-steel">{contactReach(detail.contact)}</div>
                  <div className="mt-2 text-sm leading-6 text-steel">{billingAddress(detail.contact)}</div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <PartyNewTransactionMenu partyId={detail.contact.id} partyType={kind} userPermissions={activeMembership} />
                  {can(PERMISSIONS.contacts.manage) ? (
                    <Link href={`/contacts/${detail.contact.id}`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Edit {copy.singularLower}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="text-xs font-semibold uppercase tracking-wide text-steel">{copy.balanceTitle}</div>
              <div className="mt-3 space-y-4">
                <BalanceLine label={copy.openLabel} value={formatMoneyAmount(openBalance(detail), "SAR")} emphasized />
                <BalanceLine label={copy.overdueLabel} value={formatMoneyAmount(overdueBalance(detail), "SAR")} />
                <BalanceLine label="Last transaction" value={formatOptionalDate(detail.lastTransactionDate, "No transactions")} />
              </div>
            </div>
          </div>

          <PartyActivitySummary detail={detail} kind={kind} />

          {kind === "customer" && canViewCollections ? (
            <CustomerCollectionsPanel
              customerId={detail.contact.id}
              collectionCases={collectionCases}
              loading={collectionCasesLoading}
              canCreateCollectionCase={canCreateCollectionCase}
              openReceivableBalance={openBalance(detail)}
            />
          ) : null}

          <div className="flex flex-wrap gap-2 border-b border-slate-200">
            {([
              ["transactions", "Transaction List"],
              ["details", `${copy.singularTitle} Details`],
              ["notes", "Notes"],
            ] as Array<[PartyTab, string]>).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-3 py-2 text-sm font-medium ${activeTab === tab ? "border-palm text-ink" : "border-transparent text-steel hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "transactions" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
                  <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value as PartyTransactionStatusFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                    <option value="ALL">All transactions</option>
                    <option value="OPEN">Open transactions</option>
                    <option value="OVERDUE">Overdue transactions</option>
                    <option value="PAID">Paid transactions</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Type</span>
                  <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                    <option value="ALL">All types</option>
                    {transactionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">From</span>
                  <input type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">To</span>
                  <input type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={exportTransactions} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Export
                  </button>
                  <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Print
                  </button>
                </div>
              </div>

              <PartyTransactionsTable transactions={filteredTransactions} emptyLabel={`No ${copy.singularLower} transactions match the current filters.`} />
            </div>
          ) : null}

          {activeTab === "details" ? <PartyDetails contact={detail.contact} kind={kind} /> : null}
          {activeTab === "notes" ? <PartyNotes detail={detail} kind={kind} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function PartyTransactionsTable({ transactions, emptyLabel }: { transactions: PartyTransaction[]; emptyLabel: string }) {
  if (transactions.length === 0) {
    return <StatusMessage type="empty">{emptyLabel}</StatusMessage>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Transaction number</th>
            <th className="px-4 py-3">Total before tax</th>
            <th className="px-4 py-3">Tax amount</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Balance due</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="px-4 py-3 text-steel">{formatOptionalDate(transaction.date, "-")}</td>
              <td className="px-4 py-3 text-steel">{transaction.type}</td>
              <td className="px-4 py-3 font-mono text-xs">{transaction.transactionNumber}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(transaction.subtotal, transaction.currency)}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(transaction.taxAmount, transaction.currency)}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(transaction.total, transaction.currency)}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(transaction.balanceDue, transaction.currency)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${transactionStatusBadgeClass(transaction.status)}`}>
                  {formatStatusLabel(transaction.status)}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link href={partyTransactionActionHref(transaction)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PartyActivitySummary({ detail, kind }: { detail: PartyDetail; kind: PartyKind }) {
  const counts = transactionCounts(detail.transactions);
  const contactId = detail.contact.id;
  const cards: Array<{ label: string; href: string; sourceType?: string; balance?: string }> =
    kind === "customer"
      ? [
          { label: "Open invoices", sourceType: "SalesInvoice", href: `/sales/invoices?customerId=${encodeURIComponent(contactId)}`, balance: openBalance(detail) },
          { label: "Sales quotes", sourceType: "SalesQuote", href: `/sales/quotes?customerId=${encodeURIComponent(contactId)}` },
          { label: "Recurring templates", sourceType: "RecurringInvoiceTemplate", href: `/sales/recurring-invoices?customerId=${encodeURIComponent(contactId)}` },
          { label: "Delivery notes", sourceType: "DeliveryNote", href: `/sales/delivery-notes?customerId=${encodeURIComponent(contactId)}` },
          { label: "Invoice history", sourceType: "SalesInvoice", href: `/sales/invoices?customerId=${encodeURIComponent(contactId)}` },
          { label: "Credit notes", sourceType: "CreditNote", href: `/sales/credit-notes?customerId=${encodeURIComponent(contactId)}` },
          { label: "Payments", sourceType: "CustomerPayment", href: `/sales/customer-payments?customerId=${encodeURIComponent(contactId)}` },
          { label: "Refunds", sourceType: "CustomerRefund", href: `/sales/customer-refunds?customerId=${encodeURIComponent(contactId)}` },
          { label: "Aged receivables", href: "/reports/aged-receivables", balance: overdueBalance(detail) },
        ]
      : [
          { label: "Bills", sourceType: "PurchaseBill", href: `/purchases/bills?supplierId=${encodeURIComponent(contactId)}`, balance: openBalance(detail) },
          { label: "Purchase orders", sourceType: "PurchaseOrder", href: `/purchases/purchase-orders?supplierId=${encodeURIComponent(contactId)}` },
          { label: "Supplier credits", sourceType: "PurchaseDebitNote", href: `/purchases/debit-notes?supplierId=${encodeURIComponent(contactId)}` },
          { label: "Supplier payments", sourceType: "SupplierPayment", href: `/purchases/supplier-payments?supplierId=${encodeURIComponent(contactId)}` },
          { label: "Supplier refunds", sourceType: "SupplierRefund", href: `/purchases/supplier-refunds?supplierId=${encodeURIComponent(contactId)}` },
          { label: "Aged payables", href: "/reports/aged-payables", balance: overdueBalance(detail) },
        ];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{kind === "customer" ? "Customer ledger visibility" : "Supplier ledger visibility"}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">
            Balances and transaction counts are tenant-scoped from posted and draft records already available in LedgerByte.
          </p>
        </div>
        <Link href={`/contacts/${contactId}`} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Contact ledger
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-md border border-slate-200 px-4 py-3 hover:border-palm hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold text-ink">{card.label}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {card.sourceType ? (counts.get(card.sourceType) ?? 0) : "Report"}
              </span>
            </div>
            {card.balance ? <div className="mt-2 font-mono text-xs text-steel">{formatMoneyAmount(card.balance, "SAR")}</div> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CustomerCollectionsPanel({
  customerId,
  collectionCases,
  loading,
  canCreateCollectionCase,
  openReceivableBalance,
}: {
  customerId: string;
  collectionCases: CollectionCase[];
  loading: boolean;
  canCreateCollectionCase: boolean;
  openReceivableBalance: string;
}) {
  const openCases = collectionCases.filter((collectionCase) => !["PAID", "CLOSED", "CANCELLED"].includes(collectionCase.status));

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Customer collections</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Collection cases are operational follow-up records. {collectionsSafeWording}
          </p>
        </div>
        {canCreateCollectionCase ? (
          <Link href={`/sales/collections/new?customerId=${encodeURIComponent(customerId)}&returnTo=${encodeURIComponent(`/customers/${customerId}`)}`} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            New collection case
          </Link>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <BalanceLine label="Open receivable" value={formatMoneyAmount(openReceivableBalance, "SAR")} emphasized />
        <BalanceLine label="Open collection cases" value={String(openCases.length)} />
        <BalanceLine label="Collection amount effect" value="0.0000" />
      </div>
      {loading ? <div className="mt-3"><StatusMessage type="loading">Loading customer collection cases...</StatusMessage></div> : null}
      {!loading && collectionCases.length === 0 ? <p className="mt-3 text-sm text-steel">No collection cases are recorded for this customer.</p> : null}
      {collectionCases.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">Case</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Outstanding</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Latest activity</th>
                <th className="px-3 py-2">Next follow-up</th>
                <th className="px-3 py-2">Promise</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collectionCases.map((collectionCase) => (
                <tr key={collectionCase.id}>
                  <td className="px-3 py-2 font-mono text-xs">{collectionCase.caseNumber}</td>
                  <td className="px-3 py-2 font-mono text-xs">{collectionCase.salesInvoice?.invoiceNumber ?? "Customer-level"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{formatMoneyAmount(collectionCase.salesInvoice?.balanceDue ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR")}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${collectionStatusBadgeClass(collectionCase.status)}`}>{collectionStatusLabel(collectionCase.status)}</span>
                  </td>
                  <td className="px-3 py-2 text-steel">{collectionCase.activities?.[0] ? collectionActivityTypeLabel(collectionCase.activities[0].activityType) : "-"}</td>
                  <td className="px-3 py-2 text-steel">{formatOptionalDate(collectionCase.nextActionAt ?? collectionCase.followUpDate, "-")}</td>
                  <td className="px-3 py-2 text-steel">{formatOptionalDate(collectionCase.promisedPaymentDate, "-")}</td>
                  <td className="px-3 py-2">
                    <Link href={`/sales/collections/${collectionCase.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function PartyDetails({ contact, kind }: { contact: Contact; kind: PartyKind }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">{kind === "customer" ? "Customer Details" : "Supplier Details"}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
        <Summary label="Name" value={contact.name} />
        <Summary label="Display name" value={contact.displayName ?? "-"} />
        <Summary label="Type" value={contact.type} />
        <Summary label="Email" value={contact.email ?? "-"} />
        <Summary label="Phone" value={contact.phone ?? "-"} />
        <Summary label="VAT number" value={contact.taxNumber ?? "-"} />
        <Summary label="Billing address" value={billingAddress(contact)} />
        {kind === "supplier" ? <Summary label="Bank details / payment notes" value="No bank details are recorded yet." /> : null}
      </div>
    </div>
  );
}

function PartyNotes({ detail, kind }: { detail: PartyDetail; kind: PartyKind }) {
  const text = kind === "customer" ? ("notes" in detail ? detail.notes : null) : "paymentNotes" in detail ? detail.paymentNotes : null;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Notes</h2>
      <p className="mt-3 text-sm leading-6 text-steel">{text?.trim() || `No ${kind === "customer" ? "customer notes" : "supplier payment notes"} are recorded yet.`}</p>
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

function StatusBadge({ isActive }: { isActive: boolean }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${partyStatusBadgeClass(isActive)}`}>{isActive ? "Active" : "Inactive"}</span>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function displayName(contact: Contact): string {
  return contact.displayName ?? contact.name;
}

function contactReach(contact: Contact): string {
  return [contact.email, contact.phone].filter(Boolean).join(" / ") || "-";
}

function billingAddress(contact: Contact): string {
  const parts = [contact.addressLine1, contact.addressLine2, contact.buildingNumber, contact.district, contact.city, contact.postalCode, contact.countryCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No billing address recorded.";
}

function openBalance(row: PartySummary | PartyDetail): string {
  return "openReceivableBalance" in row ? row.openReceivableBalance : row.openPayableBalance;
}

function overdueBalance(row: PartySummary | PartyDetail): string {
  return "overdueReceivableBalance" in row ? row.overdueReceivableBalance : row.overduePayableBalance;
}

function transactionCounts(transactions: PartyTransaction[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const transaction of transactions) {
    counts.set(transaction.sourceType, (counts.get(transaction.sourceType) ?? 0) + 1);
  }
  return counts;
}

function transactionStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized.includes("VOID") || normalized.includes("REVERSE") || normalized.includes("CANCEL")) {
    return "bg-rose-50 text-rosewood";
  }
  if (normalized.includes("DRAFT") || normalized.includes("PENDING") || normalized.includes("PARTIAL")) {
    return "bg-amber-50 text-amber-800";
  }
  if (normalized.includes("POST") || normalized.includes("FINAL") || normalized.includes("PAID") || normalized.includes("APPROVED")) {
    return "bg-emerald-50 text-emerald-700";
  }
  return "bg-slate-100 text-slate-700";
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function partyCopy(kind: PartyKind) {
  if (kind === "customer") {
    return {
      singularTitle: "Customer",
      singularLower: "customer",
      pluralTitle: "Customers",
      pluralLower: "customers",
      routeSegment: "customers",
      contactType: "CUSTOMER",
      openLabel: "Open receivable",
      overdueLabel: "Overdue receivable",
      balanceTitle: "Receivable summary",
      listDescription: "Review customers independently from invoices, including open and overdue receivable balances.",
      detailDescription: "See customer contact details, receivable balances, and every customer transaction in one place.",
    };
  }

  return {
    singularTitle: "Supplier",
    singularLower: "supplier",
    pluralTitle: "Suppliers",
    pluralLower: "suppliers",
    routeSegment: "suppliers",
    contactType: "SUPPLIER",
    openLabel: "Open payable",
    overdueLabel: "Overdue payable",
    balanceTitle: "Payable summary",
    listDescription: "Review suppliers independently from bills, including open and overdue payable balances.",
    detailDescription: "See supplier contact details, payable balances, and every supplier transaction in one place.",
  };
}
