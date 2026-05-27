# LedgerByte Development Completion Plan

Status: draft development execution plan
Date: 2026-05-23
Source state inspected: `4c8fa2c Document PROD-A3 web hosting inventory`

## Scope

- This plan pauses production-hosting research and returns the next workstream to product development readiness.
- No app code, infrastructure, provider settings, environment variables, migrations, seed/reset/delete commands, customer data, email behavior, ZATCA behavior, or deployment settings were changed for this plan.
- AWS remains the known future production direction from the proposed production ADRs, but production infrastructure work should not resume until the development gates below are handled or explicitly deferred.
- Vercel remains beta/user-testing/staging only, not final production hosting.

## Current Development Status

- LedgerByte is a broad accounting SaaS MVP, not a production SaaS launch candidate.
- The committed web app is a Next.js 16 / React 19 App Router app with 113 committed `page.tsx` route files across auth, dashboard, sales, purchases, banking, inventory, reports, settings, documents, and placeholder routes.
- The committed API is a NestJS / Express / Prisma PostgreSQL service with 51 controller declarations across auth, organizations, roles, accounting, AR/AP, banking, inventory, storage, email, audit, reports, ZATCA, and health/readiness.
- Prisma schema coverage is wide: users, organizations, roles, contacts, accounts, AR/AP documents, bank statement/reconciliation records, inventory records, generated documents, attachments, audit logs, email readiness records, backup evidence, and ZATCA metadata/custody planning records are modeled.
- Existing verification assets are substantial: API Jest tests, web helper/page tests, Playwright E2E, focused visual regression, ZATCA package tests, and deep API smoke scripts exist. They were not run in this docs-only thread because no app code changed.
- Product maturity is best treated as controlled beta/internal accountant review: core workflows exist, but real production operations, compliance, provider validation, and SaaS business controls remain incomplete.

## Unfinished User-Facing Features

- Dashboard and onboarding: useful first-workflow guidance exists, but saved dashboard preferences, advanced charting, and accountant-approved KPI definitions are missing.
- Auth and sessions: login, invite, password reset, permissions, and role-aware UI exist, but MFA, refresh-token rotation, advanced session invalidation, and admin security alerting are missing.
- Contacts: customer/supplier CRUD and ledgers exist, but import/export, duplicate management, richer contact history, and bulk tools are missing.
- Sales and AR: invoices, payments, credit notes, refunds, ledgers, statements, PDFs, and attachments exist, but recurring invoices, quotes/proformas, delivery notes, collection workflow, payment gateway capture, and send/remittance flows are missing.
- Purchases and AP: purchase orders, bills, supplier payments, debit notes, refunds, cash expenses, ledgers, statements, PDFs, and attachments exist, but partial billing, multi-PO matching, remittance sending, OCR/import, supplier delivery documents, and accountant-reviewed AP output remain incomplete.
- Banking and reconciliation: bank profiles, transfers, manual statement import, matching/categorization, reconciliation, reports, and limited OFX/CAMT/MT940 parser groundwork exist, but live feeds, automatic matching, target-bank certified parser coverage, transfer fees, FX transfer handling, and raw-file archive implementation are missing.
- Inventory: warehouses, movements, adjustments, transfers, receipts, issues, valuation reports, manual COGS, receipt asset posting, clearing reports, and variance proposals exist, but automatic posting, landed cost, FIFO cost layers, serial/batch, returns, in-transit/bin/location support, and approval inboxes are missing.
- Reports and documents: GL, trial balance, P&L, balance sheet, VAT summary, aging, CSV/PDF export, and archive workflows exist, but official VAT return, report packs, scheduled delivery, accountant-approved layouts, PDF snapshot/text coverage, and document-template preview/designer work remain incomplete.
- Admin/audit: audit logs, CSV export, retention settings, dry-run preview, team/role pages, storage readiness, and email outbox readiness exist, but immutable audit storage, scheduled export, purge executor, sensitive-action alerting, anomaly detection, and maker-checker approval workflows are missing.
- SaaS business layer: paid plans, tenant limits, subscription/billing, cancellation/refund policy, support tooling, legal-review surfaces, and customer lifecycle workflows are not implemented.

## Placeholder, Stub, And Mock-Only Areas

- `apps/web/src/app/(app)/[...placeholder]/page.tsx` is a catch-all scaffold for future modules such as recurring invoices, quotes/proformas, fixed assets, payroll, integrations, API keys, document templates, and other unbuilt sections.
- `packages/ui` is a minimal package with only a simple interface/helper and a `test` script that prints `No UI package tests yet`.
- Email remains mock/local by default. SMTP is opt-in, diagnostics are disabled by default, retry processing and retry worker execution are disabled by default, provider events are metadata-only/mock or provider-agnostic test paths, and no production scheduler or provider-specific webhook adapter is live.
- ZATCA remains local/mock/dry-run/scaffolded. Real sandbox HTTP execution, production CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, signed artifact promotion, immutable archive behavior, and production compliance are not implemented.
- Storage remains database-backed by default for generated documents and existing attachments. S3-compatible attachment storage is feature-flagged for new uploads, while generated-document S3 storage and DB-to-object-storage migration execution are not implemented.
- Backup and restore readiness is metadata/readiness planning plus prior local evidence only; backup execution, restore execution, hosted PITR proof, object-storage restore proof, and RPO/RTO approval remain outside the app.
- Redis/queue infrastructure is only a future direction in the current product state. No BullMQ or equivalent worker queue is active in the app runtime.
- Inventory FIFO is placeholder-only, moving-average estimates remain the active operational valuation path, and automatic COGS/receipt/variance posting is not broadly enabled.
- Bank statement raw-file archive policy is design-only; raw uploaded statement bodies are not persisted in the beta import path.
- Audit retention purge is dry-run/planning only; automatic purge/archive execution is not implemented.

## Broken Or Risky CRUD Flows

- No runtime QA was executed in this thread, so this list identifies risk areas from route, API, schema, test, and audit inspection rather than newly reproduced defects.
- Placeholder navigation can route users into "Module not implemented yet" pages; these should be removed, hidden, or converted into real modules before paid launch.
- Several implemented list pages still have limited filters, saved views, exports, and bulk actions; this is most visible in sales, purchases, payments/refunds, items, contacts, and manual journals.
- State-machine flows need full browser QA: invoice finalization/voiding, bill finalization/voiding, payment allocation/reversal, refunds, credit/debit note allocation, reconciliation submit/approve/close/void, inventory adjustment approve/void, receipt/issue voiding, and manual inventory accounting post/reverse actions.
- Auth/session state is browser `localStorage` based; org switching and token handling work for MVP but need session-hardening review before higher-trust beta or paid use.
- Attachments and generated documents are split between source-record upload panels and generated archive behavior; storage provider transitions and migration UX are risky until object-storage validation and migration execution exist.
- Bank statement import accepts multiple local file/text shapes, but target-bank coverage depends on sanitized real samples; no live feed, auto-match, transfer fee, or FX workflow should be assumed.
- Inventory receipt/bill matching, clearing variance, and manual COGS/receipt asset posting are intentionally controlled but complex; accountant review and browser QA are needed before widening automation.
- Role/team/audit/admin changes have backend guards and UI gating, but no broad maker-checker approval workflow or sensitive-action alerting.
- Reports and PDFs are useful operational outputs, but official VAT filing, accountant-approved statement/report wording, and PDF/A-3 compliance are not complete.

## Missing Tests And Verification Gaps

- No tests were run in this thread because the change is documentation-only.
- Full current route QA on the latest pushed state is still needed, including loading, empty, error, permission, responsive, and unhappy-path states.
- API smoke is deep, but browser E2E remains smoke-level and does not assert every accounting outcome through the UI.
- Full smoke, full E2E, and visual regression should be run only against an approved safe target with clear data/credential policy.
- Scheduled CI gates for typecheck, unit tests, build, smoke, visual regression, and deployed E2E are not fully established.
- Cross-tenant and restricted-role browser coverage is not exhaustive across all high-risk routes.
- Load/concurrency tests are missing for invoice finalization, payment allocation, refund/void, supplier payment allocation, bill voiding, reconciliation close, and inventory post/reverse actions.
- Bank parser coverage needs real sanitized target-bank samples and fixtures before any support claim.
- PDF tests should expand beyond endpoint validity into text/snapshot checks for key document types.
- Object-storage migration, generated-document storage, virus scanning, live email provider behavior, provider webhooks, real ZATCA, and hosted restore proof intentionally remain untested until separate approved phases.

## DEV-03 Status - State-Machine QA Planning

- DEV-03 state-machine QA planning and final triage are completed in [DEV_03_FINAL_STATE_MACHINE_QA_TRIAGE.md](DEV_03_FINAL_STATE_MACHINE_QA_TRIAGE.md).
- Runtime mutation QA was not executed: no login, fixture creation, state changes, exports/downloads/PDF/archive generation, smoke, E2E, ZATCA, email, backup/restore, production check, beta check, or customer-data check was performed.
- The next step requires explicit local disposable fixture, login/audit-write, fixture creation, cleanup/retention, output-gate, and no-production/no-beta approvals before any mutation QA can start.

## DEV-04 Status - Local Disposable Fixture Planning

- DEV-04 fixture planning started in [DEV_04_LOCAL_DISPOSABLE_FIXTURE_PLAN.md](DEV_04_LOCAL_DISPOSABLE_FIXTURE_PLAN.md).
- No fixture scripts were created, no login was run, no fixture data was created, and no mutation QA was executed.
- DEV-04 Part 2 should design the fixture script contract, dry-run mode, target guards, marker strategy, cleanup inventory, direct-Prisma bootstrap boundary, service/API fixture boundary, and approval gates before implementation.

## DEV-06 Status - AR Invoice Lifecycle State-Machine QA

- DEV-06 completed the local-only Sales/AR invoice lifecycle slice in [DEV_06_AR_STATE_MACHINE_FINAL_TRIAGE.md](DEV_06_AR_STATE_MACHINE_FINAL_TRIAGE.md).
- The slice used marker `DEV03-AR-20260524T130000` and fixture invoice `INVOICE-000001`; it covered draft create/edit, finalization, posted journal evidence, local ZATCA metadata upsert boundary, finalized void, reversal journal evidence, and read-only evidence verification.
- Final local fixture state: invoice `VOIDED`, total `287.5000`, balance due `0.0000`, original journal `REVERSED`, reversal journal `POSTED`, SalesInvoice audit actions through `SALES_INVOICE_VOIDED`, and forbidden output/payment/refund/credit-note/allocation/email/ZATCA signing/submission side effects at `0`.
- Remaining AR state-machine gaps are payment allocation/void/reversal, refunds, credit notes, output/PDF/archive, email, ZATCA XML/signing/submission, authenticated UI/API QA, cleanup policy, repeated/idempotency paths, allocation blockers, and fiscal-period locks.
- DEV-07 Part 1 completed [DEV_07_AR_PAYMENT_ALLOCATION_STATE_MACHINE_PLAN.md](DEV_07_AR_PAYMENT_ALLOCATION_STATE_MACHINE_PLAN.md) as planning/read-only work.
- DEV-07 fixture strategy: reuse the existing local DEV03-AR fixture organization/dependencies, but create a new DEV-07-specific finalized invoice fixture in a later approved part; do not use voided `INVOICE-000001` as the allocation happy-path target.
- DEV-07 Part 2 completed [DEV_07_AR_PAYMENT_ALLOCATION_FIXTURE_PLAN.md](DEV_07_AR_PAYMENT_ALLOCATION_FIXTURE_PLAN.md) as planning/read-only work. It chose one new finalized invoice under marker `DEV03-AR-20260524T130000`, planned total `1150.0000`, future payment `500.0000`, direct allocation `300.0000`, unapplied amount `200.0000`, same-invoice unapplied allocation `200.0000`, and final planned balance `650.0000`.
- DEV-07 is now closed for the local customer payment allocation/void evidence chain in [DEV_07_AR_STATE_MACHINE_CLOSURE.md](DEV_07_AR_STATE_MACHINE_CLOSURE.md). It proved the finalized payment-allocation invoice fixture, customer payment creation, direct allocation, unapplied amount application, unapplied allocation reversal, customer payment void/reversal, journal behavior, standardized audit behavior, and output/email/ZATCA non-effects.
- DEV-07 does not claim full AR completion. Remaining AR gaps include customer refunds, credit notes, output/PDF/archive, email, ZATCA XML/signing/submission, authenticated UI/API QA, repeated/idempotency paths, allocation blockers beyond this chain, fiscal-period locks, cleanup policy, and production/beta/customer-data behavior.
- DEV-08 is now closed for the core local AP bill/payment evidence chain in [DEV_08_AP_STATE_MACHINE_CLOSURE.md](DEV_08_AP_STATE_MACHINE_CLOSURE.md). It proved the fake supplier fixture, finalized direct-mode purchase bill, AP/VAT/expense purchase bill journal, supplier payment creation, direct bill allocation, unapplied amount application, unapplied allocation reversal, supplier payment void/reversal, purchase bill void/reversal after supplier payment void, journal behavior, audit behavior, and output/email/ZATCA non-effects.
- DEV-08B is now closed for the local AP purchase debit note and supplier refund-from-debit-note branch in [DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md](DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md). It proved debit-note fixture creation/finalization, debit-note apply-to-bill, debit-note allocation reversal, supplier refund creation from a debit note, supplier refund void/reversal, debit-note void/reversal, journal behavior, audit behavior, and output/email/ZATCA non-effects.
- DEV-08C is now closed for the local purchase order conversion/lifecycle branch in [DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md](DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md). It proved purchase order fixture creation, approval, mark-sent, convert-to-bill, converted bill finalization, close branch, void branch, journal behavior, audit behavior, and output/email/ZATCA non-effects.
- DEV-08D is now closed for the local supplier refund from supplier payment branch in [DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CLOSURE.md](DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CLOSURE.md). It proved source supplier payment fixture creation, supplier refund creation from a payment, source payment unapplied decrement/restoration, supplier payment void blocker while the refund was posted, supplier refund void/reversal, supplier payment void/reversal after blocker clearance, journal behavior, audit behavior, and source-scoped output/email/ZATCA non-effects.
- DEV-08E is now closed for the local cash expense lifecycle branch in [DEV_08E_CASH_EXPENSE_LIFECYCLE_CLOSURE.md](DEV_08E_CASH_EXPENSE_LIFECYCLE_CLOSURE.md). It proved cash expense create/post behavior, original journal behavior, cash expense void/reversal, reversal journal behavior, audit behavior, and output/email/ZATCA non-effects.
- DEV-08F is now closed for the local inventory-clearing purchase bill and linked purchase receipt branch in [DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_RECEIPT_CLOSURE.md](DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_RECEIPT_CLOSURE.md). It proved inventory-clearing bill fixture creation/finalization/void, linked purchase receipt creation/void, receipt placeholder stock movement, manual receipt asset posting, asset reversal, receipt void blocker behavior while asset posting was active, journal behavior, audit behavior, and source-scoped output/email/ZATCA non-effects.
- DEV-08 through DEV-08F do not claim full AP completion. Remaining AP gaps include purchase-order receipt matching, standalone receipt accounting, over/under receipt and variance handling, AP PDF/archive/output routes, AP email delivery, authenticated UI/API QA, repeated/idempotency paths, fiscal-period locks, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Recommended next local-only AP branch: `DEV-08G Part 1: purchase receipt and inventory integration hardening preflight`.

## Highest-Priority Development Tickets

1. `DEV-01 Full route QA and blocker triage`: inspect every implemented route against seeded non-production data, record exact defects, and fix only real loading, empty, error, permission, responsive, and unsafe-wording issues.
2. `DEV-02 Verification gate hardening`: wire current typecheck, tests, build, API smoke, visual regression, and safe E2E into a documented CI/local gate without touching production infrastructure.
3. `DEV-03 High-risk state-machine QA`: exercise and harden AR/AP, bank reconciliation, inventory approval, manual posting, and void/reversal flows at UI and API levels.
4. `DEV-04 Auth/session and admin-safety hardening`: plan and implement MVP-safe MFA/session invalidation/security-alert improvements without changing provider settings.
5. `DEV-05 Accountant review packet`: prepare dashboard KPI definitions, report layouts, VAT summary limitations, statement wording, COA template, and inventory policy questions for accountant review.
6. `DEV-06 Sales workflow completion`: add or explicitly defer recurring invoices, quotes/proformas, delivery notes, collections, and payment gateway boundaries.
7. `DEV-07 Purchase workflow hardening`: improve partial billing, multi-PO matching, purchase receipt/bill matching, remittance UX, OCR/import boundaries, and supplier statement review.
8. `DEV-08 Banking parser and reconciliation hardening`: collect sanitized target-bank samples, add fixtures/tests, improve approval queues, and keep live feeds/auto-match separate.
9. `DEV-09 Inventory accounting policy track`: design landed cost, FIFO, returns, serial/batch, in-transit/bin/location, and any automatic posting only after policy review.
10. `DEV-10 Product admin and SaaS readiness shell`: improve audit alerts, support/admin tools, tenant limits, billing-plan groundwork, and legal/support handoff docs before production implementation resumes.

## Finish Before Production Infrastructure Work Resumes

- Complete `DEV-01` and produce a route-by-route blocker list with fixes or explicit deferrals.
- Establish the verification gate from `DEV-02` so future development and infrastructure work cannot bypass product regression checks.
- Close or explicitly defer high-risk CRUD/state-machine defects found in AR/AP, banking, inventory, attachments, reports, roles, and settings.
- Produce an accountant/product review packet for dashboard KPIs, reports, VAT summary, statements, inventory valuation, COA, and posting policy.
- Keep all safety wording consistent: LedgerByte is controlled beta/internal review, Vercel is beta/user-testing/staging only, AWS is future direction, and paid SaaS v1 is not production-ready.
- Decide which incomplete user-facing modules are required for paid private beta versus explicitly deferred after launch.
- Preserve mock/no-send/no-network gates for real email, real ZATCA, live bank integrations, payment gateways, and production storage migrations until their own approved implementation tickets exist.

## Areas That Should Stay Mocked Or Blocked Until Later

- Real ZATCA CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, production credentials, production network calls, and production compliance claims.
- Real customer email sending by default, production retry scheduler, provider-specific webhook ingestion, sender-domain live validation, and alert delivery until provider gates are separately approved.
- Live bank feeds, external aggregation, automatic matching, payment gateway capture, transfer-fee automation, and FX handling until sanitized development and policy work is complete.
- Object-storage migration execution, generated-document object storage, virus scanning, backup/restore execution, and customer-data movement until non-production storage/restore evidence and approvals exist.
- Automatic inventory receipt/COGS/variance posting, FIFO, landed cost, and returns accounting until accountant-approved policy and tests exist.
- Billing/charge collection and customer lifecycle automation until product packaging, legal, support, and test-mode billing gates are approved.

## Recommended Next 10 Development Tickets

| Order | Ticket | Outcome |
| ---: | --- | --- |
| 1 | `DEV-01 Full route QA and blocker triage` | Route-by-route defect list and focused fixes for real UI/runtime issues only. |
| 2 | `DEV-02 Verification gate hardening` | Repeatable local/CI gate for typecheck, tests, build, smoke, visual, and safe E2E. |
| 3 | `DEV-03 High-risk state-machine QA` | Confidence in finalize, void, allocate, reverse, approve, close, and manual-post flows. |
| 4 | `DEV-04 Auth/session and admin-safety hardening` | MFA/session/security-alert plan and MVP implementation boundaries. |
| 5 | `DEV-05 Accountant review packet` | Reviewed questions and evidence for KPIs, reports, VAT, statements, COA, and inventory policy. |
| 6 | `DEV-06 Sales workflow completion` | Decision and implementation path for recurring invoices, quotes/proformas, delivery notes, and collections. |
| 7 | `DEV-07 Purchase workflow hardening` | Safer partial billing, purchase matching, remittance, OCR/import, and supplier review flows. |
| 8 | `DEV-08 Banking parser and reconciliation hardening` | Sanitized bank sample matrix, parser fixtures/tests, approval queue, and no-live-feed boundaries. |
| 9 | `DEV-09 Inventory accounting policy track` | Landed cost, FIFO, returns, serial/batch, and automatic posting policy gates. |
| 10 | `DEV-10 Product admin and SaaS readiness shell` | Audit alerts, support/admin tools, tenant limit groundwork, and paid-plan readiness docs. |

## Exact Next Recommended Development Ticket

`DEV-08G Part 1: purchase receipt and inventory integration hardening preflight`
