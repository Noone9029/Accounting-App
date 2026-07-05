# Production Smoke Readiness Runbook

This runbook is planning and readiness guidance only. Do not run browser smoke, hosted smoke, hosted mutations, hosted migrations, or cleanup execute from a local worktree without owner approval.

LedgerByte remains controlled beta/user-testing until launch gates are approved. All evidence must be metadata-only and redacted. Manual browser smoke must use synthetic tenants only. Abort if production URLs, real customer data, secret values, cookies, JWTs, or database URLs would be exposed.

## Smoke Scope

This runbook prepares, but does not execute, safe smoke verification for a deployed non-production target.

The smoke scope covers browser smoke, deployed API smoke, organization switching, dashboard totals, global search, settings, exports, downloads, refresh invalid org context, direct URL navigation, health endpoint, readiness endpoint, cookie auth, and CSRF boundaries.

It is intended to prove the deployed user journey after the lower-layer tenant proof lanes have already covered API/service/DB behavior. It is not approval to run against production or real customer data.

## Target Approval Gate

Record the following before any future smoke run:

- target URL class
- environment name
- decision owner
- credential owner
- data reset policy
- approved command
- start time
- target approval status

The target must be non-production unless a separate production approval exists. If the target is production-like, stop and require explicit owner approval, a rollback owner, a support owner, and a written abort path.

## Environment And Credential Boundaries

Approved targets must be non-production unless a separate production approval exists.

Evidence must not include secret values, cookies, JWTs, access tokens, refresh tokens, database URLs, private keys, provider payloads, or screenshots containing credentials.

Allowed credential handling:

- credentials stay in the approved secret store or local secure vault
- passwords are typed manually by the approved operator
- screenshots are cropped or redacted before storage
- logs are summarized as metadata, not copied verbatim

Forbidden credential handling:

- pasting secrets into chat, docs, commits, issue comments, or PR bodies
- printing cookies, JWTs, access tokens, refresh tokens, or database URLs
- exporting browser storage or HAR files that include credentials
- sharing provider dashboard screenshots with secrets visible

## Synthetic Tenant Data

Use synthetic organization IDs, synthetic user IDs, synthetic customers, synthetic invoices, synthetic bills, synthetic payments, synthetic documents, and synthetic settings only.

The synthetic setup must represent at least two tenants:

- User A belongs to Organization A.
- User B belongs to Organization B.
- Organization A has unique dashboard totals, records, settings, exports, and downloadable documents.
- Organization B has distinct records that must never appear to User A.

Do not use real customer names, emails, invoices, uploaded files, bank data, tax identifiers, documents, support messages, or provider payloads.

## Browser And API Smoke Matrix

Check health endpoint status, readiness endpoint status, cookie auth status, CSRF status, login status, logout status, refresh status, dashboard aggregate status, search scope status, and settings scope status.

Minimum future checks:

- web login succeeds for the approved synthetic user
- auth uses cookie state and does not require browser token persistence
- unsafe cookie-authenticated requests require CSRF protection where applicable
- logout clears server-side session state
- health endpoint status is recorded
- readiness endpoint status is recorded
- page refresh does not revive a tenant context the user cannot access

## Tenant Isolation Smoke Matrix

Check organization switching, dashboard totals, global search, settings scope, exports scope, downloads scope, refresh invalid org context, and direct URL navigation.

Minimum future checks:

- User A cannot switch to Organization B.
- User A cannot see Organization B dashboard totals.
- User A global search does not return Organization B records.
- User A settings pages do not show Organization B settings or members.
- User A export routes do not include Organization B rows.
- User A downloads cannot retrieve Organization B PDFs, generated documents, attachments, or report files.
- User A direct URL navigation to Organization B resources returns a denial or safe not-found state.
- Refreshing an invalid organization context falls back to an allowed organization or a clear denial state.

## Export And Download Smoke Matrix

Check export/download status, report export status, PDF download status, attachment download status, and generated document download status without printing file bodies or object bodies.

Allowed evidence:

- request path class
- response status
- synthetic record class
- file type
- byte-count class, such as zero, small, medium, large
- tenant-scope pass/fail status

Forbidden evidence:

- file bodies
- object bodies
- raw PDFs
- raw CSV exports
- raw XML
- raw bank statements
- object keys if they contain tenant names or sensitive IDs

## Artifact Redaction

Safe evidence includes commit SHA, deployment ID, target URL class, environment name, synthetic organization IDs, synthetic user IDs, start time, end time, health endpoint status, readiness endpoint status, dashboard aggregate status, search scope status, settings scope status, export/download status, direct URL probe status, artifact redaction status, and cleanup status.

Evidence should be stored as a short metadata summary. Screenshots are optional and must be redacted before storage. Do not store browser profiles, cookies, HAR files, downloaded documents, exported files, request bodies, response bodies, or database rows.

## Abort Conditions

Abort on missing target approval, production URLs without explicit approval, real customer data, secret values, raw logs, cookies, JWTs, database URLs, provider console mutations, hosted migrations, hosted mutations, seed/reset/delete, security:cleanup -- --execute, email sends, ZATCA network calls, object bodies, or unknown tenant data integrity.

Abort and escalate to the decision owner if:

- the target URL is not the approved target
- the synthetic data set cannot be distinguished from real data
- a test requires destructive cleanup that was not explicitly approved
- a browser artifact contains credentials
- tenant data integrity is uncertain
- cross-tenant leakage is observed

## Forbidden Actions

Forbidden actions include:

- production URLs without explicit approval
- hosted migrations
- hosted mutations
- seed/reset/delete
- `security:cleanup -- --execute`
- real customer data
- provider console mutations
- secret values
- raw logs
- cookies
- JWTs
- access tokens
- refresh tokens
- database URLs
- private keys
- object bodies
- email sends
- ZATCA network calls

## Evidence Template

Record only metadata:

- commit SHA
- deployment ID
- target URL class
- environment name
- synthetic organization IDs
- synthetic user IDs
- start time
- end time
- decision owner
- credential owner
- data reset policy
- health endpoint status
- readiness endpoint status
- dashboard aggregate status
- search scope status
- settings scope status
- export/download status
- direct URL probe status
- artifact redaction status
- cleanup status
- pass/fail summary
- blocker summary

## Remaining Gaps

This runbook does not complete a hosted smoke run, production smoke run, monitoring setup, hosted backup/PITR proof, restore proof, or final launch approval.

Remaining gates:

- approved non-production target and credentials
- synthetic two-tenant deployed data set
- future manual browser smoke execution
- future deployed API smoke execution
- monitoring and alert routing
- hosted backup/PITR and restore proof
- support owner and incident escalation rehearsal

## Next Recommended Prompt

Codex, review the production smoke readiness guard PR for owner-review readiness only.
