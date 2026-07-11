import { LedgerButton, LedgerPanel, LedgerStatusBadge, LedgerSummaryBand } from "@/components/ui/ledger-system";
import type { FxCurrencyCatalog, FxReadiness } from "@/lib/foreign-exchange";

export function FxSummary({ catalog, readiness }: Readonly<{ catalog: FxCurrencyCatalog; readiness: FxReadiness }>) {
  return (
    <LedgerSummaryBand tone={readiness.fxRevaluationEnabled ? "success" : "warning"}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold text-ink">Controlled FX foundation</h2>
          <p className="mt-1">Base currency is {catalog.baseCurrency}. It is fixed for captured-rate evidence and cannot be changed here.</p>
          <p className="mt-1">Manual rate capture only. Captured rates are immutable accounting evidence.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LedgerStatusBadge tone="warning">Live rate provider is disabled</LedgerStatusBadge>
          <LedgerStatusBadge tone={readiness.foreignDocumentPostingEnabled ? "success" : "warning"}>
            {readiness.foreignDocumentPostingEnabled ? "Foreign document posting is enabled" : "Foreign document posting is blocked"}
          </LedgerStatusBadge>
        </div>
      </div>
      {!readiness.fxRevaluationEnabled ? (
        <p className="mt-3 border-t border-amber-200 pt-3">
          Period-end revaluation remains blocked until all realized and unrealized FX posting accounts are configured.
        </p>
      ) : null}
    </LedgerSummaryBand>
  );
}

export function FxReadinessPanel({ readiness }: Readonly<{ readiness: FxReadiness }>) {
  return (
    <LedgerPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Posting readiness</h2>
          <p className="mt-1 text-sm leading-6 text-steel">Configuration gates controlled settlement and period-end gain/loss journals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LedgerStatusBadge tone={readiness.accountConfigurationComplete ? "success" : "warning"}>
            {readiness.accountConfigurationComplete ? "Account configuration complete" : "Account configuration incomplete"}
          </LedgerStatusBadge>
          <LedgerStatusBadge tone={readiness.controlAccountsComplete ? "success" : "warning"}>
            {readiness.controlAccountsComplete ? "AR/AP controls available" : "AR/AP controls unavailable"}
          </LedgerStatusBadge>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-steel" aria-label="FX readiness blockers">
        {readiness.blockers.map((blocker) => (
          <li key={blocker} className="border-l-2 border-amber-300 pl-3">
            {blocker}
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-line pt-4">
        <LedgerButton href="/fx-revaluations" size="sm">Open FX revaluation workspace</LedgerButton>
      </div>
    </LedgerPanel>
  );
}

export function FxRatePermissionPanel() {
  return (
    <LedgerPanel>
      <h2 className="text-base font-semibold text-ink">FX rate evidence unavailable</h2>
      <p className="mt-1 text-sm leading-6 text-steel">FX rate read permission is required to review captured immutable rates.</p>
    </LedgerPanel>
  );
}
