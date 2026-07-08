# LedgerByte Project Audit

Audit date: 2026-05-15

## 2026-07-02 - UAE provider sandbox harness audit update

- Added provider-neutral envelope skeletons and deterministic fake provider simulators for future UAE ASP onboarding tests.
- Added local sandbox onboarding, fake webhook delivery/replay/stale handling, provider capability negotiation, and provider error fixtures.
- This reduces future integration ambiguity but does not prove provider access, ASP connectivity, Peppol delivery, FTA reporting, UAE compliance, production hosting, storage, signed URLs, or legal compliance evidence.

Current commit audited: pending (`Add ZATCA SDK hash mode persistence groundwork`)

See also:

- `docs/PRODUCT_AUDIT_V2.md` for the current product maturity and go/no-go view.
- `docs/PRODUCT_READINESS_SCORECARD.md` for 0-100 readiness scores by product area.
- `docs/NEXT_30_PROMPTS_ROADMAP.md` for the prioritized next 30 implementation prompts.
- `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md` for the paid Saudi-first SaaS v1 production foundation plan.
- `docs/production/PAID_SAAS_V1_GAP_MATRIX.md` for the paid-v1 gap matrix.
- `docs/production/LAUNCH_GATE_CHECKLIST.md` for controlled beta, paid beta, public production, ZATCA, security, backup, monitoring, and billing/legal gates.
- `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md` for owned production implementation tickets.
- `docs/production/ARCHITECTURE_DECISION_RECORDS.md` for production ADR placeholders.
- `docs/production/NEXT_10_PRODUCTION_TICKETS.md` for the first risk-reducing production tickets.

## Summary

MONITORING-SUPPORT-EXECUTION-01 update: LedgerByte now has a local/read-only monitoring and support readiness diagnostic. The pass adds a deterministic source/docs scanner, generated evidence under `docs/operations/evidence/`, controlled-beta incident simulation templates, support response templates, and a controlled-beta support checklist. Current evidence is `MONITORING_SUPPORT_PARTIAL_READY` with 13 available signals, 5 partial signals, and 0 blocked signals. Production monitoring provider/log drain, provider-backed alerts, support SLA tooling, object-storage proof, signed-URL proof, and UAE ASP access remain blocked or partial. This does not perform hosted/Supabase/Vercel mutation, database connection, migration, provider call, email send, storage/signed-URL operation, ZATCA/UAE/Peppol/ASP behavior, payment action, or accounting/report/VAT/inventory/banking behavior changes.

SECURITY-EXECUTION-01 update: LedgerByte now has a read-only database/security diagnostics layer. The pass adds source-only scanners and generated evidence for Prisma tenant-scope classification, API route/service tenancy-risk classification, environment credential-name separation, and seed/demo/cleanup/deploy/migration/provider/compliance-capable script inventory. Current evidence reports 112 Prisma models with 0 risky unclassified models, 8 API files requiring review, 55 tenant-scope unique-constraint review items, and 32 dangerous script/package guardrail follow-ups. This does not perform hosted/Supabase/Vercel mutation, RLS enablement, runtime role cutover, Prisma schema change, migration, provider call, storage/signed-URL operation, compliance activation, or accounting/report/VAT/inventory/banking behavior changes.

PRE-ASP-PRODUCTION-FOUNDATION-01 update: LedgerByte now has a cohesive pre-ASP foundation layer in docs and local helpers. The pass adds the master tracker, database/security hardening plans, Supabase RLS/Data API strategy, backup/PITR/object-storage plans, monitoring/support runbooks, billing/legal drafts, and UAE pre-ASP adapter docs. It also adds a read-only diagnostics script for tenant-scope cataloging and secret env presence by name only, plus local-only UAE ASP helper primitives for idempotency, draft outbox shape, fake-secret webhook verification, replay guarding, and error normalization. This improves production-readiness preparation but does not perform production hosting, hosted/Supabase/Vercel mutation, real ASP access, Peppol/FTA submission, UAE compliance activation, billing, real email, storage operations, signed URL proof, or accounting/report/VAT/inventory/banking behavior changes.

CONTROLLED-BETA-PROVISION-01 provisioning packet preparation: LedgerByte now has a provisioning-ready packet for the first controlled beta cohort, including approved tester list template, invite and onboarding templates, dry-run checklist, environment check, blocked first-onboarding result, access/revocation plan, and support readiness. Approved tester identities were not provided, so account creation, invite delivery, email sending, and first real tester onboarding remain blocked. Non-mutating Vercel/Supabase test stack checks passed, including API readiness with database OK. No backend API, Prisma schema, hosted migration, Supabase mutation, Vercel env mutation, provider call, storage/signed-URL operation, payment/email action, seed/reset/delete, accounting/report/VAT/inventory valuation/banking/reconciliation logic change, or production compliance claim changed.

CONTROLLED-BETA-LAUNCH-01 launch packet preparation: LedgerByte now has a controlled beta launch packet for owner review. The packet defines who can test, what testers may and may not do, login/onboarding guidance, owner and accountant walkthrough scripts, feedback capture, issue severity and triage, support placeholders, access and revocation checklists, stop conditions, expansion gates, and go/no-go status. The decision remains `GO with restrictions` for controlled beta only. No real tester invite was sent, no production launch was performed, and no hosted/Supabase/Vercel/provider/storage/compliance mutation or production-readiness claim changed.

BETA-FIX-01 controlled beta evidence closure: `BETA-FIX-01` ran from merged `origin/main` at `bbd784e482c3e250ad75795570c8bcefebdbff82` on branch `codex/beta-fix-01`. The pass closed the remaining beta evidence blockers by completing all required visual shards with 1,077/1,077 passing Playwright visual tests and running a non-mutating live Vercel/Supabase walkthrough with 23/23 checks passing. API readiness returned database OK, login worked, seeded reconciliation history loaded, topbar/sidebar shell controls worked, and core route families loaded. This supports `GO with restrictions` for controlled beta only. No backend API, Prisma schema, hosted migration, Supabase mutation, Vercel env mutation, provider call, storage/signed-URL operation, payment/email action, seed/reset/delete, accounting/report/VAT/inventory valuation/banking/reconciliation logic change, or production compliance claim changed.

Redesigned frontend beta walkthrough evidence update: `BETA-WALKTHROUGH-01` ran from merged `origin/main` at `31e932920d7a488f50baffba3dd651e567b8654f` on branch `codex/beta-walkthrough-01`. The pass added local walkthrough results and an issue log, completed 23 Jest tests and 272 Playwright visual tests in returned commands, fixed a tablet overflow on bank reconciliation history, and refreshed the quote visual fixture. This remains local mocked QA evidence only. No live disposable demo-org/API walkthrough was run, and broad remaining visual suites timed out before usable output. No backend API, Prisma schema, hosted state, provider, storage, signed URL, accounting/report/VAT/inventory valuation/banking behavior, payment, email, deployment, seed/reset/delete, migration, or compliance production claim changed.

Frontend redesign stabilization evidence update: `UI-REBUILD-STABILIZE-01` ran from merged `origin/main` at `d12535cd2fc608797bc4664543cbbb1920379406` on branch `codex/ui-rebuild-stabilize-01`. The pass added route-load, visual QA, accessibility, responsive, truthfulness, permission/action, and beta-walkthrough evidence for the redesigned frontend. Confirmed code fixes were limited to app-shell tablet wrapping and audit-log responsive overflow, plus stale authenticated visual assertions. No backend API, Prisma schema, hosted state, provider, storage, signed URL, accounting/report/VAT/inventory valuation/banking behavior, email, deployment, or compliance production claim changed.

Frontend redesign full-stack merge update: PR #146 through PR #210 are merged into `main` at `cb34543d16389344ba45e69a2db277fce4c633ad`. The full route-family frontend redesign stack is now a mainline baseline rather than an open stacked queue. Final local verification passed through `verify:ci:local` and the OpenBooks clean-room guard; focused visual coverage was refreshed and a confirmed dashboard/mobile-shell overflow regression was fixed. This remains frontend, test-artifact, and documentation stabilization only: no backend APIs, Prisma schema, migrations, hosted state, providers, storage/signed URLs, accounting/report/VAT/inventory valuation/banking behavior, email, deployment, or compliance production claims changed.

Frontend redesign loop engineering update: LedgerByte now has a full route-family redesign checklist and the first post-merge loops have started on Sales, Purchase, Banking, Contacts, and Inventory list surfaces. `/sales/quotes`, `/sales/invoices`, `/purchases/bills`, `/purchases/debit-notes`, `/bank-accounts`, `/bank-transfers`, `/contacts`, and `/inventory/balances` list views use shared LedgerByte page, summary, table, date, money, badge, action, and empty-state primitives. This preserves existing permissions and product truth: quotes remain non-posting, invoice and purchase bill finalization remain explicit, debit notes remain supplier adjustments, banking remains manual-review/no-live-feed, contact readiness fields remain local profile data, inventory balances remain operational review only, and no backend, provider, storage, signed URL, compliance, hosted, payment, email, ledger math, report math, VAT math, inventory valuation, stock movement, COGS, seed/reset/delete, or shutdown behavior changed.

Frontend redesign continuation update: LedgerByte now has an expanded shared frontend system for route layout, tables, forms, route states, workflows, summary bands, review panels, and breadcrumbs. The settings root now renders a grouped administration overview, the generated-document archive uses shared page/filter/table/empty-state primitives, and the report-pack read-only preview uses shared preview/table/disabled-boundary primitives. This is frontend and documentation work only. It does not add backend behavior, hosted migrations, Supabase mutations, Vercel deployments, provider calls, banking execution, reconciliation execution, generated-document object storage, signed URL behavior, storage moves, ZATCA/UAE/Peppol/ASP behavior, tax-authority submission, seed/reset/delete behavior, or shutdown behavior. Remaining screen families still need follow-up redesign slices.

Report-pack generation/export/download/archive design update: LedgerByte now has a docs-only future design for report-pack request/run/item/artifact/delivery/event/schedule models, state machines, API shape, permissions, audit events, storage/download/archive blockers, failure/retry/idempotency, and implementation sequencing. This does not add runtime API endpoints, runtime UI behavior, Prisma migrations, report generation, PDF/CSV/XLSX generation, download/export behavior, email sending, scheduling, archive writes, generated-document mutation, object storage behavior, signed URLs, provider calls, compliance behavior, ZATCA/UAE/Peppol/ASP behavior, AI proposals, Inbox behavior, or hosted mutations. Object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented/unproven; runtime generated documents remain DB-backed unless separately changed; report-pack archive writes and download links remain blocked until storage approval and signed URL proof are separately approved.

Setup wizard typed onboarding API consumption update: LedgerByte now has a narrow setup wizard API consumption slice for typed onboarding profile/checklist state. The backend exposes organization-scoped onboarding profile/checklist controller endpoints over the existing service foundation, and the setup wizard typed onboarding preview can load saved profile/checklist state, save selected archetype changes through the API, and refresh checklist previews from API recompute results. This remains `PARTIAL`. It does not complete the full typed onboarding backend, add browser durable persistence, add unrelated Prisma migrations, run hosted/Supabase/Vercel/provider mutations, change generated-document object storage or signed URLs, change UAE/ZATCA/Peppol/ASP/provider behavior, implement Inbox/AI/deterministic pipeline/report packs/integration health/document review, or claim production compliance.

Typed onboarding API/service foundation update: LedgerByte now has a narrow local service foundation for typed onboarding profile/checklist persistence using the schema foundation from PR #99. The service covers explicit actor context permission checks, organization scoping, optional branch scoping, selected-archetype validation, checklist generation/recompute, complete/skip/reopen transitions, blocked-item fail-closed behavior, and onboarding checklist event records. This is still `PARTIAL`. It does not add public controller endpoints, setup wizard API consumption, setup wizard persistence, frontend/UI persistence, localStorage/sessionStorage/indexedDB/cookie/URL persistence, hosted migration, Supabase mutation, Vercel mutation, provider behavior, generated-document object storage, signed URLs, production compliance behavior, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, or document review.

Typed onboarding persistence schema foundation update: LedgerByte now has the first additive Prisma schema/migration foundation for future typed onboarding persistence. The schema groundwork covers onboarding profiles, generated checklist containers, checklist items, checklist events, template version metadata, profile/checklist/item states, organization scoping, optional branch scope, actor fields, indexes, and active-record uniqueness guards. This is `PARTIAL` only. It does not add public API behavior, setup wizard persistence, frontend persistence, localStorage/sessionStorage/indexedDB/cookie/URL persistence, hosted migration, Supabase mutation, tenant-isolated onboarding mutations, permission enforcement, recompute behavior, runtime audit-event writes, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, provider behavior, generated-document object storage, signed URLs, or production compliance behavior.

OpenBooks adoption post-merge baseline update: PR #89 through PR #95 are merged into `main` at `a8ebc9e6d039c52675135fa77bc1eb838c00a70d`. The main baseline now includes the clean-room validator plus the LedgerByte-native app route, setup/onboarding, setup progress, typed onboarding metadata, setup checklist preview consumption, and typed onboarding selector/default helper stack. This remains frontend/shared metadata and documentation work. It does not add full typed onboarding backend persistence, persistent setup checklist state, Prisma migrations, Inbox runtime, AI proposals, deterministic bookkeeping pipeline, report packs, integration health runtime, document review, provider behavior, generated-document object storage, signed URLs, hosted behavior, or production compliance behavior. Generated-document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production readiness remains blocked unless separately proven and approved.

Typed onboarding persistence design update: LedgerByte now has a design-only plan for future typed onboarding profile and setup checklist persistence. The design covers future-only domain model sketches, API sketches, item/profile state machines, template versioning, recompute rules, tenant scoping, permissions, audit events, Inbox interaction boundaries, and integration-health interaction boundaries. This does not add persistent typed onboarding, persistent setup checklist state, Prisma schema changes, migrations, API modules, controllers, services, setup wizard runtime behavior, UI persistence, database persistence, local storage, session storage, indexedDB, cookie, URL query, hosted persistence, provider behavior, generated-document object storage, signed URLs, or production compliance behavior.

Archetype-aware setup guidance copy update: the setup checklist preview now renders LedgerByte-native guidance copy for the selected typed onboarding archetype. The helper covers every archetype with active-now, planned-next, blocked-until-proven, warning, and compliance/storage/provider caution copy. The selected archetype remains ephemeral in React state only; no API, database, local storage, session storage, indexedDB, cookie, URL query, or hosted persistence was added. Planned and blocked guidance remains non-actionable. This does not add a typed onboarding backend, persistent setup checklist state, setup state machine, Prisma migrations, API runtime behavior, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, provider behavior, generated-document object storage, signed URLs, or production compliance behavior.

Typed onboarding profile selector defaults update: the frontend/shared helper layer now centralizes safe selector options, default selection, invalid-value fallback, selected-profile preview metadata, and active/planned/blocked summary counts for setup checklist previews. The setup preview consumes this helper while keeping selected archetype state ephemeral in React state only; no API, database, local storage, session storage, indexedDB, cookie, URL query, or hosted persistence was added. Planned and blocked template items remain non-actionable. This does not add a typed onboarding backend, persistent setup checklist state, setup state machine, Prisma migrations, API runtime behavior, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, provider behavior, generated-document object storage, signed URLs, or production compliance behavior.

Setup checklist template UI consumption update: the setup wizard now renders a LedgerByte-native archetype-aware setup checklist preview from typed onboarding metadata. Users can switch archetypes in client-side state only; no API, database, local storage, cookie, or hosted persistence was added. Active preview items link only through active setup/onboarding route helpers and the app route registry, while planned and blocked template items remain non-actionable. This does not add a typed onboarding backend, persistent setup checklist state, setup state machine, Prisma migrations, API runtime behavior, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, provider behavior, generated-document object storage, signed URLs, or production compliance behavior.

Typed onboarding profile metadata update: the frontend/shared helper layer now has LedgerByte-native typed onboarding archetype metadata and setup checklist template metadata. Active template items use route registry keys and setup/onboarding route helpers without duplicating hrefs. Planned and blocked template items remain non-actionable, including future typed onboarding state, generated-document object storage, signed URL delivery, and country/provider production-readiness capabilities. This does not add a typed onboarding backend, persistent setup checklist state, setup state machine, Prisma migrations, UI runtime behavior, API runtime behavior, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, provider behavior, generated-document object storage, signed URLs, or production compliance behavior.

Setup progress metadata refinement update: the frontend setup wizard/dashboard helpers now consume a LedgerByte-native setup progress metadata helper. Setup progress categories, titles, descriptions, statuses, route keys, hrefs, action labels, safe explanations, planned metadata, and unknown-item fallback are centralized while preserving existing setup labels, read-only checklist behavior, return-to links, and local-readiness wording. Planned typed-onboarding metadata remains non-actionable. This does not add a typed onboarding backend, persistent setup checklist state, setup state machine, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, provider behavior, generated-document object storage, signed URLs, or production compliance behavior.

Setup/onboarding route registry consumer update: the frontend setup wizard now has LedgerByte-native route helper consumption backed by the app route registry. Setup navigation, breadcrumbs, setup checklist route mapping, missing-route fallback, and dashboard completion destination are covered by focused tests, while existing setup labels and read-only checklist wording are preserved. This does not add a typed onboarding backend, persistent setup checklist state, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, provider behavior, generated-document object storage, signed URLs, or production compliance behavior.

LedgerByte app shell route registry update: the frontend now has a LedgerByte-native route registry for app-shell route keys, labels, hrefs, sections, descriptions, active/planned status, shell/mobile visibility, permissions, and compliance/storage/provider sensitivity tags. Sidebar and mobile first-workflow navigation consume registry-backed metadata while preserving existing labels and edition-aware compliance navigation. Planned Inbox, AI proposal review, deterministic bookkeeping pipeline, report pack, integration health, document review, evidence packs, and disposable test-business fixtures remain inactive future work. No backend/API module, Prisma migration, hosted behavior, provider adapter, generated-document object storage, signed URL behavior, or production compliance behavior changed.

OpenBooks adoption planning update: the clean-room adoption track is `PLANNED` only. No OpenBooks runtime behavior is implemented, no OpenBooks code is copied, and future exception Inbox, deterministic bookkeeping pipeline, AI proposal boundary, report pack, typed onboarding, integration health, document review, evidence packs, and disposable test-business fixtures must be LedgerByte-native work. Production compliance status is unchanged; generated document object storage approval remains `BLOCKED`; UAE/ZATCA production claims remain blocked unless separately proven.

LedgerByte is a TypeScript monorepo for a GCC/Saudi-oriented accounting SaaS. The current codebase has a working local MVP for core AR and AP transaction flows, dashboard KPI overview, document PDFs, report CSV/PDF exports, generated-document archive, uploaded supporting-file attachment groundwork with database-default storage and feature-flagged S3-compatible storage for new uploads, storage readiness and dry-run migration planning, backup/restore readiness and metadata-only evidence planning plus a local non-production Postgres restore drill, email invitation/password reset groundwork with mock-default delivery, opt-in SMTP adapter, provider readiness, safe disabled-by-default diagnostics/retry processing/retry worker shell, metadata-only sender-domain evidence capture, metadata-only delivery monitoring evidence, mock provider-event/bounce capture, test-send, and DB-backed rate limits, standardized audit logging with admin review UI, filtered CSV export, retention settings, dry-run retention preview, guarded number-sequence settings, operational inventory warehouse/stock-ledger/adjustment/transfer/receipt/issue/report controls, inventory accounting preview, clearing/matching groundwork, accountant-reviewed purchase bill clearing-mode finalization, explicit compatible purchase receipt asset posting, inventory clearing reconciliation/variance reporting, accountant-reviewed inventory variance proposal workflow, inventory accounting integrity audit, purchase receipt posting readiness audit, local API smoke coverage, browser E2E smoke coverage, and non-production ZATCA groundwork.

Current maturity level: `MVP_ACCOUNTING_FOUNDATION`. The Product Audit v2 now estimates local demo MVP readiness at 88%, private beta readiness at 66%, production SaaS readiness at 40%, Saudi/ZATCA production readiness at 36%, and Xero/Wafeq competitor readiness at 45%. The app can be demonstrated locally for dashboard KPI overview, sales invoices, customer payments, credit notes, customer refunds, purchase orders, purchase bills, purchase bill accounting previews, supplier payments, bank account profile balances/transactions, bank transfers, opening-balance posting, local bank statement import preview/reconciliation, reconciliation approval/close/lock review history, reconciliation reports, uploaded attachment upload/list/download/soft-delete on key source records, inventory warehouses, opening-balance movements, inventory adjustment approvals/voids, warehouse transfers/voids, purchase receipts/voids, sales stock issues/voids, inventory balances, inventory settings, inventory accounting settings, purchase receipt posting readiness, purchase receipt accounting previews, compatible receipt asset posting/reversal, bill/receipt matching visibility, inventory clearing reconciliation/variance reports, variance proposal create/submit/approve/post/reverse/void workflow, sales issue COGS previews/posting, stock valuation/movement/low-stock reports, ledgers, statements, core report exports, and PDFs. It is not production-ready as a SaaS and is not production ZATCA compliant.

Production posture update: the current Vercel deployment is beta/user-testing only, not final production hosting. LedgerByte is not production-launched. Paid Saudi-first SaaS v1 requires production foundation work across hosting, database security, backup/restore, object storage, monitoring, support, billing, legal, accountant review, and ZATCA specialist review. Real ZATCA production compliance remains disabled until CSID, signing, clearance/reporting, PDF/A-3, official SDK validation, key custody, audit evidence, and compliance sign-off are complete.

Production execution planning update: the roadmap has been converted into a ticket backlog, ADR index, and next-10 sequence under `docs/production/`. This is planning only; no hosting, runtime DB role, RLS, backup/restore, billing, real email, ZATCA, monitoring, or production infrastructure implementation was performed.

AP local evidence update: DEV-08 through DEV-08M are closed as local-only AP evidence, with the final evidence map and production-gap register captured under `docs/development/DEV_08Z_AP_LOCAL_EVIDENCE_MAP.md` and `docs/development/DEV_08Z_AP_PRODUCTION_GAP_REGISTER.md`. This strengthens local AP confidence, but it is not production, beta, customer-data, real-email, real-ZATCA, broad-E2E, or accountant/compliance evidence.

Banking local evidence update: DEV-09 is closed as local-only banking/reconciliation evidence, with closure captured under `docs/development/DEV_09_BANKING_RECONCILIATION_CLOSURE.md`. This strengthens local confidence in synthetic fixtures, parser/preview checks, match/categorize/ignore actions, and reconciliation close/void, but it is not production, beta, customer-data, live-feed, automatic-matching, certified-parser, broad-E2E, or accountant/compliance evidence.

Reports local evidence update: DEV-10 is closed as local-only reports and financial statements evidence, with closure captured under `docs/development/DEV_10_REPORTS_FINANCIAL_STATEMENTS_CLOSURE.md`. This strengthens local confidence in report fixtures, core report JSON, aging/VAT Return JSON, CSV/PDF/archive/download metadata, no-body handling, and selected permission gates, but it is not production, beta, customer-data, accountant-certified, official-VAT-filing, scheduled-delivery, report-pack, broad-E2E, or load/concurrency evidence.

Report-pack groundwork update: LedgerByte now has local manifest metadata records for accountant review packs, tenant-scoped create/list/detail/download-readiness endpoints, requestId-bearing audit events, and `/report-packs` status/export-availability UI. This is local groundwork only; pack-level downloads, bundled artifacts, email sending, scheduling, archive writes, generated-document mutation, object storage, signed URLs, provider calls, hosted behavior, customer-data proof, and compliance submissions remain unimplemented or blocked.

Inventory valuation and COGS local evidence update: DEV-11 is closed as local-only inventory valuation and COGS evidence, with closure captured under `docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md`. This strengthens local confidence in marker fixture math, manual COGS post/reverse, compatible receipt asset post/reverse, clearing variance proposal lifecycle, inventory valuation reports, clearing reports, GL, Trial Balance, P&L, Balance Sheet, dashboard totals, and no-body/no-secret checks, but it is not production, beta, customer-data, accountant-certified, FIFO/landed-cost, automatic-COGS, broad-E2E, hosted, or load/concurrency evidence.

Generated documents storage retention local evidence update: DEV-12 is closed as local-only generated documents storage retention evidence, with closure captured under `docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_CLOSURE.md`. This strengthens local confidence in marker-scoped generated-document metadata, DB-backed download hash/size behavior, storage readiness and migration dry-run counts, and retention/legal-hold gap visibility, but it is not production, beta, customer-data, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad-E2E/smoke/full-test, hosted, or load/concurrency evidence.

## Tech Stack

- Monorepo: pnpm workspaces.
- Backend: NestJS, Prisma, PostgreSQL, JWT auth, class-validator DTOs.
- Frontend: Next.js App Router, React, Tailwind CSS, typed API helpers.
- Shared packages: `accounting-core`, `pdf-core`, `zatca-core`, `shared`, `ui`.
- PDF: PDFKit through `packages/pdf-core`.
- ZATCA: local TypeScript scaffolding plus local official references, Java SDK readiness/local-validation wrapper checks, official sample fixture validation pass under Java 11, LedgerByte XML structural fixes against SDK output, API-generated XML validation, read-only SDK/app hash comparison, dry-run hash-chain reset planning, and explicit fresh-EGS SDK hash persistence.
- Local infra: Docker Compose for PostgreSQL, Redis, API, and web.

## Monorepo Structure

- `apps/api`: NestJS API, Prisma schema/migrations/seed, smoke script, backend tests.
- `apps/web`: Next.js app routes, forms, helpers, frontend tests.
- `packages/accounting-core`: decimal-safe journal and invoice calculation helpers.
- `packages/pdf-core`: PDF data contracts and renderers.
- `packages/zatca-core`: local-only XML/QR/hash/CSR/checklist helpers.
- `packages/shared`: shared tenant/API types.
- `packages/ui`: UI placeholder package.
- `docs`: project audit docs plus ZATCA implementation maps.
- `reference`: local ZATCA/FATOORA docs and Java SDK material; not used for real network calls.
- `infra`: local Docker Compose and setup notes.

## What Works End To End

- Register/login, organization selection, and role-aware `/auth/me` membership responses.
- Read-only dashboard summary and UI showing AR/AP, banking, inventory, report-health, compliance/admin counts, attention items, permission-gated quick actions, and a first-workflow prompt for setup, customer, invoice, payment, and report progress.
- Tenant-scoped role permissions with protected default Owner/Admin/Accountant/Sales/Purchases/Viewer roles.
- Role and organization member management UI/API with custom role creation, permission matrices, role/status changes, active-provider email invites, invite acceptance, password reset, email provider readiness/diagnostics/sender-domain evidence/retry plan/provider events/test-send, token request rate limits, expired-token cleanup, email outbox inspection, audit log review UI, filtered audit CSV export, retention dry-run controls, and guarded number-sequence settings.
- API permission guards for sensitive accounting, document, report, fiscal period, and ZATCA actions.
- Frontend sidebar, route access, and high-risk action visibility based on active role permissions.
- Tenant-scoped CRUD foundations for accounts, branches, contacts, tax rates, items, journals, and future document numbering settings.
- Bank account profiles for cash/bank asset accounts, posted transaction visibility, bank-aware payment/expense account labels, posted bank transfers, transfer voids, guarded one-time opening-balance journals, local manual CSV/JSON/text plus limited OFX/CAMT/MT940 statement upload or paste preview/validation, manual matching, categorization journals, ignores, reconciliation summaries, reconciliation submit/approve/reopen/close records, review events, close item snapshots, void history, closed-period statement/import locks, and visible banking/reconciliation drill-down guidance.
- Sales invoice draft/create/edit/finalize/void with AR journal posting.
- Customer payment posting with invoice allocation and balance updates.
- Unapplied customer payment application and reversal.
- Credit note creation/finalization/void, allocation to invoices, and allocation reversal.
- Manual customer refunds from unapplied customer payments or credit notes.
- Customer ledger and statement rows for AR events.
- Purchase bill draft/create/edit/finalize/void with AP journal posting.
- Purchase order draft/create/edit/delete, approve, mark sent, close, void, PDF/archive, and conversion to draft purchase bills without posting journals.
- Supplier payment posting, allocation to bills, bill balance updates, and void restoration.
- Supplier ledger and statement rows for AP events, with supplier-facing guidance for bill/payment/debit-note balance changes and AP report drill-downs.
- Inventory `MAIN` warehouse defaults, warehouse create/archive/reactivate, opening-balance stock movements, draft/approved/voided inventory adjustments, posted/voided warehouse transfers, posted/voided purchase receipts, posted/voided sales stock issues, source document receive/issue status helpers, purchase bill/order receipt matching status helpers, purchase bill direct-vs-clearing accounting previews/finalization, compatible purchase receipt asset previews/post/reverse journals, inventory clearing reconciliation/variance reports, accountant-reviewed variance proposals with explicit approved posting/reversal, derived item/warehouse balances, valuation settings, inventory accounting settings with inventory clearing mapping, purchase receipt posting readiness, sales issue COGS previews, explicit manual COGS post/reverse journals, operational stock reports, low-stock reporting, and explicit no-journal inventory movement behavior outside manual COGS/receipt asset/approved variance proposal post actions.
- Sales invoice, credit note, customer payment, customer refund, customer statement, supplier statement, purchase order, purchase bill, supplier payment, core report, and bank reconciliation PDFs.
- Core accounting report JSON/CSV/PDF outputs for General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, and Aged Payables.
- Generated document archive for generated PDFs, with closed DEV-12 local evidence for one synthetic DB-backed generated document, safe metadata list/detail/filter behavior, one approved local download metadata/hash check, storage readiness/migration dry-run counts, and retention/legal-hold cleanup gaps.
- Uploaded supporting-file attachment groundwork with database-default storage, metadata, tenant-scoped linked entity validation, reusable panels on key detail pages, storage readiness API, feature-flagged S3-compatible upload/download storage for new attachments, dry-run migration counts, and `/settings/storage`.
- Backup/restore readiness planning with `BackupRestoreEvidence`, read-only `/system/backup-readiness`, read-only `/system/restore-drill-plan`, metadata-only backup evidence create/verify/revoke, `/settings/storage` backup evidence controls, and a local non-production restore drill that verified schema/migration/row counts only. The app endpoints still run no backup, run no restore, export no customer data, and reject database/storage/provider secrets plus document/body payloads.
- Local-only ZATCA profile, EGS, CSR, mock CSID, XML/QR/hash, compliance checklist, reference maps, SDK wrapper readiness/dry-run/local-validation disabled path, official fixture registry/results documentation, no-mutation hash-chain comparison/reset planning, and fresh-EGS SDK hash mode persistence safeguards.
- Full `typecheck`, `test`, `build`, and API smoke workflow is run for each release checkpoint; browser E2E smoke now exists for local user-facing route checks.

## Groundwork Or Scaffold Only

- Email invitation, invited-user onboarding, and password reset exist with mock/local default delivery, an opt-in SMTP adapter, redacted provider readiness, disabled-by-default diagnostics/retry processing/retry worker shell, durable retry metadata, metadata-only SPF/DKIM/DMARC evidence, metadata-only monitoring evidence, mock-only provider event capture, signed-webhook readiness, suppression list, test-send, DB-backed rate limits, and expired-token cleanup; no production scheduler, provider-specific signed webhooks, live DNS/provider validation, executed relay validation, MFA, or advanced session management exists.
- Bank feeds, external bank APIs, automatic matching, certified bank-specific OFX/CAMT/MT940 parser coverage, raw statement-file archive implementation, transfer fees, and multi-currency FX transfers are not implemented. DEV-09 local evidence closes only the synthetic fixture/parser/transaction-action/reconciliation lifecycle scope.
- Purchase receiving exists as a manual operational workflow; DEV-08 local evidence proves selected receipt, void, asset posting/reversal, and blocker paths, but linked PO-to-bill receipt reconciliation, partial billing, supplier delivery documents, landed cost, valuation variance booking, purchase returns, and automatic inventory receipt are not production-complete.
- Dashboard and reports have useful MVP visibility and DEV-10 local evidence for marker-scoped report math/output gates, but dashboard KPI definitions, accountant-certified report definitions, official VAT filing, report packs, advanced branch/multi-period/consolidation behavior, scheduling, email delivery, broad E2E/smoke/full-test coverage, hosted/beta/customer-data proof, and load/concurrency remain missing.
- Inventory warehouse, stock ledger, adjustment approval, warehouse transfer controls, manual purchase receiving, manual sales stock issue, valuation settings, purchase bill clearing-mode finalization, compatible manual purchase receipt asset posting, inventory clearing preview/matching/reconciliation groundwork, accountant-reviewed variance proposal workflow, purchase receipt posting readiness audit, inventory accounting integrity audit, manual COGS posting, and operational reports exist, but automatic COGS, automatic/direct-mode receipt asset posting, automatic variance posting, automatic receipts/issues, landed cost, serial/batch tracking, and accounting-grade inventory financial reports are not implemented.
- PDF rendering is operational only, not legal/template-complete.
- Generated document storage and existing uploaded attachment content still default to database base64; new uploaded attachments can use S3-compatible storage only when explicitly configured, and no migration executor is active. DEV-12 does not prove production readiness, beta readiness, customer-data behavior, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.
- Backup/restore planning is metadata-only and one local non-production Postgres restore drill has been executed outside app automation; hosted Supabase/Postgres backup, point-in-time recovery, and object-storage backup policy remain unverified.
- ZATCA is local/mock/scaffold only. Local SDK validation groundwork exists behind a disabled-by-default flag; official SDK sample fixtures now pass under Java 11, LedgerByte standard XML fixture now passes SDK global validation, simplified XML fixture passes XSD/EN/PIH, API-generated standard XML validates locally with warnings, and hash-chain reset planning is dry-run only. SDK hash persistence has been validated end-to-end on a fresh explicitly enabled EGS: two generated invoices matched direct SDK `-generateHash`, invoice 2 PIH equaled invoice 1's SDK hash, repeat generation was idempotent, and invoice-specific SDK `pihPath` handling resolved the prior invoice 2 `KSA-13` local validation failure. Buyer building-number warnings, signing, Phase 2 QR, real CSID, clearance, reporting, and PDF/A-3 do not exist.
- Redis is present in local infra but workers/queues are not wired.
- Production deployment, external monitoring, hosted backups, subscription billing, provider-specific signed email webhook operations, production retry scheduler, WhatsApp, generated-document object storage, attachment migration operations, full Supabase RLS policies, and least-privilege runtime DB role separation are not implemented.

## Top 10 Risks

1. ZATCA is not production compliant; LedgerByte simplified XML still fails signing/QR/certificate checks, API-generated XML still has buyer building-number warnings, and real onboarding, signing, and API submission are missing. Fresh-EGS SDK hash persistence and PIH-chain validation now work locally, including the prior invoice 2 `KSA-13` case.
2. Invite/onboarding/password reset default to mock/local delivery with provider readiness, disabled-by-default diagnostics/retry processing/retry worker shell, sender-domain evidence, monitoring evidence, mock provider-event capture, signed-webhook readiness, suppression metadata, test-send, opt-in SMTP, and DB-backed request rate limits; executed relay validation, MFA, production scheduler, provider-specific signed webhooks, and advanced session management are still missing.
3. No broad approval workflow, dual control, or maker-checker policy exists for high-risk accounting actions outside the new bank reconciliation approval path.
4. Bank reconciliation has local manual CSV/JSON/text plus limited OFX/CAMT/MT940 import preview, row validation, manual matching, categorization, approval, close/lock, report export groundwork, basic linked attachments, and a design-only raw statement-file archive policy, but there is no live feed, automatic matching, certified bank-specific parser coverage, raw statement-file archive implementation, or external bank integration.
5. Inventory warehouses, adjustment controls, transfers, manual receipts/issues, valuation settings, purchase bill clearing-mode finalization, compatible manual receipt asset posting, inventory clearing preview/matching/reconciliation groundwork, variance proposal workflow, purchase receipt posting readiness audit, integrity audit, manual COGS posting, DEV-08 local AP/receipt evidence, and closed DEV-11 local inventory valuation/COGS evidence exist, but FIFO/cost layers, landed cost, automatic COGS, automatic/direct-mode receipt asset posting, automatic variance posting, negative-stock production policy, purchase returns, sales returns inventory impact, serial/batch/bin/location, historical direct-mode migration, multi-currency inventory, accountant certification, hosted/beta/customer-data proof, broad E2E/smoke/full-test coverage, and load/concurrency proof are still missing.
6. Generated PDFs and existing uploaded attachments remain database/base64 by default; DEV-12 proved only local marker metadata/download hash and count-only readiness/dry-run behavior. New uploaded attachments can use the feature-flagged S3-compatible adapter, but no migration executor, generated-document S3 path, signed URLs, legal hold, virus scanning, backup/restore proof, or lifecycle policy is active.
7. Production secrets/key custody and database exposure are not fully hardened; ZATCA private key storage is explicitly dev-only, full Supabase RLS policies are not implemented, and least-privilege runtime DB role separation is still pending.
8. Dashboard, browser E2E, and API smoke improve visibility, but dashboard KPIs are still MVP definitions and there is no visual regression coverage yet.
9. Supplier AP drill-down wording is now supplier-specific, but accountant review of AP report terminology, statements, and exported layouts is still needed.
10. Audit logs cover high-risk events, admin review, filtered CSV export, retention dry-run controls, backup/restore evidence events, and number-sequence update events, but scheduled export, automatic purge, immutable external storage, alerting, anomaly detection, and tamper evidence are not implemented.

## Top 10 Next Priorities

1. Run a human QA pass through the dashboard, sales, purchase, payment, refund, and PDF routes, then wire typecheck/test/build/API smoke into CI and decide when the manual deployed E2E workflow should become scheduled.
2. Add provider-specific webhook adapters, external monitoring/alert delivery, production email retry scheduler, live DKIM/SPF/domain-authentication checks, MFA planning, scheduled audit export, audit alerting for role/member changes, and a reviewed number-sequence reset/skip workflow.
3. Convert DEV-10 reporting gaps into accountant review for report definitions/layouts, official VAT filing scope, scheduled/email report delivery, report packs, advanced branch/multi-period/consolidation checks, generated-document storage policy, restricted-role matrix, and E2E/load tickets.
4. Add fiscal year close, retained earnings close, and controlled unlock/approval workflows.
5. Convert the DEV-08Z AP production-gap register into scoped purchase matching, PO-to-bill receipt reconciliation, valuation variance, landed cost, purchase returns, and AP email-provider tickets.
6. Harden bank reconciliation with real sanitized target-bank variants, broader OFX/CAMT/MT940 parser coverage, optional raw-file archive implementation under the approved policy, transfer fees, and multi-currency FX handling.
7. Convert DEV-11 inventory valuation and COGS gaps into FIFO/cost-layer, landed-cost, automatic-posting, returns, accountant-review, generated-document retention, hosted-proof, E2E, and load/concurrency tickets before any production inventory accounting claim.
8. Add proper buyer building-number/address data for generated ZATCA XML, then advance signing/certificate, Phase 2 QR, CSID, clearance/reporting, and PDF/A-3.
9. Test the uploaded-attachment S3 adapter with a real non-production bucket, then implement the migration executor, generated-document S3 path, signed URL policy, lifecycle/legal-hold model, backup/restore proof, malware scanning plan, versioning/supersede policy, and large-PDF load/concurrency checks.
10. Create and validate a least-privilege Prisma runtime DB role, then verify hosted Supabase backup/PITR and object-storage backup/restore in non-production before production deployment.

## New Issues Found During Audit

- Supplier AP balances currently display through the shared `formatLedgerBalance` helper that labels positive balances as `Dr`. The underlying supplier ledger math is documented as credit-minus-debit, but the UI should later use supplier-specific payable labels to avoid confusing accountants.
- Prisma still warns that `package.json#prisma` seed configuration is deprecated and should move to Prisma config before Prisma 7.
- Windows PowerShell requires quoting paths containing `(app)` when running git or shell commands against frontend App Router paths.

## 2026-05-21 Supabase Data API/RLS hardening

- Audited the user-testing Supabase exposure model against official Supabase RLS, Data API, API key, role, and Storage access-control guidance.
- Confirmed the browser path uses the Nest API and found no direct Supabase REST, GraphQL, Realtime, or Storage client path in the web app.
- Metadata review found 76 public tables with RLS disabled and broad `anon`/`authenticated` table grants before mitigation.
- Revoked `anon` and `authenticated` public table, sequence, and function grants in user-testing, including `postgres`-owned future default grants for those roles. No data was reset, no migration or seed was run, and broad RLS was not enabled.
- API/web health stayed HTTP `200`, readiness stayed `ok`, and `smoke:accounting:reports` passed with secret-store credentials after the grant mitigation.
- Remaining blockers: Data API Dashboard toggle was not available through the current tools, full RLS policy design is not implemented, and a least-privilege Prisma runtime DB role still needs a dedicated validation pass.
- Follow-up runtime-role pass: planned `ledgerbyte_app_runtime_user_testing` with no admin/RLS-bypass privileges, public app-table DML only, no `_prisma_migrations` DML, and separate `DIRECT_URL` migration/admin credentials. It was not created because the current session lacked a safe way to update the Vercel API `DATABASE_URL`, store the generated password, redeploy, and validate without printing secrets.
- Recommended next prompt: enable a safe Vercel env mutation path, then create and validate the least-privilege Prisma runtime DB role in user-testing while keeping migration/direct credentials separate.

## 2026-05-21 Guided first-workflow UX

- Added a guided first accounting workflow across setup, dashboard, contacts, first invoice, first payment, and reports without changing accounting behavior.
- The onboarding checklist now includes real-data steps for first customer payment and first reportable posted activity.
- The dashboard empty state and onboarding card point to the next incomplete action instead of only showing generic operational emptiness.
- New-customer, new-invoice, payment, and reports pages now explain the first-use path with links to the relevant next screen.
- Security hardening remains parked until a safe Vercel env mutation path is available; no RLS, runtime role, Vercel env, seed, migration, smoke, or E2E action was part of this product pass.

## 2026-05-21 Banking and reconciliation UX polish

- Bank account, transfer, statement import, statement transaction, reconciliation summary, reconciliation history, and reconciliation detail pages now include visible guidance, readable statement import status labels, next-action links, and mobile-safe action layouts.
- Bank account pages explain ledger balance movement, debit/credit/running balance columns, imported statement rows, manual matching, and closed-period lock implications.
- Bank transfer detail explains source/destination movement, posted-transfer success, void/reversal meaning, bank-ledger navigation, account navigation, and dashboard next steps.
- Statement import and matching copy explicitly says LedgerByte does not use live bank feeds or external banking APIs in the current manual import path.
- Browser QA covered the banking/reconciliation path at 1366, 820, and 390 widths with mocked API responses and no document overflow, console/page errors, request failures, or unknown mocked API calls.
- No banking posting behavior, reconciliation matching logic, report math, ledger math, ZATCA/email/security behavior, migrations, seed/reset/delete, full smoke, or full E2E changed.

## 2026-05-21 Inventory drill-down UX polish

- Item, warehouse, purchase receipt, sales stock issue, inventory adjustment, warehouse transfer, stock movement, balance, inventory report, low-stock, and reports landing pages now include visible workflow guidance, empty states, next-action links, and responsive action layouts.
- Receipt and issue detail pages now explain posted/voided stock effects, linked movement IDs, receipt asset/COGS manual posting boundaries, and report/dashboard navigation without changing inventory posting behavior.
- Adjustment and transfer detail pages now explain draft/approval, source/destination movement, void/reversal rows, and stock ledger links without changing movement math.
- Inventory movement, balance, stock valuation, and low-stock reports now include plain-language guidance for quantity in/out, opening/closing quantity, moving-average operational valuation, reorder alerts, and export/drill-down navigation.
- Browser QA covered 14 inventory/report routes at 1366, 820, and 390 widths with mocked API responses and no document overflow, console/page errors, request failures, or unknown mocked API calls.
- No inventory posting logic, stock movement calculations, valuation behavior, COGS behavior, warehouse transfer behavior, journal behavior, report calculations, ZATCA/email/security behavior, migrations, seed/reset/delete, full smoke, or full E2E changed.

## 2026-05-21 Manual bank statement import groundwork

- Statement import pages now accept manual CSV/JSON/text file upload or paste, run a browser parser preview, and show row counts, detected columns, invalid row counts, duplicate-candidate counts, and import result next actions.
- The API parser now supports debit/credit columns, signed amount columns, transaction/posted date aliases, memo/details aliases, balance, counterparty, currency, and bank reference aliases through the existing preview/import endpoints.
- Existing storage behavior is preserved: `BankStatementImport` stores import metadata and `BankStatementTransaction` stores parsed rows/raw row metadata, while raw uploaded file bodies are not stored by this pass.
- No live bank feed, external bank API, automatic matching, reconciliation matching logic, bank ledger math, journal posting behavior, report calculations, migrations, seed/reset/delete, full smoke, or full E2E changed.

## 2026-05-22 Bank statement format parser groundwork

- Added sanitized sample OFX, CAMT XML, and MT940 fixtures using clearly fake account/reference values and no real bank account numbers, customer/vendor names, or live banking credentials.
- The manual statement import parser now detects CSV, JSON, OFX, CAMT XML, MT940, and unknown text, with safe unsupported-format errors that do not echo raw file content.
- Limited parser support normalizes common OFX transaction blocks, CAMT entry amounts/directions/remittance text, and MT940 `:61:`/`:86:` statement lines into the existing statement preview/import row shape.
- Import metadata now stores the detected manual source type when rows are imported, using the existing string `BankStatementImport.sourceType`; no schema migration was needed.
- No live bank feed, external bank API, automatic matching, reconciliation matching logic, bank ledger math, journal posting behavior, report calculations, migrations, seed/reset/delete, full smoke, or full E2E changed.

## 2026-05-22 Bank parser variant hardening and raw-file policy

- Added additional sanitized parser fixtures for OFX XML-style transactions with missing `FITID`, CAMT.054 notifications with `DtTm` and transaction-reference fallbacks, and MT940 multiline `:86:` narratives.
- Parser hardening remains small and visible: missing OFX `FITID` now produces a duplicate-check warning, CAMT entries without `CdtDbtInd` no longer infer direction, CAMT date-time/reference fallbacks are handled, and MT940 comma-decimal/multiline narratives are normalized.
- The statement import UI now warns that OFX/CAMT/MT940 support is limited for bank-specific variants and that raw bank file bodies are not archived in beta.
- Added `docs/banking/RAW_STATEMENT_FILE_ARCHIVE_POLICY.md` as a design-only policy recommending no raw bank file body storage during beta and object-storage-based archiving only after retention, encryption, audit, access-control, deletion, malware scanning, and rollback controls are approved.
- No live bank feed, external bank API, automatic matching, reconciliation matching logic, bank ledger math, journal posting behavior, report calculations, migrations, seed/reset/delete, full smoke, or full E2E changed.

## 2026-05-22 Bank parser compatibility matrix and sample kit

- Added `docs/banking/BANK_STATEMENT_COMPATIBILITY_MATRIX.md` to track target-bank sample intake and parser status without certifying bank-specific support.
- Added `docs/banking/SANITIZED_BANK_SAMPLE_COLLECTION_GUIDE.md` with safe export, sanitization, fake replacement, and no-raw-file-commit instructions.
- Added `docs/banking/BANK_PARSER_VALIDATION_CHECKLIST.md` for consistent parser validation across detection, rows, dates, amounts, direction, references, descriptions, balances, duplicate keys, warnings, persistence, and UI preview behavior.
- Added `apps/api/src/bank-statements/fixtures/README.md` so future fixtures follow fake-data naming and test rules.
- No parser behavior, live bank feed, external bank API, automatic matching, reconciliation matching logic, bank ledger math, journal posting behavior, report calculations, migrations, seed/reset/delete, full smoke, or full E2E changed.

## 2026-05-21 Document and PDF UX polish

- Generated document UX was polished across invoice, customer payment receipt, credit note, purchase bill, supplier payment receipt, debit note, contact statement, generated archive, document settings, and number sequence screens.
- Added shared document guidance that explains source-record PDF downloads are archived, archived downloads are non-posting retrievals, and document settings affect future generated PDFs only.
- Detail pages now use clearer PDF action labels, expose archive/settings/numbering links near document actions, and keep conservative compliance wording visible.
- `/documents` now has readable source/status labels, a clearer archived-PDF download action, richer empty state, and guidance that archived retrievals do not post entries or send data outside LedgerByte.
- `/settings/documents` now explains titles, colors, display toggles, and templates in plain language; templates remain presentation-density choices only.
- Supplier statement PDF export/archive parity is now available from the supplier statement tab. It reuses existing supplier statement rows and preserves AP balance math.
- No PDF renderer totals, tax math, accounting posting behavior, ZATCA signing/submission, PDF/A-3, CSID, clearance/reporting, migration, seed/reset/delete, full smoke, or full E2E changed.

## 2026-05-21 Document download beta QA follow-up

- Restored the local DPAPI-backed beta credential store and ran authenticated API-level document download/archive QA against deployed commit `ff01b2b` without printing passwords, tokens, auth headers, request/response bodies, PDF bodies, document numbers, or customer/vendor names.
- Verified deployed beta health and real-account records for invoice, customer payment receipt, credit note, purchase bill, supplier payment receipt, purchase debit note, customer statement, supplier statement, and generated archive download checks.
- Every available document download returned HTTP `200`, `application/pdf`, a safe attachment filename ending in `.pdf`, nonzero byte length, and `%PDF` magic bytes.
- Archive rows were created for invoice, customer payment receipt, credit note, purchase bill, supplier payment receipt, purchase debit note, and customer statement downloads. A follow-up non-destructive enum migration added the dedicated supplier statement document type for archive parity.
- User-testing deployment `da45544` applied the `SUPPLIER_STATEMENT` enum migration and targeted supplier statement archive QA passed: supplier statement PDF download returned `200` `application/pdf`, created exactly one archive row, and archived download returned a valid PDF response.
- Authenticated browser UI width checks remain pending because the deployed browser session was unauthenticated, login automation could not safely fill the email/password controls, and JavaScript URL token injection was rejected by browser security policy.

## 2026-05-21 Statement PDF readability review

- Customer and supplier statement PDFs now use customer/supplier-specific titles, period labels, opening/closing balance labels, activity headings, balance-column labels, and empty-state wording.
- Statement PDF copy now explains the AR/AP direction of movement without changing row selection or balances: invoices increase customer balances, purchase bills increase supplier payables, and payments/credits/debit notes reduce or adjust balances.
- Contact statement tabs now use clearer customer/supplier download labels, period guidance, archive links, and AR/AP-specific helper copy.
- Supplier statement archive parity remains unchanged through `SUPPLIER_STATEMENT`; this pass did not change archive creation, source IDs, document IDs, or the enum migration.
- Remaining risk: accountant review is still recommended for final statement wording and presentation before production use.

## 2026-05-22 Beta feedback triage intake

- Added `docs/beta-testing/BETA_FEEDBACK_TRIAGE_SUMMARY.md` to record the first sanitized beta/accountant feedback intake result.
- Reviewed local beta testing docs, accountant review docs, GitHub issue templates, repository feedback/finding references, and the public GitHub issues endpoint for `Noone9029/Accounting-App`.
- No completed sanitized beta reports, accountant review findings, redacted screenshots, redacted videos, or GitHub issues were available to triage.
- No blocker/high findings were available, so no UX, route, document, report wording, accounting, ZATCA, security, schema, or deployment changes were made.
- Remaining risk: real beta/accountant findings still need to be submitted through the feedback templates before product fixes can be safely batched.

## 2026-05-22 Beta access dry run

- Used the local DPAPI-backed user-testing credential store to run an authenticated API-level dry run against `https://ledgerbyte-api-test.vercel.app` without printing passwords, tokens, auth headers, request/response bodies, customer/vendor data, invite tokens, or document bodies.
- Confirmed the deployed beta email provider before inviting: provider `mock`, mock mode true, and real sending disabled.
- Invited one safe dummy `.example.test` tester with `Viewer`; the invite created a mock outbox record with status `SENT_MOCK`, so no real external email was sent.
- Verified the dummy member appeared in Team Members, changed the role to `Sales` and back to `Viewer`, suspended access, reactivated it, and suspended it again. Final state was `SUSPENDED` with role `Viewer`.
- Confirmed no `Owner` or `Admin` role was assigned to the dummy tester.
- No real customer data, production invoice, live bank feed, real ZATCA action, auth architecture change, permission logic change, Supabase RLS, runtime role, Vercel env, migration, seed/reset/delete, full smoke, or full E2E action was used.

## Audit Verification Commands

- `corepack pnpm add -D @playwright/test -w`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm e2e --list`: passed and discovered 12 Playwright smoke specs, including the validated demo workflow data spec.
- `corepack pnpm build`: passed.

## 2026-05-19 E2E workflow data pass

- Added local-only workflow seeding through `corepack pnpm demo:seed-workflows`; it creates/reuses demo customer, supplier, AR/AP documents, payments, posted cash expense, opening stock, and a harmless attachment placeholder through validated API endpoints.
- Playwright global setup seeds those records automatically when `LEDGERBYTE_API_URL` is local, and remote runs skip by default unless explicitly enabled for disposable non-production targets.
- `corepack pnpm e2e` passed 12 specs against local Postgres, API, and web.

## 2026-05-18 Email readiness diagnostics

- Added production SMTP readiness fields to `GET /email/readiness`: provider configured, from/reply-to configured, SMTP host/port/secure mode/credentials booleans, `productionReady`, blockers, warnings, diagnostics gate state, and redaction guarantees.
- Added `POST /email/diagnostics` as a no-mutation diagnostic endpoint. It is disabled by default and returns `SKIPPED_DISABLED`, `executionAttempted=false`, `noEmailSent=true`, and `noCustomerEmailSent=true`.
- Diagnostics execution requires `LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED=true` plus an allowlisted test recipient from `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS` or `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_DOMAINS`; delivery summaries mask recipients and redact provider details.
- `/settings/email-outbox` now surfaces production readiness, diagnostics disabled-by-default status, invite/password-reset reliability warnings, and no-customer-email messaging.
- Redaction guarantee: responses do not return raw SMTP host, username, password, API key, token, connection URL, authorization header, or provider secret values.
- Recommended next prompt: run a non-production SMTP relay diagnostic and record provider evidence without sending customer emails.
- `corepack pnpm --filter @ledgerbyte/web test`: passed.
- Full browser E2E run was skipped because local API/web were not listening on `localhost:4000` and `localhost:3000`.

## 2026-05-19 Email sender-domain readiness

- Added `EmailSenderDomainEvidence` and `/email/sender-domain-evidence` list/create/verify/revoke endpoints for tenant-scoped metadata-only SPF/DKIM/DMARC/MX/return-path/provider verification evidence.
- Added `GET /email/diagnostics-plan` and expanded `GET /email/readiness` with sender-domain status, missing/verified evidence types, relay diagnostics status, and explicit bounce/retry/monitoring blockers.
- `/settings/email-outbox` now shows sender-domain evidence state and safe create/verify/revoke controls. These controls do not send customer email or create outbox records.
- Redaction guarantee now explicitly rejects SMTP passwords, API keys, tokens, authorization headers, connection URLs, provider secrets, private DKIM keys, and customer email content in evidence payloads.
- Remaining gap: real non-production relay execution, live DNS/provider validation, retry queue, provider webhooks, bounces, and monitoring.

## 2026-05-19 Email retry and bounce readiness

- Added durable `EmailOutbox` retry metadata and a read-only `/email/retry-plan` for pending, retryable, blocked, and due counts.
- Added disabled-by-default `/email/retry-process` behind `LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED=false`; default responses skip without sending email or mutating data, and enabled runs update existing outbox retry metadata only.
- Added `EmailProviderEvent`, `/email/provider-events/plan`, and unsigned `/email/provider-events/mock` for metadata-only delivery/bounce/complaint evidence. Mock events reject secrets, raw payloads, customer recipients, and customer message bodies.
- `/settings/email-outbox` now shows retry processor state, pending/blocked counts, mock-only provider event readiness, bounce signature state, and monitoring blockers.
- Added provider-agnostic signed webhook verification planning, disabled-by-default `/email/provider-events/webhook`, and metadata-only `EmailSuppression` list/create/revoke handling. Suppressions store masked/hash email metadata only and block matched send/retry attempts.
- Remaining gap: provider-specific production webhook adapter, scheduled retry worker, monitoring/alert thresholds, real relay execution, and live DNS/provider validation.
- Recommended next prompt: add a scheduled transactional email worker and monitoring dashboard evidence for retry throughput, bounce/complaint thresholds, and suppression trends while real customer sends remain disabled by default.

## 2026-05-19 Email worker monitoring readiness

- Added read-only `/email/retry-worker/plan` and disabled-by-default `/email/retry-worker/run`; default worker runs send no email, mutate nothing, and return skipped while `LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED=false`.
- Added `EmailDeliveryMonitoringEvidence`, `/email/monitoring-plan`, and monitoring evidence list/create/verify/revoke endpoints for retry throughput, bounce/complaint alert thresholds, suppression trends, delivery dashboards, and provider webhook health.
- `/settings/email-outbox` now shows retry worker state, monitoring evidence status, bounce/complaint threshold blockers, suppression trend status, webhook health monitoring, and metadata-only monitoring evidence controls.
- Remaining gap: provider-specific production webhook adapter, production retry scheduler, external monitoring/alert delivery, real relay execution, and live DNS/provider validation.
- Recommended next prompt: add provider-specific production webhook adapters and an external monitoring integration runbook for email delivery alerts while keeping real customer sends disabled by default.

## 2026-05-19 Backup restore readiness

- Added metadata-only `BackupRestoreEvidence` plus `/system/backup-readiness`, `/system/restore-drill-plan`, and backup evidence list/create/verify/revoke endpoints.
- The system readiness endpoints are read-only/no-mutation, execute no backup, execute no restore, export no customer data, and keep `productionReady=false` until required evidence is reviewed.
- Evidence capture rejects database URLs, Supabase service role keys, storage credentials, connection strings, SMTP/API/provider secrets, auth headers, private keys, signed XML/QR bodies, customer document contents, and attachment contents.
- `/settings/storage` now shows database/object/document backup readiness, restore-drill planning, missing evidence, and metadata-only evidence controls with no backup/restore execution controls.
- Remaining gap: hosted Supabase/Postgres backup/PITR validation, object-storage backup validation, RPO/RTO business review, monitoring, and incident runbooks.
- Recommended next prompt: verify hosted Supabase backup/PITR and S3-compatible object-storage backup/restore in a real non-production project, then capture sanitized evidence without exposing secrets or customer content.

## 2026-05-19 Non-production restore drill evidence

- Executed a local Docker Postgres restore drill with seeded non-production data only; no production database, Supabase project, service role key, storage credential, customer document payload, attachment payload, signed XML body, or QR payload body was used or exposed.
- The temporary restored database matched the source for 76 tables, 55 migrations, 11 organizations, 77 users, 186 attachments, 820 generated documents, and 3121 journal entries, then the temporary database and dump were removed.
- Created verified metadata-only evidence for `DATABASE_BACKUP`, `MIGRATION_HISTORY`, `RESTORE_DRILL`, `RESTORE_VERIFICATION`, `GENERATED_DOCUMENT_BACKUP`, and `ATTACHMENT_BACKUP`.
- Created draft blocked `OBJECT_STORAGE_BACKUP` evidence because the local environment has no S3-compatible object-storage backup/provider export configured.
- `GET /system/backup-readiness` remains `productionReady=false` until `POINT_IN_TIME_RECOVERY`, `OBJECT_STORAGE_BACKUP`, and `RPO_RTO_REVIEW` evidence are verified.
- Recommended next prompt: verify hosted Supabase backup/PITR and S3-compatible object-storage backup/restore in a real non-production project, then capture sanitized evidence without exposing secrets or customer content.

## 2026-05-16 ZATCA buyer address field support

This section supersedes older notes that described `BR-KSA-63` as unresolved because buyer building number was not captured.

Official references inspected for this change:

- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

Confirmed address rules and mapping:

- `BR-KSA-63` is a warning for standard invoice buyer Saudi addresses when `cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cac:Country/cbc:IdentificationCode` is `SA` and the standard invoice transaction flag is present.
- The official Schematron requires buyer `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:PostalZone`, `cbc:CityName`, `cbc:CitySubdivisionName`, and `cac:Country/cbc:IdentificationCode` in that Saudi standard-buyer case.
- The Schematron requires the Saudi buyer building number to be present for `BR-KSA-63`; seller building number rule `BR-KSA-37` separately validates seller building number as 4 digits.
- Buyer postal code `BR-KSA-67` expects a 5-digit Saudi postal code when buyer country is `SA`.
- Official standard invoice, standard credit note, and standard debit note samples include buyer postal address fields in this order: `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:CitySubdivisionName`, `cbc:CityName`, `cbc:PostalZone`, `cac:Country/cbc:IdentificationCode`.
- Official simplified invoice samples inspected omit buyer postal address, so buyer address is not treated as mandatory for simplified invoices by this change.
- `Contact.addressLine1` maps to buyer `cbc:StreetName`.
- `Contact.addressLine2` maps to buyer `cbc:AdditionalStreetName` when present; it is no longer used as district.
- `Contact.buildingNumber` maps to buyer `cbc:BuildingNumber`.
- `Contact.district` maps to buyer `cbc:CitySubdivisionName`.
- `Contact.city` maps to buyer `cbc:CityName`.
- `Contact.postalCode` maps to buyer `cbc:PostalZone`.
- `Contact.countryCode` maps to buyer `cac:Country/cbc:IdentificationCode`.
- Buyer province/state `BT-54` is present in the data dictionary but optional for the inspected rules and samples, so no `countrySubentity` contact field was added in this pass.

Implemented scope:

- Added nullable `Contact.buildingNumber` and `Contact.district` fields through Prisma migration `20260516170000_add_contact_zatca_buyer_address_fields`.
- Updated contact create/update DTO validation and API persistence so existing contacts remain valid.
- Added contact UI fields in the address section with ZATCA buyer-address helper text.
- Updated generated ZATCA XML to emit real buyer building number and district data without fake defaults.
- Added local readiness warnings for missing Saudi standard buyer address fields, including missing building number, while preserving XML generation behavior.
- Updated smoke and fresh-EGS demo data with explicit Saudi buyer address values: street, unit/additional street, 4-digit building number, district, city, 5-digit postal code, and country `SA`.

Validation result after this change:

- `corepack pnpm db:generate`: PASS after stopping the stale local API process that locked Prisma's query engine DLL.
- `corepack pnpm db:migrate`: PASS, nullable contact address migration applied locally.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/contacts/contact.service.spec.ts src/zatca/zatca-rules.spec.ts src/zatca-core.spec.ts`: PASS, 3 suites and 45 tests.
- `corepack pnpm --filter @ledgerbyte/zatca-core test`: PASS, 24 tests.
- `node --check scripts/validate-zatca-sdk-hash-mode.cjs`, `node --check scripts/debug-zatca-pih-chain.cjs`, `node --check scripts/validate-generated-zatca-invoice.cjs`: PASS.
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm smoke:accounting`: PASS.
- `corepack pnpm zatca:debug-pih-chain`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, PIH chain stable, hash compare MATCH/noMutation for both invoices.
- `corepack pnpm zatca:validate-sdk-hash-mode`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, hash compare MATCH/noMutation for both invoices.
- `BR-KSA-63` is cleared for the fresh-EGS generated standard-invoice path when the buyer contact has real `buildingNumber` and `district` data.
- No new buyer-address SDK warnings were introduced in the fresh-EGS validation run.

Validation environment note:

- The repository path contains a space. The official Windows `fatoora.bat` launcher is sensitive to that path shape, so validation used a temporary no-space copy of the official SDK `Apps` folder under `E:\Work\Temp\ledgerbyte-zatca-sdk-nospace` plus a temporary SDK `config.json` pointing back to the official `reference/` `Data`, `Rules`, certificate, and PIH files. This was local-only and did not alter production configuration.

Remaining limitations:

- No invoice signing is implemented.
- No CSID request flow was run.
- No clearance or reporting network call was enabled or submitted.
- No production credentials were used.
- No PDF/A-3 embedding is implemented.
- This is not a production compliance claim; it is customer/contact address support and generated XML cleanup only.

## 2026-05-16 ZATCA seller/buyer readiness checks

- Added local-only ZATCA readiness checks for seller profile invoice XML data, buyer contact invoice XML data, invoice generation state, EGS/hash-chain state, and generated XML availability.
- Official sources inspected: `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`, standard credit/debit note samples, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`, `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`.
- Rules confirmed: seller invoice XML address checks use `BR-KSA-09`, seller building number format uses `BR-KSA-37`, seller postal code format uses `BR-KSA-66`, seller VAT checks use `BR-KSA-39` and `BR-KSA-40`, standard Saudi buyer postal-address readiness uses `BR-KSA-63`, Saudi buyer postal code format uses `BR-KSA-67`, buyer name standard-invoice warning uses `BR-KSA-42`, and buyer VAT format when present uses `BR-KSA-44`.
- Standard vs simplified behavior: standard-like tax invoices with Saudi buyers require buyer street, building number, district, city, postal code, and country code for clean XML readiness. Simplified invoices do not block on missing buyer postal address when official samples/rules do not require it.
- API changes: `GET /zatca/readiness` now returns detailed readiness sections while preserving legacy local readiness fields. `GET /sales-invoices/:id/zatca/readiness` returns read-only invoice readiness with `localOnly: true`, `noMutation: true`, and `productionCompliance: false`.
- UI changes: the ZATCA settings page shows section readiness cards, the contact detail page shows buyer address readiness for customer contacts, and the sales invoice detail page shows seller/buyer/invoice/EGS/XML readiness near ZATCA actions.
- Safety boundary: readiness checks do not sign XML, request CSIDs, call ZATCA, submit clearance/reporting, generate PDF/A-3, or claim production compliance.
- Recommended next step: improve admin workflows for correcting readiness issues in-place, then rerun local fresh-EGS SDK validation only when XML output changes.

## 2026-05-16 ZATCA signing readiness groundwork

- Added local-only signing readiness and Phase 2 QR readiness planning. This does not sign XML, request CSIDs, use production credentials, submit to ZATCA, clear/report invoices, generate PDF/A-3, or claim production compliance.
- Official sources inspected: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates, `EInvoice_Data_Dictionary.xlsx`, XML implementation PDF, security features PDF, official signed standard/simplified invoice samples, standard credit/debit note samples, Schematron rules, and UBL/XAdES/XMLDSig XSD files under `reference/`.
- Design doc added: `docs/zatca/SIGNING_AND_PHASE_2_QR_PLAN.md`.
- Readiness changes: settings and invoice readiness now expose `signing`, `phase2Qr`, and `pdfA3` sections. These are production blockers, while local unsigned XML generation remains available and explicitly local-only.
- API change: `GET /sales-invoices/:id/zatca/signing-plan` returns a dry-run SDK `fatoora -sign -invoice <filename> -signedInvoice <filename>` command plan with `localOnly: true`, `dryRun: true`, `noMutation: true`, and `productionCompliance: false`.
- Safety behavior: the signing plan never returns private key content, never executes signing by default, never mutates ICV/PIH/hash/EGS metadata, and includes blockers for missing certificate lifecycle, private key custody, compliance CSID, production CSID, Phase 2 QR cryptographic tags, and PDF/A-3.
- Phase 2 QR status: current QR remains basic local groundwork. QR tags that depend on XML hash, ECDSA signature, public key, and simplified-invoice certificate signature remain blocked until signing/certificate work is implemented safely.
- Recommended next step: implement an explicitly disabled local dummy-material SDK signing experiment in a temp directory only after approving its safety envelope, or proceed directly to key-custody/KMS design.

## ZATCA key custody and CSR onboarding planning (2026-05-16)

- Added local-only CSR/key-custody planning based on the repo-local official SDK readme, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates/examples under `Data/Input`, compliance CSID/onboarding/renewal PDFs, XML/security implementation PDFs, data dictionary, signed samples, Schematron rules, and UBL/XAdES/XMLDSig XSDs.
- Added `GET /zatca/egs-units/:id/csr-plan` as a dry-run, no-mutation, no-network endpoint. It returns official CSR config keys, available values, missing values, planned temp file names, blockers, warnings, and redacted certificate/key state. It never returns private key PEM, CSID secrets, binary security tokens, OTPs, or production credentials.
- Extended ZATCA readiness with `KEY_CUSTODY` and `CSR` sections: raw database PEM is flagged as non-production custody risk, missing compliance/production CSIDs remain blockers, certificate expiry is unknown, renewal/rotation workflows are missing, and KMS/HSM-style production custody is recommended.
- Updated ZATCA settings UI to show key custody, CSR readiness, compliance CSID, production CSID, renewal status, and certificate expiry visibility. No real Request CSID, signing, clearance/reporting, PDF/A-3, or production-compliance action was enabled.
- Schema changes: none. Existing raw private-key storage is only detected and flagged; this phase intentionally avoids adding production secret storage fields.
- Remaining limitations: no invoice signing, no CSID requests, no production credentials, no real ZATCA network calls, no clearance/reporting, no PDF/A-3, and no production compliance claim.

## 2026-05-16 - ZATCA CSR dry-run workflow

- Official CSR references inspected: reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf; reference/zatca-docs/compliance_csid.pdf; reference/zatca-docs/EInvoice_Data_Dictionary.xlsx; reference/zatca-docs/onboarding.pdf; reference/zatca-docs/renewal.pdf.
- Added local/non-production CSR dry-run scaffolding via `POST /zatca/egs-units/:id/csr-dry-run` and `corepack pnpm zatca:csr-dry-run`.
- Dry-run behavior is sanitized and no-mutation: no CSID request, no ZATCA network call, no invoice signing, no clearance/reporting, no PDF/A-3, no production credentials, and `productionCompliance: false`.
- Temp planning uses OS temp files only when explicitly requested; missing official CSR fields block config preparation instead of using fake values.
- `ZATCA_SDK_CSR_EXECUTION_ENABLED` defaults to `false`; SDK CSR execution remains skipped in this safe phase and only the command plan is returned.
- Redaction guarantee: private key PEM, certificate bodies, CSID/token content, OTPs, and generated CSR bodies are not returned or logged by the dry-run response/script.

## 2026-05-16 Update: ZATCA CSR onboarding field capture

- Official sources inspected: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/Input/csr-config-template.properties`, `Data/Input/csr-config-example-EN.properties`, `Data/Input/csr-config-example-EN-VAT-group.properties`, `reference/zatca-docs/compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`, `20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `EInvoice_Data_Dictionary.xlsx`.
- Official CSR config keys modeled from SDK templates/examples: `csr.common.name`, `csr.serial.number`, `csr.organization.identifier`, `csr.organization.unit.name`, `csr.organization.name`, `csr.country.name`, `csr.invoice.type`, `csr.location.address`, and `csr.industry.business.category`.
- Field ownership: VAT/organization identifier, legal name, country code, and business category remain seller/ZATCA profile data; CSR common name, structured serial number, organization unit name, invoice type capability flags, and location address are captured as non-secret EGS onboarding metadata because the official examples are EGS/unit-specific and LedgerByte must not infer them.
- Schema change: nullable non-secret fields were added on `ZatcaEgsUnit`: `csrCommonName`, `csrSerialNumber`, `csrOrganizationUnitName`, `csrInvoiceType`, and `csrLocationAddress`. No private key, certificate, token, OTP, or CSID secret fields were added.
- API change: `PATCH /zatca/egs-units/:id/csr-fields` captures only those non-secret fields, requires `zatca.manage`, rejects production EGS units, trims values, blocks newlines/control characters/equals signs, and currently accepts only the official SDK example invoice type value `1100` until broader official values are modeled.
- CSR plan/dry-run behavior: `GET /zatca/egs-units/:id/csr-plan`, `POST /zatca/egs-units/:id/csr-dry-run`, and `corepack pnpm zatca:csr-dry-run` now use captured fields. Missing required CSR fields still block temp config preparation; captured fields become `AVAILABLE`; review-only fallbacks remain visible where values are not explicitly captured.
- UI change: ZATCA settings now includes a compact non-production EGS CSR field editor with local-only helper text: no CSID request, no ZATCA call, and no secrets.
- Safety guarantees: field capture does not generate CSR files, execute the SDK, request CSIDs, call ZATCA, sign invoices, mutate ICV/PIH/hash-chain fields, enable clearance/reporting, implement PDF/A-3, or claim production compliance. Responses and audit payloads remain redacted from private key/cert/token/OTP/CSR body content.
- Remaining limitations: signing, compliance CSID request, production CSID request, production credentials, clearance/reporting, PDF/A-3, real ZATCA network calls, SDK CSR execution, and production compliance remain intentionally out of scope.
- Recommended next step: add a controlled non-production CSR file-preparation review screen that previews sanitized SDK config output and keeps SDK execution disabled until an explicit onboarding phase approves it.

## 2026-05-16 - ZATCA CSR config preview

- Official sources inspected for this slice: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, Data/Input/csr-config-template.properties, Data/Input/csr-config-example-EN.properties, Data/Input/csr-config-example-EN-VAT-group.properties, compliance_csid.pdf, onboarding.pdf, renewal.pdf, the ZATCA XML and security implementation PDFs, and EInvoice_Data_Dictionary.xlsx under reference/.
- The SDK CSR template/examples use plain single-line key=value entries in this order: csr.common.name, csr.serial.number, csr.organization.identifier, csr.organization.unit.name, csr.organization.name, csr.country.name, csr.invoice.type, csr.location.address, csr.industry.business.category.
- Added a local-only sanitized CSR config preview for non-production EGS units at GET /zatca/egs-units/:id/csr-config-preview. It returns localOnly, dryRun, noMutation, noCsidRequest, noNetwork, productionCompliance false, canPrepareConfig, stable configEntries, missing/review fields, blockers, warnings, and sanitizedConfigPreview.
- The preview includes only captured/profile non-secret CSR values. It does not include private keys, certificate bodies, CSID tokens/secrets, portal one-time codes, generated CSR bodies, production credentials, invoice signatures, clearance/reporting payloads, or PDF/A-3 output.
- The preview does not write files, execute the SDK, request CSIDs, call ZATCA, mutate EGS ICV, mutate EGS lastInvoiceHash, or create submission logs. Production EGS units are rejected for this preview.
- The existing CSR dry-run now reuses the sanitized config formatter before writing temporary CSR config files, while SDK CSR execution remains intentionally skipped and disabled by default.
- ZATCA settings now shows a per-non-production-EGS CSR config preview card with readiness, missing/review fields, sanitized key=value text, and no CSID/no network/no secrets/no SDK execution disclaimers.
- Remaining limitations are unchanged: no SDK CSR execution, no compliance CSID request, no production CSID request, no invoice signing, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: add an operator review/approval record for sanitized CSR config previews before any future controlled local SDK CSR generation phase.

## ZATCA CSR config review workflow update (2026-05-16)

Official references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only operator review tracking for sanitized non-production CSR config previews:
- Added `ZatcaCsrConfigReview` records with `DRAFT`, `APPROVED`, `SUPERSEDED`, and `REVOKED` status.
- Stored only sanitized `key=value` CSR config preview text, official key order, config hash, missing/review/blocker metadata, operator approval fields, and audit-friendly notes.
- Added endpoints to create/list reviews and approve/revoke review records.
- New reviews supersede previous active reviews for the same EGS unit so only the latest preview review remains active.
- Approval is blocked when the current preview has missing fields, blockers, or a changed config hash.
- `POST /zatca/egs-units/:id/csr-dry-run` now reports `configReviewRequired`, `latestReviewId`, `latestReviewStatus`, and `configApprovedForDryRun` for future controlled SDK CSR planning.
- The ZATCA settings UI shows review status, config hash, approval metadata, and create/approve/revoke actions next to the sanitized CSR config preview.
- Audit logs capture create/approve/revoke actions without private keys, certificate bodies, CSID tokens, one-time portal codes, generated CSR bodies, or production credentials.

Safety boundary remains unchanged:
- No SDK CSR execution is implemented.
- No compliance CSID or production CSID request is made.
- No invoice signing, clearance/reporting, PDF/A-3, real ZATCA network call, production credentials, or production compliance claim is enabled.

Recommended next step:
- Add an explicitly gated, temp-directory-only local CSR file preparation review gate that requires an approved review hash before any future non-production SDK CSR execution experiment.

## 2026-05-16 - ZATCA CSR local generation gate

Official local references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only behavior:
- Added a disabled-by-default CSR local generation gate at `POST /zatca/egs-units/:id/csr-local-generate` and `corepack pnpm zatca:csr-local-generate`.
- The gate requires `ZATCA_SDK_CSR_EXECUTION_ENABLED=true`, a non-production EGS unit, an `APPROVED` CSR config review, a current preview hash matching the approved review, no missing CSR fields, and no preview blockers.
- When the flag is false, no SDK process runs, no temp private key is generated, no CSR is generated, and the response reports `executionEnabled=false`, `executionAttempted=false`, and `executionSkipped=true`.
- When the flag is true and all prerequisites pass, the app writes only a temp CSR config file, runs the official SDK CSR command plan with temp private-key and generated-CSR paths, summarizes sanitized stdout/stderr, and deletes the temp directory by default.
- Responses, logs, reviews, smoke output, and UI do not expose private key PEM, generated CSR body, certificate bodies, CSID token material, OTP values, or production credentials.
- The gate does not request compliance CSIDs, does not request production CSIDs, does not call ZATCA network endpoints, does not sign invoices, does not perform clearance/reporting, does not implement PDF/A-3, and keeps `productionCompliance=false`.

UI and validation notes:
- ZATCA settings now shows that local SDK CSR generation requires an approved review and the disabled-by-default env gate.
- Default smoke calls the local generation endpoint with the default disabled flag and verifies no SDK execution, no secret content, no EGS ICV/hash mutation, and no submission-log creation.
- Normal tests mock SDK execution and do not require Java or the official SDK.

Recommended next step:
- Add a controlled non-production operator flow to intentionally enable the CSR gate in a local sandbox session, run the SDK CSR command once with temp files, and manually inspect only sanitized metadata before any future CSID onboarding design.

## 2026-05-16 - Local ZATCA signing dry-run and Phase 2 QR gate

- Official sources inspected: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, official simplified/standard invoice samples, official standard credit/debit samples, SDK certificate/private-key fixture paths, BR-KSA Schematron rules, UBL XAdES/XMLDSig schemas, XML implementation standard PDF, security features implementation standard PDF, and EInvoice_Data_Dictionary.xlsx.
- Added local-only signing dry-run groundwork through `POST /sales-invoices/:id/zatca/local-signing-dry-run` and `corepack pnpm zatca:local-signing-dry-run`.
- `ZATCA_SDK_SIGNING_EXECUTION_ENABLED` defaults to `false`. With the default setting, no SDK signing execution, no QR generation, no temp private-key usage, no signed XML output, no CSID request, no ZATCA network call, and no persistence occurs.
- If explicitly enabled for local/non-production work, the planned path writes unsigned XML to temporary files, attempts the official SDK `-sign` command, plans/runs the SDK `-qr` step only after a signed XML is detected, sanitizes stdout/stderr, and cleans temporary files by default.
- Redaction guarantees: responses and logs must not include private key PEM, certificate bodies, CSID tokens, OTPs, full signed XML bodies, generated CSR bodies, or QR payload bodies.
- Phase 2 QR status: blocked until signed XML, certificate, hash, and signature artifacts are available. The current UI/API exposes the dependency chain instead of fabricating cryptographic QR tags.
- Production limitations remain: no compliance CSID request, no production CSID request, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: run a controlled non-production SDK signing experiment only after approved CSR/test certificate material exists and the operator explicitly enables the local execution gate.

## 2026-05-16 - Controlled local ZATCA signing experiment

Scope: local SDK signing/Phase 2 QR experiment only. No CSID request, no ZATCA network call, no clearance/reporting, no PDF-A3, no production credentials, no signed XML persistence, and no production-compliance claim.

Official sources inspected:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx

Confirmed from official references:
- The SDK documents local `fatoora -sign -invoice <file> -signedInvoice <file>` and `fatoora -qr -invoice <file>` commands.
- Simplified invoices require the cryptographic stamp/UBL signature structures and Phase 2 QR path; BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60 remain expected until valid signing material and QR generation are in place.
- The official samples contain the required signature IDs `urn:oasis:names:specification:ubl:signature:1`, `urn:oasis:names:specification:ubl:signature:Invoice`, and signature method `urn:oasis:names:specification:ubl:dsig:enveloped:xades`.
- The bundled SDK certificate/private key files are treated as SDK dummy/test material only and must not be used as production credentials.

Implementation updates:
- Hardened `POST /sales-invoices/:id/zatca/local-signing-dry-run` so `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` still requires a generated XML, invoice metadata, active EGS, writable temp directory, Java SDK readiness, SDK launcher/config readiness, explicit SDK dummy certificate/private key availability, no production credentials, no network-like command plan, and no persistence.
- Rewrites SDK config into a temp directory for any future local signing attempt so official config keys point at repo-local SDK paths and dummy test material without returning certificate/private-key content.
- Response now distinguishes `executionStatus`, `signingExecuted`, `qrExecuted`, dummy material readiness, temp SDK config writing, signed XML detection, QR detection, SDK exit codes, sanitized stdout/stderr, blockers, warnings, and cleanup.
- UI now surfaces local signing execution status plus whether SDK signing or QR commands actually executed.
- Default smoke remains safe with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false` and verifies execution is skipped.

Controlled local experiment result:
- Experiment invoice: `INV-000163` / `faa19714-abdd-4732-a012-283b5d4ff8c6`, generated locally as `SIMPLIFIED_TAX_INVOICE` with ICV 33 for this test.
- Command: `corepack pnpm zatca:local-signing-dry-run -- --invoice-id faa19714-abdd-4732-a012-283b5d4ff8c6` with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` set only for that command.
- Java observed: OpenJDK 17.0.16.
- SDK path: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.
- Result: `executionEnabled=true`, `executionAttempted=false`, `executionSkipped=true`, `executionStatus=SKIPPED`.
- Blocker: detected Java 17.0.16 is outside the SDK-supported range `>=11 <15`.
- SDK exit code: not applicable because execution was correctly blocked before SDK invocation.
- `signedXmlDetected=false`; `qrDetected=false`; `sdkExitCode=null`; `qrSdkExitCode=null`.
- Temp files written: unsigned XML false, SDK config false, signed XML false.
- Cleanup: no temp files required; cleanup reported success.
- Optional local validation of signed temp XML was skipped because no signed XML was produced.

Security and redaction guarantees:
- No private key PEM, certificate body, CSID token, OTP, generated CSR body, signed XML body, or QR payload body is returned or stored.
- No invoice metadata is marked signed.
- No signed XML or QR is persisted to the database.
- The dry-run path does not request CSIDs, does not call ZATCA, and does not submit invoices.
- The path remains a local engineering experiment and does not prove production compliance.

Remaining blockers and next step:
- Install/use an officially supported Java runtime for the SDK experiment, preferably Java 11, then rerun the gated local experiment with SDK dummy/test material only.
- Even if local dummy signing succeeds later, production signing remains blocked until proper compliance/production CSID onboarding, key custody, certificate handling, clearance/reporting design, and production validation are implemented.

## 2026-05-16 - Java 11 controlled ZATCA SDK signing experiment

Scope: local-only SDK signing and QR experiment with SDK dummy/test material. No CSID request, no ZATCA network call, no invoice submission, no clearance/reporting, no PDF-A3, no production credentials, no signed XML persistence, and no production-compliance claim.

Official sources inspected:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx

Confirmed official behavior:
- The SDK readme requires Java versions `>=11` and `<15`.
- The documented local signing command is `fatoora -sign -invoice <filename> -signedInvoice <filename>`.
- The documented QR command is `fatoora -qr -invoice <filename>`.
- SDK bundled `cert.pem` and `ec-secp256k1-priv-key.pem` are dummy/testing material only and are not production credentials.
- Simplified invoices require the signature/cryptographic stamp structure and QR flow; official rules include BR-KSA-27, BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60.
- The official simplified sample includes `ext:UBLExtensions`, `sac:SignatureInformation`, signature ID `urn:oasis:names:specification:ubl:signature:1`, referenced signature/signature ID `urn:oasis:names:specification:ubl:signature:Invoice`, signature method `urn:oasis:names:specification:ubl:dsig:enveloped:xades`, and a `QR` additional document reference.

Java runtime configuration:
- Default Java remains OpenJDK `17.0.16` from `C:\Users\Ahmad\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin\java.exe`.
- Supported local Java used for the experiment: `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe`.
- Java 11 version output: OpenJDK `11.0.26` Microsoft build `11.0.26+4-LTS`.
- No global Java change was made; the command used `ZATCA_SDK_JAVA_BIN` only for the local experiment process.

Wrapper hardening added:
- The official Windows `fatoora.bat` expands `FATOORA_HOME` without quotes, so the repo path `E:\Accounting App` broke the launcher under Java 11.
- The local signing wrapper now stages the SDK launcher, JAR, `jq`, and `global.json` into the existing no-space temp directory before execution.
- The temp SDK config is still rewritten only in temp storage and points at SDK dummy/test certificate/private-key material.
- `tempFilesWritten.sdkRuntime` reports whether the temporary SDK runtime staging occurred.
- The sales invoice ZATCA panel displays whether the temp SDK runtime was staged.
- `corepack pnpm zatca:local-signing-dry-run -- --help` now documents `ZATCA_SDK_JAVA_BIN`.

Controlled signing/QR experiment result:
- Invoice: `INV-000163` / `faa19714-abdd-4732-a012-283b5d4ff8c6`.
- Invoice type: `SIMPLIFIED_TAX_INVOICE`.
- Local ICV: `33` from the previously generated unsigned XML.
- Command: `corepack pnpm zatca:local-signing-dry-run -- --invoice-id faa19714-abdd-4732-a012-283b5d4ff8c6` with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` and `ZATCA_SDK_JAVA_BIN` set to Java 11 for that command only.
- Result: `executionEnabled=true`, `executionAttempted=true`, `executionSkipped=false`, `executionStatus=SUCCEEDED_LOCALLY`.
- `signingExecuted=true`; `qrExecuted=true`.
- `sdkExitCode=0`; `qrSdkExitCode=0`.
- `signedXmlDetected=true`; `qrDetected=true`.
- `tempFilesWritten`: unsigned XML true, SDK config true, SDK runtime true, signed XML true, files retained false.
- Cleanup: performed true, success true, temp files removed by default.
- Sanitized SDK output: signing reported `InvoiceSigningService - invoice has been signed successfully`; QR reported `QrGenerationService - Qr has been generated successfully`; QR payload body was redacted.

Optional local validation of signed temp XML:
- A second keep-temp run was used only long enough to validate `signed.xml` locally, then the temp directory was deleted.
- Validation command used the temp staged SDK launcher/config and Java 11, with no ZATCA network call and no CSID request.
- Validation exit code: `0`.
- XSD: PASSED.
- EN: PASSED.
- KSA: PASSED.
- QR: PASSED.
- SIGNATURE: PASSED.
- PIH: FAILED.
- GLOBAL: FAILED.
- Remaining warning: `BR-KSA-08` seller identification warning in the local demo data.
- Remaining error: `KSA-13` PIH invalid. This is expected for the isolated dummy signing experiment because the signed temp artifact is not persisted and the hash chain/PIH is not mutated or promoted as an official signed invoice.

Redaction and no-mutation guarantees:
- No private key PEM, certificate body, CSID token, OTP, signed XML body, generated CSR body, or QR payload body is returned or stored.
- Signed XML is temp-only and deleted by default.
- The validation temp directory from the keep-temp run was manually deleted after validation.
- No invoice metadata is marked signed.
- No signed XML or QR payload is persisted to the database.
- No ICV, PIH, invoice hash, previous hash, EGS last hash, or submission log is mutated by the local signing dry-run path.

Remaining limitations and next step:
- This proves the local SDK dummy-material signing/QR path can execute under Java 11 only; it does not prove production compliance.
- Production signing remains blocked until real compliance/production CSID onboarding, secure key custody, certificate lifecycle handling, official clearance/reporting behavior, PDF-A3, and production validation are implemented.
- Recommended next step: add an explicit local signed-XML validation dry-run endpoint/script that keeps signed XML temp-only, returns only sanitized validation categories, and continues to block all CSID/network/persistence behavior.

### ZATCA local signed XML validation dry-run update (2026-05-16)

- Added a local-only signed XML validation dry-run path for generated invoices: `POST /sales-invoices/:id/zatca/local-signed-xml-validation-dry-run` and `corepack pnpm zatca:local-signed-xml-validate -- --invoice-id <id>`.
- Official references inspected for this phase: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/PIH/pih.txt`, SDK dummy `Data/Certificates/cert.pem`, SDK dummy `Data/Certificates/ec-secp256k1-priv-key.pem`, standard/simplified SDK invoice samples, ZATCA Schematron rules, XML Implementation Standard PDF, Security Features Implementation Standards PDF, and `EInvoice_Data_Dictionary.xlsx`.
- Behavior: when `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false`, signing, QR, and signed XML validation are skipped and the response stays dry-run/no-mutation. When explicitly enabled in local/dev only, the service signs and QR-generates temp XML with SDK dummy/test material, rewrites the temp SDK `pihPath` to invoice metadata `previousInvoiceHash`, validates the signed temp XML, sanitizes XSD/EN/KSA/QR/SIGNATURE/PIH/GLOBAL output, then cleans temp files by default.
- PIH/KSA-13 finding: the earlier signed-temp validation PIH failure was caused by SDK validation reading the default configured PIH file instead of an invoice-specific previous hash. The new temp `pihPath` override fixed the controlled local validation for demo invoice `INV-000163`: XSD/EN/KSA/QR/SIGNATURE/PIH/GLOBAL all passed with validation exit code `0`.
- Seller identification: BR-KSA-08 readiness now reports missing or invalid seller ID scheme/number, and XML emits seller `cac:PartyIdentification` only when the seller ID scheme is one of `CRN`, `MOM`, `MLS`, `SAG`, `OTH`, or `700` and the value is alphanumeric. Existing generated XML must be regenerated after adding valid seller ID data to clear an existing BR-KSA-08 warning.
- Safety guarantees: no CSID request, no ZATCA network call, no invoice submission, no clearance/reporting, no PDF/A-3, no production credentials, no signed XML/QR persistence, no ICV/PIH/hash-chain mutation, and no production compliance claim.
- Recommended next step: add controlled seller profile data repair/regeneration guidance for demo invoices, then design a signed XML promotion workflow separately from this dry-run path.

## ZATCA signed XML promotion planning update (2026-05-16)

- Added a safe signed XML promotion architecture boundary in `docs/zatca/SIGNED_XML_PROMOTION_PLAN.md`.
- Added `GET /sales-invoices/:id/zatca/signed-xml-promotion-plan` as a local-only, dry-run, no-mutation endpoint.
- Added signed artifact promotion readiness blockers for dummy/test material, missing real certificate/CSID, missing production key custody, missing persistence workflow, missing clearance/reporting, and missing PDF/A-3.
- Updated invoice/settings UI readiness to show that local signed XML validation success is not persisted signed invoice state and cannot be promoted from SDK dummy material.
- No signed XML, QR payload, private key, certificate body, CSID token, OTP, generated CSR body, production credential, ZATCA network call, CSID request, clearance/reporting, PDF/A-3, or production compliance claim is introduced.

## ZATCA signed artifact storage planning update (2026-05-16)

- Added metadata-only signed artifact storage planning in `docs/zatca/SIGNED_ARTIFACT_STORAGE_PLAN.md`.
- Added `GET /sales-invoices/:id/zatca/signed-artifact-storage-plan` as a local-only, dry-run, no-mutation endpoint.
- Added signed artifact storage readiness blockers for missing metadata model, object-storage retention, immutable archive, intentionally blocked signed XML body persistence, intentionally blocked QR payload persistence, and missing clearance/reporting linkage.
- Chose no Prisma schema in this phase because no signed artifact state should be persisted until object-storage retention, immutable archive, audit, and redaction rules are approved.
- No signed XML body, QR payload body, SDK execution, CSID request, ZATCA network call, clearance/reporting, PDF/A-3, production credential, or production compliance claim is introduced.

## 2026-05-17 - ZATCA signed artifact metadata-only draft records

Official sources inspected for this phase:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf

Findings applied:
- Future clearance/reporting payloads use `uuid`, `invoiceHash`, and a base64 invoice payload, so signed artifact planning keeps invoice metadata visible but does not create submission payloads.
- Official samples and Schematron confirm signed XML, QR, cryptographic stamp, ICV, and PIH are linked artifacts; local validation success is not enough to promote or store production artifacts.
- The new `ZatcaSignedArtifactDraft` table stores planning metadata only: status, source, hashes/sizes placeholders, sanitized validation summary fields, dummy-material flag, promotion blocker reason, and creator audit metadata.
- `signedXmlStorageKey` and `qrPayloadStorageKey` remain null in this task. No signed XML body or QR payload body columns were added.
- New endpoints are local-only: `POST /sales-invoices/:id/zatca/signed-artifact-drafts`, `GET /sales-invoices/:id/zatca/signed-artifact-drafts`, and the expanded `GET /sales-invoices/:id/zatca/signed-artifact-storage-plan`.
- Object-storage capability checks report provider/bucket configuration, unknown write capability, retention/immutability not implemented, tenant-scoped key-prefix planning, and body persistence blocked.
- Production compliance remains false. There are still no CSID requests, no ZATCA network calls, no clearance/reporting, no PDF/A-3, no production credentials, and no signed XML/QR body persistence.

Recommended next step:
- Add a future object-storage probe design that checks write/read/delete capability in an isolated test prefix without storing signed XML bodies, then define retention/immutability controls before any artifact-body persistence.

## 2026-05-17 - ZATCA signed artifact object-storage probe

Official sources inspected for this phase:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf

Storage implementation inspected:
- apps/api/src/storage/storage-configuration.service.ts
- apps/api/src/storage/storage-provider.ts
- apps/api/src/storage/storage.controller.ts
- apps/api/src/storage/storage.module.ts
- apps/api/src/attachments/attachment-storage.service.ts
- apps/api/src/attachments/attachment.module.ts
- apps/api/src/storage/storage.service.spec.ts
- apps/api/src/storage/storage.controller.spec.ts

Implemented behavior:
- Added `GET /zatca/signed-artifact-storage/probe-plan` for a read-only local probe plan. It returns object-storage configuration status, test prefix, planned test object key, and explicit blockers without uploading any object.
- Added `POST /zatca/signed-artifact-storage/probe` behind `ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED=false` by default. When disabled, it skips execution and writes/deletes nothing.
- When explicitly enabled in a local/test environment, the probe writes only this harmless text payload under `zatca/signed-artifacts/probe/<organizationId>/<timestamp>-probe.txt`: `LedgerByte ZATCA signed artifact storage probe only. No invoice data.`
- The enabled probe reads the harmless object back when supported, deletes it afterward, reports cleanup, and still keeps signed artifact body storage blocked.
- The probe does not upload signed XML, QR payload, invoice data, private keys, certificates, CSID tokens, OTPs, production credentials, or ZATCA submission payloads.
- The invoice signed artifact storage plan now reports `storageProbeRequired=true`, `latestStorageProbeStatus=NOT_RUN`, and includes the probe plan while body persistence remains blocked.
- The invoice ZATCA panel shows object-storage status and that the probe is disabled by default unless the env flag is enabled.

Safety boundary:
- No signed XML body persistence.
- No QR payload body persistence.
- No CSID requests.
- No ZATCA network calls.
- No clearance/reporting.
- No PDF/A-3.
- No production credentials.
- No production compliance claim.

Recommended next step:
- Add a future signed artifact retention and immutability design review before any endpoint can persist signed XML or QR payload bodies.

## 2026-05-17 - ZATCA signed artifact immutable storage policy planning

- Official sources inspected: SDK Readme/readme.md, SDK Configuration/usage.txt, official simplified and standard signed invoice samples, official Schematron rules, the XML and security implementation PDFs, EInvoice_Data_Dictionary.xlsx, compliance_invoice.pdf, reporting.pdf, and clearance.pdf under `reference/`.
- Added metadata-only immutable storage policy planning in `docs/zatca/SIGNED_ARTIFACT_IMMUTABLE_STORAGE_POLICY.md`.
- Added `GET /zatca/signed-artifact-storage/immutable-policy-plan` as a read-only, local-only, no-mutation endpoint. It returns `policyApproved=false`, `retentionDurationApproved=false`, `objectVersioningRequired=true`, `immutableArchiveRequired=true`, and `productionCompliance=false`.
- Updated signed artifact storage and probe plans with immutable policy status, retention review status, and the next step to approve immutable storage policy before signed artifact body persistence.
- Readiness now includes blockers for unapproved immutable policy, unapproved legal/accounting retention duration, unconfirmed object versioning, missing deletion/voiding policy, missing supersession policy, missing archive restore test, missing access-control review, and missing encryption-at-rest review.
- No retention duration is guessed. Retention duration remains legal/accounting review required.
- No signed XML body, QR payload body, invoice data, private key, certificate body, CSID token, OTP, production credential, ZATCA network call, clearance/reporting, PDF/A-3, or production compliance claim is introduced.
- Recommended next step: run a legal/accounting retention review and object-storage immutability review before designing any signed XML/QR body persistence endpoint.

## ZATCA immutable policy approval audit note

A metadata-only approval record now exists for future immutable signed artifact storage policy review. The record captures approval state and technical/legal gates only. It does not contain XML bodies, QR payloads, private keys, certificate bodies, tokens, OTPs, CSR bodies, or production credentials.

Body persistence and production compliance remain blocked.

## ZATCA storage control evidence records update (2026-05-17)

- Official files inspected for this phase: SDK `Readme/readme.md`, SDK `Configuration/usage.txt`, SDK simplified and standard invoice samples, SDK Schematron validation rules, ZATCA Security Features PDF, ZATCA XML Implementation PDF, `EInvoice_Data_Dictionary.xlsx`, `compliance_invoice.pdf`, `reporting.pdf`, and `clearance.pdf`.
- Added metadata-only technical control evidence planning for future signed artifact storage. Evidence covers object versioning, immutable retention/legal-hold equivalent, encryption at rest, access control, backup/restore, restore testing, tenant key scoping, deletion/supersession, storage probe, and other reviewed evidence.
- Evidence records intentionally do not store signed XML bodies, QR payload bodies, private keys, certificate bodies, CSID tokens, OTPs, CSR bodies, object-storage access keys, production credentials, or production compliance state.
- Retention duration remains legal/accounting review required. No retention duration is guessed from the official references.
- Immutable policy, storage-plan, and probe-plan responses now surface evidence-required status, verified evidence types, missing evidence types, and technical-control readiness while keeping body persistence blocked.
- Endpoints added: `GET /zatca/signed-artifact-storage/control-evidence`, `POST /zatca/signed-artifact-storage/control-evidence`, `POST /zatca/signed-artifact-storage/control-evidence/:id/verify`, and `POST /zatca/signed-artifact-storage/control-evidence/:id/revoke`.
- Recommended next step: collect real legal/accounting retention approval and real provider technical evidence, then design a separate body-storage approval gate before any signed XML or QR payload persistence.

## ZATCA evidence completeness reporting (2026-05-17)

- Official files inspected for this phase: SDK `Readme/readme.md`, `Configuration/usage.txt`, simplified and standard invoice samples, the SDK Schematron rules, XML/security implementation PDFs, data dictionary, `compliance_invoice.pdf`, `reporting.pdf`, and `clearance.pdf` under `reference/`.
- Required technical evidence before future signed artifact body persistence can even be reviewed: OBJECT_VERSIONING, IMMUTABLE_RETENTION, ENCRYPTION_AT_REST, ACCESS_CONTROL, BACKUP_RESTORE, RESTORE_TEST, TENANT_KEY_SCOPING, DELETION_SUPERSESSION, and STORAGE_PROBE.
- Completeness rule: only the latest VERIFIED evidence record for each required type counts. DRAFT, REVOKED, SUPERSEDED, and OTHER evidence do not satisfy a required control.
- Added read-only organization reporting at `GET /zatca/signed-artifact-storage/evidence-completeness`; it returns required, verified, missing, draft, revoked, latest-by-type, and BLOCKED or COMPLETE_FOR_REVIEW status.
- Body persistence remains blocked even when all evidence is COMPLETE_FOR_REVIEW. A separate legal/accounting retention approval and explicit body-storage phase are still required.
- The explicit body-persistence gate always returns allowed=false in this phase because evidence, immutable policy, retention approval, production certificate/CSID/key custody, clearance/reporting, PDF/A-3, and body persistence implementation are not complete.
- No signed XML body, QR payload body, private key, certificate body, CSID token, OTP, CSR body, production credential, ZATCA network call, clearance/reporting call, PDF/A-3 output, or production compliance claim is introduced.
- Retention duration is still not guessed; legal/accounting review is required.
- Recommended next step: verify all required technical evidence records, then design a separate explicit body-storage approval gate before any signed XML/QR payload persistence work.

## ZATCA sandbox compliance CSID onboarding planner (2026-05-17)

Official references inspected for this phase: SDK readme/usage, CSR config template/examples, `compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `compliance_invoice.pdf`, `reporting.pdf`, `clearance.pdf`, XML/security PDFs, and the data dictionary under `reference/`.

LedgerByte now exposes a sanitized sandbox compliance CSID request plan for non-production EGS units. The plan reports CSR/review status, OTP requirement, redacted planned headers/body fields, disabled execution status, blockers, warnings, and next steps. It does not request CSIDs, call ZATCA, submit invoices, persist signed XML/QR bodies, implement clearance/reporting, implement PDF/A-3, use production credentials, or claim production compliance.

`ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED` defaults to false. The current dry-run remains skipped/planned only; even with the flag enabled, HTTP execution is blocked until a later sandbox adapter and token/certificate custody phase. OTP, private key PEM, CSR body, certificate body, binary security token, secret, production credentials, signed XML body, and QR payload body are never returned.

Recommended next step: design the sandbox-only HTTP adapter and one-time OTP DTO/custody path with mocked responses before any real sandbox CSID request is allowed.
## 2026-05-18 - Sandbox compliance CSID mock adapter contract

Official local sources inspected for this step:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implementation notes:
- Compliance CSID onboarding remains sandbox/simulation planning only. Production CSID onboarding remains blocked.
- `POST /zatca/egs-units/:id/compliance-csid-request-dry-run` still skips execution when `ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED=false`.
- When the gate is explicitly enabled and `mode=mock`, only the local mock adapter contract can run. It never calls ZATCA and never requests a real CSID.
- The OTP dry-run DTO trims input, requires a conservative 6-digit numeric value for mock mode, rejects blank/unsafe values, and never stores or returns the OTP. The local official references confirm OTP is required for the compliance CSID request, but they do not expand a broader format rule in the inspected text.
- Public responses expose only booleans for binary security token, secret, and certificate presence. They do not return private key PEM, CSR body, OTP, certificate body, binarySecurityToken, secret, signed XML body, QR payload body, or production credentials.
- Mock adapter failures are sanitized before returning to callers.
- No signed XML body persistence, QR payload persistence, clearance/reporting, PDF/A-3, production credentials, production CSID, or production compliance claim is introduced.

Recommended next step:
- Design a separate real sandbox HTTP adapter plan with explicit OTP custody, redacted token/certificate storage, idempotency, audit logging, and a manual enablement review before any real sandbox request is attempted.
## 2026-05-18 - ZATCA compliance CSID request mapper

- Official files inspected: `reference/zatca-docs/compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `compliance_invoice.pdf`, `reporting.pdf`, `clearance.pdf`, the XML/security PDFs, `EInvoice_Data_Dictionary.xlsx`, SDK `Readme/readme.md`, `Configuration/usage.txt`, and SDK CSR templates/examples.
- Added a non-executing request mapper for the official sandbox compliance CSID contract: `POST /compliance`, `OTP` header, `Accept-Version: V2`, JSON `csr` body, and redacted public summaries only.
- Added a response mapper for official-like `requestID`, `binarySecurityToken`, `secret`, and certificate presence. Public responses expose only IDs and booleans; token, secret, certificate body, OTP, and CSR body remain redacted.
- Added recorded-contract tests for request mapping, response mapping, malformed/error response sanitization, production blocking, plan/mock/real dry-run modes, and no adapter/network mutation in real mode.
- The real sandbox HTTP adapter remains a stub for compliance CSID: it builds the redacted request contract and throws before any HTTP call. `mode=real` returns `BLOCKED_REAL_HTTP_NOT_IMPLEMENTED`.
- `corepack pnpm zatca:compliance-csid-plan` and `corepack pnpm zatca:compliance-csid-dry-run` now accept `--mode plan|mock|real`; real mode prints a blocker and never calls ZATCA.
- No real compliance CSID request, production CSID request, clearance/reporting, PDF/A-3, signed XML body storage, QR payload body storage, production credentials, or production compliance claim is implemented.
- Recommended next step: add a secrets-custody and sandbox execution design for real response material before any real sandbox HTTP request is considered.

## 2026-05-18 - ZATCA CSID response custody planning

- Inspected official ZATCA compliance CSID, onboarding, renewal, compliance invoice, reporting, clearance, XML/security, data dictionary, and SDK reference files before changing code.
- Added metadata-only CSID response custody planning for `binarySecurityToken`, `secret`, and certificate material. The plan keeps token, secret, certificate body, private key, OTP, CSR body, signed XML body, and QR payload body out of public API/UI responses.
- Added `GET /zatca/egs-units/:id/compliance-csid-custody-plan`, extended readiness with `COMPLIANCE_CSID_CUSTODY`, and added dry-run custody booleans (`tokenWouldRequireCustody`, `secretWouldRequireCustody`, `certificateWouldRequireCustody`, persisted=false flags).
- Schema decision: no Prisma schema was added because this phase does not request or persist a real sandbox CSID response. Custody storage remains a future approval phase.
- No real ZATCA network call, real CSID request, production CSID request, production credentials, clearance/reporting, PDF/A-3, signed XML body persistence, QR payload persistence, or production compliance claim was introduced.
- Recommended next step: design a metadata-only custody record and secrets-manager/KMS integration gate before any real sandbox response persistence.

### ZATCA CSID custody records and secrets/KMS gate - 2026-05-18

Official files inspected for this phase:
- reference/zatca-docs/compliance_csid.pdf
- reference/zatca-docs/onboarding.pdf
- reference/zatca-docs/renewal.pdf
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt

LedgerByte now has metadata-only `ZatcaComplianceCsidCustodyRecord` records for future sandbox compliance CSID custody planning. The record stores safe metadata such as request ids, certificate request ids, boolean presence flags, storage mode placeholders, expiry/renewal metadata, status, and audit user ids. It does not store `binarySecurityToken` bodies, secret bodies, certificate bodies, private keys, OTPs, CSR bodies, signed XML bodies, QR payload bodies, or production credentials.

New safe API behavior:
- `POST /zatca/egs-units/:id/compliance-csid-custody-records` creates metadata-only records for non-production EGS units.
- `GET /zatca/egs-units/:id/compliance-csid-custody-records` lists safe metadata only.
- `POST /zatca/compliance-csid-custody-records/:id/revoke` revokes metadata only.
- `GET /zatca/egs-units/:id/compliance-csid-custody-plan` now reports the latest custody record, record count, and a secrets-manager/KMS custody gate.

The custody gate remains blocked in this phase: `allowed=false`, token storage ready is false, secret storage ready is false, certificate storage ready is false, KMS configured is false, secrets-manager configured is false, encrypted DB approval is false, and `productionCompliance=false`. Metadata records do not enable CSID persistence, signed XML persistence, QR payload persistence, real ZATCA network calls, production CSID requests, clearance/reporting, PDF/A-3, production credentials, or any production compliance claim.

Recommended next step: design and approve the real secrets-manager/KMS custody implementation for sandbox compliance CSID response material before enabling any real sandbox response persistence. Production CSID, clearance/reporting, PDF/A-3, signed artifact body persistence, and production compliance remain separate blocked phases.

### ZATCA CSID secrets custody provider boundary - 2026-05-18

Official files inspected for this phase:
- reference/zatca-docs/compliance_csid.pdf
- reference/zatca-docs/onboarding.pdf
- reference/zatca-docs/renewal.pdf
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt

LedgerByte now has a `ComplianceCsidSecretCustodyProvider` boundary and a disabled implementation for future sandbox compliance CSID token, secret, and certificate custody. The provider readiness endpoint reports `provider=DISABLED`, `enabled=false`, token/secret/certificate storage not ready, KMS/secrets-manager not configured, encrypted DB not approved, and `productionCompliance=false`.

The disabled provider store/revoke methods throw sanitized errors and do not leak token, secret, certificate, private key, OTP, CSR, signed XML, QR payload, provider credentials, or production credential input. Custody plans and dry-runs now include provider readiness and keep `custodyGate.allowed=false`.

No real ZATCA network call, real CSID request, production CSID request, token body persistence, secret body persistence, certificate body persistence, private key persistence, OTP/CSR body persistence, signed XML/QR body persistence, clearance/reporting, PDF/A-3, production credentials, or production compliance claim is enabled.

Recommended next step: design and approve a concrete secrets-manager/KMS provider configuration and redacted reference model before any future sandbox CSID response body persistence.

## ZATCA CSID secrets provider configuration plan - 2026-05-18

Official files inspected for this phase: `compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `compliance_invoice.pdf`, `reporting.pdf`, `clearance.pdf`, the XML/security standards, the data dictionary, and the SDK readme/usage files under `reference/`.

LedgerByte now has a non-executing CSID custody provider configuration planner. It reads only planning environment variables for future `FUTURE_SECRETS_MANAGER`, `FUTURE_KMS`, and `FUTURE_ENCRYPTED_DB` modes, redacts key IDs/prefixes/regions, and keeps the runtime provider disabled.

The provider configuration endpoint and custody plan report `providerEnabled=false`, `bodyStorageAllowed=false`, `tokenStorageReady=false`, `secretStorageReady=false`, `certificateStorageReady=false`, and `productionCompliance=false`. `ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE` is intentionally ignored in this phase.

No real secrets-manager/KMS call, real ZATCA network call, real CSID request, token/secret/certificate/private-key/OTP/CSR/signed-XML/QR body persistence, clearance/reporting, PDF/A-3, production credential use, or production compliance claim is implemented.

Recommended next step: add mocked secrets-manager/KMS provider client contract tests that still never store real CSID material.

## ZATCA CSID mocked custody provider contracts update (2026-05-18)

Official files inspected for this update:
- reference/zatca-docs/compliance_csid.pdf
- reference/zatca-docs/onboarding.pdf
- reference/zatca-docs/renewal.pdf
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt

Implemented scope:
- Added local TypeScript-only mocked secrets-manager and KMS client contracts for future compliance CSID custody tests.
- Added mocked provider skeletons that accept fake injected clients, return redacted references only, and report productionCompliance=false.
- Added redacted reference handling that never exposes full ARNs, URLs, UUIDs, secret paths, KMS key IDs, provider credentials, token bodies, secret bodies, or certificate bodies.
- Kept the runtime factory/default provider disabled; providerEnabled=false, bodyStorageAllowed=false, and realProviderImplementationReady=false.
- Updated provider readiness, provider configuration plan, smoke output, and ZATCA settings UI to show mocked provider contract availability without enabling real storage.

Safety guarantees:
- No real secrets-manager, KMS, cloud provider, database secret storage, or ZATCA network call is performed.
- No real CSID request, production CSID request, clearance/reporting, PDF/A-3, production credentials, signed XML body storage, or QR payload body storage is implemented.
- binarySecurityToken, secret, certificate body, private key, OTP, CSR body, signed XML, and QR payload bodies remain blocked from API/UI responses and persistence.
- productionCompliance remains false.

Recommended next step:
- Add a non-executing provider-reference audit and rotation plan before any real sandbox custody provider implementation.

# Sellable-v1 audit update - 2026-05-18

- Added `docs/SELLABLE_V1_READINESS_AUDIT.md` with area-level readiness percentages, blockers, safe fixes, deployment recommendations, smoke recommendations, and next prompts.
- Added a read-only onboarding checklist API, dashboard card, and `/setup` guided setup wizard to improve onboarding and supportability without changing accounting postings, dashboard concurrency, contact VAT/ID validation, or ZATCA execution behavior.
- The wizard stays no-mutation and navigation-only, with explicit ZATCA local-only messaging and no CSID/network/clearance/reporting/PDF-A3 action.
- Critical blockers remain production ZATCA, production email, production storage/backup/restore, monitoring, billing/subscription operations, and production secrets custody.

# Accountant review packet update - 2026-05-22

- Added `docs/accountant-review/ACCOUNTANT_REVIEW_PACKET.md` to describe review purpose, supported beta outputs, out-of-scope compliance items, document/report inventory, reviewer notes, and known limitations.
- Added `docs/accountant-review/ACCOUNTANT_REVIEW_CHECKLIST.md` with review sections for sales invoices, customer receipts, credit notes, customer statements, purchase bills, supplier payment receipts, purchase debit notes, supplier statements, AR/AP aging, general ledger/report terminology, inventory reports, bank reconciliation, VAT/ZATCA wording safety, and overall accountant usability.
- Added `docs/accountant-review/ACCOUNTANT_REVIEW_FINDINGS_TEMPLATE.md` and `docs/accountant-review/SAMPLE_OUTPUT_INDEX.md` so reviewer findings and sanitized sample-output references can be collected without committing sensitive PDFs or real customer data.
- This is review preparation only. No accountant approval, legal/tax certification, production ZATCA approval, PDF/A-3 implementation, real ZATCA submission, full smoke, full E2E, Supabase RLS change, runtime DB role change, seed/reset, email sending, backup, or restore was performed.

# Beta testing feedback kit update - 2026-05-22

- Added `docs/beta-testing/BETA_TESTING_GUIDE.md` to define the purpose, beta environment boundaries, test data safety rules, known limitations, and reporting expectations for controlled user testing.
- Added `docs/beta-testing/BETA_ACCESS_MANAGEMENT.md` to document who should be invited, recommended 3-5 tester cohort size, safe role selection, invite flow, password reset, access revocation, organization labels, cleanup request handling, and what must not be shared.
- Added `docs/beta-testing/BETA_TESTING_SCRIPT.md` with workflow steps for setup, dashboard, AR/customer flows, AP/supplier flows, manual bank statement import, reconciliation, inventory, document PDF/archive behavior, and reports.
- Added `docs/beta-testing/BETA_FEEDBACK_FORM_TEMPLATE.md` and `docs/beta-testing/BETA_TRIAGE_GUIDE.md` so tester feedback can be captured with severity, route/page, workflow step, expected/actual behavior, screenshot reference, beta-blocking status, accounting correctness flags, and security/privacy/ZATCA wording flags.
- Added GitHub issue templates for beta bug reports, accounting review findings, and UX feedback. The templates instruct reporters not to include secrets, real customer-sensitive data, production document data, PDF/document bodies, signed XML, QR payloads, or attachment bodies.
- This is documentation and lightweight feedback workflow only. No accounting behavior, calculations, report math, ZATCA behavior, security configuration, Vercel environment, database schema, migration, seed/reset, real email, backup, restore, full smoke, or full E2E changed.

# Beta access management update - 2026-05-22

- `/settings/team` now shows beta access guidance for 3-5 selected testers, dummy data only, Viewer/scoped role defaults, internal-only Owner/Admin access, password reset instead of credential sharing, and suspension after testing.
- `/settings/roles` and `/settings/roles/:id` now show beta role guidance without changing permission logic.
- This is visible guidance only. No auth architecture, role enforcement, security config, Supabase RLS, Vercel environment, database schema, migration, seed/reset/delete, real email, real ZATCA, full smoke, or full E2E changed.

# Security diagnostic review update - 2026-07-02

- Reviewed PR #222 diagnostic queues for API tenancy and safe-script safety.
- Added exact reviewed classifications in the scanners and review evidence docs for cleared items.
- API tenancy audit now has 0 risky review-needed files.
- Safe-script audit still has 10 review-required dangerous-capable entries, retained intentionally for migration/seed/smoke/ZATCA validation/debug workflows.
- No app runtime behavior, API behavior, Prisma schema, migration, hosted config, provider, storage, accounting/report/VAT/inventory valuation/banking, or compliance behavior changed.

# Safe-script guardrail review update - 2026-07-03

- Reviewed the 10 retained safe-script findings and converted them into explicit owner-approval-required entries.
- Safe-script audit now reports 0 review-required entries and 10 owner-approval-required entries, with local-only defaults, production/remote refusal, disposable non-production approval gates, and redaction coverage where applicable.
- No dangerous script, migration, seed/reset/delete, API smoke, ZATCA validation/debug execution, hosted mutation, provider call, storage operation, accounting/report/VAT/inventory valuation/banking behavior, or compliance behavior changed.

# UAE pre-ASP adapter audit update - 2026-07-02

- The UAE package is more adapter-ready before ASP access: local official/readiness serializer boundaries are explicit, disabled/mock provider capability flags are test-covered, mock statuses cannot be mistaken for real provider acceptance, and webhook replay/error normalization helpers are local-only and redacted.
- Evidence retention planning now identifies official XML, readiness XML, provider envelopes/responses, webhook hashes/events, transmission attempts, timeline, archive hash, delivery evidence, future FTA evidence, and future inbound evidence.
- This audit update does not approve production UAE compliance. ASP access, provider docs, credentials, sandbox evidence, FTA reporting, production hosting, and legal/security sign-off remain required.

# UAE official serializer readiness audit update - 2026-07-02

- The UAE package now has local official draft invoice/credit-note models, structured draft validators, richer serializer metadata, and tests proving disabled/mock provider behavior remains blocked or mock-only for draft payloads.
- `docs/uae-peppol/UAE_PINT_AE_SERIALIZER_READINESS_MATRIX.md` records implemented-local serializer readiness separately from documented gaps and official/provider blockers.
- This audit update does not approve production UAE compliance. ASP access, provider docs, credentials, sandbox evidence, FTA reporting, production hosting, storage/retention proof, official conformance evidence, and legal/security sign-off remain required.

# Tenant isolation evidence audit update - 2026-07-03

- Added static tenant relationship graph, tenant index review, and API query scope audit scripts with `node --test` coverage.
- Relationship graph evidence catalogs all 112 Prisma models and reports `RELATIONSHIP_GRAPH_READY`.
- Tenant index review inventories 784 constraints and retains 370 conservative tenant-aware review items.
- API query scope audit inventories 740 Prisma query calls across 72 files and retains 42 review-needed files for human review.
- Added cross-tenant fixture planning, RLS policy readiness matrix, and runtime DB role readiness evidence.
- No production security behavior was enabled. No database connection, RLS enablement, role mutation, migration, Prisma schema change, hosted mutation, provider call, storage operation, email/payment action, or compliance behavior occurred.
