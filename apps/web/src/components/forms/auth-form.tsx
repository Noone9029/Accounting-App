"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { FieldHelp, FieldLabel, FieldText, LedgerButton, LedgerInput } from "@/components/ui-ledger";
import { apiRequest, setActiveOrganizationId } from "@/lib/api";
import type { AuthResponse, MeResponse } from "@/lib/types";

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [signupOpen, setSignupOpen] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode === "register") apiRequest<{ selfServiceEnabled: boolean }>("/billing/catalog", { auth: false, organizationId: null }).then((catalog) => setSignupOpen(catalog.selfServiceEnabled)).catch(() => setSignupOpen(false));
  }, [mode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "register" && !signupOpen) return;
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
      await apiRequest<AuthResponse>(`/auth/${mode}`, {
        method: "POST",
        auth: false,
        organizationId: null,
        body,
      });

      if (mode === "register") {
        setStatus("Account created. Verify your email to start your trial.");
        router.push("/verify-email");
        return;
      }

      const me = await apiRequest<MeResponse & { emailVerifiedAt?: string | null }>("/auth/me", { organizationId: null });
      const firstMembership = me.memberships.find((membership) => membership.status === "ACTIVE");
      if (firstMembership) {
        setActiveOrganizationId(firstMembership.organization.id);
        if (!hasPermission(firstMembership, PERMISSIONS.billing.view)) { router.push("/dashboard"); return; }
        const billing = await apiRequest<{ subscription: unknown | null; access: { enforcementMode: string } }>("/billing/status");
        router.push(billing.subscription || billing.access.enforcementMode !== "ENFORCE" ? "/dashboard" : me.emailVerifiedAt ? "/plans" : "/verify-email");
        return;
      }

      router.push(me.emailVerifiedAt ? "/organization/setup" : "/verify-email");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" ? (
        <FieldLabel>
          <FieldText>Name</FieldText>
          <LedgerInput name="name" required autoComplete="name" />
        </FieldLabel>
      ) : null}
      <FieldLabel>
        <FieldText>Email</FieldText>
        <LedgerInput name="email" type="email" required autoComplete="email" />
      </FieldLabel>
      <FieldLabel>
        <FieldText>Password</FieldText>
        <LedgerInput name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        <FieldHelp>{mode === "login" ? "Use your workspace credentials." : "Use at least 8 characters. Verify your email before starting a trial."}</FieldHelp>
      </FieldLabel>
      {mode === "register" && signupOpen === false ? <p role="status" className="text-sm text-steel">Self-service enrollment is not open in this environment.</p> : null}
      <LedgerButton type="submit" disabled={submitting || (mode === "register" && signupOpen !== true)} variant="primary" className="w-full">
        {submitting ? "Submitting..." : mode === "login" ? "Log in" : "Create account"}
      </LedgerButton>
      {status ? <p className="text-sm text-steel">{status}</p> : null}
    </form>
  );
}
