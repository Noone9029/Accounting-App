# DEV-08I Restricted AP Output API Permission Preflight

## Purpose And Scope

- Task: `DEV-08I Part 7: restricted AP output API permission preflight`.
- Latest commit inspected: `a7986366 Verify DEV-08I full permission AP output API`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: no.
- Login/API/browser/output/download performed: no.
- Temporary scripts created: none.

This preflight plans the Part 8 restricted-user API checks. It did not log in, generate output, download generated documents, call source PDF routes, send email, call ZATCA, run migrations, run seed/reset/delete, deploy, or change env/provider/schema settings.

## Approval Phrase For Part 8

The exact Part 8 approval phrase has been received in the user's upfront approval bundle:

`I approve DEV-08I Part 8 local-only restricted-user AP output API permission negative checks under marker DEV08I-AP-20260528T000000. No production, no beta, no customer data.`

Part 8 must still re-check local target, latest commit, dirty status, API readiness, selected fixtures, and no temporary `*dev08i*` scripts before login.

## Local Target And Fixture Snapshot

- Database target accepted from `.env` without printing credentials: host `localhost`, port `5432`, database `accounting`.
- Restricted archive-only user safe prefix: `16d72d2a`.
- Restricted archive-only membership safe prefix: `2de5260b`.
- Restricted archive-only role safe prefix: `83dc203f`.
- Restricted archive-only role permission count: `4`.
- Restricted AP viewer/no archive-download user safe prefix: `41b031e2`.
- Restricted AP viewer/no archive-download membership safe prefix: `78a4a87c`.
- Restricted AP viewer/no archive-download role safe prefix: `b167ef15`.
- Restricted AP viewer/no archive-download role permission count: `10`.

Selected role permissions:

| Fixture user | `generatedDocuments.view` | `generatedDocuments.download` | AP source `*.view` permissions |
| --- | --- | --- | --- |
| Restricted archive-only `16d72d2a` | yes | no | no |
| Restricted AP viewer/no archive download `41b031e2` | yes | no | yes |

## Guard Expectations

All planned API checks pass through `JwtAuthGuard`, `OrganizationContextGuard`, and `PermissionGuard`.

| API surface | Required permission | Archive-only expected | AP-viewer expected |
| --- | --- | --- | --- |
| `GET /generated-documents?sourceId=<sourceId>` | `generatedDocuments.view` | 200 metadata-only | 200 metadata-only |
| `GET /generated-documents/:id` | `generatedDocuments.view` | 200 metadata-only | 200 metadata-only |
| `GET /generated-documents/:id/download` | `generatedDocuments.download` | 403 blocked | 403 blocked |
| `GET /purchase-orders/:id/pdf-data` | `purchaseOrders.view` | 403 blocked | 200 metadata-only if checked |
| `GET /purchase-bills/:id/pdf-data` | `purchaseBills.view` | 403 blocked | 200 metadata-only if checked |
| `GET /supplier-payments/:id/receipt-pdf-data` | `supplierPayments.view` | 403 blocked | 200 metadata-only if checked |
| `GET /supplier-refunds/:id/pdf-data` | `supplierRefunds.view` | 403 blocked | 200 metadata-only if checked |
| `GET /purchase-debit-notes/:id/pdf-data` | `purchaseDebitNotes.view` | 403 blocked | 200 metadata-only if checked |
| `GET /cash-expenses/:id/pdf-data` | `cashExpenses.view` | 403 blocked | 200 metadata-only if checked |
| `POST /purchase-orders/:id/generate-pdf` | `purchaseOrders.view` | 403 blocked | allowed by current guard; do not call in Part 8 |
| `POST /purchase-bills/:id/generate-pdf` | `purchaseBills.view` | 403 blocked | allowed by current guard; do not call in Part 8 |
| `POST /supplier-payments/:id/generate-receipt-pdf` | `supplierPayments.view` | 403 blocked | allowed by current guard; do not call in Part 8 |
| `POST /supplier-refunds/:id/generate-pdf` | `supplierRefunds.view` | 403 blocked | allowed by current guard; do not call in Part 8 |
| `POST /purchase-debit-notes/:id/generate-pdf` | `purchaseDebitNotes.view` | 403 blocked | allowed by current guard; do not call in Part 8 |
| `POST /cash-expenses/:id/generate-pdf` | `cashExpenses.view` | 403 blocked | allowed by current guard; do not call in Part 8 |

Important policy edge: the current AP source generation routes are guarded by AP source view permissions, not by `generatedDocuments.download`. Therefore Part 8 should use the restricted archive-only user for blocked AP generation checks. Calling AP generation routes as the AP-viewer/no-download user would likely create output, which conflicts with the negative-check goal.

## Part 8 Execution Plan

Primary negative subject: restricted archive-only user `16d72d2a`.

1. Re-check local target: DB `localhost:5432/accounting`; API `http://localhost:4000`; no production/beta/shared target.
2. Re-check selected generated documents and source ids from Part 5/6 by safe prefixes only.
3. Capture before-counts for selected-source generated documents, marker email outbox rows, ZATCA submission logs, signed artifact drafts, and restricted-user login audit rows.
4. Login once as the restricted archive-only fake user; do not print token, password, request body, response body, cookie, or auth header.
5. Call `/auth/me`; record only role safe prefix, permission count, and selected permission booleans.
6. Confirm archive metadata view-only behavior with `GET /generated-documents?sourceId=<sourceId>` and `GET /generated-documents/:id`; summarize counts/statuses only.
7. Confirm archive download is blocked with `GET /generated-documents/:id/download`; record status `403` only and do not read/print a PDF body.
8. Confirm AP output data/generation is blocked for all six source families with the archive-only user; expected status `403` for `pdf-data` and explicit `generate-pdf`/`generate-receipt-pdf`.
9. Capture after-counts and prove selected-source generated-document count did not increase.

Optional secondary subject: restricted AP viewer/no archive-download user `41b031e2`.

- Safe Part 8 checks: archive download 403 and optional read-only AP `pdf-data` metadata summaries.
- Do not call AP source streaming routes or explicit generation routes for this user in Part 8 because current guards permit those routes and would create generated-document output.

## Evidence Shape For Part 8

Record only:

- safe prefixes for users, memberships, roles, sources, and generated documents;
- HTTP status codes;
- permission booleans for the selected permissions;
- selected-source generated-document counts before/after;
- marker email/ZATCA counts before/after;
- audit row counts and safe actor prefixes.

Do not print:

- passwords, tokens, cookies, bearer headers, request bodies, response bodies, raw `/auth/me`, raw audit metadata, PDF bodies, base64, customer/vendor data, signed XML, QR payloads, private keys, CSIDs, email bodies, or database URLs.

## Stop Conditions

Stop before login or blocked-route checks if:

- The database target is not local `localhost:5432/accounting`.
- The API target is not local `http://localhost:4000`.
- The archive-only user is missing, inactive, has `generatedDocuments.download`, or has any AP source view permission.
- The selected sources or generated documents are missing.
- Any check would require printing a body, auth material, secret, PDF content, base64, email content, signed XML, QR payload, or real/customer/vendor data.
- Any AP generate check succeeds for the archive-only user; that would be a permission failure and must stop before additional generate attempts.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Read previous DEV-08I preflight/evidence documents and `CODEX_HANDOFF.md`.
- Read-only controller/guard/permission inspection.
- Read-only local Prisma fixture permission snapshot with sanitized output.

## Commands Skipped

- Login, browser/UI flow, Playwright, API generation, generated-document download, and source PDF streaming.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08I Part 8: approved local restricted-user AP output API permission negative checks`
