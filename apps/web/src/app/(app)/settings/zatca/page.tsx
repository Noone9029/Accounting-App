"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getZatcaProfileMissingFields,
  shouldShowZatcaRealNetworkWarning,
  shouldShowZatcaSdkWarning,
  truncateHash,
  zatcaAdapterModeLabel,
  zatcaChecklistRiskBadgeClass,
  zatcaChecklistStatusBadgeClass,
  zatcaCsrConfigReviewApprovePath,
  zatcaCsrConfigReviewRevokePath,
  zatcaEgsCsrConfigPreviewPath,
  zatcaEgsCsrConfigReviewsPath,
  zatcaEgsCsrDownloadPath,
  zatcaEgsCsrFieldsPath,
  zatcaEgsSdkHashModeEnablePath,
  zatcaHashChainResetPlanPath,
  zatcaHashModeLabel,
  zatcaResetPlanWarningLabel,
  zatcaReadinessLabel,
  zatcaReadinessStatusBadgeClass,
  zatcaReadinessStatusLabel,
  zatcaSdkHashModeEnableBlockerLabel,
  zatcaSdkCanAttemptLabel,
  zatcaSdkExecutionLabel,
  zatcaSdkReadinessLabel,
  zatcaSdkReadinessPath,
  canEnableZatcaSdkHashMode,
  zatcaStatusLabel,
} from "@/lib/zatca";
import type {
  ZatcaAdapterConfigSummary,
  ZatcaChecklistItem,
  ZatcaComplianceChecklistResponse,
  ZatcaCsrConfigReview,
  ZatcaEgsCsrConfigPreviewResponse,
  ZatcaEgsUnit,
  ZatcaEnvironment,
  ZatcaHashChainResetPlan,
  ZatcaOrganizationProfile,
  ZatcaReadinessSection,
  ZatcaReadinessSummary,
  ZatcaSdkReadinessResponse,
  ZatcaSubmissionLog,
  ZatcaXmlFieldMappingResponse,
} from "@/lib/types";

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

interface EgsCsrFieldsForm {
  csrCommonName: string;
  csrSerialNumber: string;
  csrOrganizationUnitName: string;
  csrInvoiceType: string;
  csrLocationAddress: string;
}

export default function ZatcaSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [profile, setProfile] = useState<ZatcaOrganizationProfile | null>(null);
  const [adapterConfig, setAdapterConfig] = useState<ZatcaAdapterConfigSummary | null>(null);
  const [checklist, setChecklist] = useState<ZatcaComplianceChecklistResponse | null>(null);
  const [xmlFieldMapping, setXmlFieldMapping] = useState<ZatcaXmlFieldMappingResponse | null>(null);
  const [readiness, setReadiness] = useState<ZatcaReadinessSummary | null>(null);
  const [sdkReadiness, setSdkReadiness] = useState<ZatcaSdkReadinessResponse | null>(null);
  const [hashResetPlan, setHashResetPlan] = useState<ZatcaHashChainResetPlan | null>(null);
  const [form, setForm] = useState<ZatcaProfileForm | null>(null);
  const [egsUnits, setEgsUnits] = useState<ZatcaEgsUnit[]>([]);
  const [submissionLogs, setSubmissionLogs] = useState<ZatcaSubmissionLog[]>([]);
  const [egsForm, setEgsForm] = useState<EgsForm>({ name: "LedgerByte Dev EGS", deviceSerialNumber: "LEDGERBYTE-DEV-EGS" });
  const [csrFieldsByUnit, setCsrFieldsByUnit] = useState<Record<string, EgsCsrFieldsForm>>({});
  const [csrConfigPreviewByUnit, setCsrConfigPreviewByUnit] = useState<Record<string, ZatcaEgsCsrConfigPreviewResponse>>({});
  const [csrConfigReviewsByUnit, setCsrConfigReviewsByUnit] = useState<Record<string, ZatcaCsrConfigReview[]>>({});
  const [otpByUnit, setOtpByUnit] = useState<Record<string, string>>({});
  const [hashModeReasonByUnit, setHashModeReasonByUnit] = useState<Record<string, string>>({});
  const [hashModeConfirmByUnit, setHashModeConfirmByUnit] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManageZatca = can(PERMISSIONS.zatca.manage);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const loadedProfile = await apiRequest<ZatcaOrganizationProfile>("/zatca/profile");
        const loadedAdapterConfig = await apiRequest<ZatcaAdapterConfigSummary>("/zatca/adapter-config");
        const loadedChecklist = await apiRequest<ZatcaComplianceChecklistResponse>("/zatca/compliance-checklist");
        const loadedXmlFieldMapping = await apiRequest<ZatcaXmlFieldMappingResponse>("/zatca/xml-field-mapping");
        const loadedReadiness = await apiRequest<ZatcaReadinessSummary>("/zatca/readiness");
        const loadedSdkReadiness = await apiRequest<ZatcaSdkReadinessResponse>(zatcaSdkReadinessPath());
        const loadedHashResetPlan = canManageZatca ? await apiRequest<ZatcaHashChainResetPlan>(zatcaHashChainResetPlanPath()).catch(() => null) : null;
        if (!cancelled) {
          setProfile(loadedProfile);
          setAdapterConfig(loadedAdapterConfig);
          setChecklist(loadedChecklist);
          setXmlFieldMapping(loadedXmlFieldMapping);
          setReadiness(loadedReadiness);
          setSdkReadiness(loadedSdkReadiness);
          setHashResetPlan(loadedHashResetPlan);
          setForm(profileToForm(loadedProfile));
        }

        const loadedUnits = await apiRequest<ZatcaEgsUnit[]>("/zatca/egs-units");
        const loadedLogs = await apiRequest<ZatcaSubmissionLog[]>("/zatca/submissions");
        const loadedReviewPairs = await Promise.all(
          loadedUnits
            .filter((unit) => unit.environment !== "PRODUCTION")
            .map(async (unit) => [unit.id, await apiRequest<ZatcaCsrConfigReview[]>(zatcaEgsCsrConfigReviewsPath(unit.id)).catch(() => [])] as const),
        );
        if (!cancelled) {
          setEgsUnits(loadedUnits);
          setCsrFieldsByUnit(buildCsrFieldsByUnit(loadedUnits));
          setCsrConfigReviewsByUnit(Object.fromEntries(loadedReviewPairs));
          setSubmissionLogs(loadedLogs);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load ZATCA settings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canManageZatca, organizationId]);

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
      await refreshReadiness();
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
      await refreshReadiness();
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
      await refreshReadiness();
      setSuccess(`${updated.name} activated for local ZATCA generation.`);
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "Unable to activate EGS unit.");
    } finally {
      setActionLoading("");
    }
  }

  async function generateCsr(unit: ZatcaEgsUnit) {
    setActionLoading(`csr-${unit.id}`);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<ZatcaEgsUnit>(`/zatca/egs-units/${unit.id}/generate-csr`, { method: "POST" });
      replaceUnit(updated);
      await refreshReadiness();
      setSuccess(`Development CSR placeholder generated for ${updated.name}. Private key is stored only as a development placeholder and is not shown.`);
    } catch (csrError) {
      setError(csrError instanceof Error ? csrError.message : "Unable to generate CSR.");
    } finally {
      setActionLoading("");
    }
  }

  async function downloadCsr(unit: ZatcaEgsUnit) {
    setActionLoading(`download-csr-${unit.id}`);
    setError("");
    setSuccess("");

    try {
      await downloadAuthenticatedFile(zatcaEgsCsrDownloadPath(unit.id), `zatca-egs-${unit.name}-csr.pem`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download CSR.");
    } finally {
      setActionLoading("");
    }
  }

  async function requestMockComplianceCsid(unit: ZatcaEgsUnit) {
    setActionLoading(`csid-${unit.id}`);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<ZatcaEgsUnit>(`/zatca/egs-units/${unit.id}/request-compliance-csid`, {
        method: "POST",
        body: { otp: otpByUnit[unit.id] ?? "000000", mode: "mock" },
      });
      replaceUnit(updated);
      const [logs] = await Promise.all([apiRequest<ZatcaSubmissionLog[]>("/zatca/submissions"), refreshReadiness()]);
      setSubmissionLogs(logs);
      setSuccess(`Mock compliance CSID issued for ${updated.name}. This does not make invoices ZATCA compliant.`);
    } catch (csidError) {
      setError(csidError instanceof Error ? csidError.message : "Unable to request mock compliance CSID.");
    } finally {
      setActionLoading("");
    }
  }

  async function enableSdkHashMode(unitId: string) {
    setActionLoading(`sdk-hash-${unitId}`);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<ZatcaEgsUnit>(zatcaEgsSdkHashModeEnablePath(unitId), {
        method: "POST",
        body: {
          reason: hashModeReasonByUnit[unitId] ?? "",
          confirmReset: hashModeConfirmByUnit[unitId] === true,
        },
      });
      replaceUnit(updated);
      await refreshReadiness();
      setHashModeReasonByUnit((current) => ({ ...current, [unitId]: "" }));
      setHashModeConfirmByUnit((current) => ({ ...current, [unitId]: false }));
      setSuccess(`${updated.name} is now in local SDK hash mode. Signing and ZATCA submission remain disabled.`);
    } catch (hashModeError) {
      setError(hashModeError instanceof Error ? hashModeError.message : "Unable to enable SDK hash mode.");
    } finally {
      setActionLoading("");
    }
  }

  async function saveEgsCsrFields(event: FormEvent<HTMLFormElement>, unit: ZatcaEgsUnit) {
    event.preventDefault();
    setActionLoading(`csr-fields-${unit.id}`);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<ZatcaEgsUnit>(zatcaEgsCsrFieldsPath(unit.id), {
        method: "PATCH",
        body: csrFieldsByUnit[unit.id] ?? unitToCsrFieldsForm(unit),
      });
      replaceUnit(updated);
      await refreshReadiness();
      setSuccess(`CSR onboarding fields saved for ${updated.name}. No CSID request, SDK execution, signing, or network call was performed.`);
    } catch (csrFieldError) {
      setError(csrFieldError instanceof Error ? csrFieldError.message : "Unable to save CSR onboarding fields.");
    } finally {
      setActionLoading("");
    }
  }

  async function loadEgsCsrConfigPreview(unit: ZatcaEgsUnit) {
    setActionLoading(`csr-config-preview-${unit.id}`);
    setError("");
    setSuccess("");

    try {
      const preview = await apiRequest<ZatcaEgsCsrConfigPreviewResponse>(zatcaEgsCsrConfigPreviewPath(unit.id));
      setCsrConfigPreviewByUnit((current) => ({ ...current, [unit.id]: preview }));
      setSuccess(`Sanitized CSR config preview loaded for ${unit.name}. No file, SDK execution, CSID request, or network call was performed.`);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Unable to load CSR config preview.");
    } finally {
      setActionLoading("");
    }
  }

  async function refreshCsrConfigReviews(unitId: string) {
    const reviews = await apiRequest<ZatcaCsrConfigReview[]>(zatcaEgsCsrConfigReviewsPath(unitId));
    setCsrConfigReviewsByUnit((current) => ({ ...current, [unitId]: reviews }));
    return reviews;
  }

  async function createCsrConfigReview(unit: ZatcaEgsUnit) {
    setActionLoading(`csr-review-create-${unit.id}`);
    setError("");
    setSuccess("");

    try {
      const review = await apiRequest<ZatcaCsrConfigReview>(zatcaEgsCsrConfigReviewsPath(unit.id), {
        method: "POST",
        body: { note: "Operator review record created from sanitized CSR config preview." },
      });
      await refreshCsrConfigReviews(unit.id);
      setSuccess(`CSR config review ${review.configHash.slice(0, 12)} created for ${unit.name}. No SDK execution, CSID request, or network call was performed.`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to create CSR config review.");
    } finally {
      setActionLoading("");
    }
  }

  async function approveCsrConfigReview(unit: ZatcaEgsUnit, review: ZatcaCsrConfigReview) {
    setActionLoading(`csr-review-approve-${review.id}`);
    setError("");
    setSuccess("");

    try {
      const approved = await apiRequest<ZatcaCsrConfigReview>(zatcaCsrConfigReviewApprovePath(review.id), {
        method: "POST",
        body: { note: "Operator approved sanitized CSR config preview for future controlled local dry-run planning." },
      });
      await refreshCsrConfigReviews(unit.id);
      setSuccess(`CSR config review ${approved.configHash.slice(0, 12)} approved locally. This does not request CSID, execute SDK, or prove production compliance.`);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Unable to approve CSR config review.");
    } finally {
      setActionLoading("");
    }
  }

  async function revokeCsrConfigReview(unit: ZatcaEgsUnit, review: ZatcaCsrConfigReview) {
    setActionLoading(`csr-review-revoke-${review.id}`);
    setError("");
    setSuccess("");

    try {
      const revoked = await apiRequest<ZatcaCsrConfigReview>(zatcaCsrConfigReviewRevokePath(review.id), {
        method: "POST",
        body: { note: "Operator revoked local CSR config preview approval." },
      });
      await refreshCsrConfigReviews(unit.id);
      setSuccess(`CSR config review ${revoked.configHash.slice(0, 12)} revoked locally. No SDK execution, CSID request, or network call was performed.`);
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke CSR config review.");
    } finally {
      setActionLoading("");
    }
  }

  function replaceUnit(unit: ZatcaEgsUnit) {
    setEgsUnits((current) => current.map((item) => (item.id === unit.id ? unit : { ...item, isActive: unit.isActive ? false : item.isActive })));
    setCsrFieldsByUnit((current) => ({ ...current, [unit.id]: unitToCsrFieldsForm(unit) }));
    setCsrConfigPreviewByUnit((current) => {
      const next = { ...current };
      delete next[unit.id];
      return next;
    });
  }

  async function refreshReadiness() {
    const updatedReadiness = await apiRequest<ZatcaReadinessSummary>("/zatca/readiness");
    setReadiness(updatedReadiness);
    if (canManageZatca) {
      const updatedHashResetPlan = await apiRequest<ZatcaHashChainResetPlan>(zatcaHashChainResetPlanPath()).catch(() => null);
      setHashResetPlan(updatedHashResetPlan);
    }
  }

  function updateProfileField<K extends keyof ZatcaProfileForm>(field: K, value: ZatcaProfileForm[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateCsrField(unitId: string, field: keyof EgsCsrFieldsForm, value: string) {
    setCsrFieldsByUnit((current) => ({
      ...current,
      [unitId]: {
        ...(current[unitId] ?? unitToCsrFieldsForm(egsUnits.find((unit) => unit.id === unitId))),
        [field]: value,
      },
    }));
  }

  const missingProfileFields = profile?.readiness?.missingFields ?? (profile ? getZatcaProfileMissingFields(profile) : []);

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
        {!canManageZatca ? <StatusMessage type="info">Your role can view ZATCA readiness but cannot manage profile, EGS, CSR, or CSID actions.</StatusMessage> : null}
        <StatusMessage type="info">Local ZATCA generation only. These settings do not submit invoices to ZATCA and are not production credentials.</StatusMessage>
        {shouldShowZatcaRealNetworkWarning(adapterConfig) ? (
          <StatusMessage type="info">Real ZATCA calls are disabled unless explicitly enabled through environment variables.</StatusMessage>
        ) : null}
        {profile && missingProfileFields.length > 0 ? (
          <StatusMessage type="info">CSR readiness missing fields: {missingProfileFields.join(", ")}.</StatusMessage>
        ) : null}
      </div>

      {form ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Adapter mode</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <AdapterSummary label="Mode" value={zatcaAdapterModeLabel(adapterConfig?.mode)} />
              <AdapterSummary label="Real network enabled" value={adapterConfig?.realNetworkEnabled ? "Yes" : "No"} />
              <AdapterSummary label="Sandbox URL configured" value={adapterConfig?.sandboxBaseUrlConfigured ? "Yes" : "No"} />
              <AdapterSummary label="Effective network" value={adapterConfig?.effectiveRealNetworkEnabled ? "Enabled" : "Disabled"} />
            </div>
            {adapterConfig?.invalidMode ? <p className="mt-3 text-xs text-rosewood">Invalid adapter mode `{adapterConfig.invalidMode}` was ignored and mock mode is active.</p> : null}
          </div>

          {sdkReadiness ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">SDK validation readiness</h2>
                  <p className="mt-1 text-sm text-steel">Optional local-only SDK validation. The app does not submit invoices to ZATCA or prove production compliance.</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${sdkReadiness.canRunLocalValidation ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {sdkReadiness.canRunLocalValidation ? "Local validation ready" : zatcaSdkCanAttemptLabel(sdkReadiness.canAttemptSdkValidation)}
                </span>
              </div>
              <StatusMessage type="info">SDK execution is {zatcaSdkExecutionLabel(sdkReadiness.enabled)}. This is local validation only, does not submit to ZATCA, and does not prove production compliance.</StatusMessage>
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                <SdkReadinessSummary label="Execution" value={sdkReadiness.enabled} detail={zatcaSdkExecutionLabel(sdkReadiness.enabled)} />
                <SdkReadinessSummary label="Reference folder" value={sdkReadiness.referenceFolderFound} />
                <SdkReadinessSummary label="SDK JAR" value={sdkReadiness.sdkJarFound} />
                <SdkReadinessSummary label="Launcher" value={sdkReadiness.fatooraLauncherFound} />
                <SdkReadinessSummary label="jq helper" value={sdkReadiness.jqFound} />
                <SdkReadinessSummary label="Config directory" value={sdkReadiness.configDirFound} />
                <SdkReadinessSummary label="Work directory" value={sdkReadiness.workingDirectoryWritable} detail={sdkReadiness.workingDirectoryWritable ? "Writable" : "Not writable"} />
                <SdkReadinessSummary label="Command support" value={sdkReadiness.supportedCommandsKnown} detail={sdkReadiness.supportedCommandsKnown ? "Readme command resolved" : "Blocked"} />
                <SdkReadinessSummary label="Java" value={sdkReadiness.javaFound} detail={sdkReadiness.javaVersion ?? "Not detected"} />
                <SdkReadinessSummary label="Java version" value={sdkReadiness.javaVersionSupported} detail={sdkReadiness.javaVersionSupported ? "Compatible with SDK readme" : "Expected Java 11-14"} />
                <SdkReadinessSummary label="Path spaces" value={!sdkReadiness.projectPathHasSpaces} detail={sdkReadiness.projectPathHasSpaces ? "Project path contains spaces" : "No path-space warning"} />
                <SdkReadinessSummary label="Validation plan" value={sdkReadiness.canAttemptSdkValidation} />
                <SdkReadinessSummary label="Can run local validation" value={sdkReadiness.canRunLocalValidation} detail={`${sdkReadiness.timeoutMs} ms timeout`} />
              </div>
              {sdkReadiness.blockingReasons.length > 0 ? (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-rosewood">
                  {sdkReadiness.blockingReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
              {shouldShowZatcaSdkWarning(sdkReadiness) ? (
                <div className="mt-4 space-y-3">
                  {sdkReadiness.warnings.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700">
                      {sdkReadiness.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                  {sdkReadiness.suggestedFixes.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-steel">
                      {sdkReadiness.suggestedFixes.map((fix) => (
                        <li key={fix}>{fix}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {sdkReadiness || hashResetPlan ? (
            <HashChainStatusPanel
              sdkReadiness={sdkReadiness}
              resetPlan={hashResetPlan}
              canManage={canManageZatca}
              actionLoading={actionLoading}
              reasonByUnit={hashModeReasonByUnit}
              confirmByUnit={hashModeConfirmByUnit}
              onReasonChange={(unitId, value) => setHashModeReasonByUnit((current) => ({ ...current, [unitId]: value }))}
              onConfirmChange={(unitId, value) => setHashModeConfirmByUnit((current) => ({ ...current, [unitId]: value }))}
              onEnableSdkHashMode={(unitId) => void enableSdkHashMode(unitId)}
            />
          ) : null}

          {readiness ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">Readiness summary</h2>
                  <p className="mt-1 text-sm text-steel">{readiness.warning}</p>
                </div>
                <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rosewood">Production ready: No</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <ReadinessSummary label="Profile" ready={readiness.profileReady} detail={readiness.profileMissingFields.length ? readiness.profileMissingFields.join(", ") : "Required local fields present"} />
                <ReadinessSummary label="Active EGS" ready={readiness.egsReady} detail={readiness.activeEgsUnit?.name ?? "No active development EGS"} />
                <ReadinessSummary label="Local XML" ready={readiness.localXmlReady} detail={readiness.localXmlReady ? "At least one invoice has local XML" : "Generate local XML from a finalized invoice"} />
                <ReadinessSummary label="Mock CSID" ready={readiness.mockCsidReady} detail={readiness.mockCsidReady ? "Local mock CSID exists" : "Request mock CSID after CSR"} />
                <ReadinessSummary label="Real network" ready={readiness.realNetworkEnabled} detail={readiness.realNetworkEnabled ? "Explicitly enabled" : "Disabled by configuration"} />
                <ReadinessSummary label="Production" ready={readiness.productionReady} detail="Always blocked until official validation is complete" />
                <ReadinessSummary label="Key custody" ready={readiness.keyCustody.status !== "BLOCKED"} detail={readiness.activeEgsUnit?.keyCustodyMode === "RAW_DATABASE_PEM" ? "Raw DB PEM detected; production KMS/HSM required" : "No private key custody configured"} />
                <ReadinessSummary label="CSR readiness" ready={readiness.csr.status !== "BLOCKED"} detail={readiness.activeEgsUnit?.hasCsr ? "CSR exists locally" : "CSR fields still need planning"} />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReadinessCheckCard title="Seller invoice XML profile" section={readiness.sellerProfile} />
                <ReadinessCheckCard title="EGS/hash mode" section={readiness.egs} />
                <ReadinessCheckCard title="Generated XML inventory" section={readiness.xml} />
                <ReadinessCheckCard title="Local SDK wrapper" section={readiness.sdk} />
                <ReadinessCheckCard title="Signing/certificate" section={readiness.signing} />
                <ReadinessCheckCard title="Key custody" section={readiness.keyCustody} />
                <ReadinessCheckCard title="CSR onboarding" section={readiness.csr} />
                <ReadinessCheckCard title="Signed XML promotion" section={readiness.signedArtifactPromotion} />
                <ReadinessCheckCard title="Phase 2 QR" section={readiness.phase2Qr} />
                <ReadinessCheckCard title="PDF/A-3" section={readiness.pdfA3} />
              </div>
              <p className="mt-4 text-xs text-amber-700">Local-only readiness. No signing, CSID request, clearance/reporting, network submission, PDF/A-3, or production compliance is enabled.</p>
              {readiness.blockingReasons.length > 0 ? (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-steel">
                  {readiness.blockingReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {checklist ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">Compliance checklist</h2>
                  <p className="mt-1 text-sm text-steel">{checklist.warning} Production compliance requires official ZATCA/FATOORA validation.</p>
                  <p className="mt-1 text-xs text-steel">XML field mapping is documented in docs/zatca/XML_FIELD_MAPPING.md. The mapping is local scaffolding, not official validation.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{checklist.summary.total} checklist items</span>
                  {xmlFieldMapping ? (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{xmlFieldMapping.summary.total} XML mapping items</span>
                  ) : null}
                </div>
              </div>
              <ChecklistSummary title="By status" counts={checklist.summary.byStatus} />
              <ChecklistSummary title="By risk" counts={checklist.summary.byRisk} />
              {xmlFieldMapping ? <ChecklistSummary title="XML mapping by status" counts={xmlFieldMapping.summary.byStatus} /> : null}
              <div className="mt-5 space-y-5">
                {Object.entries(checklist.groups).map(([category, items]) => (
                  <ChecklistGroup key={category} category={category} items={items} />
                ))}
              </div>
            </div>
          ) : null}

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

            {canManageZatca ? (
            <div className="mt-5 flex justify-end">
              <button type="submit" disabled={saving} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
            ) : null}
          </form>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">EGS units</h2>
            <p className="mt-1 text-sm text-steel">Development placeholders for ICV and previous-invoice hash chaining. Real CSID onboarding comes later.</p>
            <p className="mt-1 text-xs text-rosewood">Mock CSID is for local development only. It does not make invoices ZATCA compliant. Private keys are not shown in the app.</p>

            {canManageZatca ? (
            <form onSubmit={createEgsUnit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
              <TextField label="Unit name" value={egsForm.name} onChange={(value) => setEgsForm((current) => ({ ...current, name: value }))} />
              <TextField label="Device serial number" value={egsForm.deviceSerialNumber} onChange={(value) => setEgsForm((current) => ({ ...current, deviceSerialNumber: value }))} />
              <div className="flex items-end">
                <button type="submit" disabled={actionLoading === "create-egs"} className="w-full rounded-md border border-palm px-4 py-2 text-sm font-semibold text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {actionLoading === "create-egs" ? "Creating..." : "Create dev EGS"}
                </button>
              </div>
            </form>
            ) : null}

            <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Serial</th>
                    <th className="px-4 py-3">Environment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">CSR</th>
                    <th className="px-4 py-3">CSR onboarding fields</th>
                    <th className="px-4 py-3">Compliance CSID</th>
                    <th className="px-4 py-3">Production CSID</th>
                    <th className="px-4 py-3">Key custody</th>
                    <th className="px-4 py-3">Renewal</th>
                    <th className="px-4 py-3">Certificate request</th>
                    <th className="px-4 py-3">ICV</th>
                    <th className="px-4 py-3">Last hash</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {egsUnits.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-4">
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
                            {unit.isActive ? "ACTIVE MOCK" : zatcaStatusLabel(unit.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-steel">{unit.hasCsr ? "Generated" : "Missing"}</td>
                        <td className="min-w-[360px] px-4 py-3">
                          <form onSubmit={(event) => void saveEgsCsrFields(event, unit)} className="space-y-2">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <SmallInput label="Common name" value={(csrFieldsByUnit[unit.id] ?? unitToCsrFieldsForm(unit)).csrCommonName} onChange={(value) => updateCsrField(unit.id, "csrCommonName", value)} disabled={!canManageZatca || unit.environment === "PRODUCTION"} />
                              <SmallInput label="Invoice type" value={(csrFieldsByUnit[unit.id] ?? unitToCsrFieldsForm(unit)).csrInvoiceType} onChange={(value) => updateCsrField(unit.id, "csrInvoiceType", value)} disabled={!canManageZatca || unit.environment === "PRODUCTION"} placeholder="1100" />
                              <SmallInput label="Location address" value={(csrFieldsByUnit[unit.id] ?? unitToCsrFieldsForm(unit)).csrLocationAddress} onChange={(value) => updateCsrField(unit.id, "csrLocationAddress", value)} disabled={!canManageZatca || unit.environment === "PRODUCTION"} />
                              <SmallInput label="Organization unit" value={(csrFieldsByUnit[unit.id] ?? unitToCsrFieldsForm(unit)).csrOrganizationUnitName} onChange={(value) => updateCsrField(unit.id, "csrOrganizationUnitName", value)} disabled={!canManageZatca || unit.environment === "PRODUCTION"} />
                              <SmallInput label="Serial number" value={(csrFieldsByUnit[unit.id] ?? unitToCsrFieldsForm(unit)).csrSerialNumber} onChange={(value) => updateCsrField(unit.id, "csrSerialNumber", value)} disabled={!canManageZatca || unit.environment === "PRODUCTION"} />
                            </div>
                            <div className="text-[11px] text-steel">Used for local CSR planning only. Does not request CSID. Does not call ZATCA. Do not enter secrets.</div>
                            <div className="text-[11px] text-amber-700">Invoice type is limited to the official SDK example value currently modeled: 1100.</div>
                            <div className="flex flex-wrap gap-2">
                            {canManageZatca ? (
                              <button
                                type="submit"
                                disabled={unit.environment === "PRODUCTION" || actionLoading === `csr-fields-${unit.id}`}
                                className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                              >
                                {actionLoading === `csr-fields-${unit.id}` ? "Saving..." : "Save CSR fields"}
                              </button>
                            ) : null}
                              <button
                                type="button"
                                disabled={unit.environment === "PRODUCTION" || actionLoading === `csr-config-preview-${unit.id}`}
                                onClick={() => void loadEgsCsrConfigPreview(unit)}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                              >
                                {actionLoading === `csr-config-preview-${unit.id}` ? "Loading preview..." : "Preview CSR config"}
                              </button>
                            </div>
                            {unit.environment === "PRODUCTION" ? <div className="text-[11px] text-rosewood">CSR config preview is restricted to non-production EGS units.</div> : null}
                            {csrConfigPreviewByUnit[unit.id] ? <CsrConfigPreviewPanel preview={csrConfigPreviewByUnit[unit.id]!} /> : null}
                            {unit.environment !== "PRODUCTION" ? (
                              <CsrConfigReviewPanel
                                unit={unit}
                                reviews={csrConfigReviewsByUnit[unit.id] ?? []}
                                preview={csrConfigPreviewByUnit[unit.id] ?? null}
                                canManage={canManageZatca}
                                actionLoading={actionLoading}
                                onCreate={() => void createCsrConfigReview(unit)}
                                onApprove={(review) => void approveCsrConfigReview(unit, review)}
                                onRevoke={(review) => void revokeCsrConfigReview(unit, review)}
                              />
                            ) : null}
                          </form>
                        </td>
                        <td className="px-4 py-3 text-steel">{unit.hasComplianceCsid ? "Mock issued" : "Missing"}</td>
                        <td className="px-4 py-3 text-steel">{unit.hasProductionCsid ? "Configured" : "Missing"}</td>
                        <td className="px-4 py-3 text-steel">
                          {unit.keyCustodyMode === "RAW_DATABASE_PEM" ? "DB PEM (dev risk)" : "Missing"}
                          <div className="mt-1 text-[11px] text-amber-700">KMS/HSM recommended for production.</div>
                        </td>
                        <td className="px-4 py-3 text-steel">
                          {unit.certificateExpiryKnown ? unit.certificateExpiresAt ?? "Known" : "Expiry unknown"}
                          <div className="mt-1 text-[11px] text-steel">{unit.renewalStatus ?? "Not implemented"}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{unit.certificateRequestId ?? "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{unit.lastIcv}</td>
                        <td className="px-4 py-3 font-mono text-xs">{truncateHash(unit.lastInvoiceHash)}</td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-64 flex-wrap gap-2">
                            {canManageZatca ? (
                              <button
                                type="button"
                                disabled={actionLoading === `csr-${unit.id}`}
                                onClick={() => void generateCsr(unit)}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                {actionLoading === `csr-${unit.id}` ? "Generating..." : "Generate dev CSR placeholder"}
                              </button>
                            ) : null}
                            {canManageZatca ? (
                              <button
                                type="button"
                                disabled
                                className="rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                Local SDK CSR gate disabled
                              </button>
                            ) : null}
                            {unit.hasCsr ? (
                              <button
                                type="button"
                                disabled={actionLoading === `download-csr-${unit.id}`}
                                onClick={() => void downloadCsr(unit)}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                Download CSR
                              </button>
                            ) : null}
                            {canManageZatca ? (
                              <button
                                type="button"
                                disabled={unit.isActive || actionLoading === unit.id}
                                onClick={() => void activateEgsUnit(unit)}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                {unit.isActive ? "Active" : actionLoading === unit.id ? "Activating..." : "Activate dev"}
                              </button>
                            ) : null}
                            {canManageZatca ? (
                              <label className="flex items-center gap-2">
                                <span className="sr-only">Mock OTP</span>
                                <input
                                  value={otpByUnit[unit.id] ?? "000000"}
                                  onChange={(event) => setOtpByUnit((current) => ({ ...current, [unit.id]: event.target.value }))}
                                  className="w-24 rounded-md border border-slate-300 px-2 py-1 font-mono text-xs outline-none focus:border-palm"
                                />
                              </label>
                            ) : null}
                            {canManageZatca ? (
                              <button
                                type="button"
                                disabled={!unit.hasCsr || actionLoading === `csid-${unit.id}`}
                                onClick={() => void requestMockComplianceCsid(unit)}
                                className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                              >
                                {actionLoading === `csid-${unit.id}` ? "Requesting..." : "Request mock CSID"}
                              </button>
                            ) : null}
                            {canManageZatca ? (
                              <button
                                type="button"
                                disabled
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-400 disabled:cursor-not-allowed"
                              >
                                Production CSID coming soon
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-2 text-[11px] text-steel">
                            Local SDK CSR generation requires an approved CSR config review and ZATCA_SDK_CSR_EXECUTION_ENABLED=true. It uses temp files only and still makes no CSID request or network call.
                          </div>
                          <div className="mt-1 text-[11px] text-steel">Use 000000 for local mock mode. Real OTP will come from the ZATCA/FATOORA portal later.</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Recent ZATCA logs</h2>
            <p className="mt-1 text-sm text-steel">Local onboarding and invoice-generation submission records. Network submission is still not implemented.</p>

            <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Response</th>
                    <th className="px-4 py-3">EGS unit</th>
                    <th className="px-4 py-3">Error</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissionLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4">
                        <StatusMessage type="empty">No ZATCA logs have been recorded yet.</StatusMessage>
                      </td>
                    </tr>
                  ) : (
                    submissionLogs.slice(0, 10).map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-steel">{zatcaStatusLabel(log.submissionType)}</td>
                        <td className="px-4 py-3 text-steel">{zatcaStatusLabel(log.status)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{log.responseCode ?? "-"}</td>
                        <td className="px-4 py-3 text-steel">{log.egsUnit?.name ?? "-"}</td>
                        <td className="px-4 py-3 text-steel">{log.errorMessage ?? "-"}</td>
                        <td className="px-4 py-3 text-steel">{new Date(log.submittedAt).toLocaleString()}</td>
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

function CsrConfigPreviewPanel({ preview }: { preview: ZatcaEgsCsrConfigPreviewResponse }) {
  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-ink">Sanitized CSR config preview</div>
          <div className="mt-1 text-[11px] text-steel">Official SDK key order, plain key=value format, no file write, no CSID request, no network call.</div>
        </div>
        <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${preview.canPrepareConfig ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {preview.canPrepareConfig ? "Config preview ready" : "Missing fields"}
        </span>
      </div>
      {preview.missingFields.length > 0 ? (
        <div className="mt-2 text-[11px] text-rosewood">Missing: {preview.missingFields.map((field) => field.key).join(", ")}</div>
      ) : null}
      {preview.reviewFields.length > 0 ? (
        <div className="mt-2 text-[11px] text-amber-700">Needs review: {preview.reviewFields.map((field) => field.key).join(", ")}</div>
      ) : null}
      <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-white p-3 font-mono text-[11px] text-slate-800">{preview.sanitizedConfigPreview}</pre>
      <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-steel md:grid-cols-2">
        <div>No private key, certificate body, CSID token, one-time portal code, or generated CSR body is displayed.</div>
        <div>SDK execution disabled by default. Production compliance: {preview.productionCompliance ? "true" : "false"}.</div>
      </div>
      {preview.blockers.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-rosewood">
          {preview.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}
      {preview.warnings.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-steel">
          {preview.warnings.slice(0, 4).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CsrConfigReviewPanel({
  unit,
  reviews,
  preview,
  canManage,
  actionLoading,
  onCreate,
  onApprove,
  onRevoke,
}: {
  unit: ZatcaEgsUnit;
  reviews: ZatcaCsrConfigReview[];
  preview: ZatcaEgsCsrConfigPreviewResponse | null;
  canManage: boolean;
  actionLoading: string;
  onCreate: () => void;
  onApprove: (review: ZatcaCsrConfigReview) => void;
  onRevoke: (review: ZatcaCsrConfigReview) => void;
}) {
  const latest = reviews[0] ?? null;
  const missingCount = jsonArrayLength(latest?.missingFieldsJson);
  const blockerCount = jsonArrayLength(latest?.blockersJson);
  const canApprove = Boolean(canManage && latest?.status === "DRAFT" && preview?.canPrepareConfig && missingCount === 0 && blockerCount === 0);
  const canRevoke = Boolean(canManage && latest && (latest.status === "DRAFT" || latest.status === "APPROVED"));
  const createDisabled = !canManage || !preview || actionLoading === `csr-review-create-${unit.id}`;

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-ink">CSR config review</div>
          <div className="mt-1 text-[11px] text-steel">Local operator approval tracking only. Approval is required before the disabled-by-default SDK CSR generation gate can run.</div>
        </div>
        <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${latest?.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : latest ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
          {latest ? latest.status.replaceAll("_", " ") : "NO REVIEW"}
        </span>
      </div>
      {latest ? (
        <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-steel md:grid-cols-2">
          <div>Config hash: <span className="font-mono text-ink">{truncateHash(latest.configHash, 10)}</span></div>
          <div>Created: {new Date(latest.createdAt).toLocaleString()}</div>
          <div>Missing fields at review: {missingCount}</div>
          <div>Blockers at review: {blockerCount}</div>
          <div>Approved by: {latest.approvedBy?.email ?? latest.approvedById ?? "-"}</div>
          <div>Approved at: {latest.approvedAt ? new Date(latest.approvedAt).toLocaleString() : "-"}</div>
        </div>
      ) : (
        <div className="mt-3 text-[11px] text-steel">Load the sanitized CSR config preview, then create a local review record before any future controlled SDK CSR generation phase.</div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={createDisabled}
          onClick={onCreate}
          className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
        >
          {actionLoading === `csr-review-create-${unit.id}` ? "Creating review..." : "Create CSR config review"}
        </button>
        <button
          type="button"
          disabled={!latest || !canApprove || actionLoading === `csr-review-approve-${latest?.id}`}
          onClick={() => latest && onApprove(latest)}
          className="rounded-md border border-emerald-600 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
        >
          {latest && actionLoading === `csr-review-approve-${latest.id}` ? "Approving..." : "Approve review"}
        </button>
        <button
          type="button"
          disabled={!latest || !canRevoke || actionLoading === `csr-review-revoke-${latest?.id}`}
          onClick={() => latest && onRevoke(latest)}
          className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rosewood hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
        >
          {latest && actionLoading === `csr-review-revoke-${latest.id}` ? "Revoking..." : "Revoke review"}
        </button>
      </div>
      {!preview ? <div className="mt-2 text-[11px] text-amber-700">Preview must be loaded before creating or approving a review.</div> : null}
      {latest && !canApprove && latest.status === "DRAFT" ? <div className="mt-2 text-[11px] text-amber-700">Approval requires a ready preview with no missing fields or blockers.</div> : null}
      <div className="mt-2 text-[11px] text-steel">
        Approval is local-only. It does not request CSID, does not call ZATCA, does not sign invoices, and does not prove production compliance. SDK CSR execution still requires ZATCA_SDK_CSR_EXECUTION_ENABLED=true.
      </div>
    </div>
  );
}

function jsonArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
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

function unitToCsrFieldsForm(unit?: ZatcaEgsUnit): EgsCsrFieldsForm {
  return {
    csrCommonName: unit?.csrCommonName ?? "",
    csrSerialNumber: unit?.csrSerialNumber ?? "",
    csrOrganizationUnitName: unit?.csrOrganizationUnitName ?? "",
    csrInvoiceType: unit?.csrInvoiceType ?? "",
    csrLocationAddress: unit?.csrLocationAddress ?? "",
  };
}

function buildCsrFieldsByUnit(units: ZatcaEgsUnit[]): Record<string, EgsCsrFieldsForm> {
  return Object.fromEntries(units.map((unit) => [unit.id, unitToCsrFieldsForm(unit)]));
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

function SmallInput({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-steel">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-palm disabled:bg-slate-50 disabled:text-slate-400"
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

function AdapterSummary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}

function ReadinessSummary({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs font-medium ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        {zatcaReadinessLabel(ready)}
      </div>
      <div className="mt-1 text-xs text-steel">{detail}</div>
    </div>
  );
}

function ReadinessCheckCard({ title, section }: { title: string; section: ZatcaReadinessSection }) {
  const visibleChecks = section.checks.slice(0, 4);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-xs text-steel">{section.scope.replaceAll("_", " ").toLowerCase()}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${zatcaReadinessStatusBadgeClass(section.status)}`}>
          {zatcaReadinessStatusLabel(section.status)}
        </span>
      </div>
      {visibleChecks.length ? (
        <ul className="mt-3 space-y-2 text-xs text-steel">
          {visibleChecks.map((check) => (
            <li key={`${check.code}-${check.field}`}>
              <span className="font-medium text-ink">{check.field}</span>: {check.message}
              {check.sourceRule ? <span className="ml-1 text-slate-500">({check.sourceRule})</span> : null}
              <div className="mt-1 text-slate-500">{check.fixHint}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-emerald-700">No readiness issues detected for this section.</p>
      )}
      {section.checks.length > visibleChecks.length ? <p className="mt-2 text-xs text-steel">+{section.checks.length - visibleChecks.length} more checks.</p> : null}
    </div>
  );
}

function SdkReadinessSummary({ label, value, detail }: { label: string; value: boolean; detail?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs font-medium ${value ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        {zatcaSdkReadinessLabel(value)}
      </div>
      {detail ? <div className="mt-1 text-xs text-steel">{detail}</div> : null}
    </div>
  );
}

function HashChainStatusPanel({
  sdkReadiness,
  resetPlan,
  canManage,
  actionLoading,
  reasonByUnit,
  confirmByUnit,
  onReasonChange,
  onConfirmChange,
  onEnableSdkHashMode,
}: {
  sdkReadiness: ZatcaSdkReadinessResponse | null;
  resetPlan: ZatcaHashChainResetPlan | null;
  canManage: boolean;
  actionLoading: string;
  reasonByUnit: Record<string, string>;
  confirmByUnit: Record<string, boolean>;
  onReasonChange: (unitId: string, value: string) => void;
  onConfirmChange: (unitId: string, value: boolean) => void;
  onEnableSdkHashMode: (unitId: string) => void;
}) {
  const hashMode = resetPlan?.hashMode ?? sdkReadiness?.hashMode ?? null;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Hash-chain status</h2>
          <p className="mt-1 text-sm text-steel">Read-only planning for replacing LedgerByte local hashes with official SDK/C14N11 hashes later.</p>
        </div>
        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">SDK hash not stored</span>
      </div>
      <StatusMessage type="info">SDK hash replacement is not active. No EGS ICV, last hash, or invoice metadata is reset from this page.</StatusMessage>
      <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
        <AdapterSummary label="Hash mode" value={zatcaHashModeLabel(hashMode?.mode)} />
        <AdapterSummary label="SDK execution" value={sdkReadiness ? zatcaSdkExecutionLabel(sdkReadiness.enabled) : "Unknown"} />
        <AdapterSummary label="SDK hash readiness" value={sdkReadiness?.canRunLocalValidation ? "Ready locally" : "Blocked"} />
        <AdapterSummary label="Reset plan" value={resetPlan?.dryRunOnly ? "Dry run only" : canManage ? "Unavailable" : "Admin only"} />
        <AdapterSummary label="Active EGS units" value={resetPlan ? String(resetPlan.summary.activeEgsUnitCount) : "-"} />
        <AdapterSummary label="Current ICV" value={resetPlan?.summary.currentIcv === null || resetPlan?.summary.currentIcv === undefined ? "-" : String(resetPlan.summary.currentIcv)} />
        <AdapterSummary label="Current last hash" value={truncateHash(resetPlan?.summary.currentLastInvoiceHash)} />
        <AdapterSummary label="Invoice metadata rows" value={resetPlan ? String(resetPlan.summary.invoicesWithMetadataCount) : "-"} />
      </div>
      {hashMode?.blockingReasons.length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-rosewood">
          {hashMode.blockingReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {hashMode?.warnings.length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber-700">
          {hashMode.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {resetPlan ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">{zatcaResetPlanWarningLabel(resetPlan.dryRunOnly)}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-steel">
                {resetPlan.resetRisks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Recommended next steps</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-steel">
                {resetPlan.recommendedNextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">EGS hash mode enablement</h3>
            <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-3 py-2">EGS unit</th>
                    <th className="px-3 py-2">Hash mode</th>
                    <th className="px-3 py-2">Metadata</th>
                    <th className="px-3 py-2">ICV</th>
                    <th className="px-3 py-2">Enable SDK mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resetPlan.egsUnits.map((unit) => {
                    const reason = reasonByUnit[unit.id] ?? "";
                    const confirmed = confirmByUnit[unit.id] === true;
                    const canEnable = canManage && canEnableZatcaSdkHashMode(unit);
                    const enableDisabled = !canEnable || reason.trim().length < 10 || !confirmed || actionLoading === `sdk-hash-${unit.id}`;
                    return (
                      <tr key={unit.id} className="align-top">
                        <td className="px-3 py-3">
                          <div className="font-medium text-ink">{unit.name}</div>
                          <div className="mt-1 text-steel">{unit.environment} {unit.isActive ? "active" : "inactive"}</div>
                          <div className="mt-1 font-mono text-[11px] text-steel">{truncateHash(unit.lastInvoiceHash)}</div>
                          <div className="mt-1 text-[11px] text-amber-700">CSR dry-run only; no CSID request or network call.</div>
                        </td>
                        <td className="px-3 py-3">{zatcaHashModeLabel(unit.hashMode)}</td>
                        <td className="px-3 py-3">{unit.metadataCount}</td>
                        <td className="px-3 py-3">{unit.lastIcv}</td>
                        <td className="min-w-[260px] px-3 py-3">
                          <div className={canEnable ? "text-emerald-700" : "text-amber-700"}>
                            {canEnable ? "Eligible after confirmation" : zatcaSdkHashModeEnableBlockerLabel(unit.enableSdkHashModeBlockers)}
                          </div>
                          {canManage ? (
                            <div className="mt-3 space-y-2">
                              <input
                                value={reason}
                                onChange={(event) => onReasonChange(unit.id, event.target.value)}
                                placeholder="Reason for fresh EGS SDK hash mode"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                disabled={!canEnable}
                              />
                              <label className="flex items-start gap-2 text-xs text-steel">
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={confirmed}
                                  disabled={!canEnable}
                                  onChange={(event) => onConfirmChange(unit.id, event.target.checked)}
                                />
                                <span>I confirm this fresh EGS starts a local-only SDK hash chain. No signing or submission is enabled.</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => onEnableSdkHashMode(unit.id)}
                                disabled={enableDisabled}
                                className="rounded-md bg-palm px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {actionLoading === `sdk-hash-${unit.id}` ? "Enabling..." : "Enable SDK hash mode"}
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChecklistSummary({ title, counts }: { title: string; counts: Record<string, number> }) {
  return (
    <div className="mt-4">
      <div className="text-xs font-medium uppercase tracking-wide text-steel">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(counts).map(([key, value]) => (
          <span key={key} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            {zatcaStatusLabel(key)}: {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChecklistGroup({ category, items }: { category: string; items: ZatcaChecklistItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{zatcaStatusLabel(category)}</h3>
      <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Manual dependency</th>
              <th className="px-4 py-3">Code references</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{item.title}</div>
                  <div className="mt-1 text-xs text-steel">{item.description}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${zatcaChecklistStatusBadgeClass(item.status)}`}>{zatcaStatusLabel(item.status)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${zatcaChecklistRiskBadgeClass(item.riskLevel)}`}>{item.riskLevel}</span>
                </td>
                <td className="px-4 py-3 text-xs text-steel">{item.manualDependency ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="space-y-1 font-mono text-[11px] text-steel">
                    {item.codeReferences.map((reference) => (
                      <div key={reference}>{reference}</div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
