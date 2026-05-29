# DEV-08K AP Email Local UI Outbox QA Preflight

## Purpose And Scope

- Task: `DEV-08K Part 16: AP email local UI outbox QA preflight`.
- Latest commit inspected: `794e119a Verify DEV-08K AP email UI`.
- Mode: read-only preflight.
- Runtime outbox mutation performed: no.
- Browser/login performed: no.
- AP email endpoint called: no.
- Provider calls performed: no.
- Real email sent: no.

This preflight selected the local authenticated UI QA target for Part 17 and captured baseline counts. It did not run browser login, call the AP email endpoint, create an outbox row, call providers, retry workers, webhooks, diagnostics sends, SMTP, generate/download PDFs, inspect PDF/email/attachment bodies, run migrations, seed/reset/delete, deploy, or use production, beta, hosted/shared, or customer data.

## Approval Phrase For Part 17

Required exact phrase:

`I approve DEV-08K Part 17 local-only authenticated AP email UI outbox QA under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

Approval status: exact phrase was received up front in this continuation thread and must be re-validated before the Part 17 local UI outbox mutation.

## Local-Only Target

Sanitized database target:

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Schema | `public` |
| Local-only classification | `true` |

No database URL, credential, token, cookie, auth header, request body, response body, email body, attachment body, PDF body, base64, signed XML, QR payload, private key, CSID, SMTP payload, provider payload, customer/vendor data, or source contact email was printed.

## Selected User

| Field | Value |
| --- | --- |
| User | `admin@example.com` |
| Display name | `Demo Admin` |
| Role | `Owner` |
| Organization | `Demo GCC Trading` |
| Organization safe prefix | `00000000` |
| Permission count | `132` |
| Full access | `true` |

Required permission checks:

| Permission | Result |
| --- | --- |
| `generatedDocuments.download` | `true` |
| `emailOutbox.view` | `true` |
| `purchaseBills.view` | `true` |

Part 17 must not print the password, token, cookie, auth header, login request body, login response body, or raw `/auth/me` response.

## Selected AP Generated Document

| Field | Value |
| --- | --- |
| Generated document safe prefix | `27a07429` |
| Organization safe prefix | `00000000` |
| Status | `GENERATED` |
| Document type | `PURCHASE_BILL` |
| Source type | `PurchaseBill` |
| Source safe prefix | `16e6f021` |
| Document/source number | `BILL-000423` |
| Filename | `purchase-bill-BILL-000423.pdf` |
| MIME type | `application/pdf` |
| Byte count | `3417` |
| Content hash prefix | `47935bce9f75` |

This is the existing fake DEV-08H/DEV-08K local AP output fixture selected in earlier evidence. The generated document remains `GENERATED`.

## Local Runtime Requirements

Current read-only health snapshot:

| Target | Snapshot |
| --- | --- |
| API `http://localhost:4000/health` | connection refused; not currently listening |
| API `http://localhost:4000/readiness` | connection refused; not currently listening |
| Web `http://localhost:3000/documents` | `200` |
| Local Postgres `5432` | listening |
| Local Redis `6379` | listening |

Part 17 runtime requirements before login/action:

| Requirement | Expected |
| --- | --- |
| API base URL | `http://localhost:4000` |
| API health | `GET /health` returns `200` |
| API readiness | `GET /readiness` returns reachable safe JSON |
| Web base URL | `http://localhost:3000` |
| Web route | `/documents` reachable after authenticated session setup |
| Database target | same sanitized local `localhost:5432/accounting` target |

If API readiness or web route checks fail in Part 17, stop before the outbox action.

## Provider And No-Send Plan

| Check | Value |
| --- | --- |
| AP generated-document provider | `mock-no-send` |
| Provider call expected | `false` |
| Real email send expected | `false` |
| Provider events baseline | `0` |

The AP generated-document email path is expected to create a metadata-only `EmailOutbox` row with `SENT_MOCK` and provider `mock-no-send`; it must not call a real provider.

## UI Flow Plan

| Step | Planned action |
| --- | --- |
| Route | `/documents` |
| Filters | document type `Purchase bill`, status `Generated` |
| Row | generated document safe prefix `27a07429`, document/source number `BILL-000423` |
| Recipient | `dev08k-ap-20260528t000000-ui@ledgerbyte.local.test` |
| UI action | `Create local email outbox` |
| Expected API path | `POST /email/ap-generated-documents/:generatedDocumentId/outbox` |
| Expected request body keys | `recipientEmail` only |
| Review route after success | `/settings/email-outbox` link may be visible, but no provider send is expected |

The selected recipient is a synthetic `.test` address and had no existing outbox rows at preflight.

## Expected Outbox Metadata

| Field | Expected |
| --- | --- |
| Template type | `AP_GENERATED_DOCUMENT` |
| Status | `SENT_MOCK` |
| Provider | `mock-no-send` |
| Generated document safe prefix | `27a07429` |
| Source type | `PurchaseBill` |
| Source safe prefix | `16e6f021` |
| Attachment filename | `purchase-bill-BILL-000423.pdf` |
| Attachment MIME type | `application/pdf` |
| Attachment byte count | `3417` |
| Attachment content hash prefix | `47935bce9f75` |
| Attempt count | `0` |
| Max attempts | `0` |
| Sent at | `null` |
| Provider message id | `null` |

## Baseline Counts

| Check | Count |
| --- | ---: |
| Email outbox rows | `228` |
| DEV-08K marker email rows | `1` |
| AP generated-document email rows | `1` |
| Selected generated-document email rows | `1` |
| Provider events | `0` |
| Generated documents | `870` |
| Next synthetic recipient rows | `0` |
| Existing selected-document rows for next synthetic recipient | `0` |

Existing selected generated-document AP email row:

| Field | Value |
| --- | --- |
| Outbox safe prefix | `3c19700b` |
| Status | `SENT_MOCK` |
| Provider | `mock-no-send` |
| Attempt count | `0` |
| Max attempts | `0` |
| Next attempt | `null` |
| Sent at | `null` |
| Provider message id | `null` |
| Attachment filename | `purchase-bill-BILL-000423.pdf` |
| Attachment MIME type | `application/pdf` |
| Attachment byte count | `3417` |
| Attachment content hash prefix | `47935bce9f75` |

Part 17 expected post-action counts: email outbox rows `229`, DEV-08K marker email rows `2`, AP generated-document email rows `2`, selected generated-document email rows `2`, provider events `0`, next synthetic recipient rows `1`, and existing selected-document rows for next synthetic recipient `1`.

## Exposure Controls

- No browser/login occurred in this preflight.
- No AP email endpoint was called.
- No outbox mutation occurred.
- No provider call or real email send occurred.
- No email body, attachment body, PDF body, request body, response body, base64, source contact email, customer/vendor data, token, cookie, auth header, signed XML, QR payload, private key, CSID, or provider payload was printed.
- Disposable read-only verifier was deleted before commit.

## Commands Run

- `git status --short --branch`
- `git log --oneline -5 --decorate`
- Read DEV-08K Part 16 through Part 19 prompts from `E:\Downloads\dev08k_remaining_from_part12_arc_prompts.md`.
- Read `CODEX_HANDOFF.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_UI_EVIDENCE_VERIFICATION.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_EVIDENCE_VERIFICATION.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_SERVICE_EVIDENCE_VERIFICATION.md`.
- Read `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`.
- Read `BUG_AUDIT.md` and `README.md`.
- Inspected AP email UI/service/auth/schema files for route, permission, and no-send behavior.
- `Invoke-WebRequest` safe health checks for local API/web targets.
- Created and ran disposable read-only verifier `apps/api/scripts/dev08k-part16-ui-outbox-qa-preflight.ts`.
- `corepack pnpm exec tsx scripts/dev08k-part16-ui-outbox-qa-preflight.ts`
- Deleted disposable verifier.
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'`

## Commands Skipped

- Browser/login flow.
- AP email endpoint call.
- Outbox creation.
- Provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP.
- PDF generation/download, body/base64 reads, attachment body reads.
- Migrations, Prisma db push, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 17: approved local authenticated AP email UI outbox QA`
