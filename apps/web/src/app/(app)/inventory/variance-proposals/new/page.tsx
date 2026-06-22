"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryVarianceReasonLabel } from "@/lib/inventory";
import type { Account, InventoryVarianceProposal, InventoryVarianceReason } from "@/lib/types";

const reasons: InventoryVarianceReason[] = [
  "PRICE_DIFFERENCE",
  "QUANTITY_DIFFERENCE",
  "RECEIPT_WITHOUT_CLEARING_BILL",
  "CLEARING_BILL_WITHOUT_RECEIPT",
  "REVERSED_RECEIPT_POSTING",
  "MANUAL_ADJUSTMENT",
];

export default function NewInventoryVarianceProposalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const purchaseBillId = searchParams.get("purchaseBillId") ?? "";
  const purchaseReceiptId = searchParams.get("purchaseReceiptId") ?? "";
  const initialReason = (searchParams.get("reason") as InventoryVarianceReason | null) ?? "PRICE_DIFFERENCE";
  const hasClearingSource = Boolean(purchaseBillId || purchaseReceiptId);
  const postingAccounts = useMemo(() => accounts.filter((account) => account.isActive && account.allowPosting), [accounts]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<Account[]>("/accounts")
      .then((result) => {
        if (!cancelled) {
          setAccounts(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load accounts.");
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

  async function createProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const body = hasClearingSource
        ? {
            purchaseBillId: purchaseBillId || undefined,
            purchaseReceiptId: purchaseReceiptId || undefined,
            reason: String(formData.get("reason")) as InventoryVarianceReason,
            description: String(formData.get("description") || "") || undefined,
          }
        : {
            reason: String(formData.get("reason")) as InventoryVarianceReason,
            proposalDate: String(formData.get("proposalDate")),
            amount: String(formData.get("amount")),
            debitAccountId: String(formData.get("debitAccountId")),
            creditAccountId: String(formData.get("creditAccountId")),
            description: String(formData.get("description") || "") || undefined,
          };
      const created = await apiRequest<InventoryVarianceProposal>(
        hasClearingSource ? "/inventory/variance-proposals/from-clearing-variance" : "/inventory/variance-proposals",
        { method: "POST", body },
      );
      router.push(`/inventory/variance-proposals/${created.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create inventory variance proposal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory valuation"
        title="New inventory variance proposal"
        description="Draft a proposal for accountant review. No journal is created from this form."
        actions={<LedgerButton href="/inventory/variance-proposals">Back</LedgerButton>}
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to create proposals.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading accounts" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

      <LedgerPanel>
      <form onSubmit={createProposal} className="space-y-5">
        {hasClearingSource ? (
          <LedgerSummaryBand>
            <p className="font-medium text-ink">Clearing variance source</p>
            <p className="mt-1">The API recomputes the variance amount and accounts from the current clearing report and inventory settings.</p>
            <LedgerMetadataRow
              items={[
                { label: "Purchase bill ID", value: purchaseBillId || "-" },
                { label: "Purchase receipt ID", value: purchaseReceiptId || "-" },
              ]}
            />
          </LedgerSummaryBand>
        ) : (
          <LedgerAlert tone="warning">
            Manual proposals require explicit debit and credit accounts. Use this only after accountant review.
          </LedgerAlert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Reason">
            <LedgerSelect name="reason" required defaultValue={initialReason}>
              {reasons.map((reason) => (
                <option key={reason} value={reason}>
                  {inventoryVarianceReasonLabel(reason)}
                </option>
              ))}
            </LedgerSelect>
          </Field>

          {!hasClearingSource ? (
            <>
              <Field label="Proposal date">
                <LedgerInput name="proposalDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label="Amount">
                <LedgerInput name="amount" required inputMode="decimal" placeholder="0.0000" />
              </Field>
              <Field label="Debit account">
                <AccountSelect name="debitAccountId" accounts={postingAccounts} />
              </Field>
              <Field label="Credit account">
                <AccountSelect name="creditAccountId" accounts={postingAccounts} />
              </Field>
            </>
          ) : null}

          <Field label="Description">
            <Textarea name="description" rows={3} />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <LedgerButton type="submit" variant="primary" disabled={!organizationId || saving}>
            {saving ? "Creating..." : "Create draft proposal"}
          </LedgerButton>
          <LedgerButton href="/inventory/variance-proposals">Cancel</LedgerButton>
        </div>
      </form>
      </LedgerPanel>
      </LedgerPageBody>
    </LedgerPage>
  );
}
function AccountSelect({ name, accounts }: { name: string; accounts: Account[] }) {
  return (
    <LedgerSelect name={name} required>
      <option value="">Select account</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.code} {account.name}
        </option>
      ))}
    </LedgerSelect>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      {children}
    </LedgerFieldLabel>
  );
}
