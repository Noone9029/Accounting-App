"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LedgerButton } from "@/components/ui-ledger";
import { apiRequest } from "@/lib/api";

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("Verify your email to continue. Request a link, then open it from your inbox.");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setToken(query.get("token") ?? "");
    if (query.has("token")) window.history.replaceState({}, "", "/verify-email");
  }, []);
  async function submit(confirm: boolean) {
    setBusy(true);
    try {
      const result = await apiRequest<{ verified: boolean; message: string }>(`/auth/email-verification/${confirm ? "confirm" : "request"}`, { method: "POST", organizationId: null, ...(confirm ? { auth: false, body: { token } } : {}) });
      setVerified(result.verified); setMessage(result.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verification failed."); }
    finally { setBusy(false); }
  }
  return <AuthPageShell title="Verify your email" description="Your trial begins after you verify and choose your organization plan." footer={<Link href="/login">Return to login</Link>}>
    <p role="status" className="mb-4 text-sm text-steel">{message}</p>
    {verified ? <Link href="/organization/setup" className="font-semibold text-palm">Continue to organization setup</Link> : <LedgerButton variant="primary" disabled={busy} onClick={() => void submit(Boolean(token))}>{busy ? "Working..." : token ? "Verify email" : "Send verification link"}</LedgerButton>}
  </AuthPageShell>;
}
