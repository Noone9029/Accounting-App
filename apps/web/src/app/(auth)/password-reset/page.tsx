"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { AuthPageShell, AuthTextLink } from "@/components/auth/auth-page-shell";
import { LedgerAlert, LedgerButton, LedgerFieldLabel, LedgerFieldText, LedgerInput } from "@/components/ui/ledger-system";
import { apiRequest } from "@/lib/api";
import { passwordResetGenericMessage } from "@/lib/email";

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<{ message: string }>("/auth/password-reset/request", {
        method: "POST",
        auth: false,
        organizationId: null,
        body: { email },
      });
      setMessage(result.message || passwordResetGenericMessage());
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to request password reset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthPageShell
      title="Reset password"
      description="Request a mock/local password reset email."
      footer={
        <p>
          Remembered it?{" "}
          <AuthTextLink href="/login">Log in</AuthTextLink>
        </p>
      }
    >
      <div className="space-y-3">
        {message ? <LedgerAlert tone="success">{message}</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        <LedgerAlert tone="info">Real email delivery is not configured yet.</LedgerAlert>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <LedgerFieldLabel>
          <LedgerFieldText>Email</LedgerFieldText>
          <LedgerInput required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerButton type="submit" disabled={saving} variant="primary" icon={Mail} className="w-full">
          {saving ? "Sending..." : "Send reset instructions"}
        </LedgerButton>
      </form>
    </AuthPageShell>
  );
}
