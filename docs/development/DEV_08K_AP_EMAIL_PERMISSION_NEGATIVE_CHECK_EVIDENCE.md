# DEV-08K AP Email Permission Negative Check Evidence

## Purpose And Scope

- Task: `DEV-08K Part 11: approved local AP generated-document email permission negative checks`.
- Latest commit inspected: `5d1555ca Plan DEV-08K AP email permission negative checks`.
- Approval phrase status: received exactly before checks.
- Runtime negative checks performed: yes, local-only service-level denied permission checks.
- Successful outbox creation: no.
- Provider calls performed: no.
- Real email sent: no.
- Login/API/browser performed: no.

This part ran local-only AP generated-document email permission negative checks against the selected generated document. It did not create outbox rows, call a real provider, send email, run retry workers, run webhooks, generate/download PDFs, read document/email/attachment bodies, run ZATCA, run migrations, seed/reset/delete, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Approval Phrase

Confirmed exact phrase:

`I approve DEV-08K Part 11 local-only AP generated-document email permission negative checks under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

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

## Selected Generated Document

| Field | Before | After |
| --- | --- | --- |
| Generated document safe prefix | `27a07429` | `27a07429` |
| Status | `GENERATED` | `GENERATED` |
| Document type | `PURCHASE_BILL` | `PURCHASE_BILL` |
| Source type | `PurchaseBill` | `PurchaseBill` |
| Source safe prefix | `16e6f021` | `16e6f021` |
| Document/source number | `BILL-000423` | `BILL-000423` |

## Negative Check Results

All denied vectors blocked before outbox creation:

| Case | Result status | Blocked | Permission count |
| --- | ---: | --- | ---: |
| Missing `generatedDocuments.download` | `403` | yes | `2` |
| Missing AP source view | `403` | yes | `2` |
| Missing `emailOutbox.view` | `403` | yes | `2` |
| Restricted AP viewer/no archive download role | `403` | yes | `10` |
| Restricted archive-only role | `403` | yes | `4` |

Sanitized blocked result only was recorded. No request body, response body, auth material, email body, attachment body, PDF body, base64, customer/vendor data, provider payload, signed XML, or QR payload was printed.

## Counts And Side Effects

| Check | Before | After |
| --- | ---: | ---: |
| Email outbox rows | `228` | `228` |
| Synthetic recipient rows | `1` | `1` |
| AP generated-document email rows | `1` | `1` |
| Selected generated-document email rows | `1` | `1` |
| Email provider events | `0` | `0` |
| Generated documents | `870` | `870` |

Provider guard result:

- Provider `send(...)` call count: `0`.
- No provider event was created.
- No email was sent.

## Runner Handling

- Disposable runner: `apps/api/scripts/dev08k-part11-permission-negative.ts`.
- Runner safety:
  - refused non-local database targets.
  - checked exact approval phrase.
  - injected a provider that throws if `send(...)` is called.
  - failed if any denied vector created an outbox row, provider event, or generated-document change.
  - printed sanitized metadata only.
- First runner attempt used a placeholder organization id and returned a non-creation setup failure before permission evidence could be accepted; counts stayed unchanged.
- Corrected runner used the selected document's local organization id without printing it, and all denied vectors returned `403`.
- Runner removed before commit: yes.
- `git ls-files 'apps/api/scripts/*dev08k*'` returned no tracked files.
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'` returned no files.

## Commands Run

- `git status --short --branch`
- `git log --oneline -5 --decorate`
- Read DEV-08K Part 11 prompt from `E:\Downloads\dev08k_arc_prompts.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_PREFLIGHT.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_EVIDENCE_VERIFICATION.md`.
- Created and ran disposable local runner `apps/api/scripts/dev08k-part11-permission-negative.ts`.
- `corepack pnpm exec tsx scripts/dev08k-part11-permission-negative.ts`
- Read-only sanitized Prisma count check after the setup failure.
- Corrected and reran `corepack pnpm exec tsx scripts/dev08k-part11-permission-negative.ts`.
- Deleted disposable runner.
- `git ls-files 'apps/api/scripts/*dev08k*'`
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'`

## Commands Skipped

- AP email endpoint calls.
- Login, browser/UI flows, Playwright, and audit-writing authentication.
- Successful outbox row creation.
- Provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP.
- PDF generation/download, body/base64 reads, attachment body reads.
- Migrations, Prisma db push, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 12: AP email permission negative evidence verification`
