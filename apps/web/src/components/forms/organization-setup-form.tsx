"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerSelect,
} from "@/components/ui/ledger-system";
import { apiRequest, setActiveOrganizationId } from "@/lib/api";
import type { MeResponse, Organization } from "@/lib/types";

export function OrganizationSetupForm() {
  const router = useRouter();
  const { reload } = usePermissions();
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<MeResponse & { emailVerifiedAt?: string | null }>("/auth/me", { organizationId: null }).then((me) => {
      if (!me.emailVerifiedAt) { router.replace("/verify-email"); return; }
      const existing = me.memberships.find((member) => member.status === "ACTIVE");
      if (existing) { setActiveOrganizationId(existing.organization.id); reload(); router.replace("/plans"); return; }
      setLoading(false);
    }).catch((error: unknown) => { setStatus(error instanceof Error ? error.message : "Unable to resume setup."); });
  }, [reload, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      // Resume safely if a prior create response was lost before navigation.
      const me = await apiRequest<MeResponse>("/auth/me", { organizationId: null });
      const existing = me.memberships.find((member) => member.status === "ACTIVE");
      if (existing) { setActiveOrganizationId(existing.organization.id); reload(); router.push("/plans"); return; }
      const organization = await apiRequest<Organization>("/organizations", {
        method: "POST",
        organizationId: null,
        body: {
          name: String(formData.get("name")),
          legalName: String(formData.get("legalName") || ""),
          taxNumber: String(formData.get("taxNumber") || ""),
          countryCode: String(formData.get("countryCode") || "SA"),
          baseCurrency: String(formData.get("baseCurrency") || "SAR"),
          timezone: String(formData.get("timezone") || "Asia/Riyadh"),
        },
      });
      setActiveOrganizationId(organization.id);
      reload();
      setStatus(`Organization ready: ${organization.name}`);
      router.push("/plans");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Organization setup failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <LedgerFieldLabel>
        <LedgerFieldText>Organization name</LedgerFieldText>
        <LedgerInput name="name" required />
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Legal name</LedgerFieldText>
        <LedgerInput name="legalName" />
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>VAT number</LedgerFieldText>
        <LedgerInput name="taxNumber" />
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Country</LedgerFieldText>
        <LedgerSelect name="countryCode" defaultValue="SA">
          <option value="AE">United Arab Emirates</option>
          <option value="SA">Saudi Arabia</option>
          <option value="BH">Bahrain</option>
          <option value="KW">Kuwait</option>
          <option value="OM">Oman</option>
          <option value="QA">Qatar</option>
        </LedgerSelect>
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Base currency</LedgerFieldText>
        <LedgerInput name="baseCurrency" defaultValue="SAR" />
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Timezone</LedgerFieldText>
        <LedgerInput name="timezone" defaultValue="Asia/Riyadh" />
      </LedgerFieldLabel>
      <div className="space-y-3 md:col-span-2">
        <LedgerButton type="submit" disabled={submitting || loading} variant="primary" icon={Building2}>
          {submitting ? "Creating..." : "Create organization"}
        </LedgerButton>
        {status ? <LedgerAlert tone={status.startsWith("Organization ready") ? "success" : "warning"}>{status}</LedgerAlert> : null}
      </div>
    </form>
  );
}
