"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
          countryCode: String(formData.get("countryCode") || "SA"),
          baseCurrency: String(formData.get("baseCurrency") || "SAR"),
          timezone: String(formData.get("timezone") || "Asia/Riyadh"),
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
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Organization name</span>
        <input name="name" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Legal name</span>
        <input name="legalName" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">VAT number</span>
        <input name="taxNumber" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Country</span>
        <select name="countryCode" defaultValue="SA" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
          <option value="SA">Saudi Arabia</option>
          <option value="AE">United Arab Emirates</option>
          <option value="BH">Bahrain</option>
          <option value="KW">Kuwait</option>
          <option value="OM">Oman</option>
          <option value="QA">Qatar</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Base currency</span>
        <input name="baseCurrency" defaultValue="SAR" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Timezone</span>
        <input name="timezone" defaultValue="Asia/Riyadh" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
      </label>
      <div className="md:col-span-2">
        <button type="submit" disabled={submitting} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? "Creating..." : "Create organization"}
        </button>
        {status ? <p className="mt-3 text-sm text-steel">{status}</p> : null}
      </div>
    </form>
  );
}
