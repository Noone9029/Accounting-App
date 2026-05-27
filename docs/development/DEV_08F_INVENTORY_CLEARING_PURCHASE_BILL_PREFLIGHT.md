# DEV-08F Inventory-Clearing Purchase Bill Preflight

## Purpose And Scope

This document records DEV-08F Part 1: read-only preflight for the inventory-clearing purchase bill and purchase receipt integration branch.

- Latest commit inspected: `9bae1e3a Close DEV-08E cash expense evidence`.
- Local `HEAD` matched `origin/main`: `9bae1e3aa1df99fbd0d5f48591c8945473d1eb6e`.
- Branch inspected: `main`.
- Mutation performed: no.
- Runtime DB writes performed: no.
- No purchase bill, purchase receipt, stock movement, journal, item, supplier, warehouse, settings, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted-target, customer-data, login/browser, E2E, smoke, full test, or full build action was run.

## Local-Only And No-Mutation Proof

- `git fetch origin --prune` completed, and `git rev-list --left-right --count HEAD...origin/main` returned `0 0`.
- `git status --short` showed only pre-existing unrelated untracked marketing/graphify paths:
  - `apps/graphify-out/`
  - `apps/web/src/app/ar/`
  - `apps/web/src/app/marketing.test.tsx`
  - `apps/web/src/app/pricing/`
  - `apps/web/src/app/product/`
  - `apps/web/src/app/readiness/`
  - `apps/web/src/app/resources/`
  - `apps/web/src/app/workflows/`
  - `apps/web/src/components/marketing/`
  - `graphify-out/`
- Root `.env` and `apps/api/.env` `DATABASE_URL` entries were classified without printing secrets: PostgreSQL, local host, port `5432`.
- All DB inspection used stdin-only Node/Prisma scripts with a local-target guard that refused non-local hosts before any Prisma read.
- DB output was limited to safe ID prefixes, counts, statuses, modes, account codes, and setting enums.
- No temporary script file was created.
- `apps/api/scripts` contains only tracked long-lived scripts; no `*dev08e*`, `*dev08f*`, `*cash-expense*`, or DEV-08F temporary script exists.

## DEV-08E Closure Context

DEV-08E closed the local cash expense lifecycle branch:

- Final cash expense: `EXP-000002`, safe prefix `74886497`, status `VOIDED`, total `1150.0000`.
- Original journal: `JE-000062`, safe prefix `a2aa8290`, status `REVERSED`.
- Void reversal journal: `JE-000063`, safe prefix `391169e6`, status `POSTED`, balanced debit/credit `1150.0000`.
- DEV-08E proved local cash expense creation/posting, void/reversal, audit behavior, and output/email/ZATCA non-effects.
- Remaining AP gaps include inventory-clearing purchase bills, purchase receipt/inventory integration, AP output/PDF/archive, AP email, browser-authenticated AP UI/API QA, repeated/idempotency paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.

## Inventory-Clearing Purchase Bill Code-Path Map

Relevant files inspected:

- `apps/api/src/purchase-bills/purchase-bill.service.ts`
- `apps/api/src/purchase-bills/purchase-bill-accounting.ts`
- `apps/api/src/purchase-bills/dto/create-purchase-bill.dto.ts`
- `apps/api/src/purchase-bills/dto/purchase-bill-line.dto.ts`
- `apps/api/src/purchase-bills/dto/update-purchase-bill.dto.ts`
- `apps/api/src/purchase-bills/purchase-bill-rules.spec.ts`
- `apps/api/src/purchase-bills/purchase-bill.controller.ts`
- `apps/api/prisma/schema.prisma`
- `apps/web/src/lib/purchase-bills.ts`
- `apps/web/src/components/forms/purchase-bill-form.tsx`
- `apps/web/src/app/(app)/purchases/bills/page.tsx`
- `apps/web/src/app/(app)/purchases/bills/[id]/page.tsx`

Observed behavior:

- Prisma enum `PurchaseBillInventoryPostingMode` supports `DIRECT_EXPENSE_OR_ASSET` and `INVENTORY_CLEARING`.
- `PurchaseBill.inventoryPostingMode` defaults to `DIRECT_EXPENSE_OR_ASSET`.
- `PurchaseBillService.create(...)` prepares lines, validates header references, validates inventory posting mode, assigns the next bill number, creates a `DRAFT` bill, sets `balanceDue` to the prepared total, creates bill lines, and writes `PurchaseBill:CREATE` audit.
- `PurchaseBillService.update(...)` is draft-only and can change `inventoryPostingMode`; inventory-clearing validation runs before line replacement/update.
- `PurchaseBillService.accountingPreview(...)` is read-only and returns `previewOnly: true`, `canFinalize`, `canUseInventoryClearingMode`, readiness blockers, warnings, account mapping, and journal preview lines.
- In `INVENTORY_CLEARING`, inventory-tracked bill lines post to the mapped inventory clearing account; non-inventory lines still use their direct line account.
- `buildPurchaseBillJournalLines(...)` groups taxable line amounts by posting account, adds VAT receivable when tax is positive, and credits AP for the total.
- Finalization is draft-only, idempotently returns already-finalized bills with a journal, refuses voided bills, checks fiscal posting period, checks total/line validity, checks inventory-clearing readiness, updates status to `FINALIZED`, creates a posted journal, links `journalEntryId`, and writes `PurchaseBill:FINALIZE` audit.
- Expected inventory-clearing finalization journal for the proposed single tracked line: Dr inventory clearing `240` `1000.0000`, Dr VAT receivable `230` `150.0000`, Cr AP `210` `1150.0000`.
- Void accepts draft/finalized bills. Draft void marks the bill `VOIDED` and balance due `0.0000` with no journal. Finalized void requires a journal, checks fiscal posting period, blocks active supplier payment allocations, purchase debit note allocations, and supplier payment unapplied allocations, marks the bill `VOIDED`, sets balance due `0.0000`, creates/reuses a reversal journal, links `reversalJournalEntryId`, and writes `PurchaseBill:VOID` audit.
- Purchase bill void does not create stock movements; tests assert inventory-clearing bill journal reversal without stock movement mutation.
- Output paths exist but were not called: `GET /purchase-bills/:id/pdf-data`, `GET /purchase-bills/:id/pdf`, and `POST /purchase-bills/:id/generate-pdf` can render/archive generated documents.

Inventory-clearing readiness requirements from code:

- At least one inventory-tracked purchase bill line.
- Inventory-tracked lines must retain an item reference.
- Inventory accounting must be enabled.
- Valuation method must be `MOVING_AVERAGE`.
- Purchase receipt posting mode must be `PREVIEW_ONLY`.
- Inventory clearing account mapping must exist, belong to the organization, be active, allow posting, and be `LIABILITY` or `ASSET`.
- Inventory clearing account must not be AP account code `210`.
- Inventory clearing account must be separate from the inventory asset account.
- AP account code `210` must exist and allow posting for preview/finalization.
- VAT receivable account code `230` must exist and allow posting when `taxTotal > 0`.

## Purchase Receipt Integration Code-Path Map

Relevant files inspected:

- `apps/api/src/purchase-receipts/purchase-receipt.service.ts`
- `apps/api/src/purchase-receipts/dto/create-purchase-receipt.dto.ts`
- `apps/api/src/purchase-receipts/dto/reverse-purchase-receipt-asset.dto.ts`
- `apps/api/src/purchase-receipts/purchase-receipt.service.spec.ts`
- `apps/api/src/purchase-receipts/purchase-receipt.controller.ts`
- `apps/api/src/inventory/inventory-accounting.service.ts`
- `apps/api/src/stock-movements/stock-movement.service.ts`
- `apps/api/prisma/schema.prisma`
- `apps/web/src/lib/inventory.ts`
- `apps/web/src/app/(app)/inventory/purchase-receipts/page.tsx`
- `apps/web/src/app/(app)/inventory/purchase-receipts/new/page.tsx`
- `apps/web/src/app/(app)/inventory/purchase-receipts/[id]/page.tsx`
- `apps/web/src/app/(app)/inventory/reports/clearing-reconciliation/page.tsx`
- `apps/web/src/app/(app)/inventory/reports/clearing-variance/page.tsx`

Observed behavior:

- Purchase receipts can be sourced from one purchase order, one purchase bill, or standalone supplier/item lines; the API rejects a request containing both `purchaseOrderId` and `purchaseBillId`.
- Purchase-order receipts require the order to be approved or sent.
- Purchase-bill receipts require the bill to be `FINALIZED`.
- Standalone receipts require an active supplier and explicit item lines.
- Receipt lines require inventory-tracked active items; source-linked receipt lines must match source item IDs and cannot exceed remaining source quantity.
- `PurchaseReceiptService.create(...)` creates a `POSTED` receipt, creates inbound `PURCHASE_RECEIPT_PLACEHOLDER` stock movements per line, links each movement to a receipt line, and writes `PurchaseReceipt:CREATE` audit.
- Receipt create/void is operational inventory movement behavior only; it does not create a GL journal.
- `accountingPreview(...)` is read-only and requires inventory asset and clearing mappings for a journal preview. It blocks purchase-order-only and standalone receipts from asset posting, and it blocks receipts not linked to a finalized `INVENTORY_CLEARING` purchase bill.
- Asset posting requires the receipt status to be `POSTED`, no existing `inventoryAssetJournalEntryId`, enabled inventory accounting, `PREVIEW_ONLY` purchase receipt posting mode, mapped inventory asset and clearing accounts, positive receipt value, unit costs, and an open fiscal period.
- `postInventoryAsset(...)` creates one posted balanced journal, debiting inventory asset and crediting inventory clearing, then links `inventoryAssetJournalEntryId` and writes `PurchaseReceipt:POST_INVENTORY_ASSET` audit. Tests assert it does not mutate stock movements.
- `reverseInventoryAsset(...)` requires an active posted asset journal, creates a posted reversal journal, marks the original asset journal `REVERSED`, links `inventoryAssetReversalJournalEntryId`, and writes `PurchaseReceipt:REVERSE_INVENTORY_ASSET` audit.
- `void(...)` rejects already-voided receipts and rejects receipts with an active asset journal that has not been reversed. After reversal, it checks that voiding will not make stock negative, marks the receipt `VOIDED`, creates outbound `ADJUSTMENT_OUT` void stock movements, links `voidStockMovementId` on receipt lines, and writes `PurchaseReceipt:VOID` audit.
- Web surfaces already load receipt accounting preview, post/reverse asset actions, void action, line movement details, and clearing reconciliation/variance links.

## Current Safe Source And Readiness Availability

Sanitized local read summary:

- Local target: PostgreSQL on local host, port `5432`.
- Organizations inspected: `12`.
- Selected option: `A`.
- Selected target organization safe prefix: `db69e5a8`.
- Reason for selecting `db69e5a8`: it is the smaller existing fake local AP/inventory-ready organization used by earlier local AP evidence, while another ready org prefix `00000000` contains much larger pre-existing fixture volume.

Selected organization readiness:

| Requirement | Result |
| --- | --- |
| Active supplier support | `6` active supplier/BOTH contacts; candidate safe prefixes include `287aec77`, `a2f88f08`, `58e8ee34`, `0e36df97`, `d11c76db` |
| Active inventory-tracked item support | `1` active tracked product; safe prefix `175a7c7f` |
| Active warehouse support | `2` active warehouses; default safe prefix `197fac56` |
| Inventory accounting enabled | yes |
| Valuation method | `MOVING_AVERAGE` |
| Purchase receipt posting mode | `PREVIEW_ONLY` |
| Inventory asset account | code `130`, safe prefix `e731fbd2`, active posting asset |
| Inventory clearing account | code `240`, safe prefix `d3b787fc`, active posting liability |
| Clearing separate from AP `210` | yes |
| Clearing separate from inventory asset | yes |
| AP account | code `210`, safe prefix `883ea9a6`, active posting liability |
| VAT receivable account | code `230`, safe prefix `41e36736`, active posting asset |
| Purchase VAT rate | active purchase-scope 15 percent candidates include safe prefixes `172417be` and `af4bdc7d` |
| Existing DEV-08F marker contacts/items/warehouses | `0` / `0` / `0` |
| Existing DEV-08F marker purchase bills/receipts/stock movements | `0` / `0` / `0` |

Selected organization current counts:

| Entity | Status / Mode | Count |
| --- | --- | ---: |
| Purchase bills | `FINALIZED` / `DIRECT_EXPENSE_OR_ASSET` | `4` |
| Purchase bills | `FINALIZED` / `INVENTORY_CLEARING` | `2` |
| Purchase bills | `VOIDED` / `DIRECT_EXPENSE_OR_ASSET` | `2` |
| Purchase receipts | `POSTED` | `1` |
| Purchase receipts | `VOIDED` | `2` |

Forbidden side-effect baseline for the DEV-08F marker:

- Generated documents: `0`.
- Email outbox rows: `0`.
- Email provider events: `0`.
- Cleanup/delete audit by marker: `0`.
- ZATCA models are sales-invoice scoped. The selected organization has existing unrelated ZATCA rows from earlier sales evidence, but no AP purchase-bill path was called, no ZATCA command was run, and DEV-08F has no purchase-bill/sales-invoice marker bridge at preflight.

## Selected Part 2 Mutation Option

Option A is selected.

Use the existing fake local inventory-ready organization and create one DEV-08F `DRAFT` purchase bill in `INVENTORY_CLEARING` mode. Do not mutate inventory settings. Reuse the existing fake local supplier, active inventory-tracked item, active posting account, active purchase VAT rate, and active warehouse/accounting setup as needed.

Part 2 should not create a purchase receipt, stock movement, journal, supplier payment, refund, debit note, purchase order, cash expense, generated document, email, ZATCA row, cleanup/delete row, login/browser audit row, migration, seed/reset/delete, deploy, env change, or production/beta/shared/customer-data touch.

## Proposed Marker And Future Mutation Target

- Marker: `DEV08F-AP-20260527T000000`.
- Selected organization safe prefix: `db69e5a8`.
- Preferred existing supplier safe prefix: `287aec77` or another active fake local supplier in the selected org.
- Preferred inventory-tracked item safe prefix: `175a7c7f`.
- Preferred bill line account: code `511`, safe prefix `c97f0827`.
- Preferred purchase VAT rate: 15 percent purchase-scope rate, safe prefix `172417be` or `af4bdc7d`.
- Warehouse safe prefix for later receipt flow: default warehouse `197fac56`.
- Inventory clearing account for later finalization: code `240`, safe prefix `d3b787fc`.
- Inventory asset account for later receipt asset posting: code `130`, safe prefix `e731fbd2`.
- AP account for bill finalization: code `210`, safe prefix `883ea9a6`.
- VAT receivable account for bill finalization: code `230`, safe prefix `41e36736`.

Proposed Part 2 fixture shape:

- One draft purchase bill with marker in notes and/or line description.
- `inventoryPostingMode`: `INVENTORY_CLEARING`.
- Quantity and unit price: `10.0000 x 100.0000`.
- Subtotal: `1000.0000`.
- VAT: `150.0000`.
- Total: `1150.0000`.
- Expected Part 2 state: `DRAFT`, `balanceDue 1150.0000`, no journal, no receipt, no stock movement.

## Expected Future Accounting And Journal Result

Part 2 should not post a journal because the purchase bill remains draft.

Later finalization should produce one posted balanced purchase bill journal:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `240` inventory clearing | `1000.0000` | `0.0000` |
| 2 | `230` VAT receivable | `150.0000` | `0.0000` |
| 3 | `210` accounts payable | `0.0000` | `1150.0000` |

Later purchase receipt asset posting should produce one posted balanced journal:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | `130` inventory asset | `1000.0000` | `0.0000` |
| 2 | `240` inventory clearing | `0.0000` | `1000.0000` |

Later reversal paths should mirror the original journals and mark original journals `REVERSED`.

## Expected Purchase Receipt And Stock Movement Result

Later receipt creation from the finalized inventory-clearing bill should:

- Create one `POSTED` purchase receipt linked to the purchase bill.
- Create one inbound `PURCHASE_RECEIPT_PLACEHOLDER` stock movement for the tracked item/warehouse.
- Not create a journal during receipt creation.
- Leave receipt asset posting as an explicit manual action.
- Block receipt void while a receipt inventory asset journal is active.
- Allow receipt void only after asset reversal and sufficient stock.
- Create outbound `ADJUSTMENT_OUT` void stock movement when voided.

## Expected Audit Result

Expected audit actions across the branch:

- Part 2: `PurchaseBill:CREATE` exactly once for the draft fixture.
- Later finalization: `PurchaseBill:FINALIZE` exactly once.
- Later receipt creation: `PurchaseReceipt:CREATE` exactly once.
- Later receipt asset posting: `PurchaseReceipt:POST_INVENTORY_ASSET` exactly once.
- Later receipt void blocker negative check: no successful state change; no duplicate post/reverse/void side effects expected.
- Later receipt asset reversal: `PurchaseReceipt:REVERSE_INVENTORY_ASSET` exactly once.
- Later receipt void: `PurchaseReceipt:VOID` exactly once.
- Later purchase bill void: `PurchaseBill:VOID` exactly once.

No login/browser audit-writing flow is approved in this branch.

## Expected Forbidden Side Effects

The DEV-08F branch must keep the following at zero unless a later explicit prompt safely widens scope:

- Supplier payment/refund creation.
- Purchase debit note creation/allocation/refund.
- Purchase order creation/conversion.
- Cash expense creation.
- Generated document/PDF/archive/export/download.
- Email outbox/provider events.
- ZATCA metadata/submission/signed artifacts.
- Cleanup/delete audit events.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes.
- Production, beta, shared-target, hosted-target, or customer-data touches.

## Temporary Script Policy

Part 1 created no temporary script.

If a later approved mutation needs a helper, it should:

- Live under `apps/api/scripts` with a `dev08f-*.tmp.ts` name.
- Refuse non-local database targets before imports or write-capable service calls.
- Require the exact approval phrase.
- Print only redacted/safe prefixes, counts, statuses, amounts, and service call counts.
- Execute the allowed mutation exactly once.
- Be removed after execution.
- Be proven absent with `Test-Path`/`rg`.
- Never be staged or committed.

## Commands Run

- `Get-Content -LiteralPath 'E:\Downloads\dev08f_arc_prompts (1).md'`.
- `git status --short`.
- `git status -sb`.
- `git branch --show-current`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git fetch origin --prune`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `git rev-parse --abbrev-ref --symbolic-full-name '@{u}'`.
- `Get-ChildItem -LiteralPath 'apps\api\scripts' -Force`.
- `git ls-files 'apps/api/scripts/*'`.
- `rg -n "DEV08E|DEV08F|DEV-08E|DEV-08F|dev08e|dev08f" apps/api/scripts docs/development CODEX_HANDOFF.md`.
- Targeted reads/searches of `CODEX_HANDOFF.md`, `README.md`, `BUG_AUDIT.md`, `docs/development/DEVELOPMENT_COMPLETION_PLAN.md`, DEV-08/08B/08C/08D/08E closure docs, DEV-03 AP/inventory dry-run docs, DEV-02 verification runbook, and relevant purchase/inventory code paths.
- Local-target `.env` classification without printing database URLs.
- Stdin-only Node/Prisma read-only readiness checks with local-target guard and sanitized output.

## Commands Skipped And Why

- Runtime DB writes, fixture creation, purchase bill create/finalize/void, purchase receipt create/post/reverse/void, stock movement creation, journal creation, settings mutation, supplier/item/warehouse creation, cleanup, migration, seed/reset/delete, and other mutation commands: forbidden for Part 1.
- API/web startup: not required for code-path and DB-read preflight.
- Browser/login flows: forbidden because they can write audit logs.
- PDF/archive/export/download/generated-document execution: forbidden.
- Email and ZATCA commands: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this prompt.
- Deploys, Vercel/Supabase changes, environment/provider/schema changes, backup/restore, production-hosting research, production, beta, shared, hosted, and customer-data targets: explicitly forbidden.

## Blockers Or Discrepancies

- No blocker prevents Option A.
- A larger local ready org prefix `00000000` exists, but the smaller prior AP-ready org prefix `db69e5a8` is safer for this branch because it has fewer existing records and already has AP/inventory prerequisites.
- The selected org has unrelated existing ZATCA sales-invoice rows; this is not a DEV-08F side effect, and no AP/ZATCA operation was run.
- No DEV-08F marker purchase bill, purchase receipt, stock movement, contact, item, or warehouse exists yet.

## Required Approval Phrase For Part 2

`I approve DEV-08F Part 2 local-only inventory-clearing purchase bill fixture creation mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08F Part 2: approved local inventory-clearing purchase bill fixture creation mutation`

## Part 2 Mutation Result

- DEV-08F Part 2 local-only mutation evidence is recorded in [DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_MUTATION_EVIDENCE.md](DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_MUTATION_EVIDENCE.md).
- Result: `BILL-000009`, safe prefix `04b3f131`, was created as a future `DRAFT` purchase bill in `INVENTORY_CLEARING` mode.
- Amounts: subtotal `1000.0000`, VAT `150.0000`, total and balance due `1150.0000`.
- No purchase bill journal, reversal journal, purchase receipt, stock movement, generated document, email, ZATCA, supplier payment/refund, purchase debit note, purchase order, cash expense, cleanup/delete, login/browser, production, beta, or customer-data side effect was created.
- Audit result: one `PURCHASE_BILL_CREATED` audit for the bill.
- Temporary script result: no DEV-08F temporary script file was created or staged.
- Exact next prompt title: `DEV-08F Part 3: inventory-clearing purchase bill fixture evidence verification`.
