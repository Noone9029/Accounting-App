# Close checklist and sign-off

## System checks and manual work

System checks are read-only results from the close-readiness orchestrator. They cannot be manually completed, acknowledged into a pass, or changed by a stale browser response. A system check changes only when its authoritative source data changes and readiness is refreshed.

Manual checklist tasks are operational evidence, not accounting mutations. A permitted user can have a task assigned, completed, reopened, and evidenced. Evidence is a tenant-scoped safe reference: it contains a safe label and normalized linked-record identity, not a document body, provider payload, cookie, token, or bank-account number.

`BLOCKER` stops review, close, and lock when policy requires it. `WARNING` remains visible and can be acknowledged with a safe reason where the API permits acknowledgement. `INFORMATION` never blocks a transition. `NOT_APPLICABLE` is excluded from completion counts. There is no blanket blocker override.

## Preparer and reviewer

The preparer records readiness only after required tasks are complete and current blockers are absent. The reviewer records the reviewed readiness hash and must see unresolved warnings and evidence references.

Where an organization has at least two eligible users, preparer and reviewer must be distinct. A single-user demonstration organization may use a clearly labelled single-user demonstration exception only under its explicit organization policy. That exception is not evidence of separation of duties for a multi-user organization.

## Invalidating review

A stale review is never sufficient authority to close or lock. Any new readiness hash, authoritative blocker, readiness error, or historical-state-unproven result invalidates a prior review. The close and lock actions calculate readiness again within the authoritative transaction; the UI’s prior green display is only review evidence.

## Supporting reports and limits

Evidence and report links help the accountant review the period, but they are not a claim that reports were archived immutably. The current export contains safe cycle, task, evidence-reference, and snapshot fields and is bounded to protect the service. Report-pack archive execution and backup/PITR restoration proof remain separate operational capabilities and are not implied by a close sign-off.
