"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, DownloadIcon, EditIcon, PrinterIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui-ledger/data-table";
import { KpiCard } from "@/components/ui-ledger/kpi-card";
import { PageHeader } from "@/components/ui-ledger/page-header";
import { PanelSection } from "@/components/ui-ledger/panel-section";
import { StatusBadge as LedgerStatusBadge } from "@/components/ui-ledger/status-badge";
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
  getSupplierApSummary,
  listCustomers,
  listSuppliers,
  buildPartyTransactionHref,
  partyDetailHref,
  partyStatementHref,
  partyTransactionActionHref,
  partyTransactionsCsv,
  partyTransactionTypeOptions,
  type PartyKind,
  type PartyTransactionFilters,
  type PartyTransactionStatusFilter,
} from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  CollectionCase,
  Contact,
  CustomerPartyDetail,
  CustomerPartySummary,
  PartyTransaction,
  SupplierApDetailSummary,
  SupplierApRecentActivityItem,
  SupplierPartyDetail,
  SupplierPartySummary,
} from "@/lib/types";
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
  const { can } = usePermissions();
  const [rows, setRows] = useState<PartySummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const copy = partyCopy(kind);
  const canManageContacts = can(PERMISSIONS.contacts.manage);
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
        {canManageContacts ? (
          <Link href={`/contacts?type=${copy.contactType}`} className="self-start rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Add {copy.singularLower}
          </Link>
        ) : null}
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
  const { activeMembership, can, canAny } = usePermissions();
  const [detail, setDetail] = useState<PartyDetail | null>(null);
  const [supplierApSummary, setSupplierApSummary] = useState<SupplierApDetailSummary | null>(null);
  const [supplierApSummaryLoading, setSupplierApSummaryLoading] = useState(false);
  const [supplierApSummaryError, setSupplierApSummaryError] = useState("");
  const [activeTab, setActiveTab] = useState<PartyTab>("transactions");
  const [filters, setFilters] = useState<PartyTransactionFilters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [collectionCases, setCollectionCases] = useState<CollectionCase[]>([]);
  const [collectionCasesLoading, setCollectionCasesLoading] = useState(false);
  const copy = partyCopy(kind);
  const canViewCollections = can(PERMISSIONS.salesInvoices.view);
  const canCreateCollectionCase = can(PERMISSIONS.salesInvoices.create);
  const canViewSupplierApSummary =
    kind === "supplier" &&
    canAny(
      PERMISSIONS.contacts.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.inventory.view,
      PERMISSIONS.supplierPayments.view,
      PERMISSIONS.purchaseDebitNotes.view,
      PERMISSIONS.supplierRefunds.view,
    );

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

  useEffect(() => {
    if (!canViewSupplierApSummary || !organizationId || !params.id) {
      setSupplierApSummary(null);
      setSupplierApSummaryLoading(false);
      setSupplierApSummaryError("");
      return;
    }

    let cancelled = false;
    setSupplierApSummaryLoading(true);
    setSupplierApSummaryError("");

    getSupplierApSummary(params.id)
      .then((result) => {
        if (!cancelled) {
          setSupplierApSummary(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setSupplierApSummary(null);
          setSupplierApSummaryError(loadError instanceof Error ? loadError.message : "Unable to load supplier AP summary.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSupplierApSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canViewSupplierApSummary, organizationId, params.id]);

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
      <PageHeader
        title={detail ? displayName(detail.contact) : copy.singularTitle}
        description={copy.detailDescription}
        actions={
          <Link href={`/${copy.routeSegment}`} className={buttonVariants({ variant: "outline" })}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to {copy.pluralLower}
          </Link>
        }
      />

      <div className="flex flex-col gap-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load this {copy.singularLower}.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading {copy.singularLower}...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {detail ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
            <PanelSection
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {displayName(detail.contact)}
                  <ActiveStatusBadge isActive={detail.contact.isActive} />
                </span>
              }
              description={
                <>
                  <span className="block">{contactReach(detail.contact)}</span>
                  <span className="block">{billingAddress(detail.contact)}</span>
                </>
              }
              action={
                <div className="flex flex-wrap gap-2">
                  <PartyNewTransactionMenu partyId={detail.contact.id} partyType={kind} userPermissions={activeMembership} />
                  {can(PERMISSIONS.contacts.manage) ? (
                    <Link href={`/contacts/${detail.contact.id}`} className={buttonVariants({ variant: "outline" })}>
                      <EditIcon data-icon="inline-start" />
                      Edit {copy.singularLower}
                    </Link>
                  ) : null}
                </div>
              }
            >
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <Summary label="Email / phone" value={contactReach(detail.contact)} />
                <Summary label="Billing address" value={billingAddress(detail.contact)} />
                <Summary label="VAT / TRN" value={[detail.contact.taxNumber, detail.contact.uaeTrn, detail.contact.uaeTin].filter(Boolean).join(" / ") || "-"} />
              </div>
            </PanelSection>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <KpiCard label={copy.openLabel} value={formatMoneyAmount(openBalance(detail), "SAR")} detail={copy.balanceTitle} />
              <KpiCard label={copy.overdueLabel} value={formatMoneyAmount(overdueBalance(detail), "SAR")} detail="Overdue balance from existing records" tone="warning" />
              <KpiCard label="Last transaction" value={formatOptionalDate(detail.lastTransactionDate, "No transactions")} detail="Most recent activity date" tone="info" />
            </div>
          </div>

          <PartyActivitySummary detail={detail} kind={kind} />

          {kind === "supplier" && supplierApSummaryLoading ? <StatusMessage type="loading">Loading supplier AP summary...</StatusMessage> : null}
          {kind === "supplier" && supplierApSummaryError ? <StatusMessage type="error">{supplierApSummaryError}</StatusMessage> : null}
          {kind === "supplier" && supplierApSummary ? <SupplierApSummaryPanel summary={supplierApSummary} /> : null}

          {kind === "customer" && canViewCollections ? (
            <CustomerCollectionsPanel
              customerId={detail.contact.id}
              collectionCases={collectionCases}
              loading={collectionCasesLoading}
              canCreateCollectionCase={canCreateCollectionCase}
              openReceivableBalance={openBalance(detail)}
            />
          ) : null}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PartyTab)} className="min-w-0">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="transactions">Transaction List</TabsTrigger>
              <TabsTrigger value="details">{copy.singularTitle} Details</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="min-w-0 flex flex-col gap-4 overflow-hidden">
              <PanelSection title="Transaction filters" description="Filters apply only to the loaded transaction rows on this workspace.">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
                    <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value as PartyTransactionStatusFilter)} className="mt-1 h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                      <option value="ALL">All transactions</option>
                      <option value="OPEN">Open transactions</option>
                      <option value="OVERDUE">Overdue transactions</option>
                      <option value="PAID">Paid transactions</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-muted-foreground">Type</span>
                    <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)} className="mt-1 h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                      <option value="ALL">All types</option>
                      {transactionTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-muted-foreground">From</span>
                    <Input type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} className="mt-1" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase text-muted-foreground">To</span>
                    <Input type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} className="mt-1" />
                  </label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={exportTransactions}>
                      <DownloadIcon data-icon="inline-start" />
                      Export
                    </Button>
                    <Button type="button" variant="outline" onClick={() => window.print()}>
                      <PrinterIcon data-icon="inline-start" />
                      Print
                    </Button>
                  </div>
                </div>
              </PanelSection>

              {kind === "supplier" ? (
                <SupplierGroupedActivityTables transactions={filteredTransactions} emptyLabel={`No ${copy.singularLower} transactions match the current filters.`} />
              ) : (
                <PartyTransactionsTable transactions={filteredTransactions} emptyLabel={`No ${copy.singularLower} transactions match the current filters.`} />
              )}
            </TabsContent>

            <TabsContent value="details">{activeTab === "details" ? <PartyDetails contact={detail.contact} kind={kind} /> : null}</TabsContent>
            <TabsContent value="notes">{activeTab === "notes" ? <PartyNotes detail={detail} kind={kind} /> : null}</TabsContent>
          </Tabs>
        </div>
      ) : null}
    </section>
  );
}

function PartyTransactionsTable({
  transactions,
  emptyLabel,
  showPostingEffect = false,
}: {
  transactions: PartyTransaction[];
  emptyLabel: string;
  showPostingEffect?: boolean;
}) {
  if (transactions.length === 0) {
    return <StatusMessage type="empty">{emptyLabel}</StatusMessage>;
  }

  return (
    <DataTable minWidth="min-w-[1180px]" className="mt-0">
      <TableHeader className="bg-muted/50 text-xs uppercase text-muted-foreground">
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Transaction number</TableHead>
          <TableHead>Total before tax</TableHead>
          <TableHead>Tax amount</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Balance due</TableHead>
          <TableHead>Status</TableHead>
          {showPostingEffect ? <TableHead>Effect</TableHead> : null}
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="text-muted-foreground">{formatOptionalDate(transaction.date, "-")}</TableCell>
              <TableCell className="text-muted-foreground">{transaction.type}</TableCell>
              <TableCell className="font-mono text-xs">{transaction.transactionNumber}</TableCell>
              <TableCell className="font-mono text-xs">{formatMoneyAmount(transaction.subtotal, transaction.currency)}</TableCell>
              <TableCell className="font-mono text-xs">{formatMoneyAmount(transaction.taxAmount, transaction.currency)}</TableCell>
              <TableCell className="font-mono text-xs">{formatMoneyAmount(transaction.total, transaction.currency)}</TableCell>
              <TableCell className="font-mono text-xs">{formatMoneyAmount(transaction.balanceDue, transaction.currency)}</TableCell>
              <TableCell>
                <LedgerStatusBadge tone={transactionStatusTone(transaction.status)}>{formatStatusLabel(transaction.status)}</LedgerStatusBadge>
              </TableCell>
              {showPostingEffect ? (
                <TableCell>
                  {isOperationalNonPostingTransaction(transaction) ? (
                    <LedgerStatusBadge tone="info">Non-posting</LedgerStatusBadge>
                  ) : (
                    <LedgerStatusBadge tone="muted">Financial posting</LedgerStatusBadge>
                  )}
                </TableCell>
              ) : null}
              <TableCell>
                <Link href={partyTransactionActionHref(transaction)} className={buttonVariants({ variant: "outline", size: "xs" })}>
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </DataTable>
  );
}

export function SupplierApSummaryPanel({ summary }: { summary: SupplierApDetailSummary }) {
  const cards = [
    { label: "Outstanding payable balance", value: formatMoneyAmount(summary.outstandingPayableBalance, "SAR") },
    { label: "Overdue bills", value: `${formatMoneyAmount(summary.overdueBillsTotal, "SAR")} / ${summary.overdueBillCount}` },
    { label: "Open purchase orders", value: String(summary.openPurchaseOrders) },
    { label: "Purchase receipts pending bill", value: String(summary.purchaseReceiptsPendingBill) },
    { label: "Purchase bills pending receipt", value: String(summary.purchaseBillsPendingReceipt) },
    { label: "Open purchase returns", value: String(summary.openPurchaseReturns) },
    { label: "Open matching reviews", value: String(summary.openMatchingReviews) },
    { label: "Valuation variance previews", value: String(summary.valuationVariancePreviews) },
  ];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Supplier AP Summary</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-steel">
            This panel is read-only. Purchase returns are operational/non-posting activity and do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-md border border-slate-200 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-steel">{card.label}</div>
            <div className="mt-2 font-mono text-sm font-semibold text-ink">{card.value}</div>
          </div>
        ))}
      </div>
      <SupplierApRecentActivity rows={summary.recentApActivity} />
    </div>
  );
}

function SupplierApRecentActivity({ rows }: { rows: SupplierApRecentActivityItem[] }) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-steel">No recent AP activity is available for this supplier.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Activity</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Effect</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-3 py-2 text-steel">{formatOptionalDate(row.date, "-")}</td>
              <td className="px-3 py-2">
                <div className="font-medium text-ink">{row.label}</div>
                <div className="font-mono text-xs text-steel">{row.sourceNumber}</div>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{row.amount ? formatMoneyAmount(row.amount, "SAR") : "-"}</td>
              <td className="px-3 py-2 text-steel">{formatStatusLabel(row.status)}</td>
              <td className="px-3 py-2">
                {row.nonPosting ? (
                  <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">Non-posting</span>
                ) : (
                  <span className="text-xs font-medium text-slate-700">Financial posting</span>
                )}
              </td>
              <td className="px-3 py-2">
                {row.href ? (
                  <Link href={row.href} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Open
                  </Link>
                ) : (
                  <span className="text-xs text-steel">Hidden</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SupplierGroupedActivityTables({ transactions, emptyLabel }: { transactions: PartyTransaction[]; emptyLabel: string }) {
  const financialRows = transactions.filter((transaction) => !isOperationalNonPostingTransaction(transaction));
  const operationalRows = transactions.filter(isOperationalNonPostingTransaction);

  if (transactions.length === 0) {
    return <StatusMessage type="empty">{emptyLabel}</StatusMessage>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Financial posting activity</h2>
        <p className="mt-1 text-sm leading-6 text-steel">Purchase bills, supplier payments, purchase debit notes, and supplier refunds appear here when present.</p>
        <div className="mt-4">
          <PartyTransactionsTable transactions={financialRows} emptyLabel="No financial posting activity matches the current filters." showPostingEffect />
        </div>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Operational/non-posting activity</h2>
        <p className="mt-1 text-sm leading-6 text-steel">
          Operational rows help track purchasing work. They do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately.
        </p>
        <div className="mt-4">
          <PartyTransactionsTable transactions={operationalRows} emptyLabel="No operational/non-posting activity matches the current filters." showPostingEffect />
        </div>
      </div>
    </div>
  );
}

export function PartyActivitySummary({ detail, kind }: { detail: PartyDetail; kind: PartyKind }) {
  const counts = transactionCounts(detail.transactions);
  const contactId = detail.contact.id;
  const cards: Array<{ label: string; href: string; sourceType?: string; balance?: string; badgeLabel?: string }> =
    kind === "customer"
      ? [
          { label: "Open invoices", sourceType: "SalesInvoice", href: `/sales/invoices?customerId=${encodeURIComponent(contactId)}`, balance: openBalance(detail) },
          { label: "Sales quotes", sourceType: "SalesQuote", href: `/sales/quotes?customerId=${encodeURIComponent(contactId)}` },
          { label: "Recurring templates", sourceType: "RecurringInvoiceTemplate", href: `/sales/recurring-invoices?customerId=${encodeURIComponent(contactId)}` },
          { label: "Delivery notes", sourceType: "DeliveryNote", href: `/sales/delivery-notes?customerId=${encodeURIComponent(contactId)}` },
          { label: "Invoice history", sourceType: "SalesInvoice", href: `/sales/invoices?customerId=${encodeURIComponent(contactId)}` },
          { label: "Credit notes", sourceType: "CreditNote", href: `/sales/credit-notes?customerId=${encodeURIComponent(contactId)}` },
          { label: "Payments", sourceType: "CustomerPayment", href: buildPartyTransactionHref("/sales/customer-payments", "customer", contactId) },
          { label: "Customer statement activity", href: partyStatementHref("customer", contactId), badgeLabel: "Statement" },
          { label: "Refunds", sourceType: "CustomerRefund", href: `/sales/customer-refunds?customerId=${encodeURIComponent(contactId)}` },
          { label: "Aged receivables", href: `/reports/aged-receivables?returnTo=${encodeURIComponent(partyDetailHref("customer", contactId))}`, balance: overdueBalance(detail) },
        ]
      : [
          { label: "Bills", sourceType: "PurchaseBill", href: `/purchases/bills?supplierId=${encodeURIComponent(contactId)}`, balance: openBalance(detail) },
          { label: "Purchase orders", sourceType: "PurchaseOrder", href: `/purchases/purchase-orders?supplierId=${encodeURIComponent(contactId)}` },
          { label: "Supplier credits", sourceType: "PurchaseDebitNote", href: `/purchases/debit-notes?supplierId=${encodeURIComponent(contactId)}` },
          { label: "Supplier payments", sourceType: "SupplierPayment", href: buildPartyTransactionHref("/purchases/supplier-payments", "supplier", contactId) },
          { label: "Supplier statement activity", href: partyStatementHref("supplier", contactId), badgeLabel: "Statement" },
          { label: "Supplier refunds", sourceType: "SupplierRefund", href: `/purchases/supplier-refunds?supplierId=${encodeURIComponent(contactId)}` },
          { label: "Aged payables", href: `/reports/aged-payables?returnTo=${encodeURIComponent(partyDetailHref("supplier", contactId))}`, balance: overdueBalance(detail) },
        ];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{kind === "customer" ? "Customer ledger visibility" : "Supplier ledger visibility"}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">
            Balances and transaction counts are tenant-scoped from posted and draft records already available in LedgerByte. Use the statement activity card when you need the dedicated statement route, then return here for customer or supplier workspace context.
          </p>
        </div>
        <Link href={`/contacts/${contactId}`} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Open shared contact ledger
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-md border border-slate-200 px-4 py-3 hover:border-palm hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold text-ink">{card.label}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {card.sourceType ? (counts.get(card.sourceType) ?? 0) : card.badgeLabel ?? "Report"}
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
        <Summary label="Legal name" value={contact.legalName ?? "-"} />
        <Summary label="TRN/TIN" value={[contact.uaeTrn, contact.uaeTin].filter(Boolean).join(" / ") || "-"} />
        <Summary label="Peppol participant ID" value={contact.peppolParticipantId ?? "-"} />
        <Summary label="VAT category" value={contact.uaeVatRegistrationStatus ?? "-"} />
        <Summary label="Endpoint status" value={contact.peppolEndpointStatus ?? "-"} />
        <Summary label="Preferred eInvoice delivery" value={contact.preferredEinvoiceDeliveryMethod ?? "-"} />
        <Summary label="UAE address" value={[contact.uaeAddressLine1, contact.uaeAddressLine2, contact.uaeEmirate].filter(Boolean).join(", ") || "-"} />
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
  return <ActiveStatusBadge isActive={isActive} />;
}

function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return <LedgerStatusBadge tone={isActive ? "success" : "muted"}>{isActive ? "Active" : "Inactive"}</LedgerStatusBadge>;
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

function isOperationalNonPostingTransaction(transaction: PartyTransaction): boolean {
  return transaction.sourceType === "PurchaseOrder" || transaction.sourceType === "PurchaseReturn";
}

function transactionStatusTone(status: string): "success" | "warning" | "danger" | "muted" {
  const normalized = status.toUpperCase();
  if (normalized.includes("VOID") || normalized.includes("REVERSE") || normalized.includes("CANCEL")) {
    return "danger";
  }
  if (normalized.includes("DRAFT") || normalized.includes("PENDING") || normalized.includes("PARTIAL")) {
    return "warning";
  }
  if (normalized.includes("POST") || normalized.includes("FINAL") || normalized.includes("PAID") || normalized.includes("APPROVED")) {
    return "success";
  }
  return "muted";
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
