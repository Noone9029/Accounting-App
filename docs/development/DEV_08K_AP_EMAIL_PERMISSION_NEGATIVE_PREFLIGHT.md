# DEV-08K AP Email Permission Negative Preflight

## Purpose And Scope

- Task: `DEV-08K Part 10: AP email permission negative-check preflight`.
- Latest commit inspected: `fb40145a Verify DEV-08K AP email outbox fixture`.
- Mode: read-only preflight only.
- Runtime mutation performed: no.
- Email outbox rows created: no.
- Provider calls performed: no.
- Login/API/browser performed: no.

This preflight plans the restricted AP generated-document email negative checks for Part 11. It did not call the AP email endpoint, invoke `EmailService.createApGeneratedDocumentOutbox`, create outbox rows, log in, write audit rows, send real email, call SMTP/provider code, run retry workers, generate/download PDFs, read document/email/attachment bodies, run migrations, seed/reset/delete, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Inputs Reviewed

- `CODEX_HANDOFF.md`.
- `docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_EVIDENCE_VERIFICATION.md`.
- `docs/development/DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_CLOSURE.md`.
- `docs/development/DEV_08H_AP_EMAIL_OUTPUT_BOUNDARY_PREFLIGHT.md`.
- `docs/development/DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_CLOSURE.md`.
- `docs/development/DEV_08I_AP_OUTPUT_PERMISSION_AUTHENTICATED_UI_QA_CLOSURE.md`.
- `docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_PREFLIGHT.md`.
- `docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE.md`.
- `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`.
- `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`.
- `BUG_AUDIT.md`.
- `README.md`.
- `apps/api/src/email/*` as needed.
- `apps/api/prisma/schema.prisma`.

## Local-Only Target Proof

Sanitized target classification:

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Schema | `public` |
| Local-only classification | `true` |

No database URL, credential, token, cookie, auth header, request/response body, email body, attachment body, PDF body, base64, signed XML, QR payload, private key, CSID, SMTP payload, provider payload, customer/vendor data, or source contact email was printed.

## Existing Restricted Fixture Snapshot

The preserved DEV-08I restricted fixtures remain safe as negative-check references:

| Fixture | User prefix | Membership prefix | Role prefix | Status | Permission count |
| --- | --- | --- | --- | --- | ---: |
| Restricted archive-only | `16d72d2a` | `2de5260b` | `83dc203f` | `ACTIVE` | `4` |
| Restricted AP viewer/no archive download | `41b031e2` | `78a4a87c` | `b167ef15` | `ACTIVE` | `10` |

Permission booleans:

| Fixture | `emailOutbox.view` | `generatedDocuments.view` | `generatedDocuments.download` | `purchaseBills.view` | Other AP source view permissions |
| --- | --- | --- | --- | --- | --- |
| Restricted archive-only `16d72d2a` | no | yes | no | no | no |
| Restricted AP viewer/no archive download `41b031e2` | no | yes | no | yes | yes |

These fixtures prove realistic restricted roles exist, but Part 11 should avoid login unless explicitly needed. Direct service-level negative checks can isolate each required permission without creating login audit rows or needing to print/authenticate tokens.

## Selected Generated Document

| Field | Result |
| --- | --- |
| Generated document safe prefix | `27a07429` |
| Status | `GENERATED` |
| Document type | `PURCHASE_BILL` |
| Source type | `PurchaseBill` |
| Document/source number | `BILL-000423` |
| Source safe prefix | `16e6f021` |

## Baseline Counts

| Check | Baseline |
| --- | ---: |
| Email outbox rows | `228` |
| Synthetic recipient rows | `1` |
| AP generated-document email rows | `1` |
| Selected generated-document email rows | `1` |
| Email provider events | `0` |
| Generated documents | `870` |

## Part 11 Negative Cases

Part 11 should use a disposable local runner that refuses non-local targets, loads the selected generated document by safe prefix, injects a no-send provider that throws if `send(...)` is called, and calls `EmailService.createApGeneratedDocumentOutbox` only with denied permission vectors. The runner must delete itself before commit and print sanitized metadata only.

The denied vectors should isolate each required permission:

| Case | Permission vector | Expected result |
| --- | --- | --- |
| Missing generated-document download | `emailOutbox.view`, `purchaseBills.view` | Blocked before outbox create |
| Missing AP source view | `emailOutbox.view`, `generatedDocuments.download` | Blocked before outbox create |
| Missing email outbox permission | `generatedDocuments.download`, `purchaseBills.view` | Blocked before outbox create |
| Existing restricted AP viewer/no-download shape | permissions from role `b167ef15` | Blocked before outbox create |
| Existing restricted archive-only shape | permissions from role `83dc203f` | Blocked before outbox create |

Part 11 must verify after each blocked case:

- outbox row count unchanged.
- selected generated-document email row count unchanged.
- provider event count unchanged.
- generated document remains `GENERATED`.
- no provider send was called.
- no document/email/attachment body, PDF body, or base64 was printed.

## Stop Conditions For Part 11

Stop before any write-capable call if:

- the exact Part 11 approval phrase is missing or malformed.
- DB target is not local `localhost:5432/accounting`.
- selected generated document `27a07429` is missing or not `GENERATED`.
- the existing Part 8 outbox row is missing or duplicated unexpectedly.
- the disposable runner cannot guarantee provider `send(...)` throws if called.
- any negative check creates an outbox row, creates a provider event, or changes the selected generated document.
- any evidence path requires printing request/response bodies, email body, attachment body, PDF body, base64, customer/vendor data, auth material, DB URL, signed XML, QR payload, private keys, CSIDs, SMTP payloads, or provider payloads.

## Required Part 11 Approval Phrase

Status: not received in this thread.

`I approve DEV-08K Part 11 local-only AP generated-document email permission negative checks under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

## Commands Run

- `git status --short --branch`
- `git log --oneline -8 --decorate`
- Read the DEV-08K Part 10 prompt from `E:\Downloads\dev08k_arc_prompts.md`.
- Read required DEV-08K/DEV-08J/DEV-08H/DEV-08I/DEV-03/DEV-02 docs.
- Read-only inspections of AP email service permission behavior.
- Read-only sanitized inline Prisma verification for local target, restricted fixture role permissions, selected generated document, outbox counts, and provider-event counts.

## Commands Skipped

- Part 11 negative checks.
- AP email endpoint calls.
- `EmailService.createApGeneratedDocumentOutbox` calls.
- Login, browser/UI flows, Playwright, and audit-writing authentication.
- Outbox row creation.
- Provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP.
- PDF generation/download, body/base64 reads, attachment body reads.
- Migrations, Prisma db push, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 11: approved local AP generated-document email permission negative checks`
