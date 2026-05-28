# DEV-08I Full-Permission AP Output UI Preflight

## Purpose And Scope

- Task: `DEV-08I Part 10: AP output UI full-permission preflight`.
- Latest commit inspected: `f3e32c72 Verify DEV-08I restricted AP output API permissions`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: no.
- Login/API/browser/output/download performed: no.
- Temporary scripts created: none.

This preflight plans the approved Part 11 local authenticated UI QA for the full-permission DEV-08I user. It did not log in, open a browser, call source PDF routes, download generated documents, generate output, send email, call ZATCA, run migrations, run seed/reset/delete, deploy, or change env/provider/schema settings.

## Approval Phrase For Part 11

The exact Part 11 approval phrase has been received in the user's upfront approval bundle:

`I approve DEV-08I Part 11 local-only authenticated full-permission AP output UI QA under marker DEV08I-AP-20260528T000000. No production, no beta, no customer data.`

Part 11 must still re-check local target, latest commit, dirty status, API/web readiness, selected fixtures, and no temporary `*dev08i*` scripts before login or browser work.

## Local Target And Fixture Snapshot

- Database target accepted from `.env` without printing credentials: protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Planned API target: `http://localhost:4000`.
- Planned web target: `http://localhost:3000`.
- Full output QA user safe prefix: `5281dfc0`.
- Full output QA membership safe prefix: `b7f0b3d4`.
- Full output QA role safe prefix: `a0c6ece9`.
- Full output QA role permission count from Part 2/3: `136`.
- Required permissions expected present: `generatedDocuments.view`, `generatedDocuments.download`, `purchaseOrders.view`, `purchaseBills.view`, `supplierPayments.view`, `supplierRefunds.view`, `purchaseDebitNotes.view`, and `cashExpenses.view`.

Selected source/document baseline from the completed API evidence:

| Source | Source prefix | Status | Latest selected document prefix | Filename | Hash prefix | Size |
| --- | --- | --- | --- | --- | --- | ---: |
| `PO-000144` | `8f42caf7` | `APPROVED` | `d9591705` | `purchase-order-PO-000144.pdf` | `ddf0deeb518a` | `3226` |
| `BILL-000423` | `16e6f021` | `FINALIZED` | `3d817d1e` | `purchase-bill-BILL-000423.pdf` | `71a2b74fd81b` | `3416` |
| `PAY-000318` | `7efa0003` | `POSTED` | `6ad0e7b7` | `supplier-payment-PAY-000318.pdf` | `6965d8236cb0` | `3135` |
| `SRF-000127` | `e7eed3c7` | `POSTED` | `eda73f44` | `supplier-refund-SRF-000127.pdf` | `98775e8d88f1` | `3044` |
| `PDN-000127` | `7c07411c` | `FINALIZED` | `6bf15f25` | `purchase-debit-note-PDN-000127.pdf` | `c725362cde7a` | `3335` |
| `EXP-000065` | `bd4d1330` | `POSTED` | `42748b57` | `cash-expense-EXP-000065.pdf` | `9decd7876a08` | `3262` |

## UI Surface Map

The inspected UI uses `ledgerbyte.accessToken` and `ledgerbyte.activeOrganizationId` local storage keys. `PermissionProvider` loads `/auth/me` from the stored token and active organization id, then exposes permission checks to route content.

Archive page:

| UI route | Data/API route | Visible action for full user | Permission checked by UI/API |
| --- | --- | --- | --- |
| `/documents` | `GET /generated-documents` | `Download archived PDF` for each archive row | UI requires `generatedDocuments.download`; API download requires `generatedDocuments.download` |

AP detail pages:

| UI route | Page load routes | Visible action for full user | Source PDF route |
| --- | --- | --- | --- |
| `/purchases/purchase-orders/:id` | `GET /purchase-orders/:id` plus receiving/matching status | `Download PDF` | `GET /purchase-orders/:id/pdf` |
| `/purchases/bills/:id` | `GET /purchase-bills/:id` plus status/accounting/clearing reads | `Download purchase bill PDF` | `GET /purchase-bills/:id/pdf` |
| `/purchases/supplier-payments/:id` | `GET /supplier-payments/:id` and `GET /supplier-payments/:id/receipt-data` | `Download receipt PDF` | `GET /supplier-payments/:id/receipt.pdf` |
| `/purchases/supplier-refunds/:id` | `GET /supplier-refunds/:id` and `GET /supplier-refunds/:id/pdf-data` | `Download PDF` | `GET /supplier-refunds/:id/pdf` |
| `/purchases/debit-notes/:id` | `GET /purchase-debit-notes/:id` | `Download debit note PDF` | `GET /purchase-debit-notes/:id/pdf` |
| `/purchases/cash-expenses/:id` | `GET /cash-expenses/:id` and `GET /cash-expenses/:id/pdf-data` | `Download PDF` | `GET /cash-expenses/:id/pdf` |

The AP detail download buttons are source-view gated through route/API permissions, not directly hidden by `generatedDocuments.download`. That is acceptable for the full-permission Part 11 subject and remains the policy edge later restricted UI checks must document.

## Part 11 Execution Plan

1. Re-check local repository state, `HEAD` vs `origin/main`, and absence of `apps/api/scripts/*dev08i*`.
2. Re-check sanitized local targets: DB `localhost:5432/accounting`, API `http://localhost:4000`, and web `http://localhost:3000`.
3. Start local API/web dev servers only if the local targets are not already reachable; do not touch production, beta, Vercel, Supabase settings, env vars, migrations, seed/reset/delete, or external providers.
4. Use only the full output QA fake user `5281dfc0`; log in once through the local API or an equivalent local browser-auth setup; do not print token, cookie, auth header, password, request body, or response body.
5. Use browser automation against local web only, with `ledgerbyte.accessToken` and `ledgerbyte.activeOrganizationId` stored in the browser context without printing them.
6. Visit `/documents`; confirm archive metadata loads and selected AP archive rows show enabled `Download archived PDF` actions.
7. Click a bounded archive download sample or the selected AP archive rows only if the script can hash/size the PDF response in memory without printing body/base64. Archive downloads should not create new generated-document rows.
8. Visit the six AP detail pages and assert the source PDF buttons are visible and enabled for the full-permission user.
9. Click each AP source PDF button once, capture only status, filename, safe source/document prefixes, hash prefix, and byte size. These clicks are expected to create one new generated-document archive row per selected AP source.
10. Capture before/after counts for selected-source generated documents, full-user `AUTH_LOGIN` audit rows, `GENERATED_DOCUMENT_CREATED` audit rows, marker email outbox rows, ZATCA submission logs, and signed artifact drafts.
11. Remove any temporary runner before commit and prove no `apps/api/scripts/*dev08i*` file remains.

Expected allowed side effects for Part 11:

- One local full-user login audit row may be added.
- Six local generated-document rows may be added by the six source PDF UI clicks.
- Six local generated-document audit rows may be added for those archive rows.

Expected non-effects:

- No accounting lifecycle state change.
- No real email/provider call and no marker email outbox rows.
- No real ZATCA network/CSID/clearance/reporting/signing/PDF-A3 path.
- No migration, seed/reset/delete, deployment, env/provider/schema change, backup/restore, production-hosting research, production target, beta target, hosted/shared target, or customer-data target.

## Evidence Shape For Part 11

Record only:

- safe prefixes for users, memberships, roles, sources, generated documents, and audit rows;
- route paths, UI action labels, enabled/visible booleans, and HTTP status codes;
- selected-source generated-document counts before/after;
- marker email/ZATCA counts before/after;
- filenames, PDF hash prefixes, and byte sizes.

Do not print:

- passwords, tokens, cookies, bearer headers, request bodies, response bodies, raw `/auth/me`, raw audit metadata, PDF bodies, base64, customer/vendor data, signed XML, QR payloads, private keys, CSIDs, email bodies, or database URLs.

## Stop Conditions

Stop before login, browser work, or source PDF clicks if:

- The database target is not local `localhost:5432/accounting`.
- The API target is not local `http://localhost:4000`.
- The web target is not local `http://localhost:3000`.
- The full output QA user is missing, inactive, or lacks `generatedDocuments.download` or any selected AP source view permission.
- The selected AP sources are missing or no longer in the expected local disposable organization.
- Browser automation cannot capture output evidence without printing bodies, auth material, secrets, PDF content, base64, email content, signed XML, QR payload, or real/customer/vendor data.
- A route/action would require a non-local service, real email provider, real ZATCA path, production/beta target, migration, seed/reset/delete, deployment, or env/provider/schema change.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Sanitized `.env` target parsing.
- Read previous DEV-08I preflight/evidence documents and `CODEX_HANDOFF.md`.
- Read-only UI/API permission and route inspection.

## Commands Skipped

- Login, browser/UI flow, Playwright execution, authenticated API output checks, generated-document download, and source PDF streaming.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08I Part 11: approved local authenticated full-permission AP output UI QA`
