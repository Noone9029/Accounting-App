"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Record supplier payment"
        description="Pay suppliers and allocate the payment to finalized open bills."
        actions={
          <LedgerButton href={returnTo || "/purchases/supplier-payments"}>
          Back
        </LedgerButton>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to record supplier payments.</LedgerAlert> : null}
        {loadingSetup ? <LedgerAlert tone="info">Loading supplier payment setup data...</LedgerAlert> : null}
        {loadingBills ? <LedgerAlert tone="info">Loading open bills...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <LedgerFormSection title="Payment details" description="Choose the supplier, payment date, amount, and paid-through account.">
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Supplier</LedgerFieldText>
              <LedgerSelect value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.displayName ?? supplier.name}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Payment date</LedgerFieldText>
              <LedgerInput type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Amount paid</LedgerFieldText>
              <LedgerInput inputMode="decimal" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} required className="font-mono tabular-nums" />
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Paid-through account</LedgerFieldText>
              <LedgerSelect value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
                <option value="">Select cash or bank account</option>
                {paidThroughAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {bankAccountOptionLabel(account, bankProfiles)}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Description</LedgerFieldText>
              <LedgerInput value={description} onChange={(event) => setDescription(event.target.value)} />
            </LedgerFieldLabel>
        </LedgerFormSection>

        <LedgerPanel className="p-0">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-base font-semibold text-ink">Bill allocation</h2>
            <p className="mt-1 text-sm leading-6 text-steel">Apply this payment only to finalized open bills for the selected supplier.</p>
          </div>
          <LedgerDataTable minWidth="760px" className="rounded-t-none border-0 shadow-none">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                {supplierAllocationColumns.map((column) => (
                  <th key={column.key} className="px-4 py-3">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {openBills.length > 0 ? openBills.map((bill) => {
                const allocation = allocations.find((candidate) => candidate.billId === bill.id);
                return (
                  <tr key={bill.id}>
                    <td className="px-4 py-3 font-mono text-xs">{bill.billNumber}</td>
                    <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(bill.billDate, "-")}</LedgerDate></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(bill.total, bill.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(bill.balanceDue, bill.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3">
                      <LedgerInput
                        inputMode="decimal"
                        value={allocation?.amountApplied ?? "0.0000"}
                        onChange={(event) => updateAllocation(bill.id, event.target.value)}
                        className="w-32 font-mono text-xs tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <LedgerButton size="sm" onClick={() => applyFullBalance(bill)}>
                        Full balance
                      </LedgerButton>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={supplierAllocationColumns.length} className="px-4 py-5 text-steel">
                    {supplierId ? (
                      <>
                        No finalized open bills were found for this supplier.{" "}
                        <Link href={createBillHref} className="font-semibold text-palm hover:underline">
                          Create and finalize a bill
                        </Link>{" "}
                        before recording payment.
                      </>
                    ) : (
                      "Select a supplier to load finalized open bills."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </LedgerDataTable>
        </LedgerPanel>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <LedgerSummaryBand>
            Supplier payment posting creates one AP payment journal. Bill allocation only updates bill balances.
          </LedgerSummaryBand>
          <LedgerPanel className="p-4">
            <h2 className="text-base font-semibold text-ink">Payment summary</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-steel">Amount paid</dt>
              <dd className="text-right"><LedgerMoney>{formatMoneyAmount(preview.amountPaid)}</LedgerMoney></dd>
              <dt className="text-steel">Allocated</dt>
              <dd className="text-right"><LedgerMoney>{formatMoneyAmount(preview.totalAllocated)}</LedgerMoney></dd>
              <dt className="font-semibold text-ink">Unapplied</dt>
              <dd className="text-right font-semibold"><LedgerMoney>{formatMoneyAmount(preview.unappliedAmount)}</LedgerMoney></dd>
            </dl>
          </LedgerPanel>
        </div>

        <LedgerActionBar className="justify-end">
          <LedgerButton href={returnTo || "/purchases/supplier-payments"}>Cancel</LedgerButton>
          <LedgerButton type="submit" disabled={submitting || !organizationId} variant="primary">
            {submitting ? "Recording..." : "Record payment"}
          </LedgerButton>
        </LedgerActionBar>
      </form>
      </LedgerPageBody>
    </LedgerPage>
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
