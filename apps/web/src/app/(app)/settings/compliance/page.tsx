"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, ShieldCheck } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { complianceStatusLabel, getComplianceReadiness } from "@/lib/compliance";
import type { ComplianceReadinessCheck, ComplianceReadinessResponse } from "@/lib/types";

export default function ComplianceSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const [readiness, setReadiness] = useState<ComplianceReadinessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getComplianceReadiness()
      .then((result) => {
        if (!cancelled) {
          setReadiness(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load compliance readiness.");
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

  const checkCounts = useMemo(() => {
    const checks = readiness?.uae.readiness.checks ?? [];
    return {
      pass: checks.filter((check) => check.status === "PASS").length,
      warning: checks.filter((check) => check.status === "WARNING").length,
      fail: checks.filter((check) => check.status === "FAIL").length,
    };
  }, [readiness]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Compliance readiness</h1>
        <p className="mt-1 text-sm text-steel">Track LedgerByte compliance-core status, UAE Peppol/PINT-AE data readiness, and disabled ASP connectivity.</p>
      </header>

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to view compliance readiness.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading compliance readiness...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      {readiness ? (
        <>
          <section className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-sky-950">Controlled beta compliance foundation</h2>
                <p className="mt-1">{readiness.claim}</p>
                <p className="mt-1">No ASP, FTA, ZATCA, signing, clearance, reporting, or provider network call is enabled by default.</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Metric label="Readiness" value={complianceStatusLabel(readiness.uae.readiness.status)} />
            <Metric label="Checks passing" value={`${checkCounts.pass}/${readiness.uae.readiness.checks.length}`} />
            <Metric label="Buyer endpoints" value={`${readiness.uae.buyerEndpointCoverage.buyerPeppolParticipantCount}/${readiness.uae.buyerEndpointCoverage.activeBuyerCount}`} />
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">UAE Peppol/PINT-AE checklist</h2>
                <p className="mt-1 text-sm text-steel">{readiness.uae.framework}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                {readiness.noNetworkByDefault ? "No network" : "Network configured"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {readiness.uae.readiness.checks.map((check) => (
                <ReadinessCheckRow key={check.key} check={check} />
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">UAE rollout dates</h2>
              <div className="mt-3 space-y-3">
                {readiness.uae.deadlines.map((deadline) => (
                  <div key={deadline.segment} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-ink">{deadline.segment}</p>
                    <p className="mt-1 text-steel">ASP appointment by {deadline.appointAspBy}; implementation by {deadline.implementBy}.</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Official references</h2>
              <div className="mt-3 space-y-2">
                {readiness.uae.sources.map((source) => (
                  <a key={source} href={source} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-palm hover:underline">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    {sourceLabel(source)}
                  </a>
                ))}
              </div>
            </section>
          </section>

          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <h2 className="font-semibold text-amber-950">Claims to avoid</h2>
            <p className="mt-1">{readiness.prohibitedClaims.join(", ")}.</p>
            {readiness.uae.readiness.warnings.map((warning) => (
              <p key={warning} className="mt-1">
                {warning}
              </p>
            ))}
          </section>
        </>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function ReadinessCheckRow({ check }: { check: ComplianceReadinessCheck }) {
  const Icon = check.status === "PASS" ? CheckCircle2 : check.status === "WARNING" ? AlertTriangle : CircleDashed;
  const color = check.status === "PASS" ? "text-palm" : check.status === "WARNING" ? "text-amber-700" : "text-slate-500";
  return (
    <div className="flex gap-3 rounded-md border border-slate-200 p-3">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-ink">{check.label}</p>
        <p className="mt-1 text-sm text-steel">{check.detail}</p>
      </div>
    </div>
  );
}

function sourceLabel(source: string): string {
  if (source.includes("OpenPeppol") || source.includes("peppol")) {
    return "OpenPeppol PINT-AE v1.0.1";
  }
  if (source.includes("pre-approved")) {
    return "MoF pre-approved eInvoicing service providers";
  }
  if (source.includes("Ministerial-Decision")) {
    return "Ministerial Decision No. 244 of 2025";
  }
  return "MoF UAE Electronic Invoicing Guidelines";
}
