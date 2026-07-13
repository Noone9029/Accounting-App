# Accountant month-end close workspace

## Authority map

`FiscalPeriodService.close` and `FiscalPeriodService.lock` remain the only fiscal-period mutation paths. Both use serializable transactions, an optimistic status claim, and `FxCloseReadinessService.assertReadyForPeriodClose`. The close workspace must call these methods; it must not update `FiscalPeriod.status` directly.

`AccountingCloseCycle` is a process and evidence record, not a second fiscal-period authority. The operating sequence is `OPEN → IN_PROGRESS → READY_FOR_REVIEW → REVIEWED → CLOSED → LOCKED`; the cycle records the first four process stages while the fiscal period records the authoritative `CLOSED` and `LOCKED` states.

## Current reusable readiness sources

- FX: `FxCloseReadinessService.readiness(organizationId, endsOn, executor)` is authoritative and can block close. It is period-date aware and detects later FX activity that prevents honest historical reconstruction.
- Recurring: `RecurringReadinessService.get(organizationId)` is authoritative for recurring counts. It currently reports `blocksFiscalClose: false`, so the close workspace presents its exceptions as warnings unless the domain service changes that policy.

## Point-in-time and historical limits

Readiness is always a fresh, tenant-scoped observation. Its canonical hash excludes capture timestamps; the snapshot stores `capturedAt` separately. A reviewed hash is invalid when a newly calculated canonical hash differs.

FX has an explicit historical-state guard. Other modules that cannot reconstruct their period state after subsequent activity must return a visible historical-state-unproven result; they must never be inferred green from current data.

## Concurrency boundary

The final close and lock operations must recalculate readiness inside the same serializable transaction as the existing fiscal-period transition. A prior UI refresh or a reviewed snapshot is evidence, not permission to bypass that boundary.

## Current limitations

The existing fiscal-period service permits locking an open or closed period and permits reopening a closed period. The close workspace does not broaden those behaviors. It does not claim report-pack archive execution, provider submission, automatic posting, or historical proof that the underlying services cannot supply. Evidence export is a safe, tenant-scoped reference export, not an attachment-body or report-pack archive.
