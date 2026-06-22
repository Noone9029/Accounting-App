"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatCard,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatMoneyAmount } from "@/lib/money";
import type { BankAccountSummary, BankReconciliation } from "@/lib/types";

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function NewBankReconciliationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [periodStart, setPeriodStart] = useState(todayInputValue(-30));
  const [periodEnd, setPeriodEnd] = useState(todayInputValue());
  const [statementOpeningBalance, setStatementOpeningBalance] = useState("");
  const [statementClosingBalance, setStatementClosingBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setProfile(result);
          setStatementClosingBalance((current) => current || result.ledgerBalance);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank account profile.");
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
  }, [organizationId, params.id]);

  async function submitReconciliation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!periodStart || !periodEnd || !statementClosingBalance) {
      setError("Period start, period end, and statement closing balance are required.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiRequest<BankReconciliation>(`/bank-accounts/${params.id}/reconciliations`, {
        method: "POST",
        body: {
          periodStart,
          periodEnd,
          statementClosingBalance,
          statementOpeningBalance: statementOpeningBalance || undefined,
          notes: notes || undefined,
        },
      });
      router.push(`/bank-reconciliations/${created.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create reconciliation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="New reconciliation"
        description={profile ? `${profile.displayName} statement close draft` : "Statement close draft"}
        actions={<LedgerButton href={`/bank-accounts/${params.id}/reconciliations`}>Back</LedgerButton>}
      />

      <LedgerSummaryBand tone="warning">
        Creating a draft does not lock the period. The period becomes immutable only after close succeeds with zero difference and no unmatched statement rows.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to create a reconciliation.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading bank account" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        <LedgerPanel>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-base font-semibold text-ink">Before you close a period</h2>
              <p className="mt-2 text-sm leading-6 text-steel">
                Create a draft after statement rows are imported and reviewed. The period is not locked yet; submit and close only after the difference is zero and no statement rows remain unmatched.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`}>Review unmatched rows</LedgerButton>
              <LedgerButton href={`/bank-accounts/${params.id}/statement-imports`}>Import statement</LedgerButton>
            </div>
          </div>
        </LedgerPanel>

        {profile ? (
          <LedgerMetricGrid className="md:grid-cols-3 xl:grid-cols-3">
            <LedgerStatCard label="Bank account" value={profile.displayName} />
            <LedgerStatCard label="Current ledger balance" value={<LedgerMoney>{formatMoneyAmount(profile.ledgerBalance, profile.currency)}</LedgerMoney>} />
            <LedgerStatCard label="Currency" value={profile.currency} />
          </LedgerMetricGrid>
        ) : null}

        <form onSubmit={submitReconciliation} className="space-y-5">
          <LedgerFormSection
            title="Statement period"
            description="Enter the statement period and balances for the manual reconciliation draft."
          >
            <LedgerFieldLabel>
              <LedgerFieldText>Period start</LedgerFieldText>
              <LedgerInput type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Period end</LedgerFieldText>
              <LedgerInput type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Statement opening balance</LedgerFieldText>
              <LedgerInput inputMode="decimal" value={statementOpeningBalance} onChange={(event) => setStatementOpeningBalance(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Statement closing balance</LedgerFieldText>
              <LedgerInput inputMode="decimal" value={statementClosingBalance} onChange={(event) => setStatementClosingBalance(event.target.value)} />
            </LedgerFieldLabel>
          </LedgerFormSection>

          <LedgerFormSection title="Notes" description="Optional reconciliation notes for accountant review.">
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Notes</LedgerFieldText>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
            </LedgerFieldLabel>
          </LedgerFormSection>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <LedgerButton href={`/bank-accounts/${params.id}/reconciliation`}>Review summary first</LedgerButton>
            <LedgerButton type="submit" disabled={submitting} variant="primary">
              {submitting ? "Creating..." : "Create draft"}
            </LedgerButton>
          </div>
        </form>
      </LedgerPageBody>
    </LedgerPage>
  );
}
