# Production Security Cleanup Dry-Run Runbook

This runbook is planning and dry-run guidance only. Do not run security:cleanup -- --execute, security:cleanup:execute, hosted mutations, hosted migrations, seed/reset/delete, or provider console mutations from a local worktree.

LedgerByte remains controlled beta/user-testing until launch gates are approved. All evidence must be aggregate metadata only. Production cleanup dry-run requires owner approval, target approval, and redacted count-only evidence. Abort if secret values, raw logs, cookies, JWTs, database URLs, raw emails, raw IPs, jti values, or row identifiers would be exposed.

## Cleanup Scope

The cleanup scope covers security:cleanup dry-run planning for AuthSession expired eligible counts, AuthSession revoked eligible counts, LoginRateLimit eligible counts, retention settings, batch size, and deleted counts that must remain zero in dry-run mode.

This runbook does not approve cleanup execution. It only prepares and reviews dry-run output for the existing `security:cleanup` CLI.

## Target Approval Gate

Record the following before any future hosted dry-run:

- target URL class
- environment name
- decision owner
- security owner
- database owner
- operator
- start time
- target approval status
- run mode

The target must be an approved operations environment. A local developer worktree is not an approved place to run hosted production cleanup, even in dry-run mode, unless the owner explicitly approves that exact target and command.

## Dry-Run Command Contract

The only allowed command in this runbook is corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run or corepack pnpm security:cleanup:dry-run from the approved operations environment.

Allowed local validation before any hosted dry-run:

```bash
corepack pnpm production:cleanup-dry-run-guard -- --json
```

Allowed future hosted dry-run command after approval:

```bash
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run
```

The dry-run output must show:

- `mode: dry-run`
- `dryRun: true`
- `AuthSession eligible`
- `AuthSession eligibleByReason`
- `LoginRateLimit eligible`
- `AuthSession deleted: 0`
- `LoginRateLimit deleted: 0`

## Environment And Credential Boundaries

The command must not print secret values, raw logs, cookies, JWTs, access tokens, refresh tokens, database URLs, private keys, raw emails, raw IPs, jti values, row identifiers, or provider payloads.

The operator must not paste connection strings, credentials, raw errors, raw logs, database rows, provider screenshots, or browser/session material into chat, docs, issues, PRs, or incident notes.

If a command fails with a database or provider error, record only the sanitized error class and exit status. Do not copy the raw connection string, host, username, password, token, or provider payload.

## Aggregate Count Evidence

Safe evidence includes commit SHA, deployment ID, target URL class, environment name, start time, end time, decision owner, security owner, database owner, operator, run mode, dry-run status, AuthSession eligible count, AuthSession eligibleByReason count, LoginRateLimit eligible count, deleted count, retention settings status, batch size, artifact redaction status, and follow-up decision.

Do not record:

- raw `AuthSession` rows
- raw `LoginRateLimit` rows
- user emails
- IP addresses
- `jti` values
- session hashes
- throttle key hashes
- database connection values
- screenshots containing secrets

## Review Thresholds And Abort Conditions

Abort on missing owner approval, wrong target, production URLs without explicit approval, unexpected eligible counts, non-zero deleted count in dry-run, secret values, raw logs, database URLs, hosted mutations, hosted migrations, seed/reset/delete, security:cleanup -- --execute, security:cleanup:execute, direct SQL, production data deletion, database restore, provider console mutations, email sends, ZATCA network calls, or unknown tenant data integrity.

Investigate before any future execute-mode proposal if:

- eligible counts are materially higher than expected
- retention settings differ from the approved defaults or plan
- deleted counts are not zero in dry-run mode
- the target environment label is ambiguous
- output includes anything beyond aggregate counts and status
- recent authentication, logout, or throttling behavior is under incident review

## Execute Mode Boundary

Execute mode is out of scope. Any future security:cleanup -- --execute or security:cleanup:execute run requires a separate approved execution lane, reviewed dry-run counts from the same target, backup/PITR posture, rollback owner, and incident/support handoff.

An execute-mode lane must prove:

- the same target was used for dry-run and execute
- dry-run counts were accepted by the decision owner
- backup/PITR posture was checked
- rollback and incident owners are available
- the command runs from the approved operations environment
- post-execute auth/login/logout/throttling checks are defined

## Forbidden Actions

Forbidden actions include:

- `security:cleanup -- --execute`
- `security:cleanup:execute`
- hosted mutations
- hosted migrations
- seed/reset/delete
- production data deletion
- database restore
- direct SQL
- provider console mutations
- secret values
- raw logs
- cookies
- JWTs
- access tokens
- refresh tokens
- database URLs
- private keys
- raw emails
- raw IPs
- jti values
- row identifiers
- email sends
- ZATCA network calls

## Evidence And Redaction

Evidence must be aggregate metadata only and must not include connection strings, tokens, cookies, passwords, secret values, raw emails, raw IPs, jti values, row identifiers, database rows, request bodies, response bodies, raw logs, screenshots containing secrets, or provider payloads.

Recommended evidence template:

```text
commit SHA:
deployment ID:
target URL class:
environment name:
start time:
end time:
decision owner:
security owner:
database owner:
operator:
run mode: dry-run
dry-run status:
AuthSession eligible count:
AuthSession eligibleByReason count:
LoginRateLimit eligible count:
deleted count:
retention settings status:
batch size:
artifact redaction status:
follow-up decision:
```

## Operational Handoff

Record whether the dry-run is approved for review only, requires investigation, or should open a future execute-mode approval lane. Do not schedule execute mode from this runbook.

Allowed follow-up decisions:

- `review-only-complete`
- `investigate-counts`
- `repeat-dry-run-later`
- `open-execute-approval-lane`
- `blocked-wrong-target`

## Remaining Gaps

This runbook does not complete cleanup execute approval, cleanup scheduling, hosted backup/PITR proof, restore proof, monitoring setup, incident response rehearsal, or final launch approval.

Remaining gates:

- approved operations target and owner sign-off
- future hosted dry-run execution
- future execute-mode approval lane, if needed
- cleanup scheduling design
- monitoring and alert ownership
- hosted backup/PITR and restore proof
- post-cleanup authentication smoke definition

## Next Recommended Prompt

Codex, review the production security cleanup dry-run guard PR for owner-review readiness only.
