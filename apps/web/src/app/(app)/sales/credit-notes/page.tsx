"use client";

import { CheckCircle2, Eye, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerToolbar,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { creditNoteStatusLabel } from "@/lib/credit-notes";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { CreditNote, CreditNoteStatus } from "@/lib/types";

type StatusFilter = "ALL" | CreditNoteStatus;

function creditNoteStatusTone(status: CreditNoteStatus): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "FINALIZED":
      return "success";
    case "VOIDED":
      return "danger";
    default:
      return "neutral";
  }
}

export default function CreditNotesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const canCreateCreditNote = can(PERMISSIONS.creditNotes.create);
  const canFinalizeCreditNote = can(PERMISSIONS.creditNotes.finalize);

  const filteredCreditNotes = useMemo(() => {
    const normalizedSearch = customerSearch.trim().toLowerCase();
    return creditNotes.filter((creditNote) => {
      const statusMatches = statusFilter === "ALL" || creditNote.status === statusFilter;
      const customerName = creditNote.customer?.displayName ?? creditNote.customer?.name ?? "";
      const customerMatches = !normalizedSearch || customerName.toLowerCase().includes(normalizedSearch);
      return statusMatches && customerMatches;
    });
  }, [creditNotes, customerSearch, statusFilter]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CreditNote[]>("/credit-notes")
      .then((result) => {
        if (!cancelled) {
          setCreditNotes(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load credit notes.");
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

  async function finalizeCreditNote(creditNote: CreditNote) {
    setActionId(creditNote.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<CreditNote>(`/credit-notes/${creditNote.id}/finalize`, { method: "POST" });
      setSuccess(`Finalized credit note ${finalized.creditNoteNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to finalize credit note.");
    } finally {
      setActionId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Sales credit notes"
        description="Customer credit notes, revenue reversal posting, and PDF downloads."
        actions={
          canCreateCreditNote ? (
            <LedgerButton href="/sales/credit-notes/new" variant="primary" icon={Plus}>
              Create credit note
            </LedgerButton>
          ) : null
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <StatusMessage type="info">Log in and select an organization to load credit notes.</StatusMessage> : null}
          {loading ? <StatusMessage type="loading">Loading credit notes...</StatusMessage> : null}
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
          {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        </div>

        {!loading && organizationId && creditNotes.length === 0 ? (
          <LedgerEmptyState
            title="No credit notes found"
            description="Create a draft customer credit note when revenue needs to be reversed or credited."
            action={
              canCreateCreditNote ? (
                <LedgerButton href="/sales/credit-notes/new" variant="primary" icon={Plus}>
                  Create credit note
                </LedgerButton>
              ) : null
            }
          />
        ) : null}

        {creditNotes.length > 0 ? (
          <LedgerToolbar
            title="Filter credit notes"
            description={`${filteredCreditNotes.length} of ${creditNotes.length} credit notes shown.`}
          >
            <LedgerFilterBar>
              <LedgerFieldLabel>
                <LedgerFieldText>Status</LedgerFieldText>
                <LedgerSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  <option value="ALL">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="FINALIZED">Finalized</option>
                  <option value="VOIDED">Voided</option>
                </LedgerSelect>
              </LedgerFieldLabel>
              <LedgerFieldLabel className="min-w-64">
                <LedgerFieldText>Customer</LedgerFieldText>
                <LedgerInput value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" />
              </LedgerFieldLabel>
            </LedgerFilterBar>
          </LedgerToolbar>
        ) : null}

        {creditNotes.length > 0 && filteredCreditNotes.length === 0 ? (
          <LedgerEmptyState title="No credit notes match the current filters" description="Adjust the status or customer filter to review other credit notes." />
        ) : null}

        {filteredCreditNotes.length > 0 ? (
          <LedgerDataTable minWidth="1080px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Original invoice</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Unapplied</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCreditNotes.map((creditNote) => (
                <tr key={creditNote.id}>
                  <td className="px-4 py-3 font-mono text-xs">{creditNote.creditNoteNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{creditNote.customer?.displayName ?? creditNote.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerDate>{new Date(creditNote.issueDate).toLocaleDateString()}</LedgerDate>
                  </td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={creditNoteStatusTone(creditNote.status)}>{creditNoteStatusLabel(creditNote.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{creditNote.originalInvoice?.invoiceNumber ?? "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerMoney>{formatMoneyAmount(creditNote.total, creditNote.currency)}</LedgerMoney>
                  </td>
                  <td className="px-4 py-3">
                    <LedgerMoney>{formatMoneyAmount(creditNote.unappliedAmount, creditNote.currency)}</LedgerMoney>
                  </td>
                  <td className="px-4 py-3 text-steel">{creditNote.journalEntry ? creditNote.journalEntry.status : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <LedgerButton href={`/sales/credit-notes/${creditNote.id}`} size="sm" icon={Eye}>
                        View
                      </LedgerButton>
                      {creditNote.status === "DRAFT" && canFinalizeCreditNote ? (
                        <LedgerButton type="button" onClick={() => void finalizeCreditNote(creditNote)} disabled={actionId === creditNote.id} size="sm" variant="primary" icon={CheckCircle2}>
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
