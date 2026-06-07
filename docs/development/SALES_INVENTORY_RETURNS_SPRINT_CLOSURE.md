# Sales Inventory Returns Sprint Closure

Date: 2026-06-06

Product: LedgerByte

Sprint: Sales Inventory Return Document Sprint

## Summary

This sprint added a dedicated Sales Inventory Return workflow for customer-returned goods. Users can create customer stock return documents, link safe source documents, progress through draft/submitted/approved/received lifecycle states, preview operational stock-in impact, and explicitly post `SALES_RETURN_IN` movement when warehouse and source validation pass.

LedgerByte remains controlled beta/user-testing only. This sprint does not add automated credit notes, refunds, accounting journals, revenue reversal, COGS reversal, AR/VAT changes, ZATCA behavior, customer email, payment links, landed cost, FIFO, production hosting, or customer-data proof.

## Implemented Scope

- Added additive `SalesInventoryReturn` and `SalesInventoryReturnLine` models.
- Added `SalesInventoryReturnStatus`.
- Added `SALES_INVENTORY_RETURN` number sequence scope with `SRN-` numbering.
- Added tenant-scoped sales inventory return API endpoints.
- Added draft/edit, submit, approve, receive, cancel, and void lifecycle actions.
- Added source links to customer, sales invoice, credit note, delivery note, and sales stock issue.
- Added read-only inventory return preview.
- Added explicit stock-in post action using `SALES_RETURN_IN`.
- Added duplicate movement prevention and source quantity validation.
- Added audit logging for create/update/lifecycle/movement post actions.
- Added customer activity visibility as zero-value operational stock return rows.
- Added frontend routes under `/sales/inventory-returns`.
- Added sidebar navigation and customer new-transaction menu entry.
- Added targeted API and frontend tests.

## Schema And Migration

Migration added:

- `apps/api/prisma/migrations/20260606100000_sales_inventory_returns/migration.sql`

Schema additions:

- `SalesInventoryReturnStatus`
- `NumberSequenceScope.SALES_INVENTORY_RETURN`
- `SalesInventoryReturn`
- `SalesInventoryReturnLine`
- Source document relations to sales invoices, credit notes, delivery notes, and sales stock issues.
- Nullable per-line stock movement link.
- User relations for create/approve/inventory post metadata.

The migration is additive. It does not reset data and does not alter accounting, AR, VAT, ZATCA, customer refund, credit note, landed-cost, FIFO, email, payment, or production infrastructure tables.

## API Endpoints

New endpoints:

- `GET /sales-inventory-returns`
- `GET /sales-inventory-returns/next-number`
- `GET /sales-inventory-returns/:id`
- `POST /sales-inventory-returns`
- `PATCH /sales-inventory-returns/:id`
- `POST /sales-inventory-returns/:id/submit`
- `POST /sales-inventory-returns/:id/approve`
- `POST /sales-inventory-returns/:id/receive`
- `POST /sales-inventory-returns/:id/cancel`
- `POST /sales-inventory-returns/:id/void`
- `GET /sales-inventory-returns/:id/inventory-return-preview`
- `POST /sales-inventory-returns/:id/post-inventory-return`

Updated behavior:

- Customer activity includes sales inventory returns as operational zero-value rows.
- Number sequence preview supports sales inventory returns.
- Audit event registry includes sales inventory return lifecycle and movement events.

## Lifecycle Behavior

- `DRAFT` can be edited and submitted.
- `SUBMITTED` can be approved or cancelled.
- `APPROVED` can be received, voided, or stock-in posted.
- `RECEIVED` can be stock-in posted if not already posted.
- `CANCELLED` and `VOIDED` are terminal.
- Void is blocked after stock-in movement has posted because reversal is not supported yet.

## Source Linkage Behavior

Supported sources:

- Customer direct.
- Sales invoice line.
- Credit note line as reference/accounting context.
- Delivered delivery note line.
- Posted sales stock issue line.

Preferred warehouse/source path:

- Posted sales stock issue source can safely derive warehouse.
- Delivery note and invoice sources need explicit warehouse selection for tracked stock-in.
- Credit note source remains reference-only unless explicit item/quantity/warehouse lines are supplied.

Source line quantity cannot exceed remaining safe source quantity across non-cancelled, non-voided sales inventory returns.

## Stock-In Movement Behavior

Posting stock-in:

- Requires `APPROVED` or `RECEIVED` status.
- Requires `stockMovements.create`.
- Requires active tracked item and active warehouse for each posted line.
- Creates `SALES_RETURN_IN` stock movement rows.
- Links each movement to the sales inventory return line.
- Sets header inventory-post metadata.
- Blocks duplicate posting.
- Skips non-tracked lines.

Posting is explicit and user-triggered only.

## Preview Behavior

The preview endpoint is read-only.

It returns:

- Source return ID, number, and status.
- Movement status.
- Post eligibility.
- Blocking reasons.
- Warnings.
- Item.
- Warehouse.
- Return quantity.
- Current on-hand.
- Projected on-hand after return.
- Source line/document context.
- Linked movement IDs when already posted.

Preview does not mutate stock, accounting, AR, VAT, ZATCA, credit notes, refunds, or email state.

## Customer Activity Integration

Customer activity now shows sales inventory returns as:

- `Sales inventory return (operational stock)`
- Zero subtotal, tax, total, and balance due.
- Link to `/sales/inventory-returns/:id`.

They do not affect customer statement balances, customer ledger accounting rows, open receivable balance, invoice balances, credit notes, payments, or refunds.

## Inventory Movement Labels

Movement labels now include:

- `PURCHASE_RETURN_OUT` -> `Purchase return out`
- `SALES_RETURN_IN` -> `Sales return in`

The existing inventory movement pages and reports can display the new labels.

## Permission Behavior

No new permissions were added.

Permissions:

- View list/detail: `salesInvoices.view`
- Create: `salesInvoices.create`
- Edit/lifecycle: `salesInvoices.update`
- Preview movement: `inventory.view`
- Post movement: `stockMovements.create`

View-only users can see sales inventory returns and read-only preview when they have the view permissions. Restricted users without stock movement create permission cannot post stock-in.

## Audit Behavior

Added audit events:

- `SALES_INVENTORY_RETURN_CREATED`
- `SALES_INVENTORY_RETURN_UPDATED`
- `SALES_INVENTORY_RETURN_SUBMITTED`
- `SALES_INVENTORY_RETURN_APPROVED`
- `SALES_INVENTORY_RETURN_RECEIVED`
- `SALES_INVENTORY_RETURN_CANCELLED`
- `SALES_INVENTORY_RETURN_VOIDED`
- `SALES_INVENTORY_RETURN_INVENTORY_MOVEMENT_POSTED`

Audit metadata includes compact IDs, return number, customer ID, source IDs, item IDs, warehouse IDs, quantities, movement IDs, and non-effect flags. It does not log full payload bodies.

## Non-Effect Behavior

This sprint does not:

- Create accounting journals.
- Reverse accounting journals.
- Change AR balances.
- Change invoice balances.
- Create credit notes automatically.
- Create refunds automatically.
- Affect VAT reports.
- Affect ZATCA.
- Send email.
- Create payment links.
- Update landed cost.
- Update FIFO/cost layers.
- Change COGS.
- Affect financial statements.
- Change production hosting, Vercel, Supabase, runtime DB roles, object storage, backup/restore, or customer-data handling.

## Validation

Commands run:

- `corepack pnpm --filter @ledgerbyte/api test -- sales-inventory-return --runInBand`
- `corepack pnpm --filter @ledgerbyte/api test -- sales-inventory-return contact.service --runInBand`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm --filter @ledgerbyte/web test -- sales-inventory-returns sales-inventory-return-form permissions parties party-new-transaction-menu --runInBand`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `corepack pnpm db:generate`

Results:

- Targeted sales inventory return API tests passed: 2 suites, 12 tests.
- Targeted API tests including customer activity passed: 3 suites, 25 tests.
- API typecheck passed.
- Targeted frontend tests passed: 7 suites, 26 tests.
- Prisma Client generation passed.
- Web typecheck remains blocked by unrelated marketing file errors listed below.

Pending final validation after documentation:

- `git diff --check`

## Marketing Typecheck Blocker

Repo-wide web typecheck remains blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx`
- `HomePage` is reported as `() => void` at lines 35 and 65.

Marketing files were not modified.

## OS Power Command Status

No OS shutdown, restart, sleep, hibernate, lock-screen, logout, or power command was run.

## Remaining Gaps

- Stock-in reversal for sales inventory returns is not implemented.
- Future COGS reversal requires accountant-approved policy.
- Credit notes and refunds remain separate manual workflows.
- Delivery note detail reverse panel for related sales inventory returns is not added yet.
- Broad browser QA and hosted/customer-data proof remain open.
- FIFO/cost layers and landed cost remain future work.

## Recommended Next Sprint

Recommended next sprint: Sales Inventory Return Source Visibility and Browser Workflow Sprint.

Scope:

- Add related sales inventory return panels on source delivery note, sales invoice, and sales stock issue detail pages.
- Add focused mocked browser coverage for list, create, detail, edit, lifecycle, preview, stock-in post, restricted permissions, customer activity, and source linkage.
- Keep accounting, AR, VAT, ZATCA, email, payment, landed-cost, and FIFO behavior unchanged.
