# DEV-08I Restricted AP Output API Permission Evidence Verification

## Purpose And Scope

- Task: `DEV-08I Part 9: restricted AP output API permission evidence verification`.
- Latest commit inspected: `f8f65d79 Check DEV-08I restricted AP output API permissions`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: no.
- Login/API/browser/output/download performed: no.
- Temporary scripts created: none.

This verification read local database metadata and the Part 8 evidence document only. It did not log in, call API routes, generate output, download generated documents, call source PDF routes, send email, call ZATCA, run migrations, run seed/reset/delete, deploy, or change env/provider/schema settings.

## Local Target And Restricted Fixture

- Database target accepted from `.env` without printing credentials: host `localhost`, port `5432`, database `accounting`.
- Restricted archive-only user safe prefix: `16d72d2a`.
- Restricted archive-only membership safe prefix: `2de5260b`.
- Restricted archive-only role safe prefix: `83dc203f`.
- Membership status: `ACTIVE`.
- Permission count: `4`.

Selected permission snapshot remained:

| Permission | Present |
| --- | --- |
| `generatedDocuments.view` | yes |
| `generatedDocuments.download` | no |
| `purchaseOrders.view` | no |
| `purchaseBills.view` | no |
| `supplierPayments.view` | no |
| `supplierRefunds.view` | no |
| `purchaseDebitNotes.view` | no |
| `cashExpenses.view` | no |

## Verification Result

- Part 8 evidence recorded six generated-document download `403` results.
- Part 8 evidence recorded six AP data-route `403` results.
- Part 8 evidence recorded six AP generate-route `403` results.
- Current selected-source generated-document count: `13`.
- Current marker email outbox rows: `0`.
- Current organization ZATCA submission logs: `331`.
- Current organization ZATCA signed artifact drafts: `33`.
- Current restricted-user `AUTH_LOGIN` audit rows: `1`.
- Current generated documents by restricted user: `0`.

| Source | Source prefix | Source status | Document prefix | Filename | Hash prefix | Size | Result |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| `PO-000144` | `8f42caf7` | `APPROVED` | `d9591705` | `purchase-order-PO-000144.pdf` | `ddf0deeb518a` | `3226` | pass |
| `BILL-000423` | `16e6f021` | `FINALIZED` | `3d817d1e` | `purchase-bill-BILL-000423.pdf` | `71a2b74fd81b` | `3416` | pass |
| `PAY-000318` | `7efa0003` | `POSTED` | `6ad0e7b7` | `supplier-payment-PAY-000318.pdf` | `6965d8236cb0` | `3135` | pass |
| `SRF-000127` | `e7eed3c7` | `POSTED` | `eda73f44` | `supplier-refund-SRF-000127.pdf` | `98775e8d88f1` | `3044` | pass |
| `PDN-000127` | `7c07411c` | `FINALIZED` | `6bf15f25` | `purchase-debit-note-PDN-000127.pdf` | `c725362cde7a` | `3335` | pass |
| `EXP-000065` | `bd4d1330` | `POSTED` | `42748b57` | `cash-expense-EXP-000065.pdf` | `9decd7876a08` | `3262` | pass |

All six rows retained `mimeType=application/pdf`, `status=GENERATED`, expected source state, expected document safe prefix, expected hash prefix, and expected byte count. The restricted user still has no generated documents for the selected sources.

## Exposure And Side-Effect Result

- No PDF body was printed.
- No base64 was printed.
- No request or response body was printed.
- No token, cookie, or auth header was printed.
- No customer/vendor details, signed XML, QR payload, private key, CSID, or email body was printed.
- No real email/provider path was called.
- No real ZATCA network/CSID/clearance/reporting/signing/PDF-A3 path was called.
- No generated-document count changed during this verification.
- No `*dev08i*` temporary script remained under `apps/api/scripts`.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Read `docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE.md`.
- Read `CODEX_HANDOFF.md`.
- Read-only local Prisma metadata verification with `node -e` from `apps/api`.

## Commands Skipped

- Login, browser/UI flow, Playwright, API generation, generated-document download, and source PDF streaming.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08I Part 10: AP output UI full-permission preflight`
