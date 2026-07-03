"use client";

import { AlertTriangle, CheckCircle2, CircleDashed, ShieldCheck } from "lucide-react";
import { useAppLocale } from "@/components/app-locale-provider";
import { complianceStatusLabel } from "@/lib/compliance";
import type { ComplianceReadinessCheck, ComplianceSourceReadinessResponse, UaePartyReadinessReport } from "@/lib/types";

export function UaeEinvoiceReadinessPanel({
  title,
  response,
  actionLoading,
  canValidate,
  onValidate,
}: {
  title: string;
  response: ComplianceSourceReadinessResponse | null;
  actionLoading: boolean;
  canValidate: boolean;
  onValidate: () => void;
}) {
  const { tc } = useAppLocale();
  if (!response) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm text-steel">{tc("UAE eInvoicing readiness is available when compliance view permission is granted.")}</p>
      </section>
    );
  }

  const latestValidation = response.complianceDocument?.validationResults?.[0] ?? null;
  const latestArchive = response.complianceDocument?.archiveRecords?.[0] ?? null;
  const sections = [
    response.readiness.seller,
    response.readiness.buyer,
    response.readiness.invoiceFields,
    response.readiness.taxIdentity,
    response.readiness.peppolParticipant,
    ...(response.readiness.originalReference ? [response.readiness.originalReference] : []),
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">
            {tc("Local readiness and official PINT-AE XML generation for controlled beta/user-testing only. ASP validation is not connected yet; no ASP submission, FTA reporting, provider network call, or production compliance claim is made.")}
          </p>
        </div>
        <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${response.canAttemptLocalXmlGeneration ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {response.canAttemptLocalXmlGeneration ? tc("Official PINT-AE XML can be generated locally") : tc("Needs local readiness data")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <Summary label="Source status" value={tc(response.sourceStatus)} />
        <Summary label="Local readiness" value={tc(complianceStatusLabel(response.readiness.status))} />
        <Summary label="Local only" value={response.localOnly ? tc("Yes") : tc("No")} />
        <Summary label="Latest validation" value={latestValidation?.status ? tc(latestValidation.status) : response.complianceDocument?.latestValidationStatus ? tc(response.complianceDocument.latestValidationStatus) : "-"} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {sections.map((section) => (
          <ReadinessSection key={section.label} section={section} />
        ))}
      </div>

      {response.readiness.validation.issues.length ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <h3 className="text-sm font-semibold text-amber-950">{tc("Validation messages")}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">
            {response.readiness.validation.issues.slice(0, 6).map((issue) => (
              <li key={`${issue.code}:${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {latestValidation || latestArchive ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-steel">
          {latestValidation ? <p>{tc("Latest local validation result")}: {latestValidation.summary}</p> : null}
          {latestArchive ? <p className="mt-1">{tc("Archive metadata")}: {latestArchive.filename ?? "XML metadata"} {tc("hash")} {latestArchive.contentHash ?? "-"}; {tc("payload body stored")}: {tc("no")}.</p> : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onValidate}
          disabled={actionLoading || !canValidate || response.sourceStatus !== "FINALIZED"}
          className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {actionLoading ? tc("Validating...") : tc("Validate UAE eInvoice readiness")}
        </button>
        {!canValidate ? <span className="text-xs text-amber-700">{tc("Requires compliance prepare and local validation permissions.")}</span> : null}
        {response.sourceStatus !== "FINALIZED" ? <span className="text-xs text-steel">{tc("Available after document finalization.")}</span> : null}
        <span className="inline-flex items-center gap-1 text-xs text-steel">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {tc("ASP validation not connected yet; no network, no ASP submission, no FTA reporting.")}
        </span>
      </div>
    </section>
  );
}

function ReadinessSection({ section }: { section: UaePartyReadinessReport }) {
  const { tc } = useAppLocale();
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{tc(section.label)}</h3>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${section.status === "READY_FOR_VALIDATION" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {tc(complianceStatusLabel(section.status))}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {section.checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: ComplianceReadinessCheck }) {
  const { tc } = useAppLocale();
  const Icon = check.status === "PASS" ? CheckCircle2 : check.status === "WARNING" ? AlertTriangle : CircleDashed;
  const color = check.status === "PASS" ? "text-palm" : check.status === "WARNING" ? "text-amber-700" : "text-slate-500";
  return (
    <div className="flex gap-2 text-xs">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
      <div>
        <p className="font-medium text-ink">{tc(check.label)}</p>
        <p className="mt-0.5 text-steel">{check.detail}</p>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  const { tc } = useAppLocale();
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{tc(label)}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
