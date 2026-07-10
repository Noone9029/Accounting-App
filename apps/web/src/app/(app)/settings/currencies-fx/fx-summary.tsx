import { LedgerPanel, LedgerStatusBadge, LedgerSummaryBand } from "@/components/ui/ledger-system";
import type { FxCurrencyCatalog, FxReadiness } from "@/lib/foreign-exchange";

export function FxSummary({ catalog, readiness }: Readonly<{ catalog: FxCurrencyCatalog; readiness: FxReadiness }>) {
  return (
    <LedgerSummaryBand tone="warning">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold text-ink">Controlled FX foundation</h2>
          <p className="mt-1">Base currency is {catalog.baseCurrency}. It is fixed for captured-rate evidence and cannot be changed here.</p>
          <p className="mt-1">Manual rate capture only. Captured rates are immutable accounting evidence.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LedgerStatusBadge tone="warning">Live rate provider is disabled</LedgerStatusBadge>
          <LedgerStatusBadge tone="warning">Foreign document posting disabled</LedgerStatusBadge>
        </div>
      </div>
      {!readiness.foreignDocumentPostingEnabled ? (
        <p className="mt-3 border-t border-amber-200 pt-3">
          Foreign-currency document posting remains disabled until document, posting, settlement, and report controls are complete.
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
          <p className="mt-1 text-sm leading-6 text-steel">Configuration status is evidence only; it does not enable foreign document posting.</p>
        </div>
        <LedgerStatusBadge tone={readiness.accountConfigurationComplete ? "success" : "warning"}>
          {readiness.accountConfigurationComplete ? "Account configuration complete" : "Account configuration incomplete"}
        </LedgerStatusBadge>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-steel" aria-label="FX readiness blockers">
        {readiness.blockers.map((blocker) => (
          <li key={blocker} className="border-l-2 border-amber-300 pl-3">
            {blocker}
          </li>
        ))}
      </ul>
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
