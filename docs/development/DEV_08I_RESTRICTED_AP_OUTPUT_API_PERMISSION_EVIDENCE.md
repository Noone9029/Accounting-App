# DEV-08I Restricted AP Output API Permission Evidence

## Purpose And Scope

- Task: `DEV-08I Part 8: approved local restricted-user AP output API permission negative checks`.
- Latest commit inspected: `98c7359e Plan DEV-08I restricted AP output API permission checks`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: yes, only one approved local fake-user login audit row.
- Generated-document output created: no.
- Browser/UI flow performed: no.
- Real email, provider, ZATCA, hosted, beta, production, customer-data, migration, seed, reset, delete, deploy, env, schema, backup, and restore paths used: no.

This run authenticated the local restricted archive-only user and verified that metadata-only archive view stayed allowed while archive downloads and AP output routes were blocked. It did not print tokens, cookies, auth headers, request bodies, response bodies, PDF bodies, base64, signed XML, QR payloads, email bodies, or secrets.

## Approval And Local Target

- Required approval phrase status: received and matched exactly.
- Approval phrase: `I approve DEV-08I Part 8 local-only restricted-user AP output API permission negative checks under marker DEV08I-AP-20260528T000000. No production, no beta, no customer data.`
- API target accepted: `http://localhost:4000`.
- API health result: `200`.
- Database target accepted from `.env` without printing credentials: host `localhost`, port `5432`, database `accounting`.
- Restricted archive-only user safe prefix: `16d72d2a`.
- Restricted archive-only membership safe prefix: `2de5260b`.
- Restricted archive-only role safe prefix: `83dc203f`.
- Restricted archive-only role permission count: `4`.

Selected permission snapshot:

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

## Authenticated Checks

| Check | Result |
| --- | --- |
| `POST /auth/login` | Succeeded for local fake restricted archive-only user; token and body were not printed. |
| `GET /auth/me` | HTTP `200`; response body was not printed. |
| Restricted-user `AUTH_LOGIN` audit rows | `0 -> 1`. |

## Archive Metadata View-Only Checks

| Source | Source prefix | List status | List count | Detail status | Document prefix | Filename | Hash prefix | Size |
| --- | --- | --- | ---: | --- | --- | --- | --- | ---: |
| `PO-000144` | `8f42caf7` | ok | `3` | ok | `d9591705` | `purchase-order-PO-000144.pdf` | `ddf0deeb518a` | `3226` |
| `BILL-000423` | `16e6f021` | ok | `2` | ok | `3d817d1e` | `purchase-bill-BILL-000423.pdf` | `71a2b74fd81b` | `3416` |
| `PAY-000318` | `7efa0003` | ok | `2` | ok | `6ad0e7b7` | `supplier-payment-PAY-000318.pdf` | `6965d8236cb0` | `3135` |
| `SRF-000127` | `e7eed3c7` | ok | `2` | ok | `eda73f44` | `supplier-refund-SRF-000127.pdf` | `98775e8d88f1` | `3044` |
| `PDN-000127` | `7c07411c` | ok | `2` | ok | `6bf15f25` | `purchase-debit-note-PDN-000127.pdf` | `c725362cde7a` | `3335` |
| `EXP-000065` | `bd4d1330` | ok | `2` | ok | `42748b57` | `cash-expense-EXP-000065.pdf` | `9decd7876a08` | `3262` |

## Blocked Download And AP Output Checks

| Source | Archive download | AP data route | AP generate route |
| --- | ---: | ---: | ---: |
| `PO-000144` | `403` | `403` | `403` |
| `BILL-000423` | `403` | `403` | `403` |
| `PAY-000318` | `403` | `403` | `403` |
| `SRF-000127` | `403` | `403` | `403` |
| `PDN-000127` | `403` | `403` | `403` |
| `EXP-000065` | `403` | `403` | `403` |

- All generated-document archive downloads were blocked: yes.
- All AP output data/generation checks were blocked for the archive-only user: yes.
- No blocked-route response body was read or printed.
- No PDF buffer or base64 was read or printed.

## Side Effects

| Count | Before | After |
| --- | ---: | ---: |
| Selected-source generated documents | `13` | `13` |
| Marker email outbox rows | `0` | `0` |
| Organization ZATCA submission logs | `331` | `331` |
| Organization ZATCA signed artifact drafts | `33` | `33` |
| Restricted-user login audit rows | `0` | `1` |
| Generated documents by restricted user | `0` | `0` |

## Temporary Script Handling

- Temporary runner created: `apps/api/scripts/dev08i-part8-restricted-api-negative.ts`.
- Runner safety: refused non-local DB/API targets before login and printed only safe prefixes, counts, statuses, filenames, hash prefixes, and byte sizes.
- Temporary runner removed before commit: yes.
- Removal proof: `Test-Path apps/api/scripts/dev08i-part8-restricted-api-negative.ts` returned `False`.
- `apps/api/scripts` `*dev08i*` files after cleanup: none.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Local API health check against `http://localhost:4000/health`.
- Read previous DEV-08I evidence/preflight documents and `CODEX_HANDOFF.md`.
- Temporary local `tsx` runner for the approved restricted API negative checks.
- `Test-Path apps/api/scripts/dev08i-part8-restricted-api-negative.ts`.

## Commands Skipped

- Browser/UI flows and Playwright.
- AP source streaming PDF routes.
- Restricted AP-viewer generation routes, because current guards permit them and the Part 8 goal was negative-only with no output creation.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08I Part 9: restricted AP output API permission evidence verification`
