# Fiscal-period close and lock

## Authoritative transition boundary

`FiscalPeriodService.close` and `FiscalPeriodService.lock` are the authoritative fiscal-period mutations. The close workspace does not update `FiscalPeriod.status` directly. A close cycle records process, sign-off, safe evidence references, and frozen readiness snapshots; it does not create a competing period authority.

Close and lock recalculate the applicable authoritative readiness checks in the same serializable transaction as the fiscal-period transition. This protects against concurrent changes after review. The transaction fails closed when readiness is stale, errored, blocked, or cannot truthfully reconstruct the requested period state.

## Idempotency and concurrency

Lock is idempotent after it reaches `LOCKED`: a compatible repeat returns the existing locked result rather than creating another transition. Close currently requires `REVIEWED`; after a cycle reaches `CLOSED`, a repeat close is rejected by the cycle-status guard rather than treated as a successful idempotent replay. Neither behavior duplicates a fiscal-period mutation, sign-off, evidence record, or audit event. Concurrent requests use the fiscal period’s authoritative claim/version boundary; a losing request receives a conflict or the existing lock result rather than overwriting state.

The reviewed snapshot’s canonical hash excludes capture time but covers normalized readiness content. A changed hash invalidates review. The frozen snapshot is audit evidence of what was checked; it never grants permission to bypass the final authoritative revalidation.

## Accounting and historical limits

The close workspace makes no automatic accounting corrections, auto-posts no drafts, and does not rewrite historical journals. Existing authorized reopening behavior is not expanded by this workspace.

FX readiness is reused and retains its historical activity guard. Recurring readiness is reused and remains warning-level while its domain contract says it does not block fiscal close. Bank and inventory checks describe only records the existing manual workflows can prove. The workspace does not claim direct bank-feed completeness, provider submission, statutory compliance, report-pack archival, or backup/PITR restoration.
