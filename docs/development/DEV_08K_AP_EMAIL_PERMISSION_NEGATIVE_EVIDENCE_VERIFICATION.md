# DEV-08K AP Email Permission Negative Evidence Verification

## Purpose And Scope

- Task: `DEV-08K Part 12: AP email permission negative evidence verification`.
- Latest commit inspected: `5f38e517 Check DEV-08K AP email permissions`.
- Mode: read-only evidence verification only.
- AP email endpoint called: no.
- Runtime outbox mutation performed: no.
- Provider calls performed: no.
- Real email sent: no.
- Login/browser performed: no.

This verification confirmed that the Part 11 restricted AP generated-document email checks did not create additional outbox rows or provider events. It did not call the AP email endpoint, log in, run browser flows, create outbox rows, call providers, retry workers, webhooks, diagnostics sends, SMTP, ZATCA, migrations, seed/reset/delete, deploys, full tests, full builds, E2E, smoke, backup/restore, or production-hosting research.

## Evidence Doc Verification

The Part 11 evidence document exists at [DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_CHECK_EVIDENCE.md](DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_CHECK_EVIDENCE.md) and contains all five expected denied vectors:

| Case | Recorded result |
| --- | --- |
| Missing `generatedDocuments.download` | `403` blocked |
| Missing AP source view | `403` blocked |
| Missing `emailOutbox.view` | `403` blocked |
| Restricted AP viewer/no archive download role | `403` blocked |
| Restricted archive-only role | `403` blocked |

The evidence doc also records provider `send(...)` call count `0`, no provider event, no email sent, and no body/secret exposure.

## Local-Only Target Proof

Sanitized target classification from the read-only verifier:

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Schema | `public` |
| Local-only classification | `true` |

No database URL, credential, token, cookie, auth header, request/response body, email body, attachment body, PDF body, base64, signed XML, QR payload, private key, CSID, SMTP payload, provider payload, customer/vendor data, or source contact email was printed.

## Selected Generated Document Verification

| Field | Part 11 Evidence | Part 12 Read-Only Verification |
| --- | --- | --- |
| Generated document safe prefix | `27a07429` | `27a07429` |
| Status | `GENERATED` | `GENERATED` |
| Document type | `PURCHASE_BILL` | `PURCHASE_BILL` |
| Source type | `PurchaseBill` | `PurchaseBill` |
| Source safe prefix | `16e6f021` | `16e6f021` |
| Document/source number | `BILL-000423` | `BILL-000423` |
| Filename | `purchase-bill-BILL-000423.pdf` | `purchase-bill-BILL-000423.pdf` |
| MIME type | `application/pdf` | `application/pdf` |
| Size bytes | `3417` | `3417` |
| Content hash prefix | `47935bce9f75` | `47935bce9f75` |

The selected generated document remained unchanged by this verification.

## Count Verification

| Check | Part 11 Evidence | Part 12 Read-Only Verification | Result |
| --- | ---: | ---: | --- |
| Email outbox rows | `228` | `228` | unchanged |
| Synthetic recipient rows | `1` | `1` | unchanged |
| AP generated-document email rows | `1` | `1` | unchanged |
| Selected generated-document email rows | `1` | `1` | unchanged |
| Email provider events | `0` | `0` | unchanged |
| Generated documents | `870` | `870` | unchanged |

Selected outbox metadata remains a single AP generated-document email row:

| Field | Value |
| --- | --- |
| Outbox safe prefix | `3c19700b` |
| Status | `SENT_MOCK` |
| Provider | `mock-no-send` |
| Template | `AP_GENERATED_DOCUMENT` |
| Generated document safe prefix | `27a07429` |
| Source type | `PurchaseBill` |
| Source safe prefix | `16e6f021` |
| Attachment filename | `purchase-bill-BILL-000423.pdf` |
| Attachment MIME type | `application/pdf` |
| Attachment size bytes | `3417` |
| Attachment hash prefix | `47935bce9f75` |

No additional AP generated-document email row exists for the selected generated document.

## Exposure And Cleanup Verification

- No email body was printed.
- No attachment body was printed.
- No PDF body was printed.
- No base64 was printed.
- No source contact email, customer/vendor data, token, cookie, auth header, provider payload, signed XML, QR payload, private key, or CSID was printed.
- No AP email endpoint, provider, retry worker, webhook, diagnostics send, or SMTP path was called.
- No tracked or untracked `*dev08k*` script remains under `apps/api/scripts`.

## Commands Run

- `git status --short --branch`
- `git log --oneline -5 --decorate`
- Read the DEV-08K Part 12 prompt from `E:\Downloads\dev08k_remaining_from_part12_arc_prompts.md`.
- Read required DEV-08K/DEV-08J/DEV-03/DEV-02 docs, `BUG_AUDIT.md`, and `README.md`.
- Read-only inspection of `apps/api/prisma/schema.prisma`.
- Created disposable read-only verifier `apps/api/scripts/dev08k-part12-readonly-verify.ts`.
- First read-only verifier attempt stopped before verification because Prisma UUID filters do not support prefix `startsWith`.
- Corrected the verifier to use a parameterized read-only safe-prefix lookup.
- `corepack pnpm exec tsx scripts/dev08k-part12-readonly-verify.ts`
- Deleted disposable verifier.
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'`
- `git ls-files 'apps/api/scripts/*dev08k*'`
- `Select-String` evidence-doc checks for the five denied vectors.

## Commands Skipped

- AP email endpoint calls.
- Login, browser/UI flows, Playwright, and audit-writing authentication.
- Outbox row creation.
- Provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP.
- PDF generation/download, body/base64 reads, attachment body reads.
- Migrations, Prisma db push, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 13: AP email UI design preflight`
