"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { calculateSupplierPaymentAllocationPreview, parseDecimalToUnits } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import type { Account, BankAccountSummary, Contact, PurchaseBill, SupplierPayment } from "@/lib/types";

interface AllocationState {
  billId: string;
  amountApplied: string;
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSupplierPaymentPage() {
  const router = useRouter();
  const { locale, tc } = useAppLocale();
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.id ?? null;
  const baseCurrency = activeOrganization?.baseCurrency ?? null;
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankProfiles, setBankProfiles] = useState<BankAccountSummary[]>([]);
  const [bankProfilesReady, setBankProfilesReady] = useState(false);
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
    setBankProfilesReady(false);
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoadingSetup(true);
    setError("");

    Promise.all([apiRequest<Contact[]>("/contacts"), apiRequest<Account[]>("/accounts"), apiRequest<BankAccountSummary[]>("/bank-accounts")])
      .then(([contactResult, accountResult, bankProfileResult]) => {
        if (cancelled) {
          return;
        }

        setSuppliers(contactResult.filter((contact) => contact.isActive && (contact.type === "SUPPLIER" || contact.type === "BOTH")));
        setAccounts(accountResult);
        setBankProfiles(bankProfileResult);
        setBankProfilesReady(true);
        const defaultAsset =
          accountResult.find((account) => account.code === "112" && account.isActive && account.allowPosting && account.type === "ASSET") ??
          accountResult.find((account) => account.code === "111" && account.isActive && account.allowPosting && account.type === "ASSET");
        if (defaultAsset) {
          setAccountId(defaultAsset.id);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load supplier payment setup data."));
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load open purchase bills."));
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
    if (!baseCurrency) {
      setError(tc("Select an organization with a base currency before recording this payment."));
      return;
    }
    if (!bankProfilesReady) {
      setError(tc("Bank-profile currencies could not be verified. Reload them before recording this payment."));
      return;
    }
    if (loadingSetup || loadingBills || !organizationId) {
      setError(tc("Wait for payment setup data from the active organization before recording this payment."));
      return;
    }
    const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
    if (!selectedSupplier || (selectedSupplier.organizationId && selectedSupplier.organizationId !== organizationId)) {
      setError(tc("The selected supplier does not belong to the active organization."));
      return;
    }
    const selectedAccount = paidThroughAccounts.find((account) => account.id === accountId);
    if (!selectedAccount || selectedAccount.organizationId !== organizationId) {
      setError(tc("The paid-through account does not belong to the active organization."));
      return;
    }
    const allocationSourceMismatch = allocationsToSubmit.some((allocation) => {
      const bill = openBills.find((candidate) => candidate.id === allocation.billId);
      return !bill || bill.supplierId !== supplierId || bill.organizationId !== organizationId;
    });
    if (allocationSourceMismatch) {
      setError(tc("One or more payment allocations do not belong to the selected supplier in the active organization."));
      return;
    }
    const mismatchedBill = allocationsToSubmit
      .map((allocation) => openBills.find((bill) => bill.id === allocation.billId))
      .find((bill) => bill && bill.currency !== baseCurrency);
    if (mismatchedBill) {
      setError(tc("Bill {number} uses {currency}. Payments can be allocated only in the organization base currency {baseCurrency} during this phase.", { number: mismatchedBill.billNumber, currency: mismatchedBill.currency, baseCurrency }));
      return;
    }
    const selectedBankProfile = bankProfiles.find((profile) => profile.accountId === accountId);
    if (selectedBankProfile && (selectedBankProfile.organizationId !== organizationId || selectedBankProfile.currency !== baseCurrency)) {
      setError(tc("The paid-through account uses {currency}. Payments can post only in the organization base currency {baseCurrency} during this phase.", { currency: selectedBankProfile.currency, baseCurrency }));
      return;
    }
    const validationError = getValidationError(supplierId, accountId, amountPaid, allocationsToSubmit, openBills);
    if (validationError) {
      setError(tc(validationError));
      return;
    }

    setSubmitting(true);
    try {
      const payment = await apiRequest<SupplierPayment>("/supplier-payments", {
        method: "POST",
        body: {
          supplierId,
          paymentDate: `${paymentDate}T00:00:00.000Z`,
          currency: baseCurrency,
          amountPaid,
          accountId,
          description: description || undefined,
          allocations: allocationsToSubmit,
        },
      });
      router.push(returnTo || `/purchases/supplier-payments/${payment.id}?recorded=1`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("Unable to record supplier payment."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Record supplier payment")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Pay suppliers and allocate the payment to finalized open bills.")}</p>
        </div>
        <Link href={returnTo || "/purchases/supplier-payments"} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back")}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to record supplier payments.")}</StatusMessage> : null}
        {loadingSetup ? <StatusMessage type="loading">{tc("Loading supplier payment setup data...")}</StatusMessage> : null}
        {loadingBills ? <StatusMessage type="loading">{tc("Loading open bills...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">{tc("Supplier")}</span>
              <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{tc("Select supplier")}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.displayName ?? supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Payment date")}</span>
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Amount paid")}</span>
              <input inputMode="decimal" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">{tc("Paid-through account")}</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{tc("Select cash or bank account")}</option>
                {paidThroughAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {bankAccountOptionLabel(account, bankProfiles)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">{tc("Description")}</span>
              <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[760px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Bill")}</th>
                <th className="px-4 py-3">{tc("Bill date")}</th>
                <th className="px-4 py-3">{tc("Total")}</th>
                <th className="px-4 py-3">{tc("Balance due")}</th>
                <th className="px-4 py-3">{tc("Apply")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {openBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5">
                    <StatusMessage type="empty">
                      {tc("No finalized open bills were found for this supplier.")}
                      {" "}
                      <Link href={createBillHref} className="font-semibold text-palm hover:underline">
                        {tc("Create and finalize a bill")}
                      </Link>
                      {" "}
                      {tc("before recording payment.")}
                    </StatusMessage>
                  </td>
                </tr>
              ) : (
                openBills.map((bill) => {
                  const allocation = allocations.find((candidate) => candidate.billId === bill.id);
                  return (
                    <tr key={bill.id}>
                      <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{bill.billNumber}</bdi></td>
                      <td className="px-4 py-3 text-steel">{formatAppDate(bill.billDate, locale, "-")}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(bill.total, bill.currency, locale)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(bill.balanceDue, bill.currency, locale)}</td>
                      <td className="px-4 py-3">
                        <input inputMode="decimal" value={allocation?.amountApplied ?? "0.0000"} onChange={(event) => updateAllocation(bill.id, event.target.value)} className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => applyFullBalance(bill)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          {tc("Full balance")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-steel">{tc("Supplier payment posting creates one AP payment journal. Bill allocation only updates bill balances.")}</p>
          <div className="min-w-[260px] space-y-2 text-sm">
            <TotalRow label={tc("Amount paid")} value={baseCurrency ? formatAppMoney(preview.amountPaid, baseCurrency, locale) : "-"} />
            <TotalRow label={tc("Allocated")} value={baseCurrency ? formatAppMoney(preview.totalAllocated, baseCurrency, locale) : "-"} />
            <TotalRow label={tc("Unapplied")} value={baseCurrency ? formatAppMoney(preview.unappliedAmount, baseCurrency, locale) : "-"} strong />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href={returnTo || "/purchases/supplier-payments"} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Cancel")}
          </Link>
          <button type="submit" disabled={!bankProfilesReady || loadingSetup || loadingBills || submitting || !organizationId || !baseCurrency} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? tc("Recording...") : tc("Record payment")}
          </button>
        </div>
      </form>
    </section>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
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
