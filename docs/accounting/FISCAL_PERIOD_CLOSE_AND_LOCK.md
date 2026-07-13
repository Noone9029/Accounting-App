# Fiscal-period close and lock

## Authoritative transition boundary

`FiscalPeriodService.close` and `FiscalPeriodService.lock` are the authoritative fiscal-period mutations. The close workspace does not update `FiscalPeriod.status` directly. A close cycle records process, sign-off, safe evidence references, and frozen readiness snapshots; it does not create a competing period authority.

Close and lock recalculate the applicable authoritative readiness checks in the same serializable transaction as the fiscal-period transition. This protects against concurrent changes after review. The transaction fails closed when readiness is stale, errored, blocked, or cannot truthfully reconstruct the requested period state.

## Idempotency and concurrency

Close is idempotent after it reaches `CLOSED`. Lock is idempotent after it reaches `LOCKED`: a compatible repeat returns the existing terminal result rather than creating another transition. A terminal replay first verifies that the tenant-scoped fiscal period has the matching authoritative status; a mismatch is a conflict, not a hidden repair. Neither behavior duplicates a fiscal-period mutation, sign-off, evidence record, snapshot, or audit event. Concurrent requests use the fiscal period’s authoritative claim/version boundary; a losing request receives a conflict or the existing terminal result rather than overwriting state.

`POST /accounting-close/cycles/:id/close` and `POST /accounting-close/cycles/:id/lock` require an `Idempotency-Key` request header. The header is trimmed, must contain 8-128 safe characters (`A-Z`, `a-z`, `0-9`, `.`, `_`, `:`, or `-`), and must be retained by a caller for transport retries of the same action. The service stores only a tenant-scoped hash of that key, a hash of the actor/cycle/version request fingerprint, a safe wire-format response, status code, and request correlation ID; it never stores the raw key or raw request payload.

A matching key and fingerprint returns the recorded result with `replayed: true`, before current-state guards run. This means a delayed retry of a successful close can safely return its original close result after a later lock. Reusing a key for a different actor, cycle, or version returns a conflict. A newly supplied valid key against an already terminal, internally consistent cycle records that terminal result without another fiscal transition. The record, fiscal transition, frozen snapshot, and audit event are written in the same serializable transaction. If final-close drift invalidates review, that committed conflict is also recorded so its retry returns the same safe conflict without duplicate invalidation work.

The reviewed snapshot’s canonical hash excludes capture time but covers normalized readiness content. A changed hash invalidates review. When the final close recheck detects drift, it commits an `IN_PROGRESS` review invalidation and a new `DRAFT` snapshot before returning a conflict; it does not call the fiscal-period close transition. The frozen snapshot is audit evidence of what was checked; it never grants permission to bypass the final authoritative revalidation.

When final lock revalidation detects post-close drift, it commits a new frozen `CLOSED` snapshot, a `LOCK_BLOCKED` audit event, and a safe idempotency conflict before responding; it does not call the fiscal-period lock transition. Recovery is intentionally two-step: an authorized user must first use the existing fiscal-period reopen workflow, then a reviewer may return the now-open closed cycle to `IN_PROGRESS` with a reason for a new refresh, preparation, and review. The close workspace does not reopen periods directly.

## Accounting and historical limits

The close workspace makes no automatic accounting corrections, auto-posts no drafts, and does not rewrite historical journals. Existing authorized reopening behavior is not expanded by this workspace.

FX readiness is reused and retains its historical activity guard. Recurring readiness is reused and remains warning-level while its domain contract says it does not block fiscal close. Bank and inventory checks describe only records the existing manual workflows can prove. The workspace does not claim direct bank-feed completeness, provider submission, statutory compliance, report-pack archival, or backup/PITR restoration.
