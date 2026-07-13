# Close readiness policy

## Severity

- `BLOCKER` prevents preparation, review, close, and lock. System-generated blockers are non-overridable unless a separate, existing accounting policy explicitly allows an override.
- `WARNING` requires visible acknowledgement with a safe reason when acknowledgement is available. It does not silently become complete.
- `INFORMATION` records useful context and never prevents close.
- `NOT_APPLICABLE` is excluded from completion counts.

System-generated checks are derived from their source services and cannot be manually completed. Manual checklist tasks may be assigned, completed, reopened, and evidenced without mutating accounting records.

## Current policy mapping

FX blockers remain blockers because `FxCloseReadinessService` already enforces them at the existing fiscal-period transition. Recurring readiness remains warning-level because its existing contract sets `blocksFiscalClose` to `false`; when scoped to a fiscal period, it uses each run's scheduled local date rather than the UTC scheduling instant, matching the generated accounting document's `entryDate`. Manual draft journals dated within the selected fiscal period are an authoritative `WARNING`: LedgerByte surfaces their count and latest source update for accountant review, including recurring-generated journals by their current `entryDate`, but does not auto-post or alter them. Recurring readiness does not duplicate generated journal drafts. New module checks default to `WARNING` until an existing accounting policy proves they must block. Banking and inventory signals only assert what their existing manual workflows can establish; they do not assert direct bank-feed coverage, automatic inventory posting, or complete valuation proof.

## Review and transitions

A cycle may be prepared only with no current blockers and all required manual tasks completed. A reviewer records the exact readiness hash. Any later authoritative hash change invalidates review. Close and lock rerun the checks inside the authoritative transaction and fail closed on stale, unproven, or errored readiness.

Preparer and reviewer are distinct when at least two eligible users exist. A single-user demonstration organization may use a clearly labelled single-user mode only when its explicit organization policy allows it.
