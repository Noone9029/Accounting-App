# DEV-08I Full-Permission AP Output API Evidence Verification

## Purpose And Scope

- Task: `DEV-08I Part 6: full-permission AP output API evidence verification`.
- Latest commit inspected: `b5ab2cfd Check DEV-08I full permission AP output API`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: no.
- Login/browser/API generation/download performed: no.
- Temporary scripts created: none.
- PDF body/base64/request/response body/auth material printed: no.

This verification read local database metadata only. It did not log in, call AP output API routes, generate documents, call generated-document download routes, send email, call ZATCA, run migrations, run seed/reset/delete, deploy, or change env/provider/schema settings.

## Local Target Verification

- Database target accepted from `.env` without printing credentials: host `localhost`, port `5432`, database `accounting`.
- Full output QA user safe prefix: `5281dfc0`.
- `apps/api/scripts` `*dev08i*` files: none.

## Evidence Verification Result

- Selected-source generated-document count remained unchanged during the read: `13 -> 13`.
- Generated documents created by full output QA user for the selected sources: `6`.
- Full-user `AUTH_LOGIN` audit rows: `1`.
- Standardized `GENERATED_DOCUMENT_CREATED` audit rows for the six new documents: `6`.
- Marker email outbox rows: `0`.
- Organization ZATCA submission logs: `331`.
- Organization ZATCA signed artifact drafts: `33`.

| Source | Source prefix | Source status | Document prefix | Filename | Hash prefix | Size | Audit rows | Result |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| `PO-000144` | `8f42caf7` | `APPROVED` | `d9591705` | `purchase-order-PO-000144.pdf` | `ddf0deeb518a` | `3226` | `1` | pass |
| `BILL-000423` | `16e6f021` | `FINALIZED` | `3d817d1e` | `purchase-bill-BILL-000423.pdf` | `71a2b74fd81b` | `3416` | `1` | pass |
| `PAY-000318` | `7efa0003` | `POSTED` | `6ad0e7b7` | `supplier-payment-PAY-000318.pdf` | `6965d8236cb0` | `3135` | `1` | pass |
| `SRF-000127` | `e7eed3c7` | `POSTED` | `eda73f44` | `supplier-refund-SRF-000127.pdf` | `98775e8d88f1` | `3044` | `1` | pass |
| `PDN-000127` | `7c07411c` | `FINALIZED` | `6bf15f25` | `purchase-debit-note-PDN-000127.pdf` | `c725362cde7a` | `3335` | `1` | pass |
| `EXP-000065` | `bd4d1330` | `POSTED` | `42748b57` | `cash-expense-EXP-000065.pdf` | `9decd7876a08` | `3262` | `1` | pass |

All six rows retained `mimeType=application/pdf`, `status=GENERATED`, expected source status, expected safe prefixes, expected hash prefixes, expected byte counts, and one matching `GENERATED_DOCUMENT_CREATED` audit row each.

## Exposure And Side-Effect Result

- No PDF body was printed.
- No base64 was printed.
- No request or response body was printed.
- No token, cookie, or auth header was printed.
- No customer/vendor details, signed XML, QR payload, private key, CSID, or email body was printed.
- No real email/provider path was called.
- No real ZATCA network/CSID/clearance/reporting/signing/PDF-A3 path was called.
- No generated-document count changed during this verification.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Read previous DEV-08I preflight/evidence documents and `CODEX_HANDOFF.md`.
- Read-only local Prisma metadata verification with `node -e` from `apps/api`.

One read-only query attempt failed before returning data because `startsWith` is not valid for UUID fields in Prisma. It did not create, update, or delete repo or database state. The successful verification loaded local metadata and matched safe prefixes in memory.

## Commands Skipped

- Login, browser/UI flow, Playwright, API generation, generated-document download route, and source PDF streaming routes.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08I Part 7: restricted AP output API permission preflight`
