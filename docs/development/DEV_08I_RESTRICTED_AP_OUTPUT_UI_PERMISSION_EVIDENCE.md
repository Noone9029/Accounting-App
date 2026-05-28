# DEV-08I Restricted AP Output UI Permission Evidence

## Purpose And Scope

- Task: `DEV-08I Part 14: approved local authenticated restricted-user AP output UI permission checks`.
- Latest commit inspected: `1f13e4fe Plan DEV-08I restricted AP output UI permissions`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Approval phrase status: received and matched exactly.
- Runtime mutation performed: no.
- Browser/UI flow performed: yes, against local web `http://localhost:3000`.
- Output generated/downloaded: no.
- Login endpoint called: no; the browser session used a local JWT for the existing fake restricted archive-only fixture user.

Approval phrase used:

`I approve DEV-08I Part 14 local-only authenticated restricted-user AP output UI permission checks under marker DEV08I-AP-20260528T000000. No production, no beta, no customer data.`

No production, beta, hosted/shared, or customer-data target was used. No token, cookie, auth header, request body, response body, PDF body, base64, signed XML, QR payload, email body, secret, password, or database URL was printed.

## Local Target And Auth Setup

- Database target accepted from `.env` without printing credentials: protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- API target accepted: `http://localhost:4000`; health status `200`.
- Web target accepted: `http://localhost:3000`; `/login` status `200`.
- Restricted archive-only user safe prefix: `16d72d2a`.
- Restricted archive-only membership safe prefix: `2de5260b`.
- Restricted archive-only role safe prefix: `83dc203f`.
- Restricted archive-only permission count: `4`.
- Auth setup: local JWT for the existing fake fixture user; `/auth/login` was not called and login audit rows stayed unchanged.

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

Secondary policy-edge fixture was not used for source clicks:

| Fixture user | User prefix | Membership prefix | Role prefix | Permission count | Result |
| --- | --- | --- | --- | ---: | --- |
| Restricted AP viewer/no archive download | `41b031e2` | `78a4a87c` | `b167ef15` | `10` | Source PDF buttons not clicked because current source routes are AP-view-gated and would create output. |

## Documents Page Result

The `/documents` page loaded with status `200`. All selected AP archive rows were visible, but the `Download archived PDF` button was absent and the permission-required fallback was visible.

| Source | Source prefix | Filename | Row visible | Download button count | Permission-required visible |
| --- | --- | --- | --- | ---: | --- |
| `PO-000144` | `8f42caf7` | `purchase-order-PO-000144.pdf` | yes | `0` | yes |
| `BILL-000423` | `16e6f021` | `purchase-bill-BILL-000423.pdf` | yes | `0` | yes |
| `PAY-000318` | `7efa0003` | `supplier-payment-PAY-000318.pdf` | yes | `0` | yes |
| `SRF-000127` | `e7eed3c7` | `supplier-refund-SRF-000127.pdf` | yes | `0` | yes |
| `PDN-000127` | `7c07411c` | `purchase-debit-note-PDN-000127.pdf` | yes | `0` | yes |
| `EXP-000065` | `bd4d1330` | `cash-expense-EXP-000065.pdf` | yes | `0` | yes |

Navigation result:

- `Documents / Archive` link visible: yes.
- `Purchases` link count: `0`.

## AP Detail Route Result

All six AP detail routes loaded through the web shell with status `200`, but the permission boundary rendered `Access denied` and no source PDF button was present.

| Source | Source prefix | UI route | Route status | Access denied visible | Source button count |
| --- | --- | --- | ---: | --- | ---: |
| `PO-000144` | `8f42caf7` | `/purchases/purchase-orders/:id` | `200` | yes | `0` |
| `BILL-000423` | `16e6f021` | `/purchases/bills/:id` | `200` | yes | `0` |
| `PAY-000318` | `7efa0003` | `/purchases/supplier-payments/:id` | `200` | yes | `0` |
| `SRF-000127` | `e7eed3c7` | `/purchases/supplier-refunds/:id` | `200` | yes | `0` |
| `PDN-000127` | `7c07411c` | `/purchases/debit-notes/:id` | `200` | yes | `0` |
| `EXP-000065` | `bd4d1330` | `/purchases/cash-expenses/:id` | `200` | yes | `0` |

Browser/API observation from the clean runner:

- Console errors: `0`.
- Page errors: `0`.
- API calls observed: `/auth/me` status `200` on each route visit and `/generated-documents` status `200` on `/documents`.
- No AP source PDF route, generated-document download route, AP source data route, or explicit generation route was called.

## Counts And Side Effects

| Count | Before | After |
| --- | ---: | ---: |
| Selected-source generated documents | `19` | `19` |
| Generated documents by restricted archive-only user | `0` | `0` |
| Generated documents by restricted AP viewer/no archive-download user | `0` | `0` |
| Restricted archive-only `AUTH_LOGIN` audit rows | `1` | `1` |
| Marker email outbox rows | `0` | `0` |
| Organization ZATCA submission logs | `331` | `331` |
| Organization ZATCA signed artifact drafts | `33` | `33` |

No accounting lifecycle state changed. No generated-document row was created. No archive download occurred. No AP source PDF route was called. No real email/provider call, marker email row, ZATCA network/CSID/clearance/reporting/signing/PDF-A3 path, migration, seed/reset/delete, deploy, env/provider/schema change, backup/restore, production-hosting research, production target, beta target, hosted/shared target, or customer-data target was used.

## Temporary Runner Cleanup

- Temporary runner created: `apps/api/scripts/dev08i-part14-restricted-ui-permissions.ts`.
- Runner safety: refused non-local DB/API/web targets before importing Prisma or opening browser automation.
- Temporary runner removed before commit: yes.
- Removal proof: `Test-Path apps/api/scripts/dev08i-part14-restricted-ui-permissions.ts` returned `False`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'` returned no files after cleanup.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Local API health check against `http://localhost:4000/health`.
- Local web check against `http://localhost:3000/login`.
- Read previous DEV-08I evidence/preflight documents and `CODEX_HANDOFF.md`.
- Temporary local `tsx` runner for the approved restricted UI permission checks.
- Temporary script removal proof commands.

## Commands Skipped

- `/auth/login`; the successful UI session used a local JWT for the existing fake archive-only user.
- Generated-document download, AP source PDF streaming, AP source data routes, and AP source generation routes.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08I Part 15: restricted AP output UI evidence verification`
