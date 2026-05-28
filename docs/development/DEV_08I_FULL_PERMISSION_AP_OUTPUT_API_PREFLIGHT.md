# DEV-08I Full-Permission AP Output API Preflight

## Purpose And Scope

- Task: `DEV-08I Part 4: authenticated full-permission AP output API preflight`.
- Latest commit inspected: `0a6134e3 Verify DEV-08I AP output permission fixtures`.
- Local `HEAD` matched `origin/main`: yes.
- Branch inspected: `main`.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: no.
- Login performed: no.
- API output generation/download performed: no.
- Temporary scripts created: none.

This preflight selects the Part 5 full-permission API checks and the allowed evidence shape. It does not log in, generate PDF output, download PDF bodies, mutate generated documents, send email, call ZATCA, run browser/Playwright, run migrations, run seed/reset/delete, deploy, or change env/provider/schema settings.

## Approval Phrase For Part 5

The exact Part 5 approval phrase has been received in the user's upfront approval bundle:

`I approve DEV-08I Part 5 local-only authenticated full-permission AP output API QA under marker DEV08I-AP-20260528T000000. No production, no beta, no customer data.`

Part 5 must still re-check local target, latest commit, dirty status, API readiness, and temporary scripts before login or output generation.

## Local API Target Plan

- API target: local `http://localhost:4000` only.
- Database target must remain `postgresql`, host `localhost`, port `5432`, database `accounting`, parsed without printing credentials.
- If the API is not already healthy, Part 5 may start only the local API process needed for HTTP checks.
- Do not start web, Playwright, browser flows, E2E, smoke, migrations, seeds, resets, deploys, email workers, or ZATCA processes for Part 5.

## Fixture Subject

Use the Part 2 full output QA fixture only:

- Full output QA user safe prefix: `5281dfc0`.
- Full output QA role safe prefix: `a0c6ece9`.
- Full output QA permission count: `136`.
- Expected permissions include all AP source view permissions, `generatedDocuments.view`, and `generatedDocuments.download`.

Part 5 may call local `/auth/login` for this fake user only. The login token, password, request body, response body, auth header, and cookies must not be printed or committed. The expected login audit row must be summarized only by action, entity type, count, actor safe prefix, and timestamp window.

## Selected Source Records

Use the existing local DEV-08H source records:

| Source | Number | Safe prefix | Status | Baseline generated documents |
| --- | --- | --- | --- | ---: |
| Purchase order | `PO-000144` | `8f42caf7` | `APPROVED` | `2` |
| Purchase bill | `BILL-000423` | `16e6f021` | `FINALIZED` | `1` |
| Supplier payment | `PAY-000318` | `7efa0003` | `POSTED` | `1` |
| Supplier refund | `SRF-000127` | `e7eed3c7` | `POSTED` | `1` |
| Purchase debit note | `PDN-000127` | `7c07411c` | `FINALIZED` | `1` |
| Cash expense | `EXP-000065` | `bd4d1330` | `POSTED` | `1` |

## Endpoint Selection For Part 5

Authentication and identity:

| Check | Expected evidence |
| --- | --- |
| `POST /auth/login` | HTTP status, fake user safe prefix, `AUTH_LOGIN` audit count; no token/body printed. |
| `GET /auth/me` | HTTP status, active membership count, role safe prefix, permission count; no response body printed. |

Read-only AP output data contracts:

| Source | Endpoint |
| --- | --- |
| Purchase order | `GET /purchase-orders/:id/pdf-data` |
| Purchase bill | `GET /purchase-bills/:id/pdf-data` |
| Supplier payment | `GET /supplier-payments/:id/receipt-pdf-data` |
| Supplier refund | `GET /supplier-refunds/:id/pdf-data` |
| Purchase debit note | `GET /purchase-debit-notes/:id/pdf-data` |
| Cash expense | `GET /cash-expenses/:id/pdf-data` |

For these read-only checks, record only HTTP status, source safe prefix, document number, line/count summaries, and generated timestamp presence. Do not print payload bodies or customer/vendor details.

Explicit local archive generation:

| Source | Endpoint |
| --- | --- |
| Purchase order | `POST /purchase-orders/:id/generate-pdf` |
| Purchase bill | `POST /purchase-bills/:id/generate-pdf` |
| Supplier payment | `POST /supplier-payments/:id/generate-receipt-pdf` |
| Supplier refund | `POST /supplier-refunds/:id/generate-pdf` |
| Purchase debit note | `POST /purchase-debit-notes/:id/generate-pdf` |
| Cash expense | `POST /cash-expenses/:id/generate-pdf` |

For explicit generation, record only HTTP status, generated-document safe prefix, filename, MIME type, hash prefix, byte size, status, and before/after counts. Do not print generated PDF bodies or base64.

Generated-document archive metadata and download integrity:

| Check | Endpoint |
| --- | --- |
| Archive list by source | `GET /generated-documents?sourceId=<sourceId>` |
| Archive metadata | `GET /generated-documents/:id` |
| Archive file integrity | `GET /generated-documents/:id/download` |

For download integrity, read the local response buffer only to compute hash and byte length, then compare to stored metadata. Record only safe prefix, filename, MIME type, hash prefix, byte count, and match status. Never print PDF content, base64, headers, bearer tokens, cookies, or raw bodies.

The source streaming routes (`GET .../pdf` and `GET .../receipt.pdf`) are intentionally deferred from Part 5 to avoid duplicate generation beyond the six explicit archive calls. They remain relevant for the later full-permission UI check because the web detail pages call those paths.

## Side-Effect Baseline To Capture In Part 5

Before and after Part 5, record:

- Generated-document count for each selected source.
- Total generated-document count for selected sources.
- Marker email outbox rows.
- Organization ZATCA submission logs and signed artifact drafts.
- Full user `AUTH_LOGIN` audit rows in the Part 5 timestamp window.
- Generated-document audit rows created by Part 5, by count only.

Expected Part 5 side effects:

- One `AUTH_LOGIN` audit row for the fake full output QA user.
- Six new generated-document rows, one per explicit generation endpoint, if all generation calls succeed.
- Generated-document audit rows for those six archive creations.

Expected absent side effects:

- No real email provider calls.
- No email outbox rows for the marker.
- No ZATCA rows added.
- No accounting state changes beyond generated-document archive rows.
- No production, beta, hosted/shared-target, or customer data.

## Stop Conditions

Stop before any login or generation if:

- The database target is not local `localhost:5432/accounting`.
- API health/readiness is unavailable and the local API cannot be started without migrations, seed/reset/delete, env changes, or deploys.
- The full output QA fixture user/role is missing or lacks `generatedDocuments.download`.
- The selected source records are missing or no longer share one local organization.
- Any response appears to include real/customer/vendor data that cannot be safely summarized.
- Any token, cookie, auth header, request body, response body, PDF body, base64, email body, signed XML, QR payload, secret, database URL, or private key would need to be printed.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Prompt inspection for Part 4 and Part 5.
- Source/code inspection from earlier Part 1 permission/API map reused for endpoint selection.

## Commands Skipped

- Login, browser flow, Playwright, authenticated API execution, and `/auth/login`.
- AP PDF generation, generated-document download, output archive mutation, real email, provider calls, and ZATCA.
- Fixture/user/role mutation, accounting mutations, migrations, seed/reset/delete, cleanup/delete, deployments, env changes, provider changes, schema changes, backup/restore.
- `verify:repo`, actual `verify:ci:local`, full tests, full build, full E2E, full smoke, and production-hosting research.

## Exact Next Prompt Title

`DEV-08I Part 5: approved local authenticated full-permission AP output API QA`
