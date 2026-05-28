# DEV-08I AP Output Permission UI QA Preflight

## Purpose And Scope

- Task: `DEV-08I Part 1: AP output permission and authenticated UI QA preflight`.
- Latest commit inspected: `0789fec3 Close DEV-08H AP output evidence`.
- Local `HEAD` matched `origin/main`: `0789fec3cc0c9051f515467c111d9566b77563c1`.
- Branch inspected: `main`.
- Marker for this arc: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: no.
- Login/browser flow performed: no.
- PDF generation/download performed: no.
- Temporary scripts found before this preflight: no `*dev08i*` scripts under `apps/api/scripts`.

This preflight is read-only except for this documentation and `CODEX_HANDOFF.md`. It did not create users, roles, permissions, source records, generated documents, audit rows, email outbox rows, ZATCA rows, migrations, seed/reset/delete output, deployments, environment changes, provider settings, schema changes, browser sessions, or PDF/download bodies.

## Documents And Areas Reviewed

- `CODEX_HANDOFF.md`.
- `docs/development/DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_CLOSURE.md`.
- `docs/development/DEV_08G_PURCHASE_RECEIPT_INVENTORY_INTEGRATION_CLOSURE.md`.
- `docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_RECEIPT_CLOSURE.md`.
- `docs/development/DEV_08_AP_STATE_MACHINE_CLOSURE.md`.
- `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`.
- `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`.
- `docs/development/DEV_02_FINAL_HANDOFF.md`.
- `docs/development/DEV_01_FINAL_TRIAGE.md`.
- `README.md` and `BUG_AUDIT.md` relevant generated-document, permission, email, and ZATCA sections.
- API auth and output controllers/services under `apps/api/src/auth`, `apps/api/src/generated-documents`, and AP source modules.
- Web permission, document archive, PDF download, and AP detail-page surfaces under `apps/web/src`.
- Shared permission definitions in `packages/shared/src/permissions.ts`.

## Permission Map

Shared permissions relevant to this arc:

| Permission | Meaning in this preflight |
| --- | --- |
| `generatedDocuments.view` | Allows archive list/detail API and the `/documents` archive page route. |
| `generatedDocuments.download` | Allows `GET /generated-documents/:id/download` archive file streaming and the archive page download button. |
| `documents.view` | Also allows the `/documents` page through the web route boundary. |
| `purchaseOrders.view` | Allows purchase-order list/detail, `pdf-data`, `pdf`, and `generate-pdf`. |
| `purchaseBills.view` | Allows purchase-bill list/detail, `pdf-data`, `pdf`, and `generate-pdf`. |
| `supplierPayments.view` | Allows supplier-payment list/detail, receipt data, receipt PDF data, receipt PDF, and `generate-receipt-pdf`. |
| `supplierRefunds.view` | Allows supplier-refund list/detail, `pdf-data`, `pdf`, and `generate-pdf`. |
| `purchaseDebitNotes.view` | Allows purchase-debit-note list/detail, allocations, `pdf-data`, `pdf`, and `generate-pdf`. |
| `cashExpenses.view` | Allows cash-expense list/detail, `pdf-data`, `pdf`, and `generate-pdf`. |

System role notes from `packages/shared/src/permissions.ts`:

- `Owner` includes all permissions.
- `Admin` includes all permissions except `admin.fullAccess`.
- `Accountant`, `Purchases`, and `Viewer` include AP view permissions plus `generatedDocuments.view` and `generatedDocuments.download`.
- A restricted DEV-08I negative-test role should therefore be custom, not one of the existing system defaults, so it can omit `generatedDocuments.download` and selected AP source view permissions.

## API Guard Map

All AP output and generated-document archive controllers reviewed here use:

- `JwtAuthGuard`: requires a bearer token and stores the authenticated user id/email on the request.
- `OrganizationContextGuard`: requires `x-organization-id`, confirms active membership, and stores the active organization id.
- `PermissionGuard`: reloads the active membership role, normalizes JSON permissions, and allows the request when the role has any required permission.
- `RequirePermissions(...)`: declares the endpoint permission set checked by `PermissionGuard`.

Generated-document archive API:

| API surface | Permission |
| --- | --- |
| `GET /generated-documents` | `generatedDocuments.view` |
| `GET /generated-documents/:id` | `generatedDocuments.view` |
| `GET /generated-documents/:id/download` | `generatedDocuments.download` |

AP source output APIs:

| Source | Metadata/data route | Streaming PDF route | Explicit archive route | Permission used |
| --- | --- | --- | --- | --- |
| Purchase order | `GET /purchase-orders/:id/pdf-data` | `GET /purchase-orders/:id/pdf` | `POST /purchase-orders/:id/generate-pdf` | `purchaseOrders.view` |
| Purchase bill | `GET /purchase-bills/:id/pdf-data` | `GET /purchase-bills/:id/pdf` | `POST /purchase-bills/:id/generate-pdf` | `purchaseBills.view` |
| Supplier payment | `GET /supplier-payments/:id/receipt-pdf-data` | `GET /supplier-payments/:id/receipt.pdf` | `POST /supplier-payments/:id/generate-receipt-pdf` | `supplierPayments.view` |
| Supplier refund | `GET /supplier-refunds/:id/pdf-data` | `GET /supplier-refunds/:id/pdf` | `POST /supplier-refunds/:id/generate-pdf` | `supplierRefunds.view` |
| Purchase debit note | `GET /purchase-debit-notes/:id/pdf-data` | `GET /purchase-debit-notes/:id/pdf` | `POST /purchase-debit-notes/:id/generate-pdf` | `purchaseDebitNotes.view` |
| Cash expense | `GET /cash-expenses/:id/pdf-data` | `GET /cash-expenses/:id/pdf` | `POST /cash-expenses/:id/generate-pdf` | `cashExpenses.view` |

Important permission edge to test later: AP source PDF streaming/generation is not currently gated by `generatedDocuments.download`; it is gated by each AP source view permission. Archive download is separately gated by `generatedDocuments.download`.

## UI Permission Map

Web route-level gating:

- `/documents` requires `generatedDocuments.view` or `documents.view`.
- AP source detail routes require the relevant source view permission through `getRequiredPermissionsForPathname(...)`.
- `PermissionProvider` loads `/auth/me` from the stored token and active organization context. This is not a login call, but a browser session must still have a token created by an approved login or equivalent local-only setup.

Archive page behavior:

- `/documents` loads `GET /generated-documents`.
- The archive download button is rendered only when `can(PERMISSIONS.generatedDocuments.download)` is true.
- Clicking the archive download button calls `GET /generated-documents/:id/download`.

AP detail-page behavior to verify later:

- Purchase order, purchase bill, supplier payment, supplier refund, purchase debit note, and cash expense detail pages render download buttons when the user can open the page through source view permission.
- These detail buttons call the source PDF streaming routes, which also archive a generated document through the corresponding service.
- Current detail-page buttons are not hidden by `generatedDocuments.download`; later restricted UI QA should determine whether source view alone is the intended product policy or a permission gap.

## Safe Fixture Strategy For Later Parts

Use only local disposable DEV-08I data and existing safe DEV-08H AP output sources where possible:

| Source family | DEV-08H source available for later local-only checks |
| --- | --- |
| Purchase order | `PO-000144` |
| Purchase bill | `BILL-000423` |
| Supplier payment receipt | `PAY-000318` |
| Supplier refund | `SRF-000127` |
| Purchase debit note | `PDN-000127` |
| Cash expense | `EXP-000065` |

Part 2 should create or confirm, under the approved phrase, local disposable users and custom roles in the same local disposable organization as those sources:

- Full-permission user: active membership with all permissions needed for archive list/detail/download and AP source output checks.
- Restricted user: active membership that can open only selected read-only AP pages or `/documents`, while deliberately missing `generatedDocuments.download` and selected AP source view permissions needed for negative checks.
- Role names, user emails, and any notes should include `DEV08I-AP-20260528T000000`.
- Passwords, tokens, cookies, auth headers, request/response bodies, raw user ids beyond safe prefixes, and PDF bodies must not be printed.

If the existing DEV-08H sources are not in a suitable local disposable organization, Part 2 should stop and document the blocker before creating broader accounting state.

## Login And Audit Policy

Later authenticated API/UI parts may write `AUTH_LOGIN` audit rows when they call login. That is approved only for the matching approval-gated parts in this DEV-08I bundle:

- Part 5: full-permission authenticated API QA.
- Part 8: restricted-user API negative checks.
- Part 11: full-permission UI QA.
- Part 14: restricted-user UI permission checks.

Rules for those later parts:

- Use local API/web only.
- Use fake DEV-08I fixture users only.
- Record audit evidence by marker, action, entity type, safe prefixes/counts, and timestamp windows only.
- Do not print access tokens, cookies, bearer headers, request bodies, response bodies, raw audit metadata dumps, PDF bodies, base64, email bodies, signed XML, QR payloads, secrets, database URLs, or customer/vendor data.
- Browser/UI checks may capture sanitized status/action evidence, but screenshots or logs must not expose secrets or real data.

## Required Approval Phrase For Part 2

The exact Part 2 approval phrase has been received in the user's upfront approval bundle:

`I approve DEV-08I Part 2 local-only AP output permission fixture mutation under marker DEV08I-AP-20260528T000000. No production, no beta, no customer data.`

Before Part 2 mutates local fixtures, the runner must still re-check the local target, latest commit, dirty status, and no temporary `*dev08i*` scripts.

## Commands Run

- `git status --short`.
- `git branch --show-current`.
- `git log -1 --oneline`.
- `git remote -v`.
- `git fetch origin main`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Read-only `Get-Content`/`rg` inspection of the files and areas listed above.

## Commands Skipped

- Login, browser flow, Playwright, authenticated API calls, and `/auth/login`.
- PDF generation, PDF streaming, generated-document download, archive mutation, email, provider calls, and ZATCA.
- Fixture/user/role creation, accounting mutations, migrations, seed/reset/delete, cleanup/delete, deployments, env changes, provider changes, schema changes, backup/restore.
- `verify:repo`, actual `verify:ci:local`, full tests, full build, full E2E, full smoke, and production-hosting research.

## Exact Next Prompt Title

`DEV-08I Part 2: approved local AP output permission fixture mutation`
