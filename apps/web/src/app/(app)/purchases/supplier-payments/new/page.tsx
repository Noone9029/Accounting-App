"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AllocationTable } from "@/components/ui-ledger/allocation-table";
import { PageHeader } from "@/components/ui-ledger/page-header";
import { PanelSection } from "@/components/ui-ledger/panel-section";
import { PaymentSummaryCard } from "@/components/ui-ledger/payment-summary-card";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import { formatOptionalDate } from "@/lib/invoice-display";
import { calculateSupplierPaymentAllocationPreview, formatMoneyAmount, parseDecimalToUnits } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import type { Account, BankAccountSummary, Contact, PurchaseBill, SupplierPayment } from "@/lib/types";

interface AllocationState {
  billId: string;
  amountApplied: string;
}

const supplierAllocationColumns = [
  { key: "bill", label: "Bill", className: "min-w-32" },
  { key: "billDate", label: "Bill date" },
  { key: "total", label: "Total" },
  { key: "balanceDue", label: "Balance due" },
  { key: "amountApplied", label: "Apply" },
  { key: "action", label: "Actions" },
] as const;

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSupplierPaymentPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankProfiles, setBankProfiles] = useState<BankAccountSummary[]>([]);
  const [openBills, setOpenBills] = useState<PurchaseBill[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const preferredBillIdRef = useRef("");
  const [paymentDate, setPaymentDate] = useState(todayInputValue());
  const [accountId, setAccountId] = useState("");
  const [amountPaid, setAmountPaid] = useState("0.0000");
  const [description, setDescription] = useState("");
  const [allocations, setAllocations] = useState<AllocationState[]>([]);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("");

  const paidThroughAccounts = useMemo(
    () => accounts.filter((account) => account.isActive && account.allowPosting && account.type === "ASSET"),
    [accounts],
  );
  const preview = useMemo(
    () =>
      calculateSupplierPaymentAllocationPreview(
        amountPaid,
        allocations.map((allocation) => ({
          amountApplied: allocation.amountApplied,
          balanceDue: openBills.find((bill) => bill.id === allocation.billId)?.balanceDue ?? "0.0000",
        })),
      ),
    [allocations, amountPaid, openBills],
  );
  const supplierContextReturnTo = supplierId ? returnTo || partyDetailHref("supplier", supplierId) : returnTo;
  const createBillHref = supplierId
    ? `/purchases/bills/new?supplierId=${encodeURIComponent(supplierId)}&returnTo=${encodeURIComponent(supplierContextReturnTo)}`
    : "/purchases/bills/new";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const querySupplierId = query.get("supplierId") ?? "";
    const queryBillId = query.get("billId") ?? "";
    if (querySupplierId) {
      setSupplierId(querySupplierId);
    }
    if (queryBillId) {
      preferredBillIdRef.current = queryBillId;
    }
    setReturnTo(safeReturnToFromSearch(window.location.search));
  }, []);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoadingSetup(true);
    setError("");

    Promise.all([apiRequest<Contact[]>("/contacts"), apiRequest<Account[]>("/accounts"), apiRequest<BankAccountSummary[]>("/bank-accounts").catch(() => [])])
      .then(([contactResult, accountResult, bankProfileResult]) => {
        if (cancelled) {
          return;
        }

        setSuppliers(contactResult.filter((contact) => contact.isActive && (contact.type === "SUPPLIER" || contact.type === "BOTH")));
        setAccounts(accountResult);
        setBankProfiles(bankProfileResult);
        const defaultAsset =
          accountResult.find((account) => account.code === "112" && account.isActive && account.allowPosting && account.type === "ASSET") ??
          accountResult.find((account) => account.code === "111" && account.isActive && account.allowPosting && account.type === "ASSET");
        if (defaultAsset) {
          setAccountId(defaultAsset.id);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier payment setup data.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSetup(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !supplierId) {
      setOpenBills([]);
      setAllocations([]);
      return;
    }

    let cancelled = false;
    setLoadingBills(true);
    setError("");

    apiRequest<PurchaseBill[]>(`/purchase-bills/open?supplierId=${encodeURIComponent(supplierId)}`)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setOpenBills(result);
        const preferredBillId = preferredBillIdRef.current;
        const preferredBill = preferredBillId ? result.find((bill) => bill.id === preferredBillId) : null;
        setAllocations(
          result.map((bill) => ({
            billId: bill.id,
            amountApplied: preferredBill?.id === bill.id ? bill.balanceDue : "0.0000",
          })),
        );
        if (preferredBill) {
          setAmountPaid((current) => (parseDecimalToUnits(current) <= 0 ? preferredBill.balanceDue : current));
          preferredBillIdRef.current = "";
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load open purchase bills.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBills(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, supplierId]);

  function updateAllocation(billId: string, amountApplied: string) {
    setAllocations((current) => current.map((allocation) => (allocation.billId === billId ? { ...allocation, amountApplied } : allocation)));
  }

  function applyFullBalance(bill: PurchaseBill) {
    updateAllocation(bill.id, bill.balanceDue);
    if (parseDecimalToUnits(amountPaid) <= 0) {
      setAmountPaid(bill.balanceDue);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const allocationsToSubmit = allocations.filter((allocation) => parseDecimalToUnits(allocation.amountApplied) > 0);
    const validationError = getValidationError(supplierId, accountId, amountPaid, allocationsToSubmit, openBills);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payment = await apiRequest<SupplierPayment>("/supplier-payments", {
        method: "POST",
        body: {
          supplierId,
          paymentDate: `${paymentDate}T00:00:00.000Z`,
          currency: "SAR",
          amountPaid,
          accountId,
          description: description || undefined,
          allocations: allocationsToSubmit,
        },
      });
      router.push(returnTo || `/purchases/supplier-payments/${payment.id}?recorded=1`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record supplier payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Record supplier payment"
        description="Pay suppliers and allocate the payment to finalized open bills."
        actions={
          <Link href={returnTo || "/purchases/supplier-payments"} className={buttonVariants({ variant: "outline" })}>
          Back
        </Link>
        }
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to record supplier payments.</StatusMessage> : null}
        {loadingSetup ? <StatusMessage type="loading">Loading supplier payment setup data...</StatusMessage> : null}
        {loadingBills ? <StatusMessage type="loading">Loading open bills...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
        <PanelSection title="Payment details" description="Choose the supplier, payment date, amount, and paid-through account.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-foreground">Supplier</span>
              <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.displayName ?? supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Payment date</span>
              <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required className="mt-1" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Amount paid</span>
              <Input inputMode="decimal" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} required className="mt-1 font-mono tabular-nums" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-foreground">Paid-through account</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">Select cash or bank account</option>
                {paidThroughAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {bankAccountOptionLabel(account, bankProfiles)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-foreground">Description</span>
              <Input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1" />
            </label>
          </div>
        </PanelSection>

        <PanelSection title="Bill allocation" description="Apply this payment only to finalized open bills for the selected supplier." contentClassName="p-0">
          <AllocationTable
            columns={supplierAllocationColumns}
            rows={openBills}
            rowKey={(bill) => bill.id}
            minWidth="min-w-[760px]"
            framed={false}
            emptyState={
              supplierId ? (
                    <StatusMessage type="empty">
                      No finalized open bills were found for this supplier.{" "}
                      <Link href={createBillHref} className="font-semibold text-primary hover:underline">
                        Create and finalize a bill
                      </Link>
                      {" "}before recording payment.
                    </StatusMessage>
              ) : null
            }
            renderCell={(bill, columnKey) => {
                  const allocation = allocations.find((candidate) => candidate.billId === bill.id);
                  switch (columnKey) {
                    case "bill":
                      return <span className="font-mono text-xs">{bill.billNumber}</span>;
                    case "billDate":
                      return <span className="text-muted-foreground">{formatOptionalDate(bill.billDate, "-")}</span>;
                    case "total":
                      return <span className="font-mono text-xs tabular-nums">{formatMoneyAmount(bill.total, bill.currency)}</span>;
                    case "balanceDue":
                      return <span className="font-mono text-xs tabular-nums">{formatMoneyAmount(bill.balanceDue, bill.currency)}</span>;
                    case "amountApplied":
                      return (
                        <Input
                          inputMode="decimal"
                          value={allocation?.amountApplied ?? "0.0000"}
                          onChange={(event) => updateAllocation(bill.id, event.target.value)}
                          className="w-32 font-mono text-xs tabular-nums"
                        />
                      );
                    case "action":
                      return (
                        <Button type="button" variant="outline" size="xs" onClick={() => applyFullBalance(bill)}>
                          Full balance
                        </Button>
                      );
                    default:
                      return null;
                  }
                }}
          />
        </PanelSection>

        <PaymentSummaryCard
          className="w-full sm:ml-auto sm:max-w-sm"
          description="Supplier payment posting creates one AP payment journal. Bill allocation only updates bill balances."
          rows={[
            { label: "Amount paid", value: formatMoneyAmount(preview.amountPaid) },
            { label: "Allocated", value: formatMoneyAmount(preview.totalAllocated) },
            { label: "Unapplied", value: formatMoneyAmount(preview.unappliedAmount), emphasized: true },
          ]}
        />

        <div className="flex justify-end gap-3">
          <Link href={returnTo || "/purchases/supplier-payments"} className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={submitting || !organizationId}>
            {submitting ? "Recording..." : "Record payment"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function getValidationError(
  supplierId: string,
  accountId: string,
  amountPaid: string,
  allocations: AllocationState[],
  openBills: PurchaseBill[],
): string {
  if (!supplierId) {
    return "Select a supplier.";
  }
  if (!accountId) {
    return "Select a paid-through account.";
  }
  if (parseDecimalToUnits(amountPaid) <= 0) {
    return "Amount paid must be greater than zero.";
  }
  for (const allocation of allocations) {
    const bill = openBills.find((candidate) => candidate.id === allocation.billId);
    if (!bill) {
      return "Each allocation must reference an open bill.";
    }
    if (parseDecimalToUnits(allocation.amountApplied) > parseDecimalToUnits(bill.balanceDue)) {
      return "Allocation cannot exceed bill balance due.";
    }
  }
  const totalAllocated = allocations.reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0);
  if (totalAllocated > parseDecimalToUnits(amountPaid)) {
    return "Total allocations cannot exceed amount paid.";
  }
  return "";
}
