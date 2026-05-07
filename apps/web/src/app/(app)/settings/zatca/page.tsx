"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { truncateHash, zatcaStatusLabel } from "@/lib/zatca";
import type { ZatcaEgsUnit, ZatcaEnvironment, ZatcaOrganizationProfile } from "@/lib/types";

const environmentOptions: ZatcaEnvironment[] = ["SANDBOX", "SIMULATION", "PRODUCTION"];

interface ZatcaProfileForm {
  environment: ZatcaEnvironment;
  sellerName: string;
  vatNumber: string;
  companyIdType: string;
  companyIdNumber: string;
  buildingNumber: string;
  streetName: string;
  district: string;
  city: string;
  postalCode: string;
  countryCode: string;
  additionalAddressNumber: string;
  businessCategory: string;
}

interface EgsForm {
  name: string;
  deviceSerialNumber: string;
}

export default function ZatcaSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const [profile, setProfile] = useState<ZatcaOrganizationProfile | null>(null);
  const [form, setForm] = useState<ZatcaProfileForm | null>(null);
  const [egsUnits, setEgsUnits] = useState<ZatcaEgsUnit[]>([]);
  const [egsForm, setEgsForm] = useState<EgsForm>({ name: "LedgerByte Dev EGS", deviceSerialNumber: "LEDGERBYTE-DEV-EGS" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<ZatcaOrganizationProfile>("/zatca/profile"), apiRequest<ZatcaEgsUnit[]>("/zatca/egs-units")])
      .then(([loadedProfile, loadedUnits]) => {
        if (!cancelled) {
          setProfile(loadedProfile);
          setForm(profileToForm(loadedProfile));
          setEgsUnits(loadedUnits);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load ZATCA settings.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<ZatcaOrganizationProfile>("/zatca/profile", {
        method: "PATCH",
        body: buildProfilePayload(form),
      });
      setProfile(updated);
      setForm(profileToForm(updated));
      setSuccess("ZATCA profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save ZATCA profile.");
    } finally {
      setSaving(false);
    }
  }

  async function createEgsUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading("create-egs");
    setError("");
    setSuccess("");

    try {
      const created = await apiRequest<ZatcaEgsUnit>("/zatca/egs-units", {
        method: "POST",
        body: {
          name: egsForm.name,
          deviceSerialNumber: egsForm.deviceSerialNumber,
          environment: form?.environment ?? "SANDBOX",
          solutionName: "LedgerByte",
        },
      });
      setEgsUnits((current) => [created, ...current]);
      setSuccess("Development EGS unit created.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create EGS unit.");
    } finally {
      setActionLoading("");
    }
  }

  async function activateEgsUnit(unit: ZatcaEgsUnit) {
    setActionLoading(unit.id);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<ZatcaEgsUnit>(`/zatca/egs-units/${unit.id}/activate-dev`, { method: "POST" });
      setEgsUnits((current) => current.map((item) => ({ ...item, isActive: item.id === updated.id, status: item.id === updated.id ? updated.status : item.status })));
      setSuccess(`${updated.name} activated for local ZATCA generation.`);
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "Unable to activate EGS unit.");
    } finally {
      setActionLoading("");
    }
  }

  function updateProfileField<K extends keyof ZatcaProfileForm>(field: K, value: ZatcaProfileForm[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">ZATCA settings</h1>
        <p className="mt-1 text-sm text-steel">Local-only Phase 2 groundwork for seller profile data, development EGS units, XML, QR, and hash-chain metadata.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit ZATCA settings.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading ZATCA settings...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        <StatusMessage type="info">Local ZATCA generation only. These settings do not submit invoices to ZATCA and are not production credentials.</StatusMessage>
      </div>

      {form ? (
        <div className="mt-5 space-y-5">
          <form onSubmit={saveProfile} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Seller profile</h2>
                <p className="mt-1 text-sm text-steel">Used to generate local UBL-like XML and basic QR payloads.</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{zatcaStatusLabel(profile?.registrationStatus)}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectField label="Environment" value={form.environment} options={environmentOptions} onChange={(value) => updateProfileField("environment", value as ZatcaEnvironment)} />
              <TextField label="Seller name" value={form.sellerName} onChange={(value) => updateProfileField("sellerName", value)} />
              <TextField label="VAT number" value={form.vatNumber} onChange={(value) => updateProfileField("vatNumber", value)} />
              <TextField label="Company ID type" value={form.companyIdType} onChange={(value) => updateProfileField("companyIdType", value)} />
              <TextField label="Company ID number" value={form.companyIdNumber} onChange={(value) => updateProfileField("companyIdNumber", value)} />
              <TextField label="Business category" value={form.businessCategory} onChange={(value) => updateProfileField("businessCategory", value)} />
              <TextField label="Building number" value={form.buildingNumber} onChange={(value) => updateProfileField("buildingNumber", value)} />
              <TextField label="Street name" value={form.streetName} onChange={(value) => updateProfileField("streetName", value)} />
              <TextField label="District" value={form.district} onChange={(value) => updateProfileField("district", value)} />
              <TextField label="City" value={form.city} onChange={(value) => updateProfileField("city", value)} />
              <TextField label="Postal code" value={form.postalCode} onChange={(value) => updateProfileField("postalCode", value)} />
              <TextField label="Country code" value={form.countryCode} onChange={(value) => updateProfileField("countryCode", value.toUpperCase())} />
              <TextField label="Additional address number" value={form.additionalAddressNumber} onChange={(value) => updateProfileField("additionalAddressNumber", value)} />
            </div>

            <div className="mt-5 flex justify-end">
              <button type="submit" disabled={saving} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">EGS units</h2>
            <p className="mt-1 text-sm text-steel">Development placeholders for ICV and previous-invoice hash chaining. Real CSID onboarding comes later.</p>

            <form onSubmit={createEgsUnit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
              <TextField label="Unit name" value={egsForm.name} onChange={(value) => setEgsForm((current) => ({ ...current, name: value }))} />
              <TextField label="Device serial number" value={egsForm.deviceSerialNumber} onChange={(value) => setEgsForm((current) => ({ ...current, deviceSerialNumber: value }))} />
              <div className="flex items-end">
                <button type="submit" disabled={actionLoading === "create-egs"} className="w-full rounded-md border border-palm px-4 py-2 text-sm font-semibold text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {actionLoading === "create-egs" ? "Creating..." : "Create dev EGS"}
                </button>
              </div>
            </form>

            <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Serial</th>
                    <th className="px-4 py-3">Environment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">ICV</th>
                    <th className="px-4 py-3">Last hash</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {egsUnits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4">
                        <StatusMessage type="empty">No EGS units have been created yet.</StatusMessage>
                      </td>
                    </tr>
                  ) : (
                    egsUnits.map((unit) => (
                      <tr key={unit.id}>
                        <td className="px-4 py-3 font-medium text-ink">{unit.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-steel">{unit.deviceSerialNumber}</td>
                        <td className="px-4 py-3 text-steel">{unit.environment}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${unit.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {unit.isActive ? "ACTIVE DEV" : zatcaStatusLabel(unit.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{unit.lastIcv}</td>
                        <td className="px-4 py-3 font-mono text-xs">{truncateHash(unit.lastInvoiceHash)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={unit.isActive || actionLoading === unit.id}
                            onClick={() => void activateEgsUnit(unit)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            {unit.isActive ? "Active" : actionLoading === unit.id ? "Activating..." : "Activate dev"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function profileToForm(profile: ZatcaOrganizationProfile): ZatcaProfileForm {
  return {
    environment: profile.environment,
    sellerName: profile.sellerName ?? "",
    vatNumber: profile.vatNumber ?? "",
    companyIdType: profile.companyIdType ?? "",
    companyIdNumber: profile.companyIdNumber ?? "",
    buildingNumber: profile.buildingNumber ?? "",
    streetName: profile.streetName ?? "",
    district: profile.district ?? "",
    city: profile.city ?? "",
    postalCode: profile.postalCode ?? "",
    countryCode: profile.countryCode,
    additionalAddressNumber: profile.additionalAddressNumber ?? "",
    businessCategory: profile.businessCategory ?? "",
  };
}

function buildProfilePayload(form: ZatcaProfileForm): Record<string, string> {
  return {
    environment: form.environment,
    sellerName: form.sellerName.trim(),
    vatNumber: form.vatNumber.trim(),
    companyIdType: form.companyIdType.trim(),
    companyIdNumber: form.companyIdNumber.trim(),
    buildingNumber: form.buildingNumber.trim(),
    streetName: form.streetName.trim(),
    district: form.district.trim(),
    city: form.city.trim(),
    postalCode: form.postalCode.trim(),
    countryCode: form.countryCode.trim().toUpperCase() || "SA",
    additionalAddressNumber: form.additionalAddressNumber.trim(),
    businessCategory: form.businessCategory.trim(),
  };
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
