"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
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
import { formatMoneyAmount, parseDecimalToUnits } from "@/lib/money";
import {
  supplierRefundableAmountAfterRefund,
  supplierRefundableSourceLabel,
  supplierRefundSourceTypeLabel,
  validateSupplierRefundAmount,
} from "@/lib/supplier-refunds";
import type { Account, BankAccountSummary, Contact, SupplierRefund, SupplierRefundSourceType, SupplierRefundableSources } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSupplierRefundPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankProfiles, setBankProfiles] = useState<BankAccountSummary[]>([]);
  const [sources, setSources] = useState<SupplierRefundableSources | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [sourceType, setSourceType] = useState<SupplierRefundSourceType>("SUPPLIER_PAYMENT");
  const [sourceId, setSourceId] = useState("");
  const [refundDate, setRefundDate] = useState(todayInputValue());
  const [amountRefunded, setAmountRefunded] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const receivedIntoAccounts = useMemo(
    () => accounts.filter((account) => account.isActive && account.allowPosting && account.type === "ASSET"),
    [accounts],
  );
  const sourceOptions = sourceType === "SUPPLIER_PAYMENT" ? sources?.payments ?? [] : sources?.debitNotes ?? [];
  const selectedSource = sourceOptions.find((source) => source.id === sourceId);
  const availableAmount = selectedSource?.unappliedAmount ?? "0.0000";
  const remainingAfterRefund = supplierRefundableAmountAfterRefund(availableAmount, amountRefunded || "0.0000");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setSupplierId(params.get("supplierId") ?? "");
    const requestedSourceType = params.get("sourceType");
    if (requestedSourceType === "PURCHASE_DEBIT_NOTE" || requestedSourceType === "SUPPLIER_PAYMENT") {
      setSourceType(requestedSourceType);
    }
    setSourceId(params.get("sourcePaymentId") ?? params.get("sourceDebitNoteId") ?? "");
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier refund setup data.");
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
      setSources(null);
      setSourceId("");
      return;
    }

    let cancelled = false;
    setLoadingSources(true);
    setError("");

    apiRequest<SupplierRefundableSources>(`/supplier-refunds/refundable-sources?supplierId=${encodeURIComponent(supplierId)}`)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setSources(result);
        const options = sourceType === "SUPPLIER_PAYMENT" ? result.payments : result.debitNotes;
        setSourceId((current) => (current && options.some((source) => source.id === current) ? current : (options[0]?.id ?? "")));
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load refundable supplier sources.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSources(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supplierId, organizationId, sourceType]);

  useEffect(() => {
    if (selectedSource && (!amountRefunded || parseDecimalToUnits(amountRefunded) <= 0)) {
      setAmountRefunded(selectedSource.unappliedAmount);
    }
  }, [amountRefunded, selectedSource]);

  function changeSourceType(nextSourceType: SupplierRefundSourceType) {
    setSourceType(nextSourceType);
    setSourceId("");
    setAmountRefunded("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError(supplierId, accountId, sourceId, amountRefunded, availableAmount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        supplierId,
        sourceType,
        refundDate: `${refundDate}T00:00:00.000Z`,
        currency: selectedSource?.currency ?? "SAR",
        amountRefunded,
        accountId,
        description: description || undefined,
      };
      if (sourceType === "SUPPLIER_PAYMENT") {
        body.sourcePaymentId = sourceId;
      } else {
        body.sourceDebitNoteId = sourceId;
      }

      const refund = await apiRequest<SupplierRefund>("/supplier-refunds", { method: "POST", body });
      router.push(`/purchases/supplier-refunds/${refund.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record supplier refund.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Record supplier refund"
        description="Record money received back from a supplier against unapplied AP credit. No bank integration is called."
        actions={<LedgerButton href="/purchases/supplier-refunds">Back</LedgerButton>}
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to record supplier refunds.</LedgerAlert> : null}
        {loadingSetup ? <LedgerAlert tone="info">Loading supplier refund setup data...</LedgerAlert> : null}
        {loadingSources ? <LedgerAlert tone="info">Loading refundable supplier sources...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <LedgerFormSection title="Refund details" description="Choose the supplier, source credit, refund date, and received-into account.">
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
              <LedgerFieldText>Refund date</LedgerFieldText>
              <LedgerInput type="date" value={refundDate} onChange={(event) => setRefundDate(event.target.value)} required />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Amount refunded</LedgerFieldText>
              <LedgerInput inputMode="decimal" value={amountRefunded} onChange={(event) => setAmountRefunded(event.target.value)} required className="font-mono tabular-nums" />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Source type</LedgerFieldText>
              <LedgerSelect value={sourceType} onChange={(event) => changeSourceType(event.target.value as SupplierRefundSourceType)}>
                <option value="SUPPLIER_PAYMENT">Supplier payment</option>
                <option value="PURCHASE_DEBIT_NOTE">Purchase debit note</option>
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-3">
              <LedgerFieldText>Refund source</LedgerFieldText>
              <LedgerSelect value={sourceId} onChange={(event) => setSourceId(event.target.value)} required>
                <option value="">Select {supplierRefundSourceTypeLabel(sourceType).toLowerCase()}</option>
                {sourceOptions.map((source) => (
                  <option key={source.id} value={source.id}>
                    {supplierRefundableSourceLabel(sourceType, source)}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Received-into account</LedgerFieldText>
              <LedgerSelect value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
                <option value="">Select cash or bank account</option>
                {receivedIntoAccounts.map((account) => (
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

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <LedgerSummaryBand tone="warning">
              This records only the accounting refund journal. It does not call bank transfers, payment gateways, bank reconciliation, or ZATCA services.
            </LedgerSummaryBand>
            <LedgerPanel className="p-4">
              <h2 className="text-base font-semibold text-ink">Refund source balance</h2>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-steel">Available source credit</dt>
                <dd className="text-right"><LedgerMoney>{formatMoneyAmount(availableAmount, selectedSource?.currency ?? "SAR")}</LedgerMoney></dd>
                <dt className="text-steel">Amount refunded</dt>
                <dd className="text-right"><LedgerMoney>{formatMoneyAmount(amountRefunded || "0.0000", selectedSource?.currency ?? "SAR")}</LedgerMoney></dd>
                <dt className="font-semibold text-ink">Remaining after refund</dt>
                <dd className="text-right font-semibold"><LedgerMoney>{formatMoneyAmount(remainingAfterRefund, selectedSource?.currency ?? "SAR")}</LedgerMoney></dd>
              </dl>
            </LedgerPanel>
          </div>

          <LedgerActionBar>
            <LedgerButton type="submit" disabled={!organizationId || loadingSetup || loadingSources || submitting || !selectedSource} variant="primary">
              {submitting ? "Recording..." : "Record refund"}
            </LedgerButton>
            <LedgerButton href="/purchases/supplier-refunds">Cancel</LedgerButton>
          </LedgerActionBar>
        </form>
      </LedgerPageBody>
    </LedgerPage>
  );
}

function getValidationError(supplierId: string, accountId: string, sourceId: string, amountRefunded: string, availableAmount: string): string {
  if (!supplierId) {
    return "Choose a supplier.";
  }
  if (!accountId) {
    return "Choose a received-into account.";
  }
  if (!sourceId) {
    return "Choose a refundable source.";
  }
  return validateSupplierRefundAmount(amountRefunded, availableAmount) ?? "";
}
