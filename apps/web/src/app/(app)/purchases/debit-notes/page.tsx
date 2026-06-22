"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import { purchaseDebitNoteStatusLabel } from "@/lib/purchase-debit-notes";
import type { PurchaseDebitNote, PurchaseDebitNoteStatus } from "@/lib/types";

export default function PurchaseDebitNotesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [debitNotes, setDebitNotes] = useState<PurchaseDebitNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateDebitNote = can(PERMISSIONS.purchaseDebitNotes.create);
  const canFinalizeDebitNote = can(PERMISSIONS.purchaseDebitNotes.finalize);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseDebitNote[]>("/purchase-debit-notes")
      .then((result) => {
        if (!cancelled) {
          setDebitNotes(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load debit notes.");
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
  }, [organizationId, reloadToken]);

  async function finalizeDebitNote(debitNote: PurchaseDebitNote) {
    setActionId(debitNote.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${debitNote.id}/finalize`, { method: "POST" });
      setSuccess(`Finalized debit note ${finalized.debitNoteNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to finalize debit note.");
    } finally {
      setActionId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases / AP adjustments"
        title="Debit notes"
        description="Supplier credits, purchase returns, and AP adjustment tracking."
        actions={
          canCreateDebitNote ? (
            <LedgerButton href="/purchases/debit-notes/new" variant="primary">
              Create debit note
            </LedgerButton>
          ) : null
        }
      />

      <LedgerSummaryBand tone="info">
        Debit notes stay in the existing AP adjustment workflow. This page does not send payment, approve a provider workflow, or change
        supplier balance math outside explicit debit-note actions.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load debit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading debit notes...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && debitNotes.length === 0 ? (
          <LedgerEmptyState
            title="No purchase debit notes found"
            description="Create a debit note only when a supplier credit, purchase return, or AP adjustment is ready for review."
            action={
              canCreateDebitNote ? (
                <LedgerButton href="/purchases/debit-notes/new" variant="primary">
                  Create debit note
                </LedgerButton>
              ) : null
            }
          />
        ) : null}

        {debitNotes.length > 0 ? (
          <LedgerDataTable minWidth="1080px">
            <thead className="ledger-table-header">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Issue date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Unapplied</th>
                <th className="px-4 py-3">Original bill</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debitNotes.map((debitNote) => (
                <tr key={debitNote.id}>
                  <td className="px-4 py-3 font-mono text-xs">{debitNote.debitNoteNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{debitNote.supplier?.displayName ?? debitNote.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerDate>{formatOptionalDate(debitNote.issueDate, "-")}</LedgerDate>
                  </td>
                  <td className="px-4 py-3">
                    <DebitNoteStatusPill status={debitNote.status} />
                  </td>
                  <td className="px-4 py-3">
                    <LedgerMoney>{formatMoneyAmount(debitNote.total, debitNote.currency)}</LedgerMoney>
                  </td>
                  <td className="px-4 py-3">
                    <LedgerMoney>{formatMoneyAmount(debitNote.unappliedAmount, debitNote.currency)}</LedgerMoney>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{debitNote.originalBill?.billNumber ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <LedgerButton href={`/purchases/debit-notes/${debitNote.id}`} size="sm">
                        View
                      </LedgerButton>
                      {debitNote.status === "DRAFT" && canFinalizeDebitNote ? (
                        <LedgerButton size="sm" onClick={() => void finalizeDebitNote(debitNote)} disabled={actionId === debitNote.id}>
                          Finalize
                        </LedgerButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function DebitNoteStatusPill({ status }: Readonly<{ status: PurchaseDebitNoteStatus }>) {
  const tone: LedgerStatusTone = status === "FINALIZED" ? "success" : status === "VOIDED" ? "danger" : status === "DRAFT" ? "draft" : "info";
  return <LedgerStatusBadge tone={tone}>{purchaseDebitNoteStatusLabel(status)}</LedgerStatusBadge>;
}
