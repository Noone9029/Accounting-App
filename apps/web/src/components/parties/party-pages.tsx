"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, DownloadIcon, EditIcon, PrinterIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerErrorState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatCard,
  LedgerStatusBadge,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { collectionActivityTypeLabel, collectionStatusLabel, collectionsSafeWording } from "@/lib/collections";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Contacts"
        title={copy.pluralTitle}
        description={copy.listDescription}
        actions={
          canManageContacts ? (
            <LedgerButton href={`/contacts?type=${copy.contactType}`} variant="primary">
              Add {copy.singularLower}
            </LedgerButton>
          ) : null
        }
      />

      <div className="space-y-3">
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load {copy.pluralLower}.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title={`Loading ${copy.pluralLower}`} /> : null}
        {error ? <LedgerErrorState title={`Unable to load ${copy.pluralLower}`} description={error} /> : null}
        {!loading && organizationId && rows.length === 0 ? (
          <LedgerEmptyState
            title={`No ${copy.pluralLower} yet`}
            description={`Add a ${copy.singularLower} first; they can appear here before they have any transactions.`}
          />
        ) : null}
      </div>

      {rows.length > 0 ? (
        <LedgerPanel>
          <LedgerFieldLabel>
            <LedgerFieldText>Search {copy.pluralLower}</LedgerFieldText>
            <LedgerInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${copy.pluralLower} by name, email, phone, TRN, or balance`}
            />
          </LedgerFieldLabel>
        </LedgerPanel>
      ) : null}

      {rows.length > 0 && filteredRows.length === 0 ? (
        <LedgerEmptyState title={`No matching ${copy.pluralLower}`} description={`Try a different name, email, phone, TRN, or balance search.`} />
      ) : null}

      {filteredRows.length > 0 ? (
        <LedgerDataTable minWidth="1040px">
            <thead className="bg-mist text-xs uppercase tracking-wide text-steel">
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
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(openBalance(row), "SAR")}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(overdueBalance(row), "SAR")}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(row.lastTransactionDate, "No transactions")}</LedgerDate></td>
                  <td className="px-4 py-3">
                    <StatusBadge isActive={row.contact.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/${copy.routeSegment}/${row.contact.id}`} size="sm">
                      Open
                    </LedgerButton>
                  </td>
                </tr>
              ))}
            </tbody>
        </LedgerDataTable>
      ) : null}
    </LedgerPage>
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow={copy.singularTitle}
        title={detail ? displayName(detail.contact) : copy.singularTitle}
        description={copy.detailDescription}
        actions={
          <LedgerButton href={`/${copy.routeSegment}`} icon={ArrowLeftIcon}>
            Back to {copy.pluralLower}
          </LedgerButton>
        }
      />

      <div className="flex flex-col gap-3">
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load this {copy.singularLower}.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title={`Loading ${copy.singularLower}`} /> : null}
        {error ? <LedgerErrorState title={`Unable to load ${copy.singularLower}`} description={error} /> : null}
      </div>

      {detail ? (
        <LedgerPageBody>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
            <LedgerSection
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
                <LedgerActionBar>
                  <PartyNewTransactionMenu partyId={detail.contact.id} partyType={kind} userPermissions={activeMembership} />
                  {can(PERMISSIONS.contacts.manage) ? (
                    <LedgerButton href={`/contacts/${detail.contact.id}`} icon={EditIcon}>
                      Edit {copy.singularLower}
                    </LedgerButton>
                  ) : null}
                </LedgerActionBar>
              }
            >
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <Summary label="Email / phone" value={contactReach(detail.contact)} />
                <Summary label="Billing address" value={billingAddress(detail.contact)} />
                <Summary label="VAT / TRN" value={[detail.contact.taxNumber, detail.contact.uaeTrn, detail.contact.uaeTin].filter(Boolean).join(" / ") || "-"} />
              </div>
            </LedgerSection>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <LedgerStatCard label={copy.openLabel} value={<LedgerMoney>{formatMoneyAmount(openBalance(detail), "SAR")}</LedgerMoney>} detail={copy.balanceTitle} />
              <LedgerStatCard label={copy.overdueLabel} value={<LedgerMoney>{formatMoneyAmount(overdueBalance(detail), "SAR")}</LedgerMoney>} detail="Overdue balance from existing records" />
              <LedgerStatCard label="Last transaction" value={<LedgerDate>{formatOptionalDate(detail.lastTransactionDate, "No transactions")}</LedgerDate>} detail="Most recent activity date" />
            </div>
          </div>

          <PartyActivitySummary detail={detail} kind={kind} />

          {kind === "supplier" && supplierApSummaryLoading ? <LedgerLoadingState title="Loading supplier AP summary" /> : null}
          {kind === "supplier" && supplierApSummaryError ? <LedgerErrorState title="Unable to load supplier AP summary" description={supplierApSummaryError} /> : null}
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
              <LedgerSection title="Transaction filters" description="Filters apply only to the loaded transaction rows on this workspace.">
                <LedgerFilterBar>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Status</LedgerFieldText>
                    <LedgerSelect value={filters.status} onChange={(event) => updateFilter("status", event.target.value as PartyTransactionStatusFilter)}>
                      <option value="ALL">All transactions</option>
                      <option value="OPEN">Open transactions</option>
                      <option value="OVERDUE">Overdue transactions</option>
                      <option value="PAID">Paid transactions</option>
                    </LedgerSelect>
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Type</LedgerFieldText>
                    <LedgerSelect value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}>
                      <option value="ALL">All types</option>
                      {transactionTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </LedgerSelect>
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <LedgerFieldText>From</LedgerFieldText>
                    <LedgerInput type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} />
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <LedgerFieldText>To</LedgerFieldText>
                    <LedgerInput type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} />
                  </LedgerFieldLabel>
                  <LedgerActionBar>
                    <LedgerButton type="button" onClick={exportTransactions} icon={DownloadIcon}>
                      Export
                    </LedgerButton>
                    <LedgerButton type="button" onClick={() => window.print()} icon={PrinterIcon}>
                      Print
                    </LedgerButton>
                  </LedgerActionBar>
                </LedgerFilterBar>
              </LedgerSection>

              {kind === "supplier" ? (
                <SupplierGroupedActivityTables transactions={filteredTransactions} emptyLabel={`No ${copy.singularLower} transactions match the current filters.`} />
              ) : (
                <PartyTransactionsTable transactions={filteredTransactions} emptyLabel={`No ${copy.singularLower} transactions match the current filters.`} />
              )}
            </TabsContent>

            <TabsContent value="details">{activeTab === "details" ? <PartyDetails contact={detail.contact} kind={kind} /> : null}</TabsContent>
            <TabsContent value="notes">{activeTab === "notes" ? <PartyNotes detail={detail} kind={kind} /> : null}</TabsContent>
          </Tabs>
        </LedgerPageBody>
      ) : null}
    </LedgerPage>
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
    return <LedgerEmptyState title={emptyLabel} />;
  }

  return (
    <LedgerDataTable minWidth="1180px">
      <thead className="bg-mist text-xs uppercase tracking-wide text-steel">
        <tr>
          <th className="px-4 py-3">Date</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3">Transaction number</th>
          <th className="px-4 py-3">Total before tax</th>
          <th className="px-4 py-3">Tax amount</th>
          <th className="px-4 py-3">Total</th>
          <th className="px-4 py-3">Balance due</th>
          <th className="px-4 py-3">Status</th>
          {showPostingEffect ? <th className="px-4 py-3">Effect</th> : null}
          <th className="px-4 py-3">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(transaction.date, "-")}</LedgerDate></td>
              <td className="px-4 py-3 text-steel">{transaction.type}</td>
              <td className="px-4 py-3 font-mono text-xs">{transaction.transactionNumber}</td>
              <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(transaction.subtotal, transaction.currency)}</LedgerMoney></td>
              <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(transaction.taxAmount, transaction.currency)}</LedgerMoney></td>
              <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(transaction.total, transaction.currency)}</LedgerMoney></td>
              <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(transaction.balanceDue, transaction.currency)}</LedgerMoney></td>
              <td className="px-4 py-3">
                <LedgerStatusBadge tone={transactionStatusTone(transaction.status)}>{formatStatusLabel(transaction.status)}</LedgerStatusBadge>
              </td>
              {showPostingEffect ? (
                <td className="px-4 py-3">
                  {isOperationalNonPostingTransaction(transaction) ? (
                    <LedgerStatusBadge tone="info">Non-posting</LedgerStatusBadge>
                  ) : (
                    <LedgerStatusBadge tone="neutral">Financial posting</LedgerStatusBadge>
                  )}
                </td>
              ) : null}
              <td className="px-4 py-3">
                <LedgerButton href={partyTransactionActionHref(transaction)} size="sm">
                  View
                </LedgerButton>
              </td>
            </tr>
          ))}
      </tbody>
    </LedgerDataTable>
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
    <LedgerSection
      title="Supplier AP Summary"
      description="This panel is read-only. Purchase returns are operational/non-posting activity and do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately."
    >
      <LedgerMetricGrid className="sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <LedgerStatCard key={card.label} label={card.label} value={<LedgerMoney>{card.value}</LedgerMoney>} />
        ))}
      </LedgerMetricGrid>
      <SupplierApRecentActivity rows={summary.recentApActivity} />
    </LedgerSection>
  );
}

function SupplierApRecentActivity({ rows }: { rows: SupplierApRecentActivityItem[] }) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-steel">No recent AP activity is available for this supplier.</p>;
  }

  return (
    <LedgerDataTable minWidth="820px" className="mt-4">
        <thead className="bg-mist text-xs uppercase tracking-wide text-steel">
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
              <td className="px-3 py-2"><LedgerDate>{formatOptionalDate(row.date, "-")}</LedgerDate></td>
              <td className="px-3 py-2">
                <div className="font-medium text-ink">{row.label}</div>
                <div className="font-mono text-xs text-steel">{row.sourceNumber}</div>
              </td>
              <td className="px-3 py-2"><LedgerMoney>{row.amount ? formatMoneyAmount(row.amount, "SAR") : "-"}</LedgerMoney></td>
              <td className="px-3 py-2 text-steel">{formatStatusLabel(row.status)}</td>
              <td className="px-3 py-2">
                {row.nonPosting ? (
                  <LedgerStatusBadge tone="info">Non-posting</LedgerStatusBadge>
                ) : (
                  <LedgerStatusBadge tone="neutral">Financial posting</LedgerStatusBadge>
                )}
              </td>
              <td className="px-3 py-2">
                {row.href ? (
                  <LedgerButton href={row.href} size="sm">
                    Open
                  </LedgerButton>
                ) : (
                  <span className="text-xs text-steel">Hidden</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
    </LedgerDataTable>
  );
}

export function SupplierGroupedActivityTables({ transactions, emptyLabel }: { transactions: PartyTransaction[]; emptyLabel: string }) {
  const financialRows = transactions.filter((transaction) => !isOperationalNonPostingTransaction(transaction));
  const operationalRows = transactions.filter(isOperationalNonPostingTransaction);

  if (transactions.length === 0) {
    return <LedgerEmptyState title={emptyLabel} />;
  }

  return (
    <div className="space-y-4">
      <LedgerSection title="Financial posting activity" description="Purchase bills, supplier payments, purchase debit notes, and supplier refunds appear here when present.">
          <PartyTransactionsTable transactions={financialRows} emptyLabel="No financial posting activity matches the current filters." showPostingEffect />
      </LedgerSection>
      <LedgerSection
        title="Operational/non-posting activity"
        description={
          <>
          Operational rows help track purchasing work. They do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately.
          </>
        }
      >
          <PartyTransactionsTable transactions={operationalRows} emptyLabel="No operational/non-posting activity matches the current filters." showPostingEffect />
      </LedgerSection>
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
    <LedgerSection
      title={kind === "customer" ? "Customer ledger visibility" : "Supplier ledger visibility"}
      description="Balances and transaction counts are tenant-scoped from posted and draft records already available in LedgerByte. Use the statement activity card when you need the dedicated statement route, then return here for customer or supplier workspace context."
      action={<LedgerButton href={`/contacts/${contactId}`}>Open shared contact ledger</LedgerButton>}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="block rounded-md border border-line bg-panel px-4 py-3 shadow-panel hover:border-palm/50">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold text-ink">{card.label}</span>
              <LedgerStatusBadge tone="neutral">
                {card.sourceType ? (counts.get(card.sourceType) ?? 0) : card.badgeLabel ?? "Report"}
              </LedgerStatusBadge>
            </div>
            {card.balance ? <div className="mt-2"><LedgerMoney>{formatMoneyAmount(card.balance, "SAR")}</LedgerMoney></div> : null}
          </Link>
        ))}
      </div>
    </LedgerSection>
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
    <LedgerSection
      title="Customer collections"
      description={<>Collection cases are operational follow-up records. {collectionsSafeWording}</>}
      action={
        canCreateCollectionCase ? (
          <LedgerButton href={`/sales/collections/new?customerId=${encodeURIComponent(customerId)}&returnTo=${encodeURIComponent(`/customers/${customerId}`)}`}>
            New collection case
          </LedgerButton>
        ) : null
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <BalanceLine label="Open receivable" value={formatMoneyAmount(openReceivableBalance, "SAR")} emphasized />
        <BalanceLine label="Open collection cases" value={String(openCases.length)} />
        <BalanceLine label="Collection amount effect" value="0.0000" />
      </div>
      {loading ? <div className="mt-3"><LedgerLoadingState title="Loading customer collection cases" /></div> : null}
      {!loading && collectionCases.length === 0 ? <p className="mt-3 text-sm text-steel">No collection cases are recorded for this customer.</p> : null}
      {collectionCases.length > 0 ? (
        <LedgerDataTable minWidth="860px" className="mt-4">
            <thead className="bg-mist text-xs uppercase tracking-wide text-steel">
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
                  <td className="px-3 py-2"><LedgerMoney>{formatMoneyAmount(collectionCase.salesInvoice?.balanceDue ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR")}</LedgerMoney></td>
                  <td className="px-3 py-2">
                    <LedgerStatusBadge tone={collectionStatusTone(collectionCase.status)}>{collectionStatusLabel(collectionCase.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-3 py-2 text-steel">{collectionCase.activities?.[0] ? collectionActivityTypeLabel(collectionCase.activities[0].activityType) : "-"}</td>
                  <td className="px-3 py-2"><LedgerDate>{formatOptionalDate(collectionCase.nextActionAt ?? collectionCase.followUpDate, "-")}</LedgerDate></td>
                  <td className="px-3 py-2"><LedgerDate>{formatOptionalDate(collectionCase.promisedPaymentDate, "-")}</LedgerDate></td>
                  <td className="px-3 py-2">
                    <LedgerButton href={`/sales/collections/${collectionCase.id}`} size="sm">
                      Open
                    </LedgerButton>
                  </td>
                </tr>
              ))}
            </tbody>
        </LedgerDataTable>
      ) : null}
    </LedgerSection>
  );
}

function PartyDetails({ contact, kind }: { contact: Contact; kind: PartyKind }) {
  return (
    <LedgerSection title={kind === "customer" ? "Customer Details" : "Supplier Details"}>
      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
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
    </LedgerSection>
  );
}

function PartyNotes({ detail, kind }: { detail: PartyDetail; kind: PartyKind }) {
  const text = kind === "customer" ? ("notes" in detail ? detail.notes : null) : "paymentNotes" in detail ? detail.paymentNotes : null;
  return (
    <LedgerSection title="Notes">
      <p className="text-sm leading-6 text-steel">{text?.trim() || `No ${kind === "customer" ? "customer notes" : "supplier payment notes"} are recorded yet.`}</p>
    </LedgerSection>
  );
}

function BalanceLine({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-mist px-3 py-2">
      <span className="text-sm text-steel">{label}</span>
      <div className={emphasized ? "mt-1 text-lg font-semibold text-ink" : "mt-1 text-sm font-medium text-ink"}>
        <LedgerMoney>{value}</LedgerMoney>
      </div>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return <ActiveStatusBadge isActive={isActive} />;
}

function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return <LedgerStatusBadge tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</LedgerStatusBadge>;
}

function collectionStatusTone(status: CollectionCase["status"]): LedgerStatusTone {
  switch (status) {
    case "PAID":
    case "CLOSED":
      return "success";
    case "DISPUTED":
      return "danger";
    case "ON_HOLD":
      return "warning";
    case "PROMISED_TO_PAY":
    case "IN_PROGRESS":
      return "info";
    case "CANCELLED":
      return "neutral";
    case "OPEN":
      return "draft";
  }
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

function transactionStatusTone(status: string): LedgerStatusTone {
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
  return "neutral";
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
