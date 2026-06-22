"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import Link from "next/link";
import {
  LedgerButton,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSidePanel,
  LedgerSummaryBand,
  buttonClassName,
} from "@/components/ui/ledger-system";
import {
  firstAccountingWorkflowSteps,
  firstAccountingWorkflowSummary,
  setupWizardDashboardSummary,
  setupWizardSteps,
  setupWizardSummary,
} from "@/lib/dashboard";
import { getLedgerByteEdition } from "@/lib/edition";
import type { DashboardOnboardingChecklist, DashboardOnboardingChecklistItemStatus } from "@/lib/types";
import { TypedOnboardingChecklistPreview } from "./typed-onboarding-checklist-preview";

export function SetupWizardContent({ checklist }: Readonly<{ checklist: DashboardOnboardingChecklist }>) {
  const edition = getLedgerByteEdition();
  const summary = setupWizardSummary(checklist, edition.market);
  const steps = setupWizardSteps(checklist, edition.market);
  const workflowSummary = firstAccountingWorkflowSummary(checklist, edition.market);
  const workflowSteps = firstAccountingWorkflowSteps(checklist, edition.market);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Workspace setup"
        title="Guided setup"
        description={
          <>
            Follow the first accounting loop: profile, VAT, customer, invoice, payment, and report. This read-only
            guide checks live workspace data and links to the right screens without creating records, finalizing
            invoices, submitting tax-authority data, or changing setup for you.
            <span className="mt-1 block text-xs">Checklist generated {new Date(checklist.generatedAt).toLocaleString()}.</span>
          </>
        }
        actions={
          <LedgerButton href="/dashboard" icon={ArrowRight}>
            Back to dashboard
          </LedgerButton>
        }
      />

      <LedgerPageBody>
        <FirstWorkflowPanel summary={workflowSummary} steps={workflowSteps} />

        <TypedOnboardingChecklistPreview />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="space-y-4">
            <div className={`rounded-md border px-4 py-4 ${summary.statusClassName}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {summary.readyForControlledBetaReview ? "Ready for controlled beta review" : summary.statusLabel}
                  </div>
                  <div className="mt-1 text-xs">
                    {summary.completedSteps} of {summary.totalSteps} setup steps complete.
                  </div>
                </div>
                <div className="font-mono text-2xl font-semibold">{summary.progressPercent}%</div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/70">
                <div className="h-2 rounded-full bg-current" style={{ width: summary.progressWidth }} />
              </div>
            </div>

            <LedgerSidePanel title="Next step">
              {summary.nextStep ? (
                <div>
                  <div className="font-medium text-ink">{summary.nextStep.title}</div>
                  <p className="mt-1 text-sm leading-6 text-steel">{summary.nextStep.description}</p>
                  <LedgerButton href={summary.nextStep.actionHref} variant="primary" icon={ArrowRight} className="mt-3">
                    {summary.nextStep.actionLabel}
                  </LedgerButton>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-steel">
                  Ready for controlled beta review. Country-specific compliance modules stay local-readiness only until
                  provider credentials, production review, and compliance review are connected.
                </p>
              )}
            </LedgerSidePanel>

            {summary.topBlockers.length > 0 ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Top blockers
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-5">
                  {summary.topBlockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <LedgerSummaryBand tone="info">{edition.complianceDashboardNote}</LedgerSummaryBand>
          </aside>

          <div className="space-y-4">
            {steps.map((step) => (
              <SetupWizardStepCard key={step.id} step={step} />
            ))}
          </div>
        </div>
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function SetupWizardFallback({ message }: Readonly<{ message: string }>) {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Workspace setup"
        title="Guided setup"
        description="Checklist-backed setup guidance is temporarily unavailable."
      />
      <LedgerSummaryBand tone="warning">{message}</LedgerSummaryBand>
    </LedgerPage>
  );
}

export function DashboardOnboardingCard({ checklist }: Readonly<{ checklist: DashboardOnboardingChecklist }>) {
  const edition = getLedgerByteEdition();
  const summary = setupWizardDashboardSummary(checklist, edition.market);

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-ink">First accounting workflow</h2>
        <Link href={summary.setupHref} className="inline-flex items-center gap-1 self-start text-xs font-semibold text-palm hover:underline">
          Open setup wizard
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-4 rounded-md border border-slate-100 bg-mist px-3 py-3 text-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="font-semibold text-ink">{summary.workflowProgressPercent}% complete</div>
            <div className="mt-1 text-xs text-steel">
              {summary.nextWorkflowStep ? `Next: ${summary.nextWorkflowStep.title}` : "First workflow complete"}
            </div>
          </div>
          <div className="text-xs text-steel sm:text-right">{summary.conciseBlockerSummary}</div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white">
          <div
            className="h-2 rounded-full bg-palm"
            style={{ width: summary.workflowProgressWidth }}
          />
        </div>
      </div>
      {summary.nextWorkflowStep ? (
        <LedgerButton href={summary.nextWorkflowStep.actionHref} variant="primary" icon={ArrowRight} className="mt-3">
          {summary.nextWorkflowStep.actionLabel}
        </LedgerButton>
      ) : null}
      <div className="mt-3 text-xs leading-5 text-steel">
        Read-only checklist guidance. {edition.complianceDashboardNote}
      </div>
    </LedgerPanel>
  );
}

export function DashboardFirstWorkflowPrompt({ checklist }: Readonly<{ checklist: DashboardOnboardingChecklist | null }>) {
  const edition = getLedgerByteEdition();
  const summary = checklist ? setupWizardDashboardSummary(checklist, edition.market) : null;
  const nextStep = summary?.nextWorkflowStep;

  return (
    <LedgerSummaryBand tone="success">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="font-semibold text-ink">Start with one complete sale</div>
          <p className="mt-1 max-w-3xl leading-6">
            LedgerByte becomes useful once a customer, invoice, payment, and report exist. The setup wizard checks those
            milestones from real workspace data.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
          {nextStep ? (
            <Link href={nextStep.actionHref} className={buttonClassName({ variant: "primary" })}>
              {nextStep.actionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
          <Link href="/setup" className={buttonClassName({ variant: "secondary" })}>
            Open setup
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </LedgerSummaryBand>
  );
}

function FirstWorkflowPanel({
  summary,
  steps,
}: Readonly<{
  summary: ReturnType<typeof firstAccountingWorkflowSummary>;
  steps: ReturnType<typeof firstAccountingWorkflowSteps>;
}>) {
  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">First accounting workflow</h2>
          <p className="mt-1 text-sm leading-6 text-steel">
            Complete one customer sale from setup through report review. Each step is based on existing records, not a
            simulated completion flag.
          </p>
        </div>
        <div className="w-full lg:w-44">
          <div className="text-sm font-semibold text-ink lg:text-right">{summary.progressPercent}% complete</div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-palm" style={{ width: summary.progressWidth }} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <Link
            key={step.id}
            href={step.actionHref}
            className="flex min-w-0 items-start gap-3 rounded-md border border-slate-200 px-3 py-3 hover:border-palm/40 hover:bg-slate-50"
          >
            <div className={`mt-0.5 ${step.statusClassName}`}>
              <StatusIcon status={step.status} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase text-steel">Step {index + 1}</div>
              <div className="mt-1 text-sm font-semibold text-ink">{step.title}</div>
              <div className="mt-1 text-xs leading-5 text-steel">{step.statusLabel}</div>
            </div>
          </Link>
        ))}
      </div>
      {summary.nextStep ? (
        <Link href={summary.nextStep.actionHref} className={buttonClassName({ variant: "primary", className: "mt-4" })}>
          Continue: {summary.nextStep.title}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </LedgerPanel>
  );
}

function SetupWizardStepCard({ step }: Readonly<{ step: ReturnType<typeof setupWizardSteps>[number] }>) {
  return (
    <LedgerPanel>
      <article data-testid={`setup-step-${step.id}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase ${step.statusClassName}`}>
              <StatusIcon status={step.status} />
              {step.statusLabel}
            </div>
            <h2 className="mt-2 text-lg font-semibold text-ink">{step.title}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{step.description}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{step.safeExplanation}</p>
          </div>
          <Link href={step.actionHref} className={buttonClassName({ variant: "secondary", className: "md:self-start" })}>
            {step.actionLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <StepList title="Evidence" items={step.evidence} empty="No evidence reported yet." />
          <StepList title="Blockers" items={step.blockers} empty="No blockers." />
          <StepList title="Warnings" items={step.warnings} empty="No warnings." />
        </div>
      </article>
    </LedgerPanel>
  );
}

function StepList({ title, items, empty }: Readonly<{ title: string; items: string[]; empty: string }>) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="text-xs font-semibold uppercase text-steel">{title}</div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5 text-sm leading-5 text-slate-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 text-sm text-steel">{empty}</div>
      )}
    </div>
  );
}

function StatusIcon({ status }: Readonly<{ status: DashboardOnboardingChecklistItemStatus }>) {
  const className = "h-4 w-4";
  switch (status) {
    case "COMPLETE":
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case "WARNING":
      return <CircleDashed className={className} aria-hidden="true" />;
    case "INCOMPLETE":
      return <XCircle className={className} aria-hidden="true" />;
  }
}
