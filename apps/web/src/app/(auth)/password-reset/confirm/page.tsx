"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { AuthPageShell, AuthTextLink } from "@/components/auth/auth-page-shell";
import { LedgerAlert, LedgerButton, LedgerFieldHelp, LedgerFieldLabel, LedgerFieldText, LedgerInput } from "@/components/ui/ledger-system";
import { apiRequest } from "@/lib/api";
import { isValidAuthPassword } from "@/lib/email";

export default function PasswordResetConfirmPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<{ message: string }>("/auth/password-reset/confirm", {
        method: "POST",
        auth: false,
        organizationId: null,
        body: { token, password },
      });
      setMessage(result.message);
      setPassword("");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthPageShell
      title="Set new password"
      description="Complete your LedgerByte password reset."
      footer={
        <p>
          Back to{" "}
          <AuthTextLink href="/login">log in</AuthTextLink>
        </p>
      }
    >
      <div className="space-y-3">
        {!token ? <LedgerAlert tone="danger">Password reset token is missing.</LedgerAlert> : null}
        {message ? <LedgerAlert tone="success">{message}</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <LedgerFieldLabel>
          <LedgerFieldText>New password</LedgerFieldText>
          <LedgerInput required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          <LedgerFieldHelp>Use at least 8 characters.</LedgerFieldHelp>
        </LedgerFieldLabel>
        <LedgerButton type="submit" disabled={!token || !isValidAuthPassword(password) || saving} variant="primary" icon={KeyRound} className="w-full">
          {saving ? "Saving..." : "Reset password"}
        </LedgerButton>
      </form>
    </AuthPageShell>
  );
}
