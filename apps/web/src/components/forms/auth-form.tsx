"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input name="name" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
      ) : null}
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input name="email" type="email" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
      </label>
      <button type="submit" disabled={submitting} className="w-full rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
        {submitting ? "Submitting..." : mode === "login" ? "Log in" : "Create account"}
      </button>
      {status ? <p className="text-sm text-steel">{status}</p> : null}
    </form>
  );
}
