# DEV-08K AP Email UI Evidence Verification

## Purpose And Scope

- Task: `DEV-08K Part 15: AP email UI evidence verification`.
- Latest commit inspected: `2c957516 Implement DEV-08K AP email UI`.
- Mode: read-only/code-level verification.
- Runtime outbox mutation performed: no.
- AP email endpoint called: no.
- Provider calls performed: no.
- Real email sent: no.
- Browser/login performed: no.

This verification checked the Part 14 `/documents` AP email UI implementation at code/test level and confirmed local counts did not change. It did not run browser/login, create outbox rows, call providers, retry workers, webhooks, diagnostics sends, SMTP, ZATCA, migrations, seed/reset/delete, deploy, full build, E2E, smoke, backup/restore, or production-hosting research.

## UI Verification Result

Verified implementation files:

- `apps/web/src/app/(app)/documents/page.tsx`
- `apps/web/src/app/(app)/documents/page.test.tsx`
- `apps/web/src/lib/documents.ts`
- `apps/web/src/lib/documents.test.ts`
- `apps/web/src/lib/email.ts`
- `apps/web/src/lib/email.test.ts`

Result:

- `/documents` rows render `GeneratedDocumentApEmailAction` only when `canCreateApGeneratedDocumentEmail(document, can)` returns true.
- `canCreateApGeneratedDocumentEmail(...)` requires a supported AP source/document type, status `GENERATED`, `generatedDocuments.download`, `emailOutbox.view`, and the source-specific AP view permission.
- The UI action label is `Create local email outbox`.
- The row helper text says `Local mock outbox only. No real email or provider send. PDF body is not shown.`
- The success state says no real email was sent and links to `/settings/email-outbox`.

## Permission Visibility Result

Targeted tests verify:

| Case | Result |
| --- | --- |
| Full-permission AP generated document | action is visible |
| Missing `generatedDocuments.download` | action hidden |
| Missing `emailOutbox.view` | action hidden |
| Missing AP source view permission | action hidden |
| Unsupported source/document type | action hidden |
| Non-`GENERATED` document | action hidden |

Backend enforcement remains unchanged and authoritative.

## No-Send And Count Verification

Sanitized local target:

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Schema | `public` |
| Local-only classification | `true` |

Read-only counts after Part 14 implementation tests:

| Check | Count |
| --- | ---: |
| Email outbox rows | `228` |
| Synthetic recipient rows | `1` |
| AP generated-document email rows | `1` |
| Selected generated-document email rows | `1` |
| Email provider events | `0` |
| Generated documents | `870` |

Selected generated document remains:

| Field | Value |
| --- | --- |
| Generated document safe prefix | `27a07429` |
| Status | `GENERATED` |
| Document type | `PURCHASE_BILL` |
| Source type | `PurchaseBill` |
| Source safe prefix | `16e6f021` |
| Document/source number | `BILL-000423` |

No runtime outbox/send mutation happened during the Part 14 implementation tests.

## Body Exposure Result

- The UI tests assert explicit recipient submission does not include `contentBase64`, `bodyText`, `bodyHtml`, `attachmentBody`, or PDF payload fields.
- No email body was printed or rendered.
- No attachment body was printed or rendered.
- No PDF body was printed or rendered.
- No base64, source contact email, customer/vendor data, token, cookie, auth header, provider payload, signed XML, QR payload, private key, or CSID was printed.

## Temporary Script Cleanup

- Disposable read-only verifier: `apps/api/scripts/dev08k-part15-ui-readonly-verify.ts`.
- Removed before commit: yes.
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'` returned no files.
- `git ls-files 'apps/api/scripts/*dev08k*'` returned no files.

## Commands Run

- `git status --short --branch`
- `git log --oneline -5 --decorate`
- Read DEV-08K Part 15 prompt from `E:\Downloads\dev08k_remaining_from_part12_arc_prompts.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_UI_IMPLEMENTATION_EVIDENCE.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_UI_DESIGN_PREFLIGHT.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_EVIDENCE_VERIFICATION.md`.
- Read `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`, `BUG_AUDIT.md`, and `README.md`.
- `Select-String` checks across the changed UI/helper/test files for permission gates and no-body wording.
- `corepack pnpm exec jest --config jest.config.cjs src/lib/documents.test.ts src/lib/email.test.ts --testPathPatterns=documents/page.test.tsx`
- Created and ran disposable read-only verifier `apps/api/scripts/dev08k-part15-ui-readonly-verify.ts`.
- `corepack pnpm exec tsx scripts/dev08k-part15-ui-readonly-verify.ts`
- Deleted disposable verifier.
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'`
- `git ls-files 'apps/api/scripts/*dev08k*'`

## Commands Skipped

- Browser/login/runtime UI flow.
- AP email endpoint calls.
- Outbox creation.
- Provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP.
- PDF generation/download, body/base64 reads, attachment body reads.
- Migrations, Prisma db push, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 16: AP email local UI outbox QA preflight`
