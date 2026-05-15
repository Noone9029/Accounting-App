"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusMessage } from "@/components/common/status-message";
import { apiRequest, setAccessToken, setActiveOrganizationId } from "@/lib/api";
import { isValidAuthPassword } from "@/lib/email";
import type { AuthResponse, InvitationPreviewResponse } from "@/lib/types";

export default function InviteAcceptPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<InvitationPreviewResponse | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const nextToken = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(nextToken);
    if (!nextToken) {
      setError("Invitation token is missing.");
      setLoading(false);
      return;
    }

    apiRequest<InvitationPreviewResponse>(`/auth/invitations/${encodeURIComponent(nextToken)}/preview`, { auth: false, organizationId: null })
      .then((result) => {
        setPreview(result);
        if (result.email) {
          setName(result.email.split("@")[0] ?? "");
        }
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load invitation."))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await apiRequest<AuthResponse>(`/auth/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        auth: false,
        organizationId: null,
        body: { name: name || undefined, password },
      });
      setAccessToken(response.accessToken);
      if (response.organization?.id) {
        setActiveOrganizationId(response.organization.id);
      }
      router.push("/dashboard");
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to accept invitation.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = Boolean(preview?.valid && isValidAuthPassword(password));

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="text-xl font-semibold text-ink">Accept invitation</h1>
        <p className="mt-1 text-sm text-steel">Set your LedgerByte password to join the workspace.</p>
        <div className="mt-5 space-y-3">
          {loading ? <StatusMessage type="loading">Loading invitation...</StatusMessage> : null}
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
          {preview && !preview.valid ? <StatusMessage type="error">This invitation is invalid, expired, or already used.</StatusMessage> : null}
          {preview?.valid ? (
            <StatusMessage type="info">
              Joining {preview.organization?.name ?? "the organization"} as {preview.role?.name ?? "a member"}.
            </StatusMessage>
          ) : null}
        </div>

        {preview?.valid ? (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-ink">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink">Password</span>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="w-full rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Accepting..." : "Accept invitation"}
            </button>
          </form>
        ) : null}

        <p className="mt-4 text-sm text-steel">
          Already have access?{" "}
          <Link href="/login" className="font-medium text-palm">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
