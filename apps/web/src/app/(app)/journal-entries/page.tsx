"use client";

import Link from "next/link";
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
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { JournalEntry } from "@/lib/types";

export default function JournalEntriesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateJournal = can(PERMISSIONS.journals.create);
  const canPostJournal = can(PERMISSIONS.journals.post);
  const canReverseJournal = can(PERMISSIONS.journals.reverse);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<JournalEntry[]>("/journal-entries")
      .then((result) => {
        if (!cancelled) {
          setEntries(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load journal entries.");
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

  async function runAction(entry: JournalEntry, action: "post" | "reverse") {
    setActionId(entry.id);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<JournalEntry>(`/journal-entries/${entry.id}/${action}`, { method: "POST" });
      setSuccess(action === "post" ? `Posted journal ${updated.entryNumber}.` : `Created reversal journal ${updated.entryNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} journal.`);
    } finally {
      setActionId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Accounting"
        title="Manual journals"
        description="Live draft, posted, and reversed manual journals from the ledger API."
        actions={canCreateJournal ? <LedgerButton href="/journal-entries/new" variant="primary">Create journal</LedgerButton> : null}
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load journals.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading journal entries" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && entries.length === 0 ? <LedgerEmptyState title="No manual journals found." /> : null}

        {entries.length > 0 ? (
          <LedgerDataTable minWidth="980px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Debit</th>
                <th className="px-4 py-3">Credit</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-mono text-xs">{entry.entryNumber}</td>
                  <td className="px-4 py-3"><LedgerDate>{new Date(entry.entryDate).toLocaleDateString()}</LedgerDate></td>
                  <td className="px-4 py-3 font-medium text-ink">{entry.description}</td>
                  <td className="px-4 py-3"><LedgerStatusBadge tone={journalStatusTone(entry.status)}>{entry.status}</LedgerStatusBadge></td>
                  <td className="px-4 py-3"><LedgerMoney>{entry.totalDebit}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{entry.totalCredit}</LedgerMoney></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {entry.status === "DRAFT" && canPostJournal ? (
                        <LedgerButton type="button" size="sm" onClick={() => void runAction(entry, "post")} disabled={actionId === entry.id}>
                          Post
                        </LedgerButton>
                      ) : null}
                      {entry.status === "POSTED" && canReverseJournal ? (
                        <LedgerButton type="button" size="sm" variant="danger" onClick={() => void runAction(entry, "reverse")} disabled={actionId === entry.id}>
                          Reverse
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

function journalStatusTone(status: JournalEntry["status"]) {
  if (status === "POSTED") return "success";
  if (status === "DRAFT") return "draft";
  if (status === "REVERSED") return "warning";
  return "neutral";
}
