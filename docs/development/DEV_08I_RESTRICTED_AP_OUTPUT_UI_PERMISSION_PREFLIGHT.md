# DEV-08I Restricted AP Output UI Permission Preflight

## Purpose And Scope

- Task: `DEV-08I Part 13: AP output UI restricted-permission preflight`.
- Latest commit inspected: `c3d4786a Verify DEV-08I full permission AP output UI`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: no.
- Login/API/browser/output/download performed: no.
- Temporary scripts created: none.

This preflight plans the approved Part 14 local authenticated restricted-user UI permission checks. It did not log in, open a browser, call source PDF routes, generate output, download generated documents, send email, call ZATCA, run migrations, run seed/reset/delete, deploy, or change env/provider/schema settings.

## Approval Phrase For Part 14

The exact Part 14 approval phrase has been received in the user's upfront approval bundle:

`I approve DEV-08I Part 14 local-only authenticated restricted-user AP output UI permission checks under marker DEV08I-AP-20260528T000000. No production, no beta, no customer data.`

Part 14 must still re-check local target, latest commit, dirty status, API/web readiness, selected fixtures, and no temporary `*dev08i*` scripts before authenticated browser work.

## Local Target And Restricted Fixtures

- Database target accepted from `.env` without printing credentials: protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Planned API target: `http://localhost:4000`.
- Planned web target: `http://localhost:3000`.
- Selected-source generated documents after Part 12: `19`.
- Organization generated documents observed during preflight: `852`.

Primary negative UI subject:

| Fixture user | User prefix | Membership prefix | Role prefix | Status | Permission count |
| --- | --- | --- | --- | --- | ---: |
| Restricted archive-only | `16d72d2a` | `2de5260b` | `83dc203f` | `ACTIVE` | `4` |

Selected permissions for the primary subject:

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

Secondary policy-edge subject:

| Fixture user | User prefix | Membership prefix | Role prefix | Status | Permission count |
| --- | --- | --- | --- | --- | ---: |
| Restricted AP viewer/no archive download | `41b031e2` | `78a4a87c` | `b167ef15` | `ACTIVE` | `10` |

The secondary subject has all six AP source view permissions and `generatedDocuments.view`, but lacks `generatedDocuments.download`. Current guards and UI route boundaries mean this user can open AP detail pages where source PDF buttons are visible. Part 14 must not click those source buttons because current source PDF routes are view-gated and would create output.

## Expected UI Permission Behavior

Primary restricted archive-only user `16d72d2a`:

| UI surface | Expected result | Evidence to record |
| --- | --- | --- |
| `/documents` | Page allowed through `generatedDocuments.view` | Route status, selected archive row visibility, safe filenames/prefixes only |
| `/documents` archive action | `Download archived PDF` button hidden; `Download permission required` text visible | Per selected row hidden/required flags |
| Sidebar | `Documents / Archive` visible; Purchases/AP nav hidden | Visible/hidden booleans only |
| `/purchases/purchase-orders/:id` | `Access denied`; no `Download PDF` source action | Route status and access-denied/action-absent booleans |
| `/purchases/bills/:id` | `Access denied`; no `Download purchase bill PDF` source action | Route status and access-denied/action-absent booleans |
| `/purchases/supplier-payments/:id` | `Access denied`; no `Download receipt PDF` source action | Route status and access-denied/action-absent booleans |
| `/purchases/supplier-refunds/:id` | `Access denied`; no `Download PDF` source action | Route status and access-denied/action-absent booleans |
| `/purchases/debit-notes/:id` | `Access denied`; no `Download debit note PDF` source action | Route status and access-denied/action-absent booleans |
| `/purchases/cash-expenses/:id` | `Access denied`; no `Download PDF` source action | Route status and access-denied/action-absent booleans |

Secondary restricted AP viewer/no archive-download user `41b031e2` may be used only for no-output checks:

- Safe: `/documents` archive rows should show `Download permission required`, not `Download archived PDF`.
- Safe: AP detail routes can be opened to document the current policy edge that source PDF buttons are visible for AP viewers.
- Not safe for Part 14: clicking AP source PDF buttons or calling source PDF routes, because those routes are currently allowed by AP source view permissions and would create generated-document output.

## Part 14 Execution Plan

1. Re-check repository state, `HEAD` vs `origin/main`, and absence of `apps/api/scripts/*dev08i*`.
2. Re-check sanitized local targets: DB `localhost:5432/accounting`, API `http://localhost:4000`, and web `http://localhost:3000`.
3. Start local API/web dev servers only if the local targets are not already reachable; do not touch production, beta, Vercel, Supabase settings, env vars, migrations, seed/reset/delete, or external providers.
4. Use the restricted archive-only fake user `16d72d2a` as the primary negative subject.
5. Use a local JWT for the existing fake user unless a safe existing password path is available; do not print token, cookie, auth header, password, request body, or response body. If `/auth/login` is not called, login audit counts should remain unchanged.
6. Capture before-counts for selected-source generated documents, generated documents by restricted users, restricted-user login audit rows, marker email rows, ZATCA submission logs, and signed artifact drafts.
7. Visit `/documents`; verify selected archive rows are visible and archive downloads are hidden/permission-required.
8. Visit all six AP detail routes as the archive-only user; verify `Access denied` and source PDF buttons absent.
9. Do not click any AP source PDF, generated-document download, or explicit generation action.
10. Capture after-counts and prove selected-source generated-document count did not increase.
11. Remove any temporary runner before commit and prove no `apps/api/scripts/*dev08i*` file remains.

## Expected Count Results

| Count | Expected Part 14 result |
| --- | --- |
| Selected-source generated documents | unchanged from `19` |
| Generated documents by restricted archive-only user | unchanged from `0` |
| Generated documents by restricted AP viewer/no archive-download user | unchanged unless already nonzero; Part 14 must not add any |
| Restricted archive-only `AUTH_LOGIN` rows | unchanged if local JWT is used; may increase by `1` only if a safe `/auth/login` path is used |
| Marker email outbox rows | unchanged at `0` |
| Organization ZATCA submission logs | unchanged at `331` |
| Organization ZATCA signed artifact drafts | unchanged at `33` |

## Evidence Shape For Part 14

Record only:

- safe prefixes for users, memberships, roles, sources, and generated documents;
- route paths, visible/hidden/enabled/access-denied booleans, and HTTP status codes;
- selected-source generated-document counts before/after;
- marker email/ZATCA counts before/after;
- filenames, existing hash prefixes, and byte sizes from metadata only.

Do not print:

- passwords, tokens, cookies, bearer headers, request bodies, response bodies, raw `/auth/me`, raw audit metadata, PDF bodies, base64, customer/vendor data, signed XML, QR payloads, private keys, CSIDs, email bodies, or database URLs.

## Stop Conditions

Stop before authenticated browser checks if:

- The database target is not local `localhost:5432/accounting`.
- The API target is not local `http://localhost:4000`.
- The web target is not local `http://localhost:3000`.
- The archive-only user is missing, inactive, has `generatedDocuments.download`, or has any selected AP source view permission.
- The selected AP sources or Part 11/12 generated-document metadata are missing.
- Browser automation cannot verify UI state without printing bodies, auth material, secrets, PDF content, base64, email content, signed XML, QR payload, or real/customer/vendor data.

Stop immediately during Part 14 if:

- A source PDF button is visible for the archive-only user.
- A generated-document archive download button is visible for the archive-only user.
- Any AP source detail route renders source content instead of the `Access denied` panel.
- Any selected-source generated-document count increases.
- Any real email/provider or real ZATCA path would be required.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Read previous DEV-08I preflight/evidence documents and `CODEX_HANDOFF.md`.
- Read-only UI permission boundary, sidebar navigation, document archive, and AP detail-page inspection.
- Read-only local Prisma restricted-user permission snapshot with sanitized output.

## Commands Skipped

- Login, browser/UI flow, Playwright, generated-document download, AP source PDF streaming, and AP source generation.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08I Part 14: approved local authenticated restricted-user AP output UI permission checks`
