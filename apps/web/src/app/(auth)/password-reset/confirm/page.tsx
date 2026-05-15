"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusMessage } from "@/components/common/status-message";
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="text-xl font-semibold text-ink">Set new password</h1>
        <p className="mt-1 text-sm text-steel">Complete your LedgerByte password reset.</p>
        <div className="mt-5 space-y-3">
          {!token ? <StatusMessage type="error">Password reset token is missing.</StatusMessage> : null}
          {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-ink">New password</span>
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
            disabled={!token || !isValidAuthPassword(password) || saving}
            className="w-full rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Reset password"}
          </button>
        </form>
        <p className="mt-4 text-sm text-steel">
          Back to{" "}
          <Link href="/login" className="font-medium text-palm">
            log in
          </Link>
        </p>
      </section>
    </main>
  );
}
