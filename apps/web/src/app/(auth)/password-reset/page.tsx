"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusMessage } from "@/components/common/status-message";
import { apiRequest } from "@/lib/api";

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
      setMessage(result.message);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to request password reset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="text-xl font-semibold text-ink">Reset password</h1>
        <p className="mt-1 text-sm text-steel">Request a mock/local password reset email.</p>
        <div className="mt-5 space-y-3">
          {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
          <StatusMessage type="info">Real email delivery is not configured yet.</StatusMessage>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-ink">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <button type="submit" disabled={saving} className="w-full rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Sending..." : "Send reset instructions"}
          </button>
        </form>
        <p className="mt-4 text-sm text-steel">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-palm">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
