"use client";

import { FormEvent, useState } from "react";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerSelect,
} from "@/components/ui/ledger-system";
import { apiRequest, setActiveOrganizationId } from "@/lib/api";
import type { Organization } from "@/lib/types";

export function OrganizationSetupForm() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const organization = await apiRequest<Organization>("/organizations", {
        method: "POST",
        organizationId: null,
        body: {
          name: String(formData.get("name")),
          legalName: String(formData.get("legalName") || ""),
          taxNumber: String(formData.get("taxNumber") || ""),
          countryCode: String(formData.get("countryCode") || "AE"),
          baseCurrency: String(formData.get("baseCurrency") || "AED"),
          timezone: String(formData.get("timezone") || "Asia/Dubai"),
        },
      });
      setActiveOrganizationId(organization.id);
      setStatus(`Organization ready: ${organization.name}`);
      router.push("/dashboard");
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
        <LedgerSelect name="countryCode" defaultValue="AE">
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
        <LedgerInput name="baseCurrency" defaultValue="AED" />
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Timezone</LedgerFieldText>
        <LedgerInput name="timezone" defaultValue="Asia/Dubai" />
      </LedgerFieldLabel>
      <div className="space-y-3 md:col-span-2">
        <LedgerButton type="submit" disabled={submitting} variant="primary" icon={Building2}>
          {submitting ? "Creating..." : "Create organization"}
        </LedgerButton>
        {status ? <LedgerAlert tone={status.startsWith("Organization ready") ? "success" : "warning"}>{status}</LedgerAlert> : null}
      </div>
    </form>
  );
}
