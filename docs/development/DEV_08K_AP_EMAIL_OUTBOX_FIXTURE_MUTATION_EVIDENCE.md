# DEV-08K AP Email Outbox Fixture Mutation Evidence

## Purpose And Scope

- Task: `DEV-08K Part 8: approved local AP generated-document email outbox fixture mutation`.
- Latest commit inspected: `9ea4031b Verify DEV-08K AP email local schema gate`.
- Approval phrase status: received exactly before mutation.
- Runtime outbox mutation performed: yes, exactly one AP generated-document email outbox creation call.
- Real email sent: no.
- Provider calls performed: no.
- ZATCA performed: no.

This part created one local metadata-only AP generated-document email outbox row for the selected purchase-bill generated document and synthetic recipient. It did not call a real provider, send email, run retry workers, run webhooks, generate/download PDFs, read PDF/body/base64 content, run ZATCA, seed/reset/delete, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Approval Phrase

Confirmed exact phrase:

`I approve DEV-08K Part 8 local-only AP generated-document email outbox fixture mutation under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

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

## Mutation Call

- Call path: `EmailService.createApGeneratedDocumentOutbox`.
- Calls attempted before success: one disposable runner attempt failed before the service call because a UUID prefix lookup used an unsupported Prisma filter. No outbox row was created by that failed attempt.
- Successful outbox creation calls: `1`.
- Generated document safe prefix: `27a07429`.
- Recipient classification: explicit synthetic `.test` recipient.
- Provider guard: the injected local fixture provider throws if `send(...)` is called; `send(...)` was not called.

## Outbox Result

| Field | Result |
| --- | --- |
| Created outbox safe prefix | `3c19700b` |
| Generated document safe prefix | `27a07429` |
| AP source type | `PurchaseBill` |
| AP source safe prefix | `16e6f021` |
| AP document/source number | `BILL-000423` |
| Template type | `AP_GENERATED_DOCUMENT` |
| Status | `SENT_MOCK` |
| Provider | `mock-no-send` |
| Synthetic recipient used | `true` |

## Attachment Metadata Result

Only attachment metadata was read/stored for evidence:

| Field | Result |
| --- | --- |
| Filename | `purchase-bill-BILL-000423.pdf` |
| MIME type | `application/pdf` |
| Byte count | `3417` |
| Content hash prefix | `47935bce9f75` |

No PDF body, generated-document body, base64, attachment body, email body, request/response body, provider payload, signed XML, or QR payload was printed.

## Counts And Side Effects

| Check | Before | After |
| --- | ---: | ---: |
| Email outbox rows | `227` | `228` |
| Synthetic recipient rows | `0` | `1` |
| AP generated-document email rows | `0` | `1` |
| Selected generated-document email rows | `0` | `1` |
| Email provider events | `0` | `0` |
| Generated documents | `870` | `870` |

Selected generated document state:

| Field | Before | After |
| --- | --- | --- |
| Safe prefix | `27a07429` | `27a07429` |
| Status | `GENERATED` | `GENERATED` |
| Document type | `PURCHASE_BILL` | `PURCHASE_BILL` |
| Source type | `PurchaseBill` | `PurchaseBill` |
| Document number | `BILL-000423` | `BILL-000423` |

## Temporary Script Cleanup

- A disposable local runner was created at `apps/api/scripts/dev08k-part8-outbox-fixture.ts`.
- The runner refused non-local targets, checked the migration gate, refused duplicate rows, and printed sanitized metadata only.
- The runner was deleted after execution.
- `git ls-files 'apps/api/scripts/*dev08k*'` returned no tracked files.
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'` returned no files.

## Commands Run

- `git status --short --branch`
- `git log --oneline -3 --decorate`
- Read `docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_PREFLIGHT.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_LOCAL_SCHEMA_GATE_EVIDENCE_VERIFICATION.md`.
- Created, ran, fixed, reran, and deleted the disposable local runner `apps/api/scripts/dev08k-part8-outbox-fixture.ts`.
- `corepack pnpm exec tsx scripts/dev08k-part8-outbox-fixture.ts`
- `git ls-files 'apps/api/scripts/*dev08k*'`
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'`
- Read-only sanitized inline Prisma verification for the created outbox row, selected generated document, counts, provider events, and local target.

## Commands Skipped

- Calling a real email provider.
- Real email sends.
- Retry workers, webhooks, diagnostics sends, SMTP.
- PDF generation/download, body/base64 reads, attachment body reads.
- Additional migrations, Prisma db push, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 9: AP email outbox fixture evidence verification`

## Part 9 Follow-Up

- Part 9 verification is recorded in [DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_EVIDENCE_VERIFICATION.md).
- Read-only verification confirmed exactly one AP generated-document email outbox row for generated document safe prefix `27a07429`.
- Outbox safe prefix `3c19700b` remained `SENT_MOCK` with provider `mock-no-send`.
- Provider events remained `0`; selected generated document `27a07429` remained `GENERATED`; generated documents remained `870`.
- Attachment evidence remained metadata-only: filename `purchase-bill-BILL-000423.pdf`, MIME type `application/pdf`, size `3417`, hash prefix `47935bce9f75`.
- No tracked or untracked `*dev08k*` temp script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 10: AP email permission negative-check preflight`.
