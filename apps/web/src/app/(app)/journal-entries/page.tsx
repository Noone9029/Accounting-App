"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
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
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Manual journals</h1>
          <p className="mt-1 text-sm text-steel">Live draft, posted, and reversed manual journals from the ledger API.</p>
        </div>
        {canCreateJournal ? (
          <Link href="/journal-entries/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Create journal
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load journals.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading journal entries...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && entries.length === 0 ? <StatusMessage type="empty">No manual journals found.</StatusMessage> : null}
      </div>

      {entries.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full text-left text-sm">
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
                  <td className="px-4 py-3 text-steel">{new Date(entry.entryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-ink">{entry.description}</td>
                  <td className="px-4 py-3 text-steel">{entry.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.totalDebit}</td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.totalCredit}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {entry.status === "DRAFT" && canPostJournal ? (
                        <button type="button" onClick={() => void runAction(entry, "post")} disabled={actionId === entry.id} className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          Post
                        </button>
                      ) : null}
                      {entry.status === "POSTED" && canReverseJournal ? (
                        <button type="button" onClick={() => void runAction(entry, "reverse")} disabled={actionId === entry.id} className="rounded-md border border-amber px-2 py-1 text-xs font-medium text-amber hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          Reverse
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
