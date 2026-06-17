"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, SaveIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComplianceReadinessPanel } from "@/components/ui-ledger/compliance-readiness-panel";
import { LineItemsTable } from "@/components/ui-ledger/line-items-table";
import { PanelSection } from "@/components/ui-ledger/panel-section";
import { TransactionSummaryCard } from "@/components/ui-ledger/transaction-summary-card";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { getLedgerByteEdition } from "@/lib/edition";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
import { purchaseBillAccountantReviewWarning, purchaseBillInventoryClearingModeWarning, purchaseBillInventoryPostingModeLabel } from "@/lib/purchase-bills";
import type { Account, Branch, Contact, Item, PurchaseBill, PurchaseBillInventoryPostingMode, TaxRate } from "@/lib/types";

interface PurchaseBillLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

interface PurchaseBillFormProps {
  initialBill?: PurchaseBill;
  initialSupplierId?: string;
}

function makeLine(): PurchaseBillLineState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random()}`,
    itemId: "",
    description: "",
    accountId: "",
    quantity: "1.0000",
    unitPrice: "0.0000",
    discountRate: "0.0000",
    taxRateId: "",
  };
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(value?: string | null, fallback = todayInputValue()): string {
  return value ? new Date(value).toISOString().slice(0, 10) : fallback;
}

export function PurchaseBillForm({ initialBill, initialSupplierId = "" }: PurchaseBillFormProps) {
  const router = useRouter();
  const edition = getLedgerByteEdition();
  const organizationId = useActiveOrganizationId();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [supplierId, setSupplierId] = useState(initialBill?.supplierId ?? initialSupplierId);
  const [branchId, setBranchId] = useState(initialBill?.branchId ?? "");
  const [billDate, setBillDate] = useState(dateInputValue(initialBill?.billDate));
  const [dueDate, setDueDate] = useState(dateInputValue(initialBill?.dueDate, ""));
  const [notes, setNotes] = useState(initialBill?.notes ?? "");
  const [terms, setTerms] = useState(initialBill?.terms ?? "");
  const [inventoryPostingMode, setInventoryPostingMode] = useState<PurchaseBillInventoryPostingMode>(
    initialBill?.inventoryPostingMode ?? "DIRECT_EXPENSE_OR_ASSET",
  );
  const [lines, setLines] = useState<PurchaseBillLineState[]>(
    initialBill?.lines?.map((line) => ({
      id: line.id,
      itemId: line.itemId ?? "",
      description: line.description,
      accountId: line.accountId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate: line.discountRate,
      taxRateId: line.taxRateId ?? "",
    })) ?? [makeLine()],
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("");

  const postingPurchaseAccounts = accounts.filter(
    (account) =>
      account.isActive &&
      account.allowPosting &&
      (account.type === "EXPENSE" || account.type === "COST_OF_SALES" || account.type === "ASSET"),
  );
  const activePurchaseTaxRates = taxRates.filter((taxRate) => taxRate.isActive && (taxRate.scope === "PURCHASES" || taxRate.scope === "BOTH"));
  const activeItems = items.filter((item) => item.status === "ACTIVE");
  const preview = useMemo(
    () =>
      calculateInvoicePreview(
        lines.map((line) => ({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate,
          taxRate: activePurchaseTaxRates.find((taxRate) => taxRate.id === line.taxRateId)?.rate ?? "0.0000",
        })),
      ),
    [activePurchaseTaxRates, lines],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    setReturnTo(safeReturnToFromSearch(window.location.search));

    if (!initialBill && !initialSupplierId) {
      const querySupplierId = query.get("supplierId") ?? "";
      if (querySupplierId) {
        setSupplierId(querySupplierId);
      }
    }
  }, [initialBill, initialSupplierId]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Contact[]>("/contacts"),
      apiRequest<Item[]>("/items"),
      apiRequest<Account[]>("/accounts"),
      apiRequest<TaxRate[]>("/tax-rates"),
      apiRequest<Branch[]>("/branches"),
    ])
      .then(([contactResult, itemResult, accountResult, taxRateResult, branchResult]) => {
        if (cancelled) {
          return;
        }

        setSuppliers(contactResult.filter((contact) => contact.isActive && (contact.type === "SUPPLIER" || contact.type === "BOTH")));
        setItems(itemResult);
        setAccounts(accountResult);
        setTaxRates(taxRateResult);
        setBranches(branchResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase bill setup data.");
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
  }, [organizationId]);

  function updateLine(lineId: string, patch: Partial<PurchaseBillLineState>) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function selectItem(lineId: string, itemId: string) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) {
      updateLine(lineId, { itemId: "", description: "", unitPrice: "0.0000" });
      return;
    }

    updateLine(lineId, {
      itemId,
      description: item.description ?? item.name,
      accountId: item.expenseAccountId ?? "",
      unitPrice: item.purchaseCost ?? "0.0000",
      taxRateId: item.purchaseTaxRateId ?? "",
    });
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== lineId) : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError(supplierId, lines, preview.valid);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        supplierId,
        branchId: branchId || null,
        billDate: `${billDate}T00:00:00.000Z`,
        dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : null,
        currency: edition.defaultCurrency,
        notes: notes || undefined,
        terms: terms || undefined,
        inventoryPostingMode,
        lines: lines.map((line, index) => ({
          itemId: line.itemId || undefined,
          description: line.description,
          accountId: line.accountId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate || "0.0000",
          taxRateId: line.taxRateId || null,
          sortOrder: index,
        })),
      };

      const bill = initialBill
        ? await apiRequest<PurchaseBill>(`/purchase-bills/${initialBill.id}`, { method: "PATCH", body })
        : await apiRequest<PurchaseBill>("/purchase-bills", { method: "POST", body });

      router.push(returnTo || `/purchases/bills/${bill.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save purchase bill.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialBill && initialBill.status !== "DRAFT") {
    return (
      <div className="flex flex-col gap-4">
        <StatusMessage type="error">Only draft purchase bills can be edited.</StatusMessage>
        <Link href={`/purchases/bills/${initialBill.id}`} className={buttonVariants({ variant: "outline", className: "self-start" })}>
          Back to bill
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <PanelSection
        title="Bill details"
        description="Draft supplier bill fields are captured before any AP posting or finalization workflow."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-foreground">Supplier</span>
            <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.displayName ?? supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Bill date</span>
            <Input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} required className="mt-1" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Due date</span>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Currency</span>
            <Input value={edition.defaultCurrency} readOnly aria-label="Currency" className="mt-1 bg-muted text-muted-foreground" />
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">Default {edition.marketLabel} workspace currency.</span>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-foreground">Branch</span>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="">No branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.displayName ?? branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Terms</span>
            <Input value={terms} onChange={(event) => setTerms(event.target.value)} className="mt-1" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Notes</span>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-foreground">Inventory posting mode</span>
            <select
              value={inventoryPostingMode}
              onChange={(event) => setInventoryPostingMode(event.target.value as PurchaseBillInventoryPostingMode)}
              className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="DIRECT_EXPENSE_OR_ASSET">{purchaseBillInventoryPostingModeLabel("DIRECT_EXPENSE_OR_ASSET")}</option>
              <option value="INVENTORY_CLEARING">{purchaseBillInventoryPostingModeLabel("INVENTORY_CLEARING")}</option>
            </select>
          </label>
        </div>
        {inventoryPostingMode === "INVENTORY_CLEARING" ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <ul className="flex flex-col gap-1">
              <li>{purchaseBillInventoryClearingModeWarning()}</li>
              <li>{purchaseBillAccountantReviewWarning()}</li>
            </ul>
          </div>
        ) : null}
      </PanelSection>

      <ComplianceReadinessPanel
        title="VAT readiness"
        description="Local VAT and accounting review only. No tax-authority submission or provider reporting is enabled."
        checks={[
          {
            label: "Supplier bill coding",
            status: supplierId && lines.length > 0 ? "pass" : "pending",
            detail: "Supplier, bill date, due date, expense/account coding, and VAT handling stay in the draft AP workflow.",
          },
          {
            label: "Accountant review",
            status: inventoryPostingMode === "INVENTORY_CLEARING" ? "warning" : "pass",
            detail: "Inventory clearing mode keeps the existing accountant-review warning and does not post stock automation.",
          },
          {
            label: "Local readiness only",
            status: "warning",
            detail: "No provider integration, tax-authority reporting, or certification claim is made here.",
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LineItemsTable
          title="Bill line items"
          description="Line entries keep existing item, purchase account, discount, tax, and preview totals behavior."
        >
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit price</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <select value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                        <option value="">No item</option>
                        {activeItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required />
                    </TableCell>
                    <TableCell>
                      <select value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} required className="h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                        <option value="">Select account</option>
                        {postingPurchaseAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} {account.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} required className="w-24" />
                    </TableCell>
                    <TableCell>
                      <Input inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} required className="w-28" />
                    </TableCell>
                    <TableCell>
                      <Input inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="w-24" />
                    </TableCell>
                    <TableCell>
                      <select value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                        <option value="">No tax</option>
                        {activePurchaseTaxRates.map((taxRate) => (
                          <option key={taxRate.id} value={taxRate.id}>
                            {taxRate.name} ({taxRate.rate}%)
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="outline" size="xs" onClick={() => removeLine(line.id)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-4 py-3">
            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, makeLine()])}>
              <PlusIcon data-icon="inline-start" />
              Add line
            </Button>
          </div>
        </LineItemsTable>

        <TransactionSummaryCard
          rows={[
            { label: "Subtotal", value: formatMoneyAmount(preview.subtotal, edition.defaultCurrency) },
            { label: "Discount", value: formatMoneyAmount(preview.discountTotal, edition.defaultCurrency) },
            { label: "Taxable", value: formatMoneyAmount(preview.taxableTotal, edition.defaultCurrency) },
            { label: "VAT / Tax", value: formatMoneyAmount(preview.taxTotal, edition.defaultCurrency) },
            { label: "Total", value: formatMoneyAmount(preview.total, edition.defaultCurrency), emphasized: true },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create purchase bills.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase bill setup data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!preview.valid ? <StatusMessage type="info">Every bill line needs a positive quantity, non-negative unit price, valid discount, and a posting account.</StatusMessage> : null}
      </div>

      <div className="flex justify-end gap-3">
        <Link href={returnTo || "/purchases/bills"} className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={submitting || !organizationId}>
          <SaveIcon data-icon="inline-start" />
          {submitting ? "Saving..." : initialBill ? "Save changes" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}

function getValidationError(supplierId: string, lines: PurchaseBillLineState[], totalsValid: boolean): string {
  if (!supplierId) {
    return "Select a supplier.";
  }
  if (!totalsValid) {
    return "Fix purchase bill line amounts before saving.";
  }
  if (lines.some((line) => !line.description.trim() || !line.accountId)) {
    return "Each purchase bill line needs a description and account.";
  }
  return "";
}
