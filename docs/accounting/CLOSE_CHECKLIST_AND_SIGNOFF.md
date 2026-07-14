# Close checklist and sign-off

## System checks and manual work

System checks are read-only results from the close-readiness orchestrator. They cannot be manually completed, acknowledged into a pass, or changed by a stale browser response. A system check changes only when its authoritative source data changes and readiness is refreshed.

Manual checklist tasks are operational evidence, not accounting mutations. A permitted user can have a task assigned, completed, reopened, and evidenced through the existing versioned close workflow; `accountingClose.manage` can assign a non-system task only to an active member of the same organization. The reader-visible task response exposes only the assignee ID and display name; the assignment lookup is tenant-scoped, bounded, and does not expose member email or role data. System checks cannot be reassigned. Evidence is a tenant-scoped safe reference: it contains a safe label and normalized linked-record identity, not a document body, provider payload, cookie, token, or bank-account number.

`BLOCKER` stops review, close, and lock when policy requires it. `WARNING` remains visible and can be acknowledged with a safe reason where the API permits acknowledgement. `INFORMATION` never blocks a transition. `NOT_APPLICABLE` is excluded from completion counts. There is no blanket blocker override.

## Preparer and reviewer

The preparer records readiness only after required tasks are complete and current blockers are absent. The reviewer records the reviewed readiness hash and must see unresolved warnings and evidence references.

The preparer and reviewer must be distinct by default. `PATCH /accounting-close/signoff-policy` is guarded by `organization.update` and defaults the organization policy to disabled. A same-user review is permitted only when that policy is explicitly enabled **and** the organization has exactly one active member eligible for `accountingClose.review`; otherwise it is rejected. The reviewed cycle records an immutable `SEPARATED` or `SINGLE_USER_DEMO` sign-off mode, audits it, surfaces it in the close workspace, and includes it in the safe evidence export. `SINGLE_USER_DEMO` is a clearly labelled single-user demonstration exception, not evidence of separation of duties for a multi-user organization.

## Invalidating review

A stale review is never sufficient authority to close or lock. Any new readiness hash, authoritative blocker, readiness error, or historical-state-unproven result invalidates a prior review. The close and lock actions calculate readiness again within the authoritative transaction; the UI’s prior green display is only review evidence.

While the fiscal period remains open, a reviewer can return a reviewed cycle to its preparer with a required reason. This clears the active preparer/reviewer identities and readiness hash without mutating the fiscal period, retains the reviewed snapshot as history, and does not rewrite the recorded sign-off mode. If the close recheck itself finds drift, it atomically records a new `DRAFT` readiness snapshot, audits the review invalidation, returns the cycle to `IN_PROGRESS`, and responds with a conflict so the user reloads, refreshes, prepares, and reviews again.

If lock revalidation finds post-close drift, LedgerByte does not lock the period. It records a frozen `CLOSED` snapshot and `LOCK_BLOCKED` audit event, then explains the required recovery: an authorized user uses the existing fiscal-period reopen workflow, and a reviewer returns the reopened cycle to preparation with a reason before the close steps are performed again.

## Supporting reports and limits

Evidence and report links help the accountant review the period, but they are not a claim that reports were archived immutably. The current export contains safe cycle, task, evidence-reference, and snapshot fields and is bounded to protect the service. Report-pack archive execution and backup/PITR restoration proof remain separate operational capabilities and are not implied by a close sign-off.
