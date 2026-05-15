"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { emailStatusClass, emailStatusLabel, emailTemplateLabel } from "@/lib/email";
import type { EmailOutboxDetail, EmailOutboxEntry } from "@/lib/types";

export default function EmailOutboxPage() {
  const organizationId = useActiveOrganizationId();
  const [emails, setEmails] = useState<EmailOutboxEntry[]>([]);
  const [selected, setSelected] = useState<EmailOutboxDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    setLoading(true);
    setError("");
    apiRequest<EmailOutboxEntry[]>("/email/outbox")
      .then(setEmails)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load email outbox."))
      .finally(() => setLoading(false));
  }, [organizationId]);

  async function openDetail(id: string) {
    setError("");
    try {
      setSelected(await apiRequest<EmailOutboxDetail>(`/email/outbox/${id}`));
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Unable to load email detail.");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Email outbox</h1>
        <p className="mt-1 text-sm text-steel">Mock/local invite and password reset email records.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to review email outbox records.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading email outbox...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        <StatusMessage type="info">Real SMTP/API delivery is not configured yet. Mock messages are stored for local inspection.</StatusMessage>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_1fr_110px_150px] border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
            <div>To</div>
            <div>Template</div>
            <div>Status</div>
            <div>Created</div>
          </div>
          {emails.map((email) => (
            <button
              key={email.id}
              type="button"
              onClick={() => void openDetail(email.id)}
              className="grid w-full grid-cols-[1fr_1fr_110px_150px] items-center border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50"
            >
              <span className="truncate text-ink">{email.toEmail}</span>
              <span className="text-steel">{emailTemplateLabel(email.templateType)}</span>
              <span>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${emailStatusClass(email.status)}`}>{emailStatusLabel(email.status)}</span>
              </span>
              <span className="text-xs text-steel">{formatDate(email.createdAt)}</span>
            </button>
          ))}
          {!loading && emails.length === 0 ? <div className="px-4 py-6 text-sm text-steel">No email records found.</div> : null}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-ink">{selected.subject}</h2>
                <p className="mt-1 text-sm text-steel">{selected.toEmail}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Template" value={emailTemplateLabel(selected.templateType)} />
                <Detail label="Status" value={emailStatusLabel(selected.status)} />
                <Detail label="Provider" value={selected.provider} />
                <Detail label="Sent" value={selected.sentAt ? formatDate(selected.sentAt) : "-"} />
              </div>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-ink">{selected.bodyText}</pre>
            </div>
          ) : (
            <StatusMessage type="empty">Select an email to inspect the mock message body.</StatusMessage>
          )}
        </section>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
