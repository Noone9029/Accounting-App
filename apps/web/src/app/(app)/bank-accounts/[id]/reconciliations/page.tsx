"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankReconciliationStatusLabel } from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankReconciliation } from "@/lib/types";

function reconciliationStatusTone(status: BankReconciliation["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "warning";
    case "PENDING_APPROVAL":
      return "info";
    case "APPROVED":
      return "neutral";
    case "CLOSED":
      return "success";
    case "VOIDED":
      return "danger";
  }
}

export default function BankReconciliationsPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.bankReconciliations.create);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`),
      apiRequest<BankReconciliation[]>(`/bank-accounts/${params.id}/reconciliations`),
    ])
      .then(([profileResult, reconciliationsResult]) => {
        if (!cancelled) {
          setProfile(profileResult);
          setReconciliations(reconciliationsResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load reconciliations.");
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

  const currency = profile?.currency ?? "SAR";

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="Bank reconciliations"
        description={profile ? `${profile.displayName} closed-period review history` : "Closed-period review history"}
        actions={
          <>
            {canCreate ? <LedgerButton href={`/bank-accounts/${params.id}/reconciliations/new`} variant="primary">New reconciliation</LedgerButton> : null}
            <LedgerButton href={`/bank-accounts/${params.id}/reconciliation`}>Summary</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}`}>Back</LedgerButton>
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        Reconciliations document manual agreement between imported statement rows and the posted bank ledger. Closing locks the statement period; voiding unlocks it without deleting the audit trail.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load reconciliations.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading reconciliations" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        <LedgerPanel>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-base font-semibold text-ink">Closed-period history</h2>
              <p className="mt-2 text-sm leading-6 text-steel">
                Reconciliations document when the imported statement rows and posted bank ledger agree. Closing a reconciliation locks the statement transaction period, while voiding the reconciliation unlocks it without deleting the audit trail.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LedgerButton href={`/bank-accounts/${params.id}/reconciliation`}>Reconciliation summary</LedgerButton>
              <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`}>Unmatched rows</LedgerButton>
            </div>
          </div>
        </LedgerPanel>

        <LedgerSection title="Reconciliation history" description="Closed, draft, and voided reconciliation records for this bank account.">
          <LedgerDataTable minWidth="1040px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Statement closing</th>
                <th className="px-4 py-3 text-right">Ledger closing</th>
                <th className="px-4 py-3 text-right">Difference</th>
                <th className="px-4 py-3">Closed</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reconciliations.map((reconciliation) => (
                <tr key={reconciliation.id}>
                  <td className="px-4 py-3 font-medium text-ink">{reconciliation.reconciliationNumber}</td>
                  <td className="px-4 py-3">
                    <LedgerDate>{formatOptionalDate(reconciliation.periodStart, "-")} to {formatOptionalDate(reconciliation.periodEnd, "-")}</LedgerDate>
                  </td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={reconciliationStatusTone(reconciliation.status)}>
                      {bankReconciliationStatusLabel(reconciliation.status)}
                    </LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(reconciliation.statementClosingBalance, currency)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(reconciliation.ledgerClosingBalance, currency)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(reconciliation.difference, currency)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(reconciliation.closedAt, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{reconciliation._count?.items ?? 0}</td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/bank-reconciliations/${reconciliation.id}`} size="sm">View</LedgerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
          {!loading && reconciliations.length === 0 ? (
            <div className="mt-4">
              <LedgerEmptyState
                title="No reconciliations found for this bank account."
                description="Import statement rows, review unmatched activity, then create a reconciliation draft when the ledger and statement are ready to close."
              />
            </div>
          ) : null}
        </LedgerSection>
      </LedgerPageBody>
    </LedgerPage>
  );
}
