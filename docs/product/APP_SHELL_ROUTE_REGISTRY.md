# LedgerByte App Shell Route Registry

## Purpose

LedgerByte now keeps frontend app-shell route metadata in `apps/web/src/lib/app-routes.ts`. The registry gives shell, mobile workflow, tests, and later route-aware helpers a single LedgerByte-native source for stable route keys, labels, hrefs, route sections, descriptions, visibility, capability status, permissions, and compliance/storage/provider sensitivity tags.

## Active Route Families

- Overview and setup: dashboard and guided setup.
- Contacts: customers, suppliers, and shared contacts.
- Sales: invoices, credit notes, customer payments, quotes, recurring invoices, delivery notes, collections, inventory returns, and customer refunds.
- Purchases: bills, debit notes, supplier payments, AP dashboard, purchase orders, purchase returns, matching exceptions, supplier refunds, and cash expenses.
- Banking and accounting: bank accounts, bank transfers, manual journals, chart of accounts, and fiscal periods.
- Inventory: item catalog, warehouses, movements, adjustments, transfers, receipts, stock issues, balances, inventory reports, FIFO preview, tracking routes, landed-cost preview, valuation variances, variance proposals, and settings.
- Documents, reports, compliance, and settings: generated documents, financial reports, VAT reports, tax workspace, organization setup, users, roles, storage, compliance, security, banking accounting, email outbox, audit logs, and ZATCA local-readiness settings.

## Planned And Future Routes

The registry may name future route families only when they are marked `planned` or `inactive` and are excluded from active shell/mobile helpers. Current planned placeholders are exception inbox, AI proposal review, report packs, integration health, and document review. They do not add runtime routes, backend modules, Prisma schema, provider calls, or UI entry points.

## Mobile Visibility

`getMobileShellRoutes()` returns only active routes marked for the compact first-workflow strip. It currently preserves the existing mobile sequence: Dashboard, Setup, Customer, Supplier, Invoice, Payment, VAT, and Reports.

## Clean-Room Confirmation

This registry is LedgerByte-native. It does not add OpenBooks source code, schema, comments, UI text, file names, dependencies, implementation structure, runtime modules, or production behavior. Production source route metadata does not reference OpenBooks.

## Non-Goals

- No Inbox, AI proposal, deterministic bookkeeping pipeline, report-pack, integration-health, or document-review runtime was implemented.
- No API module, Prisma migration, Convex integration, external dependency, hosted deployment behavior, provider adapter, or production compliance behavior was added.
- No generated-document object storage, signed URL, ZATCA, UAE, Peppol, ASP, or provider readiness status changed.

## Validation Commands

- `corepack pnpm --filter @ledgerbyte/web test -- app-routes sidebar`
- `corepack pnpm --filter @ledgerbyte/web test -- app-routes`
- `corepack pnpm verify:openbooks-clean-room`
- `node scripts/openbooks-clean-room-validate.cjs --strict`
- `git diff --check`
- `git diff --cached --check` after staging

## Remaining Blockers

- Generated-document object storage remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven.
- Future planned route families require separate LedgerByte-native implementation PRs, tests, and evidence before they can become active.
