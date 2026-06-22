"use client";

import { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthPageShell, AuthTextLink } from "@/components/auth/auth-page-shell";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
} from "@/components/ui/ledger-system";
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
    <AuthPageShell
      title="Accept invitation"
      description="Set your LedgerByte password to join the workspace."
      footer={
        <p>
          Already have access? <AuthTextLink href="/login">Log in</AuthTextLink>
        </p>
      }
    >
      <div className="space-y-3">
        {loading ? <LedgerAlert tone="info">Loading invitation...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {preview && !preview.valid ? <LedgerAlert tone="danger">This invitation is invalid, expired, or already used.</LedgerAlert> : null}
        {preview?.valid ? (
          <LedgerAlert tone="info">
            Joining {preview.organization?.name ?? "the organization"} as {preview.role?.name ?? "a member"}.
          </LedgerAlert>
        ) : null}
      </div>

      {preview?.valid ? (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <LedgerFieldLabel>
            <LedgerFieldText>Name</LedgerFieldText>
            <LedgerInput value={name} onChange={(event) => setName(event.target.value)} />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Password</LedgerFieldText>
            <LedgerInput required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
            <LedgerFieldHelp>Use at least 8 characters for beta workspace access.</LedgerFieldHelp>
          </LedgerFieldLabel>
          <LedgerButton type="submit" disabled={!canSubmit || saving} variant="primary" icon={UserCheck} className="w-full">
            {saving ? "Accepting..." : "Accept invitation"}
          </LedgerButton>
        </form>
      ) : null}
    </AuthPageShell>
  );
}
