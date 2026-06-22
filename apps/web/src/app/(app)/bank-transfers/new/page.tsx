"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
} from "@/components/ui/ledger-system";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel, validateBankTransferInput } from "@/lib/bank-accounts";
import type { BankAccountSummary, BankTransfer } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewBankTransferPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [profiles, setProfiles] = useState<BankAccountSummary[]>([]);
  const [fromBankAccountProfileId, setFromBankAccountProfileId] = useState("");
  const [toBankAccountProfileId, setToBankAccountProfileId] = useState("");
  const [transferDate, setTransferDate] = useState(todayInputValue());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeProfiles = useMemo(() => profiles.filter((profile) => profile.status === "ACTIVE"), [profiles]);
  const sourceProfile = activeProfiles.find((profile) => profile.id === fromBankAccountProfileId);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankAccountSummary[]>("/bank-accounts")
      .then((result) => {
        if (cancelled) {
          return;
        }
        const active = result.filter((profile) => profile.status === "ACTIVE");
        setProfiles(result);
        setFromBankAccountProfileId((current) => current || active[0]?.id || "");
        setToBankAccountProfileId((current) => current || active.find((profile) => profile.id !== active[0]?.id)?.id || "");
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank accounts.");
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateBankTransferInput({ fromBankAccountProfileId, toBankAccountProfileId, amount });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const transfer = await apiRequest<BankTransfer>("/bank-transfers", {
        method: "POST",
        body: {
          fromBankAccountProfileId,
          toBankAccountProfileId,
          transferDate: `${transferDate}T00:00:00.000Z`,
          amount,
          currency: sourceProfile?.currency,
          description: description || undefined,
        },
      });
      router.push(`/bank-transfers/${transfer.id}?created=1`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create bank transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="New bank transfer"
        description="Post a balanced journal between two active cash or bank profiles."
        actions={<LedgerButton href="/bank-transfers">Back</LedgerButton>}
      />

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create bank transfers.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank accounts...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && activeProfiles.length < 2 ? <StatusMessage type="empty">At least two active bank account profiles are required.</StatusMessage> : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <LedgerPanel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LedgerFieldLabel>
              <LedgerFieldText>From</LedgerFieldText>
              <LedgerSelect value={fromBankAccountProfileId} onChange={(event) => setFromBankAccountProfileId(event.target.value)} required>
                <option value="">Select source</option>
                {activeProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {bankAccountOptionLabel(profile.account, profiles)}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>To</LedgerFieldText>
              <LedgerSelect value={toBankAccountProfileId} onChange={(event) => setToBankAccountProfileId(event.target.value)} required>
                <option value="">Select destination</option>
                {activeProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {bankAccountOptionLabel(profile.account, profiles)}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Transfer date</LedgerFieldText>
              <LedgerInput type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} required />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Amount</LedgerFieldText>
              <LedgerInput inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Description</LedgerFieldText>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
            </LedgerFieldLabel>
          </div>
          </LedgerPanel>

        <LedgerAlert tone="info">
          Transfers post a balanced accounting journal immediately: the source bank or cash account decreases and the destination account increases. Use statement matching later to reconcile imported bank rows against the posted movement.
        </LedgerAlert>

        <LedgerActionBar className="justify-end">
          <LedgerButton href="/bank-transfers">Cancel</LedgerButton>
          <LedgerButton type="submit" disabled={submitting || !organizationId || activeProfiles.length < 2} variant="primary">
            {submitting ? "Posting..." : "Post transfer"}
          </LedgerButton>
        </LedgerActionBar>
        </form>
      </LedgerPageBody>
    </LedgerPage>
  );
}
