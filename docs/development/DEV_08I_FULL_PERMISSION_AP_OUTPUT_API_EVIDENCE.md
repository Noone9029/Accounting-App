# DEV-08I Full-Permission AP Output API Evidence

## Purpose And Scope

- Task: `DEV-08I Part 5: approved local authenticated full-permission AP output API QA`.
- Latest commit inspected: `4ca68502 Plan DEV-08I full permission AP output API QA`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: yes, only the approved local fake-user login audit row plus one generated-document archive row for each selected AP source.
- Browser/UI flow performed: no.
- Real email, provider, ZATCA, hosted, beta, production, customer-data, migration, seed, reset, delete, deploy, env, schema, backup, and restore paths used: no.

This run authenticated the local disposable full-permission user, exercised the selected AP output API surfaces, generated one local archive row per selected AP source, and verified generated-document metadata/download integrity by hashes and byte sizes only. No token, cookie, auth header, request body, response body, PDF body, base64, signed XML, QR payload, email body, or secret was printed.

## Approval And Local Target

- Required approval phrase status: received and matched exactly.
- Approval phrase: `I approve DEV-08I Part 5 local-only authenticated full-permission AP output API QA under marker DEV08I-AP-20260528T000000. No production, no beta, no customer data.`
- API target accepted: `http://localhost:4000`.
- API health result: `200`.
- Database target accepted from `.env` without printing credentials: protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Full output QA user safe prefix: `5281dfc0`.
- Full output QA membership safe prefix: `b7f0b3d4`.
- Full output QA role safe prefix: `a0c6ece9`.
- Full output QA role permission count: `136`.

## Authenticated Checks

| Check | Result |
| --- | --- |
| `POST /auth/login` | Succeeded for the local fake full output QA user; token and body were not printed. |
| `GET /auth/me` | Succeeded; response body was not printed. |
| Full-user `AUTH_LOGIN` audit rows | `0 -> 1` in the Part 5 run window; current full-user total `1`. |

## AP Output API Results

| Source | Source prefix | Status | Data endpoint | Generated docs | New document | Filename | Hash prefix | Size | Metadata/download |
| --- | --- | --- | --- | ---: | --- | --- | --- | ---: | --- |
| `PO-000144` | `8f42caf7` | `APPROVED` | ok | `2 -> 3` | `d9591705` | `purchase-order-PO-000144.pdf` | `ddf0deeb518a` | `3226` | matched |
| `BILL-000423` | `16e6f021` | `FINALIZED` | ok | `1 -> 2` | `3d817d1e` | `purchase-bill-BILL-000423.pdf` | `71a2b74fd81b` | `3416` | matched |
| `PAY-000318` | `7efa0003` | `POSTED` | ok | `1 -> 2` | `6ad0e7b7` | `supplier-payment-PAY-000318.pdf` | `6965d8236cb0` | `3135` | matched |
| `SRF-000127` | `e7eed3c7` | `POSTED` | ok | `1 -> 2` | `eda73f44` | `supplier-refund-SRF-000127.pdf` | `98775e8d88f1` | `3044` | matched |
| `PDN-000127` | `7c07411c` | `FINALIZED` | ok | `1 -> 2` | `6bf15f25` | `purchase-debit-note-PDN-000127.pdf` | `c725362cde7a` | `3335` | matched |
| `EXP-000065` | `bd4d1330` | `POSTED` | ok | `1 -> 2` | `42748b57` | `cash-expense-EXP-000065.pdf` | `9decd7876a08` | `3262` | matched |

Endpoints covered:

- `GET /purchase-orders/:id/pdf-data`
- `GET /purchase-bills/:id/pdf-data`
- `GET /supplier-payments/:id/receipt-pdf-data`
- `GET /supplier-refunds/:id/pdf-data`
- `GET /purchase-debit-notes/:id/pdf-data`
- `GET /cash-expenses/:id/pdf-data`
- `POST /purchase-orders/:id/generate-pdf`
- `POST /purchase-bills/:id/generate-pdf`
- `POST /supplier-payments/:id/generate-receipt-pdf`
- `POST /supplier-refunds/:id/generate-pdf`
- `POST /purchase-debit-notes/:id/generate-pdf`
- `POST /cash-expenses/:id/generate-pdf`
- `GET /generated-documents?sourceId=<sourceId>`
- `GET /generated-documents/:id`
- `GET /generated-documents/:id/download`

The download checks read local response buffers only to compute hash and byte length. The stored metadata and downloaded buffer hash/size matched for all six new archive rows.

## Audit And Side Effects

| Evidence | Before | After/current |
| --- | ---: | ---: |
| Selected-source generated documents | `7` | `13` |
| Marker email outbox rows | `0` | `0` |
| Organization ZATCA submission logs | `331` | `331` |
| Organization ZATCA signed artifact drafts | `33` | `33` |
| Full-user login audit rows in Part 5 window | `0` | `1` |
| Generated-document audit rows for six new documents | `0` | `6` |

The generated-document audit action is standardized by `AuditLogService` to `GENERATED_DOCUMENT_CREATED`; a read-only follow-up query confirmed all six new document ids have matching standardized audit rows:

| Document prefix | Audit action | Audit row prefix |
| --- | --- | --- |
| `d9591705` | `GENERATED_DOCUMENT_CREATED` | `7c2b6d3e` |
| `3d817d1e` | `GENERATED_DOCUMENT_CREATED` | `39963611` |
| `6ad0e7b7` | `GENERATED_DOCUMENT_CREATED` | `fb0b11ef` |
| `eda73f44` | `GENERATED_DOCUMENT_CREATED` | `6f85fd48` |
| `6bf15f25` | `GENERATED_DOCUMENT_CREATED` | `135b98b9` |
| `42748b57` | `GENERATED_DOCUMENT_CREATED` | `fec2a0ee` |

## Temporary Script Handling

- Temporary runner created: `apps/api/scripts/dev08i-part5-full-api-qa.ts`.
- Runner safety: refused non-local DB/API targets before login or output generation and printed only safe prefixes, counts, statuses, filenames, hash prefixes, and byte sizes.
- Temporary runner removed before commit: yes.
- Removal proof: `Test-Path apps/api/scripts/dev08i-part5-full-api-qa.ts` returned `False`.
- `apps/api/scripts` `*dev08i*` files after cleanup: none.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Local API health check against `http://localhost:4000/health`.
- Started local API with `corepack pnpm --filter @ledgerbyte/api dev` because the API was not initially reachable.
- `corepack pnpm exec tsx scripts/dev08i-part5-full-api-qa.ts` from `apps/api`.
- Read-only Prisma follow-up query for standardized generated-document audit rows.
- Temporary script removal proof commands.

One attempted read-only inline TypeScript audit query failed before any data query because the shell quoting and `tsx` resolution were wrong. It did not create, update, or delete repo or database state; the follow-up used a read-only `node -e` Prisma query from `apps/api`.

## Commands Skipped

- Browser/UI flows and Playwright.
- Source streaming PDF routes (`GET .../pdf` and `GET .../receipt.pdf`), deferred to UI QA.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08I Part 6: full-permission AP output API evidence verification`
