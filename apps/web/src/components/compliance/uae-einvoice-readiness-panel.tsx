"use client";

import { AlertTriangle, CheckCircle2, CircleDashed, ShieldCheck } from "lucide-react";
import { LedgerAlert, LedgerButton, LedgerPanel, LedgerStatusBadge, LedgerSummaryBand, type LedgerStatusTone } from "@/components/ui/ledger-system";
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
  if (!response) {
    return (
      <LedgerPanel>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm text-steel">UAE eInvoicing readiness is available when compliance view permission is granted.</p>
      </LedgerPanel>
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
    <LedgerPanel>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">
            Local readiness and official PINT-AE XML generation for controlled beta/user-testing only. ASP validation is not connected yet; no ASP submission, FTA reporting, provider network call, or production compliance claim is made.
          </p>
        </div>
        <LedgerStatusBadge tone={response.canAttemptLocalXmlGeneration ? "success" : "warning"}>
          {response.canAttemptLocalXmlGeneration ? "Official PINT-AE XML can be generated locally" : "Needs local readiness data"}
        </LedgerStatusBadge>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <Summary label="Source status" value={response.sourceStatus} />
        <Summary label="Local readiness" value={complianceStatusLabel(response.readiness.status)} />
        <Summary label="Local only" value={response.localOnly ? "Yes" : "No"} />
        <Summary label="Latest validation" value={latestValidation?.status ?? response.complianceDocument?.latestValidationStatus ?? "-"} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {sections.map((section) => (
          <ReadinessSection key={section.label} section={section} />
        ))}
      </div>

      {response.readiness.validation.issues.length ? (
        <div className="mt-4">
        <LedgerAlert tone="warning" title="Validation messages">
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">
            {response.readiness.validation.issues.slice(0, 6).map((issue) => (
              <li key={`${issue.code}:${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </LedgerAlert>
        </div>
      ) : null}

      {latestValidation || latestArchive ? (
        <div className="mt-4">
        <LedgerSummaryBand>
          {latestValidation ? <p>Latest local validation result: {latestValidation.summary}</p> : null}
          {latestArchive ? <p className="mt-1">Archive metadata: {latestArchive.filename ?? "XML metadata"} hash {latestArchive.contentHash ?? "-"}; payload body stored: no.</p> : null}
        </LedgerSummaryBand>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <LedgerButton
          type="button"
          onClick={onValidate}
          disabled={actionLoading || !canValidate || response.sourceStatus !== "FINALIZED"}
          variant="primary"
        >
          {actionLoading ? "Validating..." : "Validate UAE eInvoice readiness"}
        </LedgerButton>
        {!canValidate ? <span className="text-xs text-amber-700">Requires compliance prepare and local validation permissions.</span> : null}
        {response.sourceStatus !== "FINALIZED" ? <span className="text-xs text-steel">Available after document finalization.</span> : null}
        <span className="inline-flex items-center gap-1 text-xs text-steel">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          ASP validation not connected yet; no network, no ASP submission, no FTA reporting.
        </span>
      </div>
    </LedgerPanel>
  );
}

function ReadinessSection({ section }: { section: UaePartyReadinessReport }) {
  return (
    <LedgerPanel className="p-3 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{section.label}</h3>
        <LedgerStatusBadge tone={complianceStatusTone(section.status)}>{complianceStatusLabel(section.status)}</LedgerStatusBadge>
      </div>
      <div className="mt-3 space-y-2">
        {section.checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </div>
    </LedgerPanel>
  );
}

function CheckRow({ check }: { check: ComplianceReadinessCheck }) {
  const Icon = check.status === "PASS" ? CheckCircle2 : check.status === "WARNING" ? AlertTriangle : CircleDashed;
  const color = check.status === "PASS" ? "text-palm" : check.status === "WARNING" ? "text-amber-700" : "text-slate-500";
  return (
    <div className="flex gap-2 text-xs">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
      <div>
        <p className="font-medium text-ink">{check.label}</p>
        <p className="mt-0.5 text-steel">{check.detail}</p>
      </div>
    </div>
  );
}

function complianceStatusTone(status: string): LedgerStatusTone {
  if (status === "READY_FOR_VALIDATION" || status === "PASS" || status === "READY") {
    return "success";
  }
  if (status === "BLOCKED" || status === "FAIL") {
    return "danger";
  }
  return "warning";
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
