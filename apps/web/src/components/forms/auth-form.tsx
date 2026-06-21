"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LedgerButton, LedgerFieldHelp, LedgerFieldLabel, LedgerFieldText, LedgerInput } from "@/components/ui/ledger-system";
import { apiRequest, setAccessToken, setActiveOrganizationId } from "@/lib/api";
import type { AuthResponse, MeResponse } from "@/lib/types";

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("Submitting...");

    const formData = new FormData(event.currentTarget);
    const body =
      mode === "login"
        ? {
            email: String(formData.get("email")),
            password: String(formData.get("password")),
          }
        : {
            name: String(formData.get("name")),
            email: String(formData.get("email")),
            password: String(formData.get("password")),
          };

    try {
      const result = await apiRequest<AuthResponse>(`/auth/${mode}`, {
        method: "POST",
        auth: false,
        organizationId: null,
        body,
      });
      setAccessToken(result.accessToken);

      if (mode === "register") {
        setStatus("Account created. Set up an organization next.");
        router.push("/organization/setup");
        return;
      }

      const me = await apiRequest<MeResponse>("/auth/me", { organizationId: null });
      const firstMembership = me.memberships.find((membership) => membership.status === "ACTIVE");
      if (firstMembership) {
        setActiveOrganizationId(firstMembership.organization.id);
        router.push("/dashboard");
        return;
      }

      router.push("/organization/setup");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" ? (
        <LedgerFieldLabel>
          <LedgerFieldText>Name</LedgerFieldText>
          <LedgerInput name="name" required autoComplete="name" />
        </LedgerFieldLabel>
      ) : null}
      <LedgerFieldLabel>
        <LedgerFieldText>Email</LedgerFieldText>
        <LedgerInput name="email" type="email" required autoComplete="email" />
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Password</LedgerFieldText>
        <LedgerInput name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        <LedgerFieldHelp>{mode === "login" ? "Use your beta workspace credentials." : "Use at least 8 characters for beta access."}</LedgerFieldHelp>
      </LedgerFieldLabel>
      <LedgerButton type="submit" disabled={submitting} variant="primary" className="w-full">
        {submitting ? "Submitting..." : mode === "login" ? "Log in" : "Create account"}
      </LedgerButton>
      {status ? <p className="text-sm text-steel">{status}</p> : null}
    </form>
  );
}
