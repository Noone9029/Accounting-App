# Production Rollback Runbook

This runbook is planning and execution guidance only. Do not run this runbook from a local worktree against hosted production without owner approval.

LedgerByte remains controlled beta/user-testing until launch gates are approved. All evidence must be metadata-only. Hosted migrations must go through the approved deployment process. Rollback must stop if tenant data integrity is uncertain.

## Rollback Scope

This runbook covers application deploy rollback, hosted migration decision-making, environment variable rollback, queue and worker rollback, support communication, and post-rollback verification.

It does not approve provider changes, database restores, DNS changes, hosted migrations, production data deletion, queue purges, `security:cleanup -- --execute`, or any destructive action. Those actions require separate owner approval and the approved deployment or incident process.

## Owner Roles

Before execution, name the decision owner, deploy owner, database owner, support owner, and security owner.

No one should begin rollback execution until the decision owner has confirmed target environment, blast radius, rollback artifact, customer impact, and tenant data-integrity risk.

## Pre-Rollback Decision Gate

Capture metadata before action:

- commit SHA
- deployment ID
- environment name
- start time
- decision owner
- health endpoint status
- readiness endpoint status
- error-rate status
- database migration status
- customer communication status

If this metadata cannot be captured without exposing secret values, customer data, raw logs, or provider payloads, stop and escalate to the security owner.

## Application Deploy Rollback

Use the hosting provider's approved rollback mechanism to redeploy the last known-good artifact for the target environment.

Required checks before application rollback:

- the target environment is confirmed
- the rollback artifact is known
- the current deployment ID is recorded
- the previous deployment ID is recorded
- the owner has approved the rollback
- no migration-dependent code/data mismatch is suspected

Do not run ad hoc deploy commands from a local worktree against hosted production.

## Database Migration Decision Tree

If no hosted migrations ran after the last known-good application artifact, application rollback can continue after owner approval.

If hosted migrations ran, stop and classify the migration:

- reversible code-only compatibility issue
- additive schema change with backward-compatible old code
- destructive or data-shaping migration
- unknown migration status

Hosted migrations must go through the approved deployment process. Database restore requires separate approval, backup/PITR owner confirmation, and metadata-only evidence. Do not run local migration commands, direct SQL, destructive reset, or database restore during this runbook unless the incident owner has opened a separate approved execution lane.

## Environment Variable Rollback

Environment variable rollback is allowed only through the approved provider console/process and only after owner approval.

Evidence may record variable names and status only. Do not paste secret values, JWT secrets, database URLs, provider tokens, API keys, cookie secrets, SMTP credentials, object-storage credentials, or ZATCA material into chat, docs, logs, screenshots, or issue trackers.

## Queue And Worker Rollback

For background workers, record whether workers are running, paused, draining, or stopped.

Queue purge is forbidden by default. Pausing workers or draining queues requires owner approval and must preserve tenant data integrity. If job payloads may contain customer data, do not print them. Record counts and statuses only.

## Customer Communication

The support owner records customer communication status without customer data.

Allowed evidence:

- whether customers are affected: yes/no/unknown
- whether status notice is needed: yes/no/unknown
- support owner
- customer communication status
- incident severity

Do not include customer names, invoices, emails, documents, bank data, tax identifiers, uploaded files, or raw support logs in rollback evidence.

## Post-Rollback Verification

After rollback, capture:

- end time
- deployment ID
- commit SHA
- health endpoint status
- readiness endpoint status
- error-rate status
- database migration status
- customer communication status

Then run only the approved non-mutating checks for the target environment. Manual browser smoke and staging smoke still require approved targets and credentials.

## Abort Conditions

Abort rollback and escalate if:

- tenant data integrity is uncertain
- database migration status is unknown
- backup/PITR owner cannot confirm restore posture
- current or previous deployment ID is unknown
- the rollback artifact is unavailable
- owner approval is missing
- secret values or customer data would be exposed to proceed
- the required support/security/database owner is unavailable

Rollback must stop if tenant data integrity is uncertain.

## Forbidden Actions

Forbidden actions include:

- rollback execution from local worktrees
- hosted migrations
- database restore
- production data deletion
- `security:cleanup -- --execute`
- provider console mutations without owner approval
- DNS changes
- secret values in evidence
- customer data in evidence
- raw logs in evidence
- queue purge
- destructive reset

## Evidence And Redaction

All evidence must be metadata-only.

Safe metadata includes commit SHA, deployment ID, environment name, start time, end time, decision owner, health endpoint status, readiness endpoint status, error-rate status, database migration status, and customer communication status.

Unsafe evidence includes secret values, customer data, raw logs, request bodies, response bodies, provider payloads, screenshots containing provider secrets, database rows, object bodies, email bodies, file contents, private keys, certificates, JWTs, cookies, refresh tokens, access tokens, and database URLs.

## Remaining Gaps

This runbook does not complete final production hosting, monitoring provider setup, hosted backup/PITR proof, hosted restore proof, production cleanup dry-run, staging smoke, manual browser smoke, incident-response ownership, status-page choice, or support SLAs.

Those remain separate production-readiness gates.

## Next Recommended Prompt

Codex, review the production rollback runbook guard PR for owner-review readiness only.
