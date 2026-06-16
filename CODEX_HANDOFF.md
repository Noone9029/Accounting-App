# LedgerByte Codex Handoff

## Latest Commit Inspected

- Branch: `feature/ui-owner-security-organization-settings-visual-qa`.
- Base: fresh `origin/main` at `b8799c8f4e77c7be87f8a4a5fde0aaec33bc3fde` after PR `#61` (`Add owner settings generated-document visual QA`) was merged.
- Original ZATCA request-body stash remains preserved in `stash@{0}` and was not restored, dropped, overwritten, or mixed into this branch.
- `codex/purchase-bill-seeded-uuid-validation` remains untouched except for existence reporting.

## Current Development Objective

- Current lane: frontend-only LedgerByte UI/UX modernization.
- Product posture remains controlled beta/user-testing only.
- This branch extends authenticated local visual QA with real Owner organization, team, roles, role detail, audit-log, compliance, setup, and organization setup surfaces. It does not create fake `/settings/security`, `/settings/api`, `/settings/sessions`, or `/settings/organization` routes.
- It keeps backend APIs, Prisma schema, migrations, UAE PINT-AE behavior, ZATCA behavior, provider adapters, Vercel/Supabase, infrastructure, hosted/customer-data mutation, and production compliance claims unchanged.

## Owner Security Organization Settings Visual QA Summary

- PR `#61` (`Add owner settings generated-document visual QA`) was reverified green and merged into `main` with merge commit `b8799c8f4e77c7be87f8a4a5fde0aaec33bc3fde` before this branch began.
- Added read-only visual fixture coverage for `/roles/:id` so the real `/settings/roles/[id]` route can be exercised without a real API call.
- Added `tests/visual/owner-security-organization-settings-visual-qa.visual.spec.ts`, a Playwright visual matrix across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Owner organization/security states checked: settings redirect to team management, team members with Owner/Accountant/Sales/Purchases/Viewer/pending/suspended users, long names/emails, role controls, role list, system role protection, long custom role detail, permission matrix, audit retention, compliance readiness, guided setup, and organization setup form layout.
- Role profiles checked: `Owner`, `Accountant`, and `Viewer`. Owner coverage checks allowed admin/settings controls; Accountant/Viewer coverage checks restricted actions are hidden, disabled, or blocked according to existing behavior.
- Routes checked include `/settings`, `/settings/team`, `/settings/roles`, `/settings/roles/role-owner`, `/settings/roles/role-custom-long`, `/settings/audit-logs`, `/settings/compliance`, `/setup`, and `/organization/setup`.
- Skipped routes because they do not exist: `/settings/security`, `/settings/sessions`, `/settings/api`, `/settings/integrations`, `/settings/organization`, `/organization`, and `/settings/users`. `/settings/zatca` exists but ZATCA-specific visual expansion was intentionally avoided.
- Generated screenshots and `visual-results.json` under `artifacts/visual-qa/owner-security-organization-settings-visual-qa/`; `artifacts/` remains ignored, so screenshots are local evidence and are not committed.
- Findings fixed: role-detail fixture coverage was added; visual assertions were calibrated to the real app shell account-menu/sign-out and organization-loading variants. No frontend product layout, permission, link, or copy defect required a source UI change.
- No backend API, Prisma schema, migration, production auth provider behavior, auth/session/security business logic, payment/accounting/business logic, report calculation logic, journal posting logic, UAE PINT-AE behavior, ZATCA behavior, provider behavior, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake security/SSO/MFA/API/provider claim, fake automation, fake bank feed, fake storage/archive claim, certification claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: deeper real security/session/API settings only if product routes are implemented later, organization profile editing beyond setup, generated-document detail route if added later, storage execution evidence after real provider proof, and accountant/legal review of settings/compliance wording.

## Owner Settings Generated Document Storage Evidence Visual QA Summary

- PR `#60` (`Add secondary operational route visual QA`) was reverified green and merged into `main` with merge commit `85813f7217d32babebf71412f43ea8034f0c0d07` before this branch began.
- Extended `tests/visual/visual-fixtures.ts` with local/test-only generated-document archive rows for invoice, credit note, purchase bill, purchase debit note, failed, superseded, and local-ready database-storage states. The fixture also now exposes metadata-only storage evidence rows for database backup, generated-document backup, and RPO/RTO review without running backup, restore, provider, or storage migration work.
- Added `tests/visual/owner-settings-generated-document-storage-evidence.visual.spec.ts`, a Playwright visual matrix across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Owner settings states checked: team/users, roles, storage, compliance, audit logs, number sequences, document settings, setup checklist, accounts, and tax rates with long names/emails, role chips, evidence notes, inactive rows, controlled-beta wording, disabled provider states, and owner/settings action restrictions.
- Generated-document/storage evidence states checked: document archive generated/failed/superseded rows, long filenames, local database-storage metadata, filtered empty states, storage-readiness warnings, backup evidence rows, and source transaction PDF archive guidance.
- Role profiles checked: `Owner`, `Accountant`, and `Viewer`. Owner coverage checks allowed admin/settings/storage actions; Accountant coverage follows existing accounting-adjacent permissions; Viewer coverage accepts hidden or disabled restricted actions according to existing route behavior.
- Routes checked include `/settings`, `/settings/team`, `/settings/roles`, `/settings/storage`, `/settings/compliance`, `/settings/audit-logs`, `/settings/number-sequences`, `/settings/documents`, `/setup`, `/accounts`, `/tax-rates`, `/documents`, `/sales/invoices/invoice-1`, `/purchases/bills/bill-1`, `/sales/credit-notes/credit-note-1`, and `/purchases/debit-notes/debit-note-1`.
- Skipped routes because they do not exist: `/settings/users`, `/settings/organization`, `/settings/taxes`, `/settings/numbering`, `/settings/chart-of-accounts`, `/settings/security`, `/settings/api`, `/settings/uae-einvoicing`, `/onboarding`, `/documents/document-1`, and `/generated-documents`. `/settings/zatca` exists but ZATCA-specific visual expansion was intentionally avoided.
- Generated screenshots and `visual-results.json` under `artifacts/visual-qa/owner-settings-generated-document-storage-evidence/`; `artifacts/` remains ignored, so screenshots are local evidence and are not committed.
- Findings fixed: generated-document and storage evidence fixture realism was added; purchase debit note and document guidance copy now uses conservative unsupported-network wording; visual assertions now match existing Accountant account/tax management permissions and Viewer disabled settings states.
- No backend API, Prisma schema, migration, production auth provider behavior, payment/accounting/business logic, report calculation logic, journal posting logic, UAE PINT-AE behavior, ZATCA behavior, provider behavior, generated-document business logic, storage provider logic, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake provider/storage/archive/certification claim, fake bank automation claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: owner/security settings depth, generated-document detail route if added later, storage execution proof after real provider evidence, and accountant wording review.

## Secondary Operational Route Polish Visual QA Summary

- PR `#59` (`Add report drilldown dense entry visual QA`) was reverified green and merged into `main` with merge commit `b36ffe56f83a79edbe04f148f4e1a86ecf38b5d9` before this branch began.
- Extended `tests/visual/visual-fixtures.ts` with local/test-only secondary operational data for customer and supplier lists, team members, roles, chart of accounts, tax rates, number sequences, generated documents, setup readiness, and banking-adjacent pages. The fixture remains read-only and does not call real auth, database, hosted data, provider, ASP, email, UAE PINT-AE, ZATCA, bank-feed, storage, report export, or reconciliation automation services.
- Added `tests/visual/secondary-operational-route-polish.visual.spec.ts`, a Playwright visual matrix across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Secondary states checked: customer/supplier lists with many rows, long legal names, TRN/TIN-style fields, balances, overdue states, inactive rows, and filtered empty states; settings overview/team/roles/storage/compliance/audit logs/numbering/accounts/tax setup; setup checklist complete/incomplete/blocked-provider-evidence states; generated document long filenames, failed rows, local-ready rows, and empty states; bank account list/detail and statement transaction review states.
- Role profiles checked: `Owner`, `Accountant`, and `Viewer`. Owner coverage checks allowed admin/settings actions; Accountant coverage checks accounting-adjacent route access and absence of owner-only affordances where existing permissions restrict them; Viewer coverage checks mutation/create/delete/finalize/export/settings actions are hidden, disabled, or blocked according to existing behavior.
- Routes checked include `/customers`, `/suppliers`, `/settings`, `/settings/team`, `/settings/roles`, `/settings/storage`, `/settings/compliance`, `/settings/audit-logs`, `/settings/number-sequences`, `/accounts`, `/tax-rates`, `/setup`, `/documents`, `/bank-accounts`, `/bank-accounts/bank-1`, and `/bank-accounts/bank-1/statement-transactions`.
- Skipped routes because they do not exist or were intentionally out of this branch scope: `/settings/users`, `/settings/organization`, `/settings/taxes`, `/settings/numbering`, `/settings/chart-of-accounts`, `/settings/security`, `/settings/api`, `/settings/uae-einvoicing`, `/onboarding`, `/documents/document-1`, `/generated-documents`, `/bank-accounts/bank-account-1`, `/bank-accounts/bank-account-1/transactions`; `/settings/zatca` exists but ZATCA-specific visual expansion was intentionally avoided.
- Generated screenshots and `visual-results.json` under `artifacts/visual-qa/secondary-operational-route-polish/`; `artifacts/` remains ignored, so screenshots are local evidence and are not committed.
- Findings fixed: Viewer no longer sees `Add customer`/`Add supplier` mutation links on party list pages without `contacts.manage`; the chart-of-accounts create form now wraps safely at tablet/mobile widths; the local fixture now covers `/accounts/next-code` and richer secondary route data used by the visual matrix.
- Route/action consistency checks now verify sidebar and topbar create-menu app-local hrefs resolve to real App Router pages or existing placeholders; create-menu disabled states are checked without inventing destination routes.
- No backend API, Prisma schema, migration, production auth provider behavior, payment/accounting/business logic, report calculation logic, journal posting logic, UAE PINT-AE behavior, ZATCA behavior, provider behavior, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake automation, fake bank feed, fake AI, fake provider connectivity, fake storage connectivity, fake export success, report certification claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: secondary route component migration beyond the checked polish, generated-document detail/storage execution work after real object-storage evidence, owner/security settings depth, dense entry-form ergonomics, and accountant wording review.

## Report Drilldown Dense Entry Visual QA Summary

- PR `#58` (`Add refund collections banking visual polish`) was reverified green and merged into `main` with merge commit `643cc62dacb764d61e4f0acd7b99e51c4a43c502` before this branch began.
- Extended `tests/visual/visual-fixtures.ts` with local/test-only report, statement, manual journal, VAT review, and audit-log data. The fixture remains read-only and does not call real auth, database, hosted data, provider, ASP, email, UAE PINT-AE, ZATCA, bank-feed, report export, or reconciliation automation services.
- Added `tests/visual/report-drilldown-dense-entry-visual-qa.visual.spec.ts`, a Playwright visual matrix across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Report states checked: Profit & Loss hierarchy with zero rows, negative adjustments, long account names, and large totals; Balance Sheet assets/liabilities/equity, negative balances, retained earnings, and totals; Trial Balance debit/credit columns, zero-balance account, long names, and balanced totals; General Ledger opening/closing balances, many rows, long descriptions, source references, debit/credit/running balance columns; VAT Summary and VAT Return internal-review states with taxable sales, taxable purchases, input/output VAT, adjustments, and zero rows; aged receivables/payables across current, `1-30`, `31-60`, `61-90`, `90+`, large overdue, long party, and zero-balance rows.
- Dense-entry states checked: manual journals with draft, posted, reversed, large amount, and zero-balance rows; bank statement transaction review rows; customer and supplier statements; customer and supplier transaction workspaces; invoice and bill line-item/payment-allocation tables; document archive and audit-log dense tables.
- Role profiles checked: `Owner`, `Accountant`, and `Viewer`. Owner coverage checks allowed report actions; Accountant coverage checks accounting-heavy readability and absence of owner-only admin affordances; Viewer coverage checks mutation/create/export/configuration actions are hidden, disabled, or blocked according to existing behavior.
- Routes checked include `/reports`, `/reports/profit-and-loss`, `/reports/balance-sheet`, `/reports/trial-balance`, `/reports/general-ledger`, `/reports/vat-summary`, `/reports/vat-return`, `/reports/aged-receivables`, `/reports/aged-payables`, `/journal-entries`, `/bank-accounts/bank-1/statement-transactions`, `/customers/customer-long/statement`, `/suppliers/supplier-long/statement`, `/customers/customer-long`, `/suppliers/supplier-long`, `/sales/invoices/invoice-partially-paid`, `/purchases/bills/bill-partially-paid`, `/documents`, and `/settings/audit-logs`.
- Skipped routes because they do not exist: `/reports/vat`, `/reports/cash-flow`, `/reports/customer-statement`, `/reports/supplier-statement`, and `/reports/audit-log`. Existing `/reports/vat-summary`, `/reports/vat-return`, party statement routes, and `/settings/audit-logs` were covered instead.
- Generated screenshots and `visual-results.json` under `artifacts/visual-qa/report-drilldown-dense-entry-visual-qa/`; `artifacts/` remains ignored, so screenshots are local evidence and are not committed.
- Findings fixed: report export controls now require `reports.export` instead of document-download permission, and report guide create links now respect invoice, bill, and payment create permissions. Fixture/test harness findings were also corrected for audit-log retention endpoints, statement-load assertions, and mixed table/empty-state expectations.
- No backend API, Prisma schema, migration, production auth provider behavior, payment/accounting/business logic, report calculation logic, journal posting logic, UAE PINT-AE behavior, ZATCA behavior, provider behavior, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake automation, fake bank feed, fake AI, fake provider connectivity, fake report export success, report certification claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: secondary operational route polish, dense entry-form ergonomics beyond the checked screens, report export implementation review if/when real exports exist, and accountant sign-off on final report wording.

## Refund Collections Banking Detail Polish Summary

- PR `#57` (`Add detail-state accountant mobile visual QA`) was reverified green and merged into `main` with merge commit `c62a1a0f2232aca7fbffcf0400fed66f67d392b2` before this branch began.
- Extended `tests/visual/visual-fixtures.ts` with local/test-only refund, collections, banking, bank statement, reconciliation, and cheque fixtures. The fixture remains read-only and does not call real auth, database, hosted data, provider, ASP, email, UAE PINT-AE, ZATCA, bank-feed, or reconciliation automation services.
- Added `tests/visual/refund-collections-banking-detail-polish.visual.spec.ts`, a Playwright visual matrix across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Refund/collections states checked: credit and debit note draft, finalized, applied, unapplied, partially applied, voided, long party/reason content, large amount, zero-balance-after-application context, customer refund, supplier refund, overdue collection case, partial payment, unallocated payment, available credit/debit note application context, long legal names/addresses, and no-open-balance party detail.
- Banking/reconciliation states checked: multiple bank accounts, negative balance, inactive account, long account name, currency display, empty/list behavior, unmatched statement row, matched statement row, ignored/manual row context, long description, large amount, debit/credit display, reconciliation summary/list/detail, unmatched and matched row snapshots, review events, issued/received/cleared/voided cheques, long payee, and large cheque amount.
- Role profiles checked: `Owner`, `Accountant`, and `Viewer`. Owner coverage checks allowed actions; Accountant coverage checks accounting-heavy readability and absence of owner-only admin affordances; Viewer coverage checks mutation/refund/reconcile actions are hidden or blocked according to existing behavior.
- Routes checked include `/sales/credit-notes`, `/sales/credit-notes/new`, mocked credit-note details, `/sales/customer-refunds`, `/sales/customer-refunds/new`, `/sales/customer-refunds/customer-refund-1`, `/sales/collections`, `/sales/collections/collection-case-visual`, `/customers/customer-long`, `/purchases/debit-notes`, `/purchases/debit-notes/new`, mocked debit-note details, `/purchases/supplier-refunds`, `/purchases/supplier-refunds/new`, `/purchases/supplier-refunds/supplier-refund-1`, `/suppliers/supplier-long`, `/bank-accounts`, `/bank-accounts/bank-1`, `/bank-accounts/bank-1/statement-transactions`, `/bank-statement-transactions/statement-row-unmatched`, `/bank-accounts/bank-1/reconciliation`, `/bank-accounts/bank-1/reconciliations`, `/bank-reconciliations/rec-1`, `/bank-accounts/bank-1/cheques`, `/reports/aged-receivables`, `/reports/aged-payables`, `/reports/general-ledger`, and `/documents`.
- Skipped routes because they do not exist: `/banking`, `/reconciliation`, `/cheques`, `/customers/customer-collections`, and `/suppliers/supplier-payables`. Existing nested banking/reconciliation/cheque routes were covered instead.
- Unsupported states documented as skipped: cancelled credit/debit note state, stale cheque state, split bank transaction display, and supplier collections route. Existing app statuses and labels were used; no production status was invented.
- Generated screenshots and `visual-results.json` under `artifacts/visual-qa/refund-collections-banking-detail-polish/`; `artifacts/` remains ignored, so screenshots are local evidence and are not committed.
- Findings fixed: debit note detail mobile destructive action no longer stretches full-width, supplier long-detail AP summary fixture now resolves, banking route expectations match actual app labels, and access-denied Viewer banking states are accepted as restricted views.
- No backend API, Prisma schema, migration, production auth provider behavior, payment/accounting/business logic, AR/AP state-machine behavior, UAE PINT-AE behavior, ZATCA behavior, provider behavior, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake automation, fake bank feed, fake AI, fake provider connectivity, bank-feed claim, reconciliation automation claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: report drilldown depth, dense entry-form ergonomics, secondary operational routes, and accountant review of final refund/banking wording.

## Detail-State Accountant Mobile Visual QA Summary

- PR `#56` (`Add role-filtered UI visual QA route polish`) was reverified green and merged into `main` with merge commit `2467a195951a351db0c5b238eab5880ff8da2971` before this branch began.
- Extended `tests/visual/visual-fixtures.ts` with local/test-only detail variants for sales invoices, purchase bills, customer payments, supplier payments, credit notes, debit notes, customer detail, and supplier detail routes. The fixture remains read-only and does not call real auth, database, hosted data, provider, ASP, email, UAE PINT-AE, or ZATCA services.
- Added `tests/visual/detail-states-accountant-mobile-table-review.visual.spec.ts`, a Playwright visual matrix for detail states across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`; accountant table and role checks run across tablet and mobile.
- Detail states checked: invoice and bill draft, awaiting payment, partially paid, paid, overdue, and voided; customer and supplier payments allocated, partially allocated, and unallocated/overpayment; credit and debit notes draft, finalized, applied, and unapplied; customer and supplier detail active with open balance, active with no transactions, inactive/archived, and long-field records.
- Unsupported-state notes: separate `cancelled` invoice/bill status was skipped because the current app status vocabulary exposes `VOIDED`; no new production status was invented. Paid, overdue, awaiting-payment, and partial states are modeled through existing status, balance, date, and allocation fields.
- Accountant review covered `/dashboard`, `/sales/invoices`, `/sales/invoices/new`, `/purchases/bills`, `/purchases/bills/new`, `/customers/customer-1`, `/suppliers/supplier-1`, `/sales/customer-payments`, `/purchases/supplier-payments`, `/sales/credit-notes`, `/purchases/debit-notes`, `/reports`, `/bank-accounts`, and `/documents`.
- Dense table/card surfaces checked on mobile and tablet: invoice line items, bill line items, customer payment allocation, supplier payment allocation, customer transactions, supplier transactions, aged receivables, aged payables, general ledger, trial balance, bank transactions, and documents.
- Generated screenshots and `visual-results.json` under `artifacts/visual-qa/detail-states-accountant-mobile-table-review/`; `artifacts/` remains ignored, so screenshots are local evidence and are not committed.
- Findings fixed were local fixture/test-harness issues only: detail route IDs now return matching local records, open-list endpoints have precedence over detail matchers, aged report buckets match frontend enum keys, General Ledger and Trial Balance report fixtures exist, duplicate payment fixture IDs were removed, and table readability assertions match the current mixed table/empty-state UI. No app source layout defect required a frontend source change.
- No backend API, Prisma schema, migration, production auth provider behavior, payment/accounting/business logic, UAE PINT-AE behavior, ZATCA behavior, provider behavior, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake automation, fake bank feed, fake AI, fake provider connectivity, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: refund/collections/banking detail polish, deeper report drilldowns, accountant review of dense entry forms, and staged migration of secondary operational routes.

## Role-Filtered UI Visual QA Route Polish Summary

- PR `#55` (`Add authenticated UI visual QA route hardening`) was reverified green and merged into `main` with merge commit `311ef752bf692c16f17cafa361c8b1522cb686e8` before this branch began.
- Extended `tests/visual/visual-fixtures.ts` so the local visual fixture can return real default role profiles from the shared permission catalog: `Owner`, `Accountant`, `Sales`, `Purchases`, and `Viewer`.
- Added `tests/visual/role-filtered-route-polish.visual.spec.ts`, a local Playwright visual matrix that primes the existing `visual-token`/`org-visual` session with a selected role profile and uses read-only API mocks.
- Route matrix covered `Owner` and `Viewer` across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844` for `/dashboard`, `/sales/invoices`, `/sales/invoices/new`, `/purchases/bills`, `/purchases/bills/new`, `/customers/customer-1`, `/suppliers/supplier-1`, `/sales/customer-payments`, `/purchases/supplier-payments`, `/sales/credit-notes`, `/purchases/debit-notes`, `/documents`, `/reports`, `/settings`, `/settings/storage`, `/settings/compliance`, and `/bank-accounts`.
- Create-menu matrix covered `Owner`, `Accountant`, `Sales`, `Purchases`, and `Viewer` across the same three viewports, verifying allowed links, disabled unauthorized actions, and local-route hrefs.
- Generated screenshots and `visual-results.json` under `artifacts/visual-qa/role-filtered-route-polish/`; `artifacts/` remains ignored, so screenshots are local evidence and are not committed.
- Findings fixed in this branch were local test-fixture and visual-harness issues only: role-aware `/auth/me`, read-only `/roles` and `/organization-members`, exact label assertions, tablet breakpoint handling, and role-neutral route content assertions. No app UI source defect required a frontend behavior change.
- No backend API, Prisma schema, migration, production auth provider behavior, payment/accounting/business logic, UAE PINT-AE behavior, ZATCA behavior, provider behavior, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake automation, fake bank feed, fake AI, fake provider connectivity, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: deeper role-filtered detail states, refund/collections/banking detail polish, report-depth review, and accountant review of dense mobile table/card readability.

## Authenticated UI Visual QA Route Hardening Summary

- PR `#54` (`Harden Stitch frontend foundation`) was reverified green and merged into `main` with merge commit `0a6c5ddde244b5298933e88e4393516ff9996982` before this branch began.
- Added `tests/visual/authenticated-route-hardening.visual.spec.ts`, a local Playwright visual route matrix that primes the existing `visual-token`/`org-visual` session and uses the read-only visual API fixture instead of real auth, database mutation, hosted data, or external provider calls.
- Expanded `tests/visual/visual-fixtures.ts` with conservative read-only fixture data for organization, user/session, permissions, dashboard summary, customers, suppliers, invoices, purchase bills, customer payments, supplier payments, credit notes, debit notes, compliance readiness, storage readiness, and backup planning endpoints.
- Covered desktop `1440x1000`, tablet `1024x768`, and mobile `390x844` for `/dashboard`, `/sales/invoices`, `/sales/invoices/new`, `/purchases/bills`, `/purchases/bills/new`, `/customers/customer-1`, `/suppliers/supplier-1`, `/sales/customer-payments`, `/sales/customer-payments/new?customerId=customer-1`, `/sales/customer-payments/payment-1`, `/purchases/supplier-payments`, `/purchases/supplier-payments/new?supplierId=supplier-1`, `/purchases/supplier-payments/supplier-payment-1`, `/sales/credit-notes`, `/purchases/debit-notes`, `/documents`, `/reports`, `/settings/compliance`, `/settings/storage`, and `/bank-accounts`.
- The matrix verifies authenticated shell visibility, route headings/actions, document-level horizontal overflow, topbar/content overlap, conservative visible wording, dashboard KPI/readiness content, and the reduced-motion `FinancialFlowScene` fallback.
- Generated screenshots and `visual-results.json` under `artifacts/visual-qa/authenticated-route-hardening/`; `artifacts/` is intentionally ignored, so screenshots are local evidence and are not committed.
- Layout hardening from findings was limited to the test harness and fixture coverage: scoped assertions to `main`/`banner`, aligned expected labels with the real app, added missing read-only `/branches` data, and kept visual checks from relying on hidden sidebar text.
- No backend API, Prisma schema, migration, production auth provider behavior, UAE PINT-AE behavior, ZATCA behavior, provider behavior, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: route-specific form polish beyond the checked shell/layout states, refund/collections/banking detail surfaces, report depth, and role-filtered visual QA.

## UI Stitch Frontend Foundation Hardening Summary

- PR `#53` (`Continue shadcn migration for payment workflows`) was merged into `main` with merge commit `90d617697a94aa34f7d6c20bb6d3b0b738d816ee` before this branch began.
- The Stitch/MCP frontend foundation pass was found as uncommitted local work in the original checkout, protected with `stitch-frontend-pass-safety.patch`, and reconciled into this fresh branch from updated `origin/main`.
- The reconciliation preserved the split `apps/web/src/components/ui-ledger/*` wrapper system from the shadcn migration instead of keeping a duplicate single-file `ui-ledger.tsx`.
- Added the split `ComplianceReadinessPanel`, tightened the dark grouped app shell, controlled-beta topbar/sidebar language, organization/search/create affordances, dashboard readiness panels, and AED-first invoice/bill form presentation.
- Real Three.js remains present through `FinancialFlowScene` on the dashboard only; `three` and `@types/three` are already wired in `apps/web/package.json` and the dashboard scene keeps reduced-motion, no-WebGL, cleanup, and jsdom fallback behavior.
- Browser route checks were run against the local dev server at desktop/tablet/mobile sizes and confirmed HTTP `200` plus no horizontal overflow on the selected routes. Full authenticated visual review remains limited because the local browser session reached the access gate without a seeded auth/API fixture.
- No backend API, Prisma schema, migration, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: authenticated visual QA with a safe local fixture, credit/debit note forms, reports, documents, compliance/settings surfaces, and route-by-route adoption of the hardened wrappers.

## UI Shadcn Transaction Workflows Summary

- PR `#51` (`Refresh LedgerByte UI shell and dashboard with shadcn`) was merged into `main` with merge commit `c19d69eba23eb01519ab70ece0bdaff960e2a223` before this branch began.
- Before this branch, the PR `#51` beta deployment evidence was observed:
  - API project `ledgerbyte-api-test`, deployment `dpl_3CZzo2Xm5DYXwG5MdDyKibnjnJde`, URL `https://ledgerbyte-api-test.vercel.app`.
  - API `/health` returned `200` with `status: ok`; API `/readiness` returned `200` with database `ok`.
  - Web project `ledgerbyte-web-test`, deployment `dpl_GY1hpGmEzkpMiMKxHrEpUQZKb2Mb`, URL `https://ledgerbyte-web-test.vercel.app`.
  - Web root returned `200` and served the login app shell.
- Before this branch, the Supabase gate evidence was observed for project `xynelbjqcmbgtscfmmzv`: already-merged PR `#49` migration `prisma_20260614100000_compliance_core_uae_readiness` was applied and recorded remotely as version `20260616000212`; migrations were verified afterward; Edge Functions list was empty, so no functions were deployed.
- The stray Vercel CLI project `ui-shadcn-shell-dashboard-refresh` had already been removed and confirmed `404`.
- This branch adds `LineItemsTable` and `TransactionSummaryCard` LedgerByte wrappers, migrates sales invoice and purchase bill creation forms to the shadcn/LedgerByte transaction layout, and modernizes the shared customer/supplier detail workspace with `PageHeader`, KPI cards, tabs, data tables, and status badges.
- Customer/supplier payment screens were not migrated in this branch; they remain follow-up scope.
- No backend API, Prisma schema, migration, UAE PINT-AE logic, ZATCA behavior, provider integration, Vercel/Supabase configuration, hosted/customer-data mutation, production infrastructure command, or production compliance/readiness claim was added.

## UI Shadcn Shell Dashboard Refresh Summary

- PR `#49` was already merged into `main` on 2026-06-15 with merge commit `2d99e42be0ab2d6d2f45fd36091bb9f3f0bece6c`; it was not re-merged.
- Created `feature/ui-shadcn-shell-dashboard-refresh` from updated `origin/main`.
- Initialized shadcn/ui in `apps/web`, added the requested primitives, and added LedgerByte wrapper components for page headers, KPI cards, data tables, filters, status badges, empty states, action grids, and panel sections.
- Reworked the app shell with a dark grouped sidebar, polished topbar, shadcn sheet mobile navigation, existing organization switcher/search/create-menu contracts, existing route links, and existing permission filtering.
- Redesigned `/dashboard` using existing dashboard data only, with KPI cards, P&L/Cash Flow tabs, read-only attention panels, onboarding progress, quick actions, and the single restrained Three.js financial-flow background.
- Migrated the sales invoices list, purchase bills list, and the sales invoice workflow guidance/detail surface to the new shadcn/LedgerByte pattern without changing accounting, finalization, payment, tax, or compliance behavior.
- Remaining UI migration scope: broader route-by-route adoption, deeper form modernization, visual QA across more authenticated states, and design-system consolidation after this first shell/dashboard/list pass.

## UAE PINT-AE Scenario Fixture Validation QA Summary

- PR `#48` was merged into `main` with merge commit `363ee49a80737796a6f15ec606b7b7d99d9afdb1` before this branch began.
- Added `docs/uae-peppol/UAE_PINT_AE_SCENARIO_FIXTURE_COVERAGE.md` and `docs/development/UAE_PINT_AE_SCENARIO_FIXTURES_VALIDATION_QA_SPRINT_CLOSURE.md`.
- Expanded package fixtures for standard tax invoice, commercial invoice `380`, tax credit note with reason/original reference, export receiver not registered in Peppol `9900000099`, deemed supply `9900000097`, buyer not subject `9900000098`, and multi-line invoice values.
- Added negative fixtures for missing buyer endpoint, invalid TIN/TRN, credit-note missing reason/reference, and unsupported legacy transaction flags.
- Added blocked fixture definitions for reverse charge, discount/allowance invoice, and provider-specific payload contract instead of inventing unsupported fields or values.
- Added package helpers `validateUaePintAeFixture()`, `runUaePintAeFixtureSuite()`, and `summarizeUaePintAeFixtureResults()`.
- The local QA summary is not certification, not legal compliance evidence, not provider validation, not FTA reporting, and not production Peppol evidence.
- Still no provider sandbox docs, provider credentials, provider response, commercial terms, provider-specific adapter, real ASP validation, real ASP submission, FTA reporting, real Peppol transmission, hosted/customer-data mutation, Vercel/Supabase change, ZATCA production behavior, or production UAE compliance claim.
- API/UI integration was intentionally skipped for this slice because the objective is package/dev-only local fixture QA.
- Next recommended arc: collect provider sandbox evidence before any provider adapter.

## UAE PINT-AE Official-Code TODO Review Summary

- Merged PR `#47` into `main` with merge commit `869d78ee02f603679ff0f462d2bd16d3a45fd481` before starting this branch.
- Added `docs/uae-peppol/UAE_PINT_AE_OFFICIAL_CODE_TODO_REVIEW.md` and `docs/development/UAE_PINT_AE_OFFICIAL_CODE_TODO_REVIEW_SPRINT_CLOSURE.md`.
- Reviewed UAE MoF Electronic Invoicing Guidelines, UAE MoF mandatory fields, UAE MoF pre-approved provider list, OpenPeppol PINT-AE v1.0.1, OpenPeppol BIS Billing 3.0, and UAE 2025-Q2 specs for continuity.
- Resolved commercial invoice type code as `380`.
- Resolved predefined endpoint participant identifications as `9900000097` for deemed supply, `9900000099` for exports when the receiver is not registered in Peppol, and `9900000098` for buyers not subject to UAE eInvoicing regulations.
- Resolved the official 8-position transaction type flags and now serialize them in `cbc:ProfileExecutionID`.
- Unknown or legacy transaction flags still produce structured `official-doc-required` validation results.
- Provider-specific payload contracts remain blocked on real provider sandbox docs, credentials, provider responses, and commercial terms.
- Still no real ASP validation, real ASP submission, FTA reporting, real Peppol transmission, provider adapter, provider credentials, hosted/customer-data mutation, Vercel/Supabase change, ZATCA production behavior, or production UAE compliance claim.
- Next recommended arc: collect and review provider sandbox evidence before any real provider adapter work.

## UAE PINT-AE Official Serializer Rule Pack Summary

- Added official local PINT-AE constants and exports for `urn:peppol:pint:billing-1@ae-1`, `urn:peppol:bis:billing`, endpoint scheme `0235`, and TIN-derived endpoint IDs.
- Added `packages/uae-peppol-pint-ae/src/pint-ae/*` for official serializer types, rule results, validation helpers, XML serializers, and golden fixtures.
- Kept existing readiness XML output and LedgerByte readiness CustomizationID separate from official serializer output.
- Added structured rule results with `code`, `severity`, `message`, `fieldPath`, and `source` values.
- Added local official XML serialization for invoices and credit notes with endpoint IDs, seller/buyer data, line data, tax totals, document totals, and credit-note reason/original-reference enforcement.
- Added guards so unknown official mappings are not silently guessed; the follow-up official-code TODO review resolved the source-backed commercial invoice, predefined endpoint, and transaction flag values.
- Updated compliance-core local validation to use the official local serializer and metadata-only archive hash path while recording that ASP validation is not connected.
- Updated the UAE readiness panel wording to distinguish local readiness, official local PINT-AE XML generation, and absent ASP validation.
- Still no real ASP validation, real ASP submission, FTA reporting, real Peppol transmission, provider adapter, provider credentials, hosted/customer-data mutation, Vercel/Supabase change, ZATCA production behavior, or production UAE compliance claim.
- Next recommended arc: collect provider sandbox payload evidence before any provider adapter.

## UAE ASP Outreach Execution Pack Summary

- Added `docs/uae-peppol/provider-outreach/README.md` with the outreach purpose, provider-backed strategy, response evaluation rules, evidence hygiene rules, and safety boundaries.
- Added `docs/uae-peppol/provider-outreach/PROVIDER_OUTREACH_TRACKER.md` seeded for Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, Comarch, TronStride / Aigentrix, Storecove, Sovos, and OpenText.
- Added provider-specific outreach email drafts for Complyance, ClearTax, Taxilla, EDICOM, and Comarch.
- Added `docs/uae-peppol/provider-outreach/PROVIDER_RESPONSE_EVALUATION_RUBRIC.md` to score provider responses before any sandbox adapter work.
- Added `docs/development/UAE_ASP_OUTREACH_EXECUTION_PACK_SPRINT_CLOSURE.md`.
- No real provider was selected. No real ASP adapter, credential, executable provider base URL, provider call, FTA reporting, Peppol transmission, real email, Vercel/Supabase change, hosted/customer-data mutation, or production infrastructure command was added.
- Next recommended arc: collect provider responses, keep confidential evidence outside git, score non-confidential evidence, and only then decide whether a provider-specific sandbox contract test branch is justified.

## UAE ASP Provider Selection Plan Summary

- Added `docs/uae-peppol/UAE_ASP_PROVIDER_SELECTION_MATRIX.md` with official-source links, provider shortlist, weighted scoring, risks, unknowns, and recommended first outreach order.
- Added `docs/uae-peppol/UAE_ASP_SANDBOX_CONTRACT_PLAN.md` with required sandbox artifacts, contract terms, provider adapter acceptance criteria, and production go-live blockers.
- Added `docs/uae-peppol/UAE_ASP_PROVIDER_OUTREACH_TEMPLATE.md` with a conservative provider email template and response checklist.
- Added `docs/development/UAE_ASP_PROVIDER_SELECTION_PLAN_SPRINT_CLOSURE.md` documenting the docs-only scope and safety boundary.
- Recommended first outreach order: Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, Comarch, TronStride / Aigentrix, Storecove, Sovos, OpenText.
- Storecove, Sovos, and OpenText remain comparator providers only unless current UAE MoF status or an authorized UAE ASP partnership is confirmed.
- Final recommendation: start outreach with the most API-friendly MoF-listed providers first; do not implement a real provider until sandbox docs and commercial terms are reviewed.

## UAE Disabled ASP Connector Contract Summary

- Added provider-neutral ASP adapter types, normalized provider keys, capability flags, status values, redaction helpers, and a factory in `@ledgerbyte/uae-peppol-pint-ae`.
- Added `DisabledAspProviderAdapter`, `MockAspProviderAdapter`, and safe future-provider placeholders for `FUTURE_COMPLYANCE`, `FUTURE_CLEARTAX`, `FUTURE_EDICOM`, and `FUTURE_GENERIC_ASP`.
- Disabled provider behavior blocks submission, returns disabled/not-configured status, rejects webhooks, returns no evidence, and never emits sent/reported/delivered statuses.
- Mock provider behavior is deterministic, local-only, test-only, and can simulate validation success/failure plus accepted/rejected mock submissions only when explicit mock mode is enabled.
- Added compliance-core API/service routes for provider readiness summary, redacted test config, transmission preview, explicit mock submission, and provider status timeline.
- Existing compliance document tenant scoping is reused before any preview/status/mock-submission action.
- Mock submission records a local `ComplianceTransmission` and event log only for local contract testing; it does not update accounting finalization or compliance document status.

## UAE Data-Entry And Validation Panel Summary

- Extended the Compliance settings page with editable legal name, trade license, TRN/TIN, VAT status, UAE address/emirate, business activity, Peppol participant ID, ASP selection, and ASP onboarding status fields.
- Added organization readiness checks for TIN/TRN, participant ID presence or derivation, UAE address completeness, VAT status, ASP selection, and ASP onboarding status.
- Added UAE eInvoicing fields to contact creation, shared contact detail/edit, and customer/supplier detail surfaces without blocking normal bookkeeping contact creation.
- Added local UAE eInvoicing/PINT-AE readiness panels to finalized sales invoice and sales credit-note detail pages.
- Added read-only API readiness endpoints for sales invoices and credit notes plus explicit prepare/validate actions that reuse compliance-core document, validation result, event, and archive metadata.
- The local validation path stores status, hashes, warnings/errors, and metadata only; PDFs are not treated as UAE compliance artifacts.

## UI shadcn payment workflows handoff - 2026-06-16

- PR `#52` (`feature/ui-shadcn-transaction-workflows`) was reverified green and merged into `main` with merge commit `25cb9ef9a0ef3225cde03dcfa935703743601762` before this branch began.
- Current branch: `feature/ui-shadcn-payment-workflows`, created fresh from updated `origin/main`.
- Completed frontend-only shadcn/LedgerByte migration for the real payment workflow routes:
  - `/sales/customer-payments`
  - `/sales/customer-payments/new`
  - `/sales/customer-payments/[id]`
  - `/purchases/supplier-payments`
  - `/purchases/supplier-payments/new`
  - `/purchases/supplier-payments/[id]`
- Added shared UI wrappers for payment allocation tables, payment summaries, and payment status badges under `apps/web/src/components/ui-ledger/`.
- Safety boundaries held: no backend, API, Prisma schema, migration, seed/reset/delete, payment posting/allocation logic, AR/AP state machine, UAE PINT-AE, ZATCA, provider integration, hosted data, Vercel, Supabase, production infrastructure, or production compliance claim changed.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: deeper generated-document/archive detail surfaces, refund workflows, bank/reconciliation review screens, reports/settings tables, and any remaining legacy table/form surfaces.

## Current Safety Boundaries

- Controlled beta/user-testing only.
- UAE eInvoicing readiness and Peppol/PINT-AE readiness only.
- Local validation/readiness, disabled/mock ASP connector contracts, and provider-selection planning only.
- No real ASP calls, no real ASP submission, no FTA reporting, no buyer delivery, and no production Peppol or UAE compliance claim.
- LedgerByte is not claiming FTA certification, Peppol certification, official UAE provider status, or accredited ASP status.
- No ZATCA production behavior, real ZATCA network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- No hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, or E2E was run.
- Accounting finalization remains separate from compliance delivery state; invoice/credit-note posting, settlement, allocation, VAT math, and report math were not changed.

## Verification Notes For This Branch

- This branch is docs/planning only and should preserve the disabled/mock adapter behavior from PR `#44`.
- Required verification should include package tests/typechecks, API/web targeted tests, `verify:diff`, `verify:ci:local`, `git diff --check`, and staged diff whitespace checks.

## Previous Compliance Core Snapshot

- PR `#42` was fixed, green, merged, and cleaned up before this branch began.
- Compliance core introduced the neutral compliance lifecycle, UAE readiness fields, local PINT-AE helper package, metadata-only archive behavior, settings readiness dashboard, and `compliance.*` permissions.
- Previous PR `#41` was reverified green/safe and merged into `main` with merge commit `7d4b9fa7fab9d971594940e8206d6cc1bc470436`.

## PR #41 Merge Status

- PR `#41` `Wafeq banking reconciliation reports and audit trail polish` was open, non-draft, mergeable clean, and still at expected head `369d2f1c64619d3f8ed709978835fdeaaa8597c7`.
- GitHub check runs were successful: Vercel Preview Comments, Non-mutating verification, and GitGuardian Security Checks.
- Commit statuses were successful for Vercel `ledgerbyte-web-test` and `ledgerbyte-api-test`.
- PR `#41` was merged by merge commit before this branch was rebased onto fresh `origin/main`.

## Compliance Core Files Added Or Updated

- Added Prisma compliance-core schema and migration:
  - `ComplianceProfile`
  - `ComplianceProvider`
  - `ComplianceDocument`
  - `ComplianceTransmission`
  - `ComplianceValidationResult`
  - `ComplianceEventLog`
  - `DocumentArchiveRecord`
- Added nullable UAE readiness fields on organization and contact records:
  - trade license, TRN, TIN, VAT status, UAE address/emirate/business activity, Peppol participant ID, ASP selection/onboarding, buyer endpoint/delivery metadata.
- Added `packages/uae-peppol-pint-ae` with local TIN/TRN validation, Peppol participant derivation, readiness checks, and PINT-AE-like invoice/credit-note XML generation.
- Added API module `apps/api/src/compliance-core/*` for readiness, document preparation, local validation, timeline events, validation result storage, and XML/evidence archive metadata.
- Added frontend settings route `apps/web/src/app/(app)/settings/compliance/*`.
- Updated permissions, route permission mapping, sidebar navigation, and permission matrix for `compliance.*`.
- Updated docs:
  - `CODEX_HANDOFF.md`
  - `BUG_AUDIT.md`
  - `docs/IMPLEMENTATION_STATUS.md`
  - `docs/REMAINING_ROADMAP.md`
  - `docs/PRODUCT_READINESS_SCORECARD.md`
  - `docs/development/COMPLIANCE_CORE_UAE_PEPPOL_FOUNDATION_SPRINT_CLOSURE.md`
  - `docs/uae-peppol/README.md`

## Implementation Summary

- Compliance delivery state is separate from accounting finalization state. Finalized invoices/credit notes can be prepared as compliance documents without changing journal posting, AR/AP allocation, VAT math, report math, PDF behavior, or source document finalization.
- Compliance statuses added: `DRAFT`, `READY_FOR_VALIDATION`, `VALIDATION_FAILED`, `READY_FOR_ASP`, `SUBMITTED_TO_ASP`, `ACCEPTED_BY_ASP`, `REJECTED_BY_ASP`, `REPORTED_TO_FTA`, `DELIVERED_TO_BUYER`, `FAILED`, `CANCELLED`, and `ARCHIVED`.
- UAE readiness uses official-source positioning: UAE eInvoicing-ready / Peppol PINT-AE-ready data preparation with disabled ASP connectivity.
- The settings page shows readiness checks, buyer endpoint coverage, official source links, rollout dates, and prohibited claims.
- XML archive behavior is metadata-only in this lane: hash, size, filename, artifact type, source link, and body-stored=false metadata are recorded by the code path. PDF archive behavior remains separate.
- PR `#41` banking/audit documentation is preserved in implementation status and roadmap docs after reconciliation.

## Safety Boundaries

- No migration was applied to any database.
- No seed, reset, delete, cleanup, deployed check, smoke, E2E, hosted data mutation, Vercel/Supabase change, real email, real ASP call, or real ZATCA action was run.
- No OTP, CSID, request body, response body, private key, certificate, signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- ZATCA remains parked as blocked-by-default future KSA work.
- LedgerByte is not described as accredited, certified, production-ready, or an official UAE eInvoicing provider.

## Checks Run

- `git status --short --branch`
- `git log -1 --oneline`
- `git branch --show-current`
- `git worktree list`
- `git branch -vv`
- `git remote -v`
- `git stash list --max-count=5`
- `git fetch --prune origin`
- GitHub PR `#41` metadata/check/status verification through GitHub REST and connector.
- PR `#41` merge via connector with expected head SHA.
- `git -C E:\Worktrees\Accounting-App\main merge --ff-only origin/main`
- `git rebase origin/main`
- `corepack pnpm --filter @ledgerbyte/uae-peppol-pint-ae test`
- `corepack pnpm --filter @ledgerbyte/uae-peppol-pint-ae typecheck`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- compliance-core.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/web test -- compliance.test.ts`
- `corepack pnpm --filter @ledgerbyte/web test -- settings/compliance/page.test.tsx`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check`

## Reconciliation Notes

- Rebase conflict files:
  - `CODEX_HANDOFF.md`
  - `docs/IMPLEMENTATION_STATUS.md`
  - `docs/REMAINING_ROADMAP.md`
- Resolution kept PR `#41` banking/audit closure and compliance-core/UAE Peppol readiness notes.
- No source-code conflict required behavior changes.

## Skipped Commands And Why

- `corepack pnpm db:migrate`, seed/reset/delete, smoke, E2E, deployed checks, real login flows, hosted database checks, Vercel/Supabase changes, real ASP calls, real ZATCA calls, real email, backup/restore, and production infrastructure commands were skipped because this lane is local code/test only and the standing repo instructions forbid those actions without explicit approval.

## Remaining Blockers

- Real ASP connectivity is still absent and must wait for commercial provider selection, API documentation review, explicit approval, sandbox credentials, redaction rules, retry policy, and provider-specific payload validation.
- PINT-AE XML generation is readiness-oriented and fixture-tested; it is not official certification and must be checked against final ASP/provider contracts before real submission.
- Retention periods, audit export format, and legal guarantees must be re-verified against current UAE rules and counsel/accountant review before production claims.
- KSA ZATCA should be wrapped behind the same lifecycle later without weakening current no-production/no-network gates.

## Exact Next Recommended Prompt Title

`UAE ASP first-provider outreach evidence and sandbox docs review`
