"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FixedAsset, FixedAssetNav } from "@/components/fixed-assets/fixed-assets-page";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerInput,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerTextarea,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";

type EditableFixedAsset = FixedAsset & {
  description?: string | null;
  serialNumber?: string | null;
  tagNumber?: string | null;
  location?: string | null;
  custodianName?: string | null;
  usefulLifeMonths: number;
};

type FormState = {
  name: string;
  description: string;
  serialNumber: string;
  tagNumber: string;
  location: string;
  custodianName: string;
  acquisitionDate: string;
  inServiceDate: string;
  baseAcquisitionCost: string;
  baseSalvageValue: string;
  usefulLifeMonths: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  serialNumber: "",
  tagNumber: "",
  location: "",
  custodianName: "",
  acquisitionDate: "",
  inServiceDate: "",
  baseAcquisitionCost: "",
  baseSalvageValue: "",
  usefulLifeMonths: "",
};

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toForm(asset: EditableFixedAsset): FormState {
  return {
    name: asset.name ?? "",
    description: asset.description ?? "",
    serialNumber: asset.serialNumber ?? "",
    tagNumber: asset.tagNumber ?? "",
    location: asset.location ?? "",
    custodianName: asset.custodianName ?? "",
    acquisitionDate: dateInput(asset.acquisitionDate),
    inServiceDate: dateInput(asset.inServiceDate),
    baseAcquisitionCost: asset.baseAcquisitionCost ?? "",
    baseSalvageValue: asset.baseSalvageValue ?? "",
    usefulLifeMonths: String(asset.usefulLifeMonths ?? ""),
  };
}

export default function EditFixedAssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [asset, setAsset] = useState<EditableFixedAsset | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!organizationId || !id) return () => { active = false; };
    setLoading(true);
    setError("");
    apiRequest<EditableFixedAsset>(`/fixed-assets/${id}`)
      .then((result) => {
        if (!active) return;
        setAsset(result);
        setForm(toForm(result));
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load fixed asset.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, organizationId]);

  const updateField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asset || saving) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/fixed-assets/${asset.id}`, {
        method: "PATCH",
        body: { ...form, usefulLifeMonths: Number(form.usefulLifeMonths) },
      });
      router.push(`/fixed-assets/${asset.id}`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to save fixed asset.");
      setSaving(false);
    }
  }

  if (loading) return <LedgerPage><LedgerLoadingState title="Loading fixed asset" description="Reading the draft register record." /></LedgerPage>;
  if (error && !asset) return <LedgerPage><LedgerAlert tone="danger" title="Asset unavailable">{error}</LedgerAlert></LedgerPage>;
  if (!asset) return <LedgerPage><LedgerAlert tone="danger" title="Asset unavailable">The fixed asset could not be found.</LedgerAlert></LedgerPage>;
  if (asset.status !== "DRAFT") {
    return <LedgerPage><LedgerPageHeader eyebrow="Fixed asset register" title="Edit fixed asset" description="Posted and reviewed assets are immutable." /><LedgerPageBody><LedgerAlert tone="warning" title="Editing is limited to drafts">This asset is {asset.status.replaceAll("_", " ").toLowerCase()}. Use its review or reversal workflow instead.</LedgerAlert><LedgerButton href={`/fixed-assets/${asset.id}`} variant="secondary">Back to asset</LedgerButton></LedgerPageBody></LedgerPage>;
  }

  return <LedgerPage>
    <LedgerPageHeader eyebrow="Accounting / Fixed assets" title="Edit fixed asset" description={`${asset.assetNumber} · Draft changes remain reviewable before capitalization.`} />
    <LedgerPageBody>
      <FixedAssetNav />
      {error ? <LedgerAlert tone="danger" title="Unable to save">{error}</LedgerAlert> : null}
      <LedgerPanel>
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div><LedgerFieldLabel htmlFor="asset-name">Asset name</LedgerFieldLabel><LedgerInput id="asset-name" value={form.name} onChange={(event) => updateField("name", event.target.value)} required /></div>
            <div><LedgerFieldLabel htmlFor="asset-cost">Base acquisition cost</LedgerFieldLabel><LedgerInput id="asset-cost" inputMode="decimal" value={form.baseAcquisitionCost} onChange={(event) => updateField("baseAcquisitionCost", event.target.value)} required /></div>
            <div><LedgerFieldLabel htmlFor="asset-salvage">Base salvage value</LedgerFieldLabel><LedgerInput id="asset-salvage" inputMode="decimal" value={form.baseSalvageValue} onChange={(event) => updateField("baseSalvageValue", event.target.value)} required /></div>
            <div><LedgerFieldLabel htmlFor="asset-life">Useful life (months)</LedgerFieldLabel><LedgerInput id="asset-life" type="number" min="1" value={form.usefulLifeMonths} onChange={(event) => updateField("usefulLifeMonths", event.target.value)} required /></div>
            <div><LedgerFieldLabel htmlFor="asset-acquisition-date">Acquisition date</LedgerFieldLabel><LedgerInput id="asset-acquisition-date" type="date" value={form.acquisitionDate} onChange={(event) => updateField("acquisitionDate", event.target.value)} required /></div>
            <div><LedgerFieldLabel htmlFor="asset-service-date">In-service date</LedgerFieldLabel><LedgerInput id="asset-service-date" type="date" value={form.inServiceDate} onChange={(event) => updateField("inServiceDate", event.target.value)} required /></div>
            <div><LedgerFieldLabel htmlFor="asset-serial">Serial number</LedgerFieldLabel><LedgerInput id="asset-serial" value={form.serialNumber} onChange={(event) => updateField("serialNumber", event.target.value)} /></div>
            <div><LedgerFieldLabel htmlFor="asset-tag">Tag number</LedgerFieldLabel><LedgerInput id="asset-tag" value={form.tagNumber} onChange={(event) => updateField("tagNumber", event.target.value)} /></div>
            <div><LedgerFieldLabel htmlFor="asset-location">Location</LedgerFieldLabel><LedgerInput id="asset-location" value={form.location} onChange={(event) => updateField("location", event.target.value)} /></div>
            <div><LedgerFieldLabel htmlFor="asset-custodian">Custodian</LedgerFieldLabel><LedgerInput id="asset-custodian" value={form.custodianName} onChange={(event) => updateField("custodianName", event.target.value)} /></div>
          </div>
          <div><LedgerFieldLabel htmlFor="asset-description">Description</LedgerFieldLabel><LedgerTextarea id="asset-description" value={form.description} onChange={(event) => updateField("description", event.target.value)} /></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <LedgerButton href={`/fixed-assets/${asset.id}`} variant="secondary">Cancel</LedgerButton>
            <LedgerButton type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save draft"}</LedgerButton>
          </div>
        </form>
      </LedgerPanel>
    </LedgerPageBody>
  </LedgerPage>;
}
