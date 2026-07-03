# Implementation Status

Audit date: 2026-06-19

## 2026-07-02 - UAE fake provider sandbox harness added

- UAE-PRE-ASP-ADAPTER-04 adds provider-neutral envelope contract skeletons, sandbox onboarding state-machine helpers, deterministic fake provider submission/status/webhook simulators, provider capability negotiation helpers, and provider error fixtures.
- Added package tests proving envelope redaction, deterministic idempotency, blocked network/production flags, sandbox docs/credential state handling, fake webhook signature/replay/stale behavior, conservative capability negotiation, and safe error fixture normalization.
- Added docs under `docs/uae-peppol/` for provider envelopes, sandbox onboarding simulation, fake provider harnesses, capability negotiation, and provider error fixtures.
- The implementation remains local-only and no-network. There is still no ASP access, provider-specific envelope mapping, real provider docs, FTA reporting, Peppol transmission, production UAE compliance, production hosting, storage/signed-URL proof, or provider credential.

MONITORING-SUPPORT-EXECUTION-01 local/read-only support diagnostics (2026-07-02):

- Added `scripts/monitoring-support-readiness.cjs` and `scripts/monitoring-support-readiness.test.cjs`.
- Added package commands `monitoring:support-readiness` and `test:monitoring-support-readiness`.
- Generated evidence under `docs/operations/evidence/`: `MONITORING_SUPPORT_READINESS.md` and `MONITORING_SUPPORT_READINESS.json`.
- Current status is `MONITORING_SUPPORT_PARTIAL_READY`: 13 available signals, 5 partial signals, and 0 blocked signals.
- Added controlled-beta support incident simulations, response templates, and support checklist under `docs/operations/`.
- Production monitoring provider/log drain, provider-backed alerting, support SLA tooling, object-storage proof, signed-URL proof, and UAE ASP access remain blocked or partial.
- No database connection, network call, hosted/Supabase/Vercel mutation, migration, seed/reset/delete, email send, provider call, storage/signed-URL operation, ZATCA/UAE/Peppol/ASP behavior, payment action, accounting/report/VAT/inventory valuation/banking/reconciliation logic change, or production monitoring/compliance claim was added.

SECURITY-EXECUTION-01 read-only database security diagnostics (2026-07-02):

- Added read-only security diagnostics for tenant-scope model cataloging, API route tenancy-risk cataloging, environment separation checks, and safe-script inventory.
- Generated evidence under `docs/security/evidence/`: `TENANT_SCOPE_AUDIT.md`, `API_TENANCY_AUDIT.md`, `ENV_SEPARATION_CHECK.md`, and `SAFE_SCRIPT_AUDIT.md`.
- Current tenant-scope evidence catalogs 112 Prisma models: 109 direct tenant-scoped, 3 indirect tenant-scoped, and 0 risky unclassified. It flags 55 unique constraints for tenant-scope review.
- Current API tenancy evidence scans 144 controller/service files: 126 tenant-guarded, 8 review-needed, 3 webhook, 1 auth-only, 1 system/admin, and 5 public-safe.
- Current safe-script evidence inventories 166 script/package entries, with 112 potentially dangerous entries and 32 review-required guardrail follow-ups.
- No database mutation, Supabase mutation, Vercel mutation, migration, Prisma schema change, provider call, storage/signed-URL operation, ZATCA/UAE/Peppol/ASP behavior, accounting/report/VAT/inventory/banking logic change, or production compliance claim was added.

PRE-ASP-PRODUCTION-FOUNDATION-01 foundation pass (2026-07-02):

- Added the master pre-ASP tracker at `docs/production/PRE_ASP_PRODUCTION_FOUNDATION_TRACKER.md`.
- Added database/security hardening plans, Supabase RLS/Data API strategy, least-privilege runtime-role plan, and tenant-isolation verification plan.
- Added read-only pre-ASP diagnostics for Prisma tenant-scope cataloging and secret environment presence by name only. The diagnostics do not connect to a database, call a network endpoint, print secret values, or mutate state.
- Added backup/PITR/object-storage, restore evidence, document retention, monitoring, support, incident, dashboard, and alerting runbooks under `docs/operations/`.
- Added billing/legal drafts under `docs/billing/` and `docs/legal/`; these remain drafts and require legal/commercial review before paid launch.
- Strengthened the UAE pre-ASP package with local-only idempotency, outbox draft, fake-secret webhook signature verification, in-memory replay guard, and error normalization helpers. Disabled/mock provider boundaries remain no-network and `productionCompliance: false`.
- Production hosting, hosted PITR, real object storage, signed URLs, billing collection, real email sending, ASP access, Peppol/FTA submission, UAE compliance, ZATCA/UAE/Peppol/ASP behavior, accounting logic, ledger posting, report math, VAT math, inventory valuation, and bank reconciliation behavior remain unchanged and unclaimed.

CONTROLLED-BETA-PROVISION-01 provisioning packet preparation (2026-07-01):

- Added controlled beta provisioning plan, approved tester list template, invite email template, onboarding message template, provisioning dry-run checklist, environment check, first onboarding result, access revocation plan, and support readiness docs under `docs/beta-testing/`.
- Approved tester status is `BLOCKED`: no owner-approved tester identities with required role, email, environment, data, access-window, organization, and acknowledgement fields were provided.
- Non-mutating environment readiness passed for API root, health, readiness, web login, dashboard, sales invoices, settings, storage settings, and compliance settings; API readiness returned `database: ok`.
- No account was created, no invite or email was sent, no first tester login/onboarding was run, and no hosted/Supabase/Vercel/provider/storage/payment/compliance mutation was performed.
- Next required action is `CONTROLLED-BETA-APPROVAL-01`: owner provides approved tester list and explicit send/invite approval.

CONTROLLED-BETA-LAUNCH-01 launch packet preparation (2026-07-01):

- Added the controlled beta launch packet, tester profile, restrictions, acknowledgement template, onboarding guide, walkthrough scripts, feedback form, issue triage runbook, access checklist, revocation checklist, and go/no-go checklist under `docs/beta-testing/`.
- Beta status remains `GO with restrictions` for a 3 to 5 tester controlled beta only.
- No real tester invite was sent, no production launch was performed, and no paid SaaS, compliance, provider, live banking, payment, real email, object-storage, or signed-URL readiness claim was added.
- Next step is actual tester provisioning/invite only after owner approval through `CONTROLLED-BETA-PROVISION-01`.

BETA-FIX-01 controlled beta evidence closure (2026-06-23):

- `BETA-FIX-01` runs on branch `codex/beta-fix-01` from merged `origin/main` at `bbd784e482c3e250ad75795570c8bcefebdbff82`.
- Closed the remaining visual evidence blocker by completing all required visual shards: 1,077/1,077 Playwright visual tests passed by direct specs or documented splits.
- Closed the live walkthrough evidence blocker against the deployed Vercel/Supabase test environment: API readiness returned `database: ok`, login worked, shell menus/sidebar and core route families loaded, and the live walkthrough passed 23/23 checks.
- Active web deployment inspected: `dpl_67sfsGb68VXWUXwrrtbjgUVN8xub` from clean commit `bbd784e482c3e250ad75795570c8bcefebdbff82`; no active `gitDirty` metadata.
- Active API deployment inspected: `dpl_68Vxdj6FNYwXgQRdBMwqr4N3Bk1i`; API behavior was not changed in this goal.
- Decision: `GO with restrictions` for controlled beta. Restrictions remain around production launch, provider/compliance readiness, object storage, signed URLs, live bank feeds, payments, real email, and public/marketing/auth visual fixture depth.
- No backend API, Prisma schema, hosted migration, Supabase mutation, Vercel env mutation, provider call, storage/signed-URL operation, payment/email action, seed/reset/delete, accounting/report/VAT/inventory valuation/banking/reconciliation logic change, or production compliance claim was made.
- Next goal is `CONTROLLED-BETA-LAUNCH-01`.

Redesigned frontend beta walkthrough evidence (2026-06-23):

- `BETA-WALKTHROUGH-01` runs on branch `codex/beta-walkthrough-01` from merged `origin/main` at `31e932920d7a488f50baffba3dd651e567b8654f`.
- Added local beta walkthrough results and issue-log evidence in `docs/beta-testing/BETA_WALKTHROUGH_01_RESULTS.md` and `docs/beta-testing/BETA_WALKTHROUGH_ISSUE_LOG.md`.
- Completed local mocked route/auth/visual coverage for the redesigned walkthrough: 23 Jest tests and 272 completed Playwright visual tests passed after fixes.
- Fixed a confirmed frontend-only tablet overflow on `/bank-accounts/[id]/reconciliations`; refreshed the quote visual fixture to match current related lookup behavior.
- Remaining blocker is evidence, not a known product regression: broad remaining visual suites timed out before usable output, and no safe disposable live demo org/API walkthrough was run.
- No backend API, Prisma schema, hosted state, provider, storage, signed URL, accounting/report/VAT/inventory valuation/banking behavior, email, payment, deployment, seed/reset/delete, migration, or compliance production behavior changed.
- Next goal is `BETA-FIX-01`.

Frontend redesign full-stack merge and stabilization (2026-06-22):

- Merged the complete frontend redesign PR stack #146 through #210 into `main`; final merged stack SHA is `cb34543d16389344ba45e69a2db277fce4c633ad`.
- Retargeted dependent stacked PRs to `main` after each parent landed; no PR head rebases or conflict resolutions were required.
- Final-main verification passed in a clean worktree: `corepack pnpm install --frozen-lockfile`, `corepack pnpm verify:ci:local`, and `corepack pnpm verify:openbooks-clean-room`.
- Stabilized frontend visual artifacts by refreshing the focused `polished-workflows` baselines and fixing dashboard/mobile workflow navigation horizontal overflow.
- Remaining frontend work is post-merge stabilization: expand visual fixture coverage and fix only confirmed frontend regressions.

Frontend redesign stabilization evidence update (2026-06-22):

- `UI-REBUILD-STABILIZE-01` runs on branch `codex/ui-rebuild-stabilize-01` from merged `origin/main` at `d12535cd2fc608797bc4664543cbbb1920379406`.
- Added route-load, visual QA, accessibility, responsive, truthfulness, permission/action, and beta walkthrough evidence docs for the redesigned frontend.
- Fixed confirmed frontend-only regressions in app-shell tablet wrapping and audit-log page responsive overflow; refreshed stale visual assertions for authenticated route hardening.
- No backend API, Prisma schema, provider, storage, compliance, accounting, reporting, banking, inventory valuation, hosted mutation, deployment, seed/reset/delete, or production readiness behavior changed.
- Remaining frontend work is controlled beta walkthrough execution plus visual fixture refresh for old quote/delivery-note/settings/public-auth fixtures.

Frontend redesign loop engineering (2026-06-22):

- Added the full route-family redesign checklist in `docs/product/FRONTEND_REDESIGN_ROUTE_FAMILY_CHECKLIST.md`.
- Began the Sales workspace loop by migrating `/sales/quotes` and tightening `/sales/invoices` list surfaces onto shared LedgerByte primitives.
- Began the Purchase workspace loop by migrating `/purchases/bills` and `/purchases/debit-notes` list surfaces onto shared LedgerByte primitives.
- Began the Banking workspace loop by migrating `/bank-accounts` and `/bank-transfers` list surfaces onto shared LedgerByte primitives.
- Began the Contacts workspace loop by migrating `/contacts` list/create surface onto shared LedgerByte primitives.
- Began the Inventory workspace loop by migrating `/inventory/balances` onto shared LedgerByte primitives.
- Preserved product truth: sales quotes remain non-posting; invoice finalization remains explicit and permission-gated; no send, payment, compliance, storage, signed URL, or provider behavior changed.
- Preserved AP truth: purchase bill finalization remains explicit and permission-gated, debit notes remain supplier adjustments, and no payment sending, provider approval workflow, archive/storage operation, or supplier balance math change was added.
- Preserved manual-banking truth: bank account and transfer lists do not connect to live bank feeds, move provider money, auto-reconcile, import statements, or match/categorize statement rows.
- Preserved contact truth: VAT, ID, UAE, Peppol, and address readiness fields remain local profile data and do not send eInvoices, validate endpoints, submit ZATCA data, or call providers.
- Preserved inventory truth: inventory balances remain operational review only; no stock movement, valuation math, FIFO, COGS, receipt, adjustment, transfer, or variance behavior changed.
- Remaining Sales, Purchase, Banking, Contacts, and Inventory surfaces include invoice/quote/bill/debit-note detail pages and forms, credit notes, customer payments/refunds, purchase orders, supplier payments/refunds, recurring invoices, delivery notes, inventory returns, collections, cash expenses, matching, AP dashboard, purchase returns, bank account detail, statement imports/review, bank rules, deposits, cheques, card settlements, reconciliation summary/history/close, transfer detail, shared contact detail, customer/supplier detail pages, statement pages, activity tabs, transaction handoffs, item catalog forms, warehouse/detail, stock ledger, adjustments/transfers, receipts/issues, FIFO, landed cost, valuation variance, and inventory reports.

Frontend redesign continuation (2026-06-22):

- Expanded the shared LedgerByte frontend system with reusable layout, table, form, state, workflow, summary, review, and breadcrumb primitives.
- Migrated the settings root into a grouped admin overview, migrated the generated-document archive surface, and migrated the report-pack read-only preview surface onto the shared system.
- Added product system documentation and frontend redesign evidence for the current adoption slice.
- This does not change backend behavior, route permissions, hosted migrations, Supabase state, Vercel deployment state, provider calls, banking execution, reconciliation execution, generated-document object storage, signed URL behavior, storage moves, ZATCA/UAE/Peppol/ASP behavior, tax-authority submissions, seed/reset/delete behavior, or shutdown behavior.
- Remaining route families require follow-up slices: sales, purchases, contacts, inventory, banking, reports/drilldowns, settings subroutes, setup/onboarding, dashboard, and auth/entry screens.

Report-pack generation/export/download/archive design (2026-06-21):

- Added `docs/architecture/REPORT_PACK_GENERATION_EXPORT_ARCHIVE_DESIGN.md` and evidence in `docs/development/openbooks-adoption/REPORT_PACK_GENERATION_EXPORT_ARCHIVE_DESIGN_EVIDENCE.md`.
- This is docs/design-only planning for future report-pack generation, PDF/CSV/XLSX export, download links, archive writes, email delivery, scheduling, audit events, and failure/retry handling.
- No runtime API endpoint, runtime UI behavior, Prisma migration, report generation, export/download behavior, email sending, scheduling, archive write, generated-document mutation, object storage behavior, signed URL behavior, provider call, hosted mutation, or compliance behavior changed in this slice.
- Report-pack runtime remains read-only preview only: `GET /reports/report-pack/manifest-preview` plus `/report-packs`.
- Object storage approval remains `BLOCKED`; real object storage remains unimplemented/unproven; signed URLs remain unimplemented/unproven; runtime generated documents remain DB-backed unless separately changed.
- Report-pack archive writes remain blocked until storage approval; download links remain blocked until signed URL behavior is proven.

Vercel Git deployment controls (2026-06-21):

- Added repo-local Vercel Git deployment controls for the root, API, and web Vercel project configs.
- Automatic Vercel Git deployments are disabled for `main` and `codex/**` branch patterns through `git.deploymentEnabled`.
- Manual Vercel deployments remain possible for authorized operators; no manual Vercel command, hosted mutation, provider behavior, storage behavior, compliance submission, or runtime app behavior changed in this slice.
- GitHub branch protection must not require Vercel status contexts while auto-deploy is disabled for the protected or Codex branch patterns.

OpenBooks adoption post-merge baseline audit (2026-06-20):

- PR #89 through PR #95 are now merged into `main` at `a8ebc9e6d039c52675135fa77bc1eb838c00a70d`.
- The OpenBooks clean-room adoption frontend metadata stack is now part of the main baseline: clean-room validator, app shell route registry, setup/onboarding route registry consumers, setup progress metadata, typed onboarding profile metadata, setup checklist template UI consumption, and typed onboarding selector/default helpers.
- The clean-room validator is now part of `main` and was proven on merged `main` with `corepack pnpm verify:openbooks-clean-room` and `node scripts/openbooks-clean-room-validate.cjs --strict`.
- Focused merged-main verification passed for `typed-onboarding-selector`, `typed-onboarding-preview`, `setup-wizard`, `typed-onboarding`, `setup-progress`, `setup-onboarding-routes`, `app-routes`, `sidebar`, and `route-load-verification`; `verify:ci:local` also passed.
- Full typed onboarding backend remains planned. Persistent setup checklist state remains unimplemented.
- Inbox, AI proposals, deterministic bookkeeping pipeline, report pack, integration health, and document review remain planned.
- Generated-document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE/ZATCA/Peppol/ASP production readiness remains blocked unless separately proven and approved.

Typed onboarding API/service foundation (2026-06-20):

- Added a LedgerByte-native local API/service foundation for typed onboarding profile and checklist persistence using the schema foundation from PR #99.
- New service behavior covers explicit actor context permission checks, organization scoping, optional branch scoping, selected-archetype validation, checklist generation/recompute, complete/skip/reopen item transitions, blocked-item fail-closed behavior, and onboarding checklist event records.
- Feature status is `PARTIAL`. This does not implement the full typed onboarding backend, public controller endpoints, setup wizard API consumption, setup wizard persistence, or frontend/UI persistence.
- No localStorage, sessionStorage, indexedDB, cookies, URL query persistence, hosted migration, Supabase mutation, Vercel mutation, provider behavior, generated-document object storage, signed URL behavior, Convex integration, or production compliance behavior was added.
- Inbox, AI proposals, deterministic bookkeeping pipeline, report packs, integration health, and document review remain planned.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Setup wizard typed onboarding API consumption (2026-06-20):

- Added a LedgerByte-native setup wizard typed onboarding API consumption slice on top of the existing schema/service foundation.
- The backend now exposes narrow onboarding profile/checklist controller endpoints for profile read/update, checklist read/recompute, and checklist item complete/skip/reopen operations using the existing typed onboarding service.
- The web setup checklist preview now loads the saved typed onboarding profile/checklist from the LedgerByte API, falls back to the default preview when missing/unavailable, saves selected archetype changes through the API, and refreshes checklist preview state from API recompute results.
- Feature status remains `PARTIAL`. This does not complete the full typed onboarding backend, broader setup checklist state machine, audit UI, or production onboarding flow.
- No browser-side durable persistence was added: no localStorage, sessionStorage, indexedDB, cookies, or URL query persistence for selected archetype/checklist state.
- No unrelated Prisma migration, hosted migration, Supabase mutation, Vercel mutation, provider behavior, generated-document object storage, signed URL behavior, Convex integration, or production compliance behavior was added.
- Inbox, AI proposals, deterministic bookkeeping pipeline, report packs, integration health, and document review remain planned.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Typed onboarding persistence schema foundation (2026-06-20):

- Added a LedgerByte-native additive Prisma schema and migration foundation for future typed onboarding profile/checklist persistence.
- New schema groundwork covers onboarding profiles, generated checklist containers, checklist items, checklist events, template version tracking, profile/checklist/item states, organization scoping, optional branch scope, actor fields, and useful indexes.
- Feature status is `PARTIAL`. This does not implement the full typed onboarding backend, setup wizard persistence, API service/controller behavior, tenant-isolated onboarding mutations, permission enforcement, recompute behavior, or audit-event write behavior.
- No UI persistence, localStorage, sessionStorage, indexedDB, cookies, URL query persistence, public API behavior, hosted migration, Supabase mutation, provider behavior, generated-document object storage, signed URL behavior, Convex integration, or production compliance behavior was added.
- Persistent setup checklist state remains unimplemented at runtime.
- Inbox, AI proposals, deterministic bookkeeping pipeline, report packs, integration health, and document review remain planned.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Typed onboarding persistence design (2026-06-20):

- Added a LedgerByte-native design document for future typed onboarding profile and setup checklist persistence.
- The design covers future-only domain model sketches, API sketches, state machines, template versioning, recompute rules, tenant scoping, permissions, audit events, Inbox interaction boundaries, and integration-health interaction boundaries.
- This is docs/design/contract planning only. It does not implement persistent typed onboarding, persistent setup checklist state, schema changes, Prisma migrations, API modules, controllers, services, UI persistence, or runtime behavior.
- No localStorage, sessionStorage, indexedDB, cookies, URL query persistence, database write, API write, hosted behavior, provider adapter, Convex integration, external dependency, generated-document object storage, signed URL behavior, or production compliance behavior was added.
- Persistent setup checklist state remains planned and unimplemented.
- Inbox, AI proposals, deterministic pipeline, report packs, integration health, and document review remain planned.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Archetype-aware setup guidance copy (2026-06-20):

- Added a LedgerByte-native typed onboarding guidance helper for archetype-aware setup preview copy, default guidance, invalid-value fallback, tone lookup, warning buckets, and compliance/storage/provider cautions.
- The setup checklist preview now renders selected-archetype guidance while keeping selected archetype state ephemeral in React state only.
- Guidance covers active-now, planned-next, and blocked-until-proven copy for every typed onboarding archetype.
- Planned and blocked guidance remains non-actionable and does not activate future inactive routes.
- This changes frontend guidance-copy/helper behavior only. It does not implement the full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, setup checklist database tables, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, or document review.
- No localStorage, sessionStorage, indexedDB, cookies, URL query persistence, API runtime behavior, hosted behavior, provider adapter, Convex integration, external dependency, generated-document object storage, signed URL behavior, or production compliance behavior was added.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Typed onboarding profile selector defaults (2026-06-20):

- Added a LedgerByte-native typed onboarding selector helper for safe setup preview default selection, selector options, invalid-value fallback, preview metadata, and summary counts.
- The setup checklist preview now consumes selector helpers while keeping selected archetype state ephemeral in React state only.
- Selector options are generated from centralized typed onboarding metadata; invalid values resolve to `general_services`.
- Planned and blocked checklist items remain non-actionable and do not activate future inactive routes.
- This changes frontend selector/default helper behavior only. It does not implement the full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, setup checklist database tables, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, or document review.
- No localStorage, sessionStorage, indexedDB, cookies, URL query persistence, API runtime behavior, hosted behavior, provider adapter, Convex integration, external dependency, generated-document object storage, signed URL behavior, or production compliance behavior was added.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Setup checklist template UI consumption (2026-06-20):

- Added a LedgerByte-native setup checklist template preview UI that consumes typed onboarding archetype and checklist template metadata.
- The setup wizard now renders archetype-aware checklist previews with a client-side selector that defaults to general services and does not persist selection.
- Active preview items link only through the setup/onboarding route helper stack and app route registry; planned and blocked items remain non-actionable and do not activate future inactive routes.
- This changes frontend UI rendering only. It does not implement the full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, setup checklist database tables, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, or document review.
- No API runtime behavior, hosted behavior, provider adapter, Convex integration, external dependency, generated-document object storage, signed URL behavior, or production compliance behavior was added.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Typed onboarding profile metadata foundation (2026-06-20):

- Added a LedgerByte-native typed onboarding metadata helper with business archetypes and setup checklist template metadata.
- Archetype coverage includes general services, software/SaaS, agency, trading, ecommerce, contractor, multi-entity, KSA local-readiness, and UAE local-readiness profiles.
- Active template items reference route registry keys and setup/onboarding route helpers without duplicating route hrefs.
- Planned and blocked template items remain non-actionable and do not activate future inactive routes.
- This does not implement the full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, setup checklist database tables, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, or document review.
- No UI runtime, API runtime behavior, hosted behavior, provider adapter, Convex integration, external dependency, generated-document object storage, signed URL behavior, or production compliance behavior was added.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Setup progress metadata refinements (2026-06-20):

- Added a LedgerByte-native setup progress metadata helper that centralizes setup progress categories, titles, descriptions, statuses, route keys, hrefs, action labels, safe explanations, planned metadata, and unknown-item fallback.
- Dashboard/setup onboarding helpers now consume setup progress metadata plus route-registry-backed setup/onboarding helpers while preserving existing labels, read-only checklist behavior, return-to links, and local-readiness wording.
- Planned typed-onboarding metadata remains non-actionable and does not expose future inactive routes.
- This does not implement the full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, setup checklist database tables, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, or document review.
- No API runtime behavior, hosted behavior, provider adapter, Convex integration, external dependency, generated-document object storage, signed URL behavior, or production compliance behavior was added.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Setup/onboarding route registry consumers (2026-06-20):

- Added LedgerByte-native setup/onboarding route helpers that consume the app route registry for setup navigation, breadcrumbs, checklist route mapping, and setup completion destination.
- Setup wizard and dashboard setup helper destinations now use registry-backed route metadata while preserving existing setup labels, action labels, read-only checklist behavior, and local-readiness wording.
- This does not implement the full typed onboarding backend, persistent setup checklist state, setup checklist database tables, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, or document review.
- No API runtime behavior, hosted behavior, provider adapter, Convex integration, external dependency, generated-document object storage, signed URL behavior, or production compliance behavior was added.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

LedgerByte app shell route registry (2026-06-20):

- Added a LedgerByte-native frontend route registry for app-shell metadata, route keys, labels, hrefs, route sections, descriptions, active/planned status, shell/mobile visibility, permissions, and compliance/storage/provider sensitivity tags.
- Sidebar and mobile first-workflow navigation now consume registry-backed route metadata while preserving existing user-facing labels and edition-aware compliance navigation.
- Planned exception Inbox, AI proposal review, deterministic bookkeeping pipeline, report pack, integration health, document review, evidence packs, and disposable test-business fixtures remain future LedgerByte-native work and are not returned by active shell/mobile helpers.
- No API runtime module, Prisma migration, hosted behavior, provider adapter, Convex integration, external dependency, or production compliance behavior was added.
- Production compliance status is unchanged. Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

OpenBooks clean-room adoption planning (2026-06-19):

- OpenBooks adoption is `PLANNED` only. This PR adds clean-room planning, legal policy, an evidence template, and a validator; no OpenBooks runtime behavior is implemented.
- No OpenBooks code, schema, comments, UI text, file structure, implementation detail, dependency, source import, or source vendor artifact has been copied into LedgerByte.
- Exception Inbox, deterministic bookkeeping pipeline, AI proposal boundary, report pack, typed onboarding, integration health, document review, evidence packs, and disposable test-business fixtures remain future LedgerByte-native work.
- Production compliance status is unchanged. LedgerByte remains controlled beta/user-testing only, and Vercel remains beta/user-testing/staging only rather than final production hosting.
- Generated document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, object-storage, signed-URL, and ASP production claims remain `BLOCKED` unless separately proven and approved.

Complete generated-document object adapter staging approval artifact intake (2026-06-19):

- The follow-up complete approval-artifact prompt was evaluated as a new approval-artifact intake attempt after PR #87.
- The prompt supplied placeholders only; no complete owner, security, storage/platform, accounting/legal-if-needed approval, exact approval phrase, staging environment, bucket, credential-scope reference, synthetic Tenant A/B IDs, `proofRunId` pattern, rollback/evidence confirmation, bucket-policy review, credential-scope review, no-production-target confirmation, or final sign-off was supplied.
- Approval artifact intake recorded: yes. Approval artifacts complete: no. Gates approved: no. Current gate approval status remains `BLOCKED`; runner state remains `NOT_READY`; future proof execution remains blocked.
- No hosted proof, hosted storage connection, hosted/customer mutation, signed URL generation, real object adapter implementation, schema/migration change, SQL/RLS/runtime-role application, or ZATCA/UAE provider work is included.

Generated-document object adapter staging approval artifact intake (2026-06-19):

- The current approval prompt was evaluated as an approval-artifact intake attempt.
- The prompt supplied placeholders only; no complete owner, security, storage/platform, accounting/legal-if-needed approval, exact approval phrase, staging environment, bucket, credential-scope reference, synthetic Tenant A/B IDs, `proofRunId` pattern, rollback/evidence confirmation, bucket-policy review, credential-scope review, no-production-target confirmation, or final sign-off was supplied.
- Approval artifact intake recorded: yes. Approval artifacts complete: no. Gates approved: no. Current gate approval status remains `BLOCKED`; runner state remains `NOT_READY`; future proof execution remains blocked.
- `scripts/object-storage-proof-validate.cjs` now reports the intake fields while keeping `generatedDocumentObjectAdapterStagingGateApprovalApproved=false` and `generatedDocumentObjectAdapterStagingProofReady=false`.
- No hosted proof, hosted storage connection, hosted/customer mutation, signed URL generation, real object adapter implementation, schema/migration change, SQL/RLS/runtime-role application, or ZATCA/UAE provider work is included.

Generated-document object adapter staging approval evidence package (2026-06-19):

- `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_APPROVAL_EVIDENCE_PACKAGE.md` prepares the future human approval packet for generated-document object adapter staging proof gates.
- `docs/storage/templates/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_APPROVAL_SIGNOFF_TEMPLATE.md` provides a placeholder-only sign-off template.
- Approval package prepared: yes. Approval evidence complete: no. Gates approved: no. Current gate approval status remains `BLOCKED`; runner state remains `NOT_READY`; future proof execution remains blocked.
- `scripts/object-storage-proof-validate.cjs` detects the package and template while keeping `generatedDocumentObjectAdapterStagingGateApprovalApproved=false` and `generatedDocumentObjectAdapterStagingProofReady=false`.
- The package includes the missing-evidence list, approval request checklist, exact future approval phrase, staging artifact intake checklist, bucket policy review checklist, credential scope review checklist, rollback/evidence checklist, scope exclusions, expiry rules, and next human actions.
- No hosted proof, hosted storage connection, hosted/customer mutation, signed URL generation, real object adapter implementation, schema/migration change, SQL/RLS/runtime-role application, or ZATCA/UAE provider work is included.

Generated-document object adapter staging gate approval record (2026-06-19):

- `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_GATE_APPROVAL_RECORD.md` records current gate approval status as `BLOCKED`.
- `scripts/object-storage-proof-validate.cjs` reports the approval record status while keeping `generatedDocumentObjectAdapterStagingProofReady=false`.
- The gates are not approved because explicit owner, security, storage owner, accounting/legal-if-needed approval evidence and required staging inputs are missing.
- Runner proof execution remains `NOT_READY`. No hosted proof, hosted storage connection, hosted/customer mutation, signed URL generation, real object adapter implementation, schema/migration change, SQL/RLS/runtime-role application, or ZATCA/UAE provider work is included.

Generated-document object adapter staging runner design (2026-06-19):

- `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_RUNNER_DESIGN.md` defines the future runner contract, modes, state machine, safety stops, evidence outputs, rollback flow, and future execution sequence.
- `scripts/generated-document-object-adapter-staging-runner.cjs` is a local-only fail-closed skeleton. Active modes are `help`, `plan`, `preflight`, and `dry-run`; hosted proof modes are future-gated blocked placeholders.
- `scripts/object-storage-proof-validate.cjs` detects the runner design/helper/tests but still reports generated-document object adapter staging proof readiness as false.
- Runtime generated-document storage remains database-backed. Real object storage and signed URLs remain unimplemented and unproven.
- No hosted proof, hosted storage connection, hosted/customer mutation, schema/migration change, SQL/RLS/runtime-role application, or ZATCA/UAE provider work is included.

Product Audit v2:

- `docs/PRODUCT_AUDIT_V2.md` summarizes current maturity, blockers, and go/no-go status.
- `docs/PRODUCT_READINESS_SCORECARD.md` scores readiness by module.
- `docs/NEXT_30_PROMPTS_ROADMAP.md` lists the next 30 recommended implementation prompts.
- `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md`, `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`, and `docs/production/LAUNCH_GATE_CHECKLIST.md` document the production-foundation path from controlled beta to paid Saudi-first SaaS v1.
- `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md`, `docs/production/ARCHITECTURE_DECISION_RECORDS.md`, and `docs/production/NEXT_10_PRODUCTION_TICKETS.md` convert the production foundation roadmap into owned tickets, ADR placeholders, and the first risk-reducing execution sequence.

Current production posture:

- Controlled beta/user-testing is the current practical stage.
- Vercel is beta/user-testing only, not final production hosting.
- LedgerByte is not production-launched.
- Real ZATCA production compliance is not enabled.
- UAE compliance work is readiness groundwork only. Current UAE Peppol/PINT-AE work is local validation/readiness, official local serializer/rule-pack foundation, disabled/mock ASP connector contracts, provider-selection planning, and provider outreach execution documentation only. LedgerByte is not an accredited ASP, Peppol-certified provider, FTA-certified provider, official UAE provider, or production UAE eInvoicing compliance provider.
- Current UAE PINT-AE package QA now includes local scenario fixture coverage and a metadata-only local QA summary. This improves local serializer/rule-pack proof only; it is not provider validation, FTA reporting, legal compliance evidence, certification, or production Peppol evidence.
- Paid production SaaS v1 requires production foundation work across hosting, database security, backup/restore, monitoring, email, billing, support, legal, accountant review, and ZATCA specialist review.
- Production tickets and ADRs are planning artifacts only. No hosting, database role, RLS, backup/restore, billing, real email, ZATCA, monitoring, or production infrastructure implementation has been performed.
- DEV-08 through DEV-08M are closed as local-only AP evidence. That evidence does not prove AP production readiness, beta readiness, customer-data behavior, real provider email delivery, real ZATCA, or broad AP E2E/smoke/full-test coverage.
- DEV-09 is closed as local-only banking/reconciliation evidence. That evidence does not prove banking production readiness, beta readiness, customer-data behavior, live bank feeds, automatic matching, certified parser coverage, raw statement archive operations, accountant sign-off, or broad banking E2E/smoke/full-test coverage.
- DEV-10 is closed as local-only reports and financial statements evidence. That evidence does not prove reporting production readiness, beta readiness, customer-data behavior, accountant-certified definitions, official VAT filing, scheduled/email delivery, report packs, advanced branch/multi-period/consolidation behavior, hosted behavior, load/concurrency, or broad reports E2E/smoke/full-test coverage.
- DEV-11 is closed as local-only inventory valuation and COGS evidence. DEV-11 does not prove production readiness, beta readiness, customer-data behavior, accountant certification, FIFO/landed-cost completeness, automatic COGS, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.
- DEV-12 is closed as local-only generated documents storage retention evidence. DEV-12 does not prove production readiness, beta readiness, customer-data behavior, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.

2026-06-19 Generated document object adapter staging preflight helper:

- Added `feature/generated-document-object-adapter-staging-preflight` from clean `origin/main` at `b7fa1133cbde18a88c0ff2c73bcc1a9c62ae0fbc` after PR #82 merged.
- Added `scripts/generated-document-object-adapter-staging-preflight.cjs` and `scripts/generated-document-object-adapter-staging-preflight.test.cjs`.
- The helper locally evaluates approval, environment, credential, bucket, application, data, migration, execution, evidence, and rollback preflight gates for a future generated-document object adapter staging proof.
- It supports `--help`, `--json`, `--strict`, and `--dry-run`; reports missing, unsafe, and satisfied gates; classifies staging/proof/local/production-looking values; redacts secret-like values; and requires `proofRunId`, distinct synthetic tenants, allow flags, rollback/evidence confirmations, bucket-policy review, credential-scope review, and no-production-target confirmation.
- Runtime generated-document storage remains DB-backed by default. The disabled object adapter remains fail-closed. The fake local adapter remains local/test-only. Real object storage, hosted proof, and signed URLs remain unimplemented and unproven.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, signed URL generation, provider call, ZATCA/UAE production work, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable. This pass does not prove hosted/customer-data behavior or production storage readiness.

2026-06-19 Generated document object adapter staging proof gates:

- Added `feature/generated-document-object-adapter-staging-gates` from clean `origin/main` at `076addba73849fc414ec3addc97f4b5b47b32833` after PR #81 merged.
- Added `docs/storage/GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_GATES.md`.
- The gate model requires explicit owner/security/storage approval, dedicated staging/proof environment and bucket, staging-only credentials, synthetic tenants, valid `proofRunId`, allow flags, bucket policy review, rollback/cleanup plan, and sanitized evidence capture before any future generated-document object adapter may run against staging object storage.
- Extended `scripts/object-storage-proof-validate.cjs` so local dry-run output reports generated-document object adapter staging gate status and keeps `generatedDocumentObjectAdapterStagingProofReady=false`.
- Generated-document runtime storage remains DB-backed by default. The disabled object adapter remains fail-closed. The fake local adapter remains local/test-only. Real object storage and signed URLs remain unimplemented and unproven.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, signed URL generation, provider call, ZATCA/UAE production work, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable. This pass does not prove hosted/customer-data behavior or production storage readiness.

2026-06-19 Fake local generated-document object adapter proof:

- Added `feature/fake-local-generated-document-object-adapter-proof` from clean `origin/main` at `b434ebfe2d1a3f1dfa99f2a1f795db4341d9f59f` after PR #80 merged.
- Completed fake local generated-document object adapter proof behavior in `apps/api/src/generated-documents/generated-document-storage.ts`.
- The fake adapter remains local/test-only and in-memory. It stores and retrieves synthetic generated-document content, uses tenant-prefixed/generated-document-id anchored keys, verifies SHA-256 and `sizeBytes`, rejects missing objects, blocks tenant-context mismatches when context is supplied, rejects path traversal segments, and handles duplicate writes deterministically.
- Selector guardrails now refuse fake local adapter selection for production-looking environments even when the explicit fake-adapter test option is present.
- `GeneratedDocumentService.download()` passes existing organization/id/size metadata through the adapter boundary without changing the DB-backed runtime default.
- `GeneratedDocumentModule` still registers `DatabaseGeneratedDocumentStorageAdapter`; explicit object/S3-compatible modes still resolve to the disabled adapter.
- Extended `scripts/object-storage-proof-validate.cjs` with fake-local proof status while keeping real object adapter implementation, hosted object storage, signed URLs, and schema migrations reported as absent.
- Generated-document object storage was not enabled, real object storage was not implemented, signed URLs were not implemented, hosted object storage was not touched, and no schema or migration changes were made.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, signed URL generation, provider call, ZATCA/UAE production work, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable. This pass does not prove hosted/customer-data behavior or production storage readiness.

2026-06-19 Disabled generated-document object adapter proof:

- Added `feature/disabled-generated-document-object-adapter-proof` from clean `origin/main` at `6abef3e58ed83403509a7b87f7408f4d93d14010` after PR #79 merged.
- Added a disabled generated-document object adapter and selector guardrails in `apps/api/src/generated-documents/generated-document-storage.ts`.
- Generated-document storage remains DB-backed by default. `GeneratedDocumentModule` still registers `DatabaseGeneratedDocumentStorageAdapter`, and archive/download behavior still flows through `storageProvider = "database"`, `contentBase64`, `contentHash`, `sizeBytes`, and API-mediated organization-scoped downloads.
- Explicit generated-document object/S3-compatible adapter modes resolve to the disabled adapter, fake local object storage requires an explicit local-test-only option, and unknown modes fail closed.
- Extended `scripts/object-storage-proof-validate.cjs` with disabled-adapter and selector guardrails.
- Generated-document object storage was not enabled, signed URLs were not implemented, hosted object storage was not touched, and no schema or migration changes were made.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, real hosted signed URL generation, provider call, ZATCA/UAE production work, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable. This pass does not prove hosted/customer-data behavior or production storage readiness.

2026-06-19 Generated document storage adapter interface:

- Added `feature/generated-document-storage-adapter-interface` from clean `origin/main` at `60feb4634a9cfddf33e995ba1514102551d832f9` after PR #78 merged.
- Added `apps/api/src/generated-documents/generated-document-storage.ts` and `docs/development/GENERATED_DOCUMENT_STORAGE_ADAPTER_INTERFACE_SPRINT_CLOSURE.md`.
- Generated-document archive writes and downloads now flow through `GeneratedDocumentStorageAdapter`.
- `DatabaseGeneratedDocumentStorageAdapter` is registered as the runtime default and preserves DB-backed behavior: `storageProvider = "database"`, `contentBase64`, `contentHash`, `sizeBytes`, and API-mediated organization-scoped downloads.
- Added `FakeLocalGeneratedDocumentObjectStorageAdapter` for local tests only. It is not registered in the runtime module, does not use network or credentials, stores content in memory, uses generated-document-id anchored keys, and rejects traversal path segments.
- Extended `scripts/object-storage-proof-validate.cjs` with adapter-interface guardrails covering DB default, fake adapter local-only posture, object storage disabled by default, no hosted storage touch, no signed URLs, and no schema migration.
- Generated documents remain database-backed by default. Generated-document object storage was not enabled, signed URLs were not implemented, hosted object storage was not touched, and no schema or migration changes were made.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, real hosted signed URL generation, provider call, ZATCA/UAE production work, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable. This pass does not prove hosted/customer-data behavior or production storage readiness.

2026-06-19 Generated document object-storage implementation plan:

- Added `feature/generated-document-object-storage-implementation-plan` from clean `origin/main` at `757daf8bd83e351c3c14a349e2fc38f520d4933c` after PR #77 merged.
- Added `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_IMPLEMENTATION_PLAN.md` and `docs/development/GENERATED_DOCUMENT_OBJECT_STORAGE_IMPLEMENTATION_PLAN_SPRINT_CLOSURE.md`.
- Updated linked storage/security/risk docs to point to the implementation plan and keep generated-document object storage planned, disabled, and proof-gated.
- Extended `scripts/object-storage-proof-validate.cjs` with generated-document object-storage implementation-plan guardrails covering disabled default, DB fallback, generated-document-id key anchor, adapter rollout, metadata/schema approval gate, dual-write rollback, staging proof, and optional signed URL posture.
- Fixed one local proof-helper bug: mock-cycle generated-document object keys now include the generated-document id anchor.
- Generated documents remain database-backed. Generated-document object storage was not implemented, signed URLs were not implemented, hosted object storage was not touched, and no schema or migration changes were made.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, real hosted signed URL generation, provider call, ZATCA/UAE production work, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable. This pass does not prove hosted/customer-data behavior or production storage readiness.

2026-06-19 Generated document object-storage contract:

- Added `feature/generated-document-object-storage-contract` from clean `origin/main` at `a118d0b7b9bd711d04dd74a5c1f6803417970fd3` after PR #76 merged.
- Added `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_CONTRACT.md`, `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_RISK_REGISTER.md`, and `docs/development/GENERATED_DOCUMENT_OBJECT_STORAGE_CONTRACT_SPRINT_CLOSURE.md`.
- Extended `scripts/object-storage-proof-validate.cjs` with generated-document object-storage contract output covering metadata, object-key, authorization, hash/integrity, migration/rollback, and edition safety.
- Generated documents remain database-backed. Generated-document object storage was not enabled, real signed URLs were not generated, hosted object storage was not touched, and no schema or migration changes were made.
- Future generated-document object keys must be tenant-prefixed, generated-document-id anchored, server-derived, normalized, and never accepted directly from user input.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, real hosted signed URL generation, provider call, ZATCA/UAE production work, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable. This pass does not prove hosted/customer-data behavior or production storage readiness.

2026-06-19 Signed URL object-storage proof harness:

- Added `feature/signed-url-object-storage-proof-harness` from clean `origin/main` at `3bb84480b37b531af1fe36bf98526ae2387f9fa5` after PR #75 merged.
- Added `docs/security/SIGNED_URL_OBJECT_STORAGE_PROOF_PLAN.md`, `docs/development/SIGNED_URL_OBJECT_STORAGE_PROOF_HARNESS_SPRINT_CLOSURE.md`, and `docs/storage/SIGNED_URL_OBJECT_STORAGE_RISK_REGISTER.md`.
- Extended the local object-storage proof validator with signed URL proof-plan output, authorization-before-URL contract, object-key policy validation, staging allow/proofRunId gates, and production-looking target refusal.
- Fixed one local proof-harness path-safety gap: proof-validator object-key helpers now remove traversal markers before constructing planned keys.
- Signed URLs remain not implemented. Generated documents remain database-backed. Hosted object-storage proof, bucket policy proof, generated-document object storage, backup/restore, retention/legal-hold/malware-scan evidence, and production archive guarantees remain blockers.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, real hosted signed URL generation, provider call, ZATCA/UAE production work, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable. This pass does not prove hosted/customer-data behavior or production storage readiness.

2026-06-19 Storage generated-document isolation proof:

- Added `feature/storage-generated-document-isolation-proof` from clean `origin/main` at `796784b34a40c0900cce8e403bef70ffb60ca521` after PR #74 merged.
- Added `docs/development/STORAGE_GENERATED_DOCUMENT_ISOLATION_PROOF_SPRINT_CLOSURE.md` and `docs/storage/STORAGE_GENERATED_DOCUMENT_ISOLATION_RISK_REGISTER.md`.
- Local API proof now covers attachment metadata/content organization scoping, generated-document metadata/content organization scoping, generated-document source ownership checks before archive creation, S3 attachment object-key filename traversal normalization, and storage readiness/migration-plan organization scoping.
- Fixed two local storage/document tenant-isolation defects: generated-document archive creation now validates supported source records against `organizationId`, and S3 object-key filenames remove traversal markers before upload key construction.
- Generated documents remain database-backed. Generated-document object storage, signed URLs, hosted bucket policy proof, backup/restore proof, retention/legal-hold/malware-scan evidence, and production archive guarantees remain blockers.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, signed URL generation, provider call, ZATCA/UAE production work, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable. This pass does not prove hosted/customer-data behavior or production storage readiness.

2026-06-18 Accounting concurrency idempotency regression:

- Added `feature/accounting-concurrency-idempotency-regression` from clean `origin/main` at `5d6a084635cca7080977920fa236173055804e3f` after PR #73 merged.
- Added `apps/api/src/accounting-concurrency-idempotency-regression.spec.ts`, `docs/development/ACCOUNTING_CONCURRENCY_IDEMPOTENCY_REGRESSION_SPRINT_CLOSURE.md`, and `docs/accounting/ACCOUNTING_CONCURRENCY_IDEMPOTENCY_RISK_REGISTER.md`.
- Fixed one real stale-write defect: manual bank statement matching now conditionally claims the statement transaction while it is still `UNMATCHED` before writing match fields.
- Local regression coverage now includes duplicate sales invoice finalization, duplicate customer payment allocation, and stale bank statement match attempts.
- This pass also inventoried existing local guards across sales invoices, customer payments, credit notes, purchase bills, supplier payments, purchase debit notes, journal entries, bank statements, bank reconciliations, generated documents, attachments, audit logs, permissions, and tenant context.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, SQL template application, RLS rollout, runtime role application, object-storage mutation, signed URL generation, ZATCA production work, UAE Peppol/ASP work, provider call, real email, real bank feed, or payment processor integration was performed.
- Remaining blockers include API idempotency-key design, schema/locking strategy review if needed, staging/proof multi-process evidence, hosted/customer-data proof, storage/signed URL proof, backup/restore proof, observability evidence, owner sign-off, and provider/production credential evidence.

2026-06-18 Least-privilege runtime role and RLS staging design:

- Added `feature/least-privilege-runtime-role-rls-staging-design` from clean `origin/main` at `40a6c66d2e09e264f26ce50e0930851328abba94` after PR #72 merged.
- Added `docs/security/LEAST_PRIVILEGE_RUNTIME_DB_ROLE_DESIGN.md`, `docs/security/RLS_STAGING_DESIGN.md`, `docs/security/sql/least_privilege_runtime_role_template.sql`, `docs/security/sql/rls_staging_policy_template.sql`, and `docs/development/LEAST_PRIVILEGE_RUNTIME_ROLE_RLS_STAGING_DESIGN_SPRINT_CLOSURE.md`.
- PR #72 remains the baseline: database-enforced application-table RLS is absent/pending and storage proof remains pending.
- This pass designs, but does not apply, a runtime DB role split: ordinary API Prisma traffic should use a non-admin runtime role while migrations and maintenance stay on a migration/admin role.
- This pass designs, but does not apply, an RLS staging approach that uses transaction-scoped tenant context in a reviewed Prisma transaction helper and starts with critical actual model names such as `Organization`, `OrganizationMember`, sales/AP/payment/journal/bank/document/compliance/audit tables.
- SQL files are templates only, not Prisma migrations, not auto-run, and not production-ready execution scripts.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, RLS implementation, runtime role application, SQL template application, object-storage mutation, signed URL generation, ZATCA production work, UAE Peppol/ASP production work, provider call, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable; remaining blockers include approved staging/proof credentials, synthetic tenant IDs, read-only and synthetic proof adapters, runtime-role staging proof, RLS or accepted compensating control, storage/signed URL proof, backup/restore proof, concurrency proof, observability evidence, and owner sign-off.

2026-06-18 Database RLS and storage isolation decision:

- Added `feature/database-rls-storage-isolation-decision` from clean `origin/main` at `3368904464891d99977698e2258a20ae1a34e776` after PR #71 merged.
- Added `docs/security/DATABASE_RLS_RUNTIME_ROLE_DECISION.md`, `docs/security/STORAGE_TENANT_ISOLATION_PROOF_PLAN.md`, and `docs/development/DATABASE_RLS_STORAGE_ISOLATION_DECISION_SPRINT_CLOSURE.md`.
- Database-enforced application-table RLS remains absent/pending in repo evidence. Current tenant isolation is application-enforced through organization membership guards, permission guards, service-level `organizationId` predicates, PR #67 local regression coverage, and the PR #69/#70/#71 hosted proof harness path.
- Recommended production decision is a hybrid approach: keep app-level scoping, add a least-privilege non-admin API runtime database role, and prove RLS for critical tenant tables in a separate staged rollout.
- Storage proof remains pending: attachments are database/base64-backed by default with feature-flagged S3-compatible uploads; generated documents are database-backed; no hosted object-storage proof, signed URL proof, generated-document object-storage proof, backup/restore proof, or production archive guarantee exists yet.
- No hosted command, Supabase command, Vercel deploy command, production database command, hosted/customer-data mutation, schema change, migration, RLS implementation, object-storage mutation, signed URL generation, ZATCA production work, UAE Peppol/ASP production work, provider call, real email, real bank feed, or payment processor integration was performed.
- Provider evidence remains unavailable and staging tenant isolation proof remains blocked by missing staging/proof credentials and synthetic tenant IDs.

2026-06-18 Staging tenant isolation proof run blocker:

- Added `feature/execute-staging-tenant-isolation-proof` from clean `origin/main` at `55c44407bceffe838ddf90502023afca1f28252c` after PR #70 merged.
- Inspected the PR #70 harness contract and confirmed the actual script is `corepack pnpm tenant-isolation:proof`, backed by `apps/api/src/hosted-tenant-isolation-proof.ts` and `apps/api/scripts/hosted-tenant-isolation-proof.ts`.
- Staging proof was not executed because the current environment is missing the staging/proof target and execution inputs: `LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT=staging` or CLI equivalent, `LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL` or CLI equivalent, `LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1`, `LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1`, `LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW=1`, `LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID`, `LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN`, `LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID`, and `LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID`.
- Local harness dry-run returned `safety=ready`, `environment=local`, `networkEnabled=false`, and `mutationEnabled=false`; local read-only plan with `proof-20260618-local` also returned `networkEnabled=false`, `mutationEnabled=false`, and `cleanupScope=proofRunId-only`.
- Verification passed: `corepack pnpm install --frozen-lockfile`, `corepack pnpm --filter @ledgerbyte/api db:generate`, harness tests, accounting tenant isolation regression, bank account service slice, API typecheck, web typecheck, `corepack pnpm verify:diff`, `git diff --check`, and `git diff --cached --check`.
- No staging read-only probe, staging synthetic proof, hosted/customer-data mutation, production target, Supabase command, Vercel deploy command, production database command, schema change, migration, seed/reset/delete, provider call, ZATCA/UAE Peppol/ASP work, real email, real bank feed, or payment processor integration was performed.
- Remaining blockers: approved staging/proof URL, approved auth token, synthetic tenant A/B IDs, proof-run ID, explicit allow gates, staging target classification, network-capable read-only probe adapter, synthetic proof adapter, database-level row policy/runtime-role evidence, storage/signed URL proof, backup/restore proof, concurrency/race proof, observability evidence, provider evidence, and accountant/legal/security sign-off.

2026-06-18 Staging tenant isolation proof execution contract:

- Added `feature/staging-tenant-isolation-proof-execution` from clean `origin/main` at `afb32f4ad2e3a9b853ad7a2a1bdcc5f5d3521f14` after PR #69 merged.
- Extended the hosted proof harness with explicit modes for `dry-run`, `read-only-plan`, `staging-read-only-probe`, `staging-synthetic-proof`, and `production-read-only-posture`.
- Dry-run classification is still non-networked and non-mutating, but now reports missing execution requirements without requiring hosted credentials.
- Staging read-only probe mode requires the base allow gate, read-only allow gate, proof-run ID, auth token presence, and two synthetic proof tenant IDs.
- Staging synthetic proof mode additionally requires `LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW=1` and reports proof-run-ID-scoped synthetic labels and cleanup scope.
- Production-like environment names and production-looking URLs remain refused unless a later explicitly approved read-only production posture path is supplied.
- The CLI emits a sanitized human-readable summary plus JSON output and never prints auth tokens or secret-like URL values.
- Actual staging proof was not executed because no staging URL/auth token/synthetic tenant IDs/read-only allow/mutation allow were present in the environment.
- This branch does not prove hosted tenant isolation and does not add database RLS. No hosted command, Supabase command, Vercel deploy command, production DB command, schema change, migration, seed/reset/delete, provider call, ZATCA/UAE Peppol/ASP work, real email, real bank feed, payment processor integration, or hosted/customer-data mutation was performed.
- Remaining blockers: approved staging proof target and credentials, read-only probe execution adapter, synthetic proof execution adapter, database-level row policy/runtime-role proof, object-storage/signed URL proof, backup/restore proof, concurrency/race proof, observability evidence, provider evidence, and accountant/legal/security sign-off.

2026-06-18 Hosted tenant isolation proof readiness:

- Added `feature/hosted-tenant-isolation-proof-readiness` from clean `origin/main` at `b8fda1f8be96d9f8beeb6688feafdd3d9c377e22` after PR #68 merged.
- Added a disabled-by-default, dry-run proof harness shell under `apps/api/scripts/hosted-tenant-isolation-proof.ts` with pure safety classification in `apps/api/src/hosted-tenant-isolation-proof.ts`.
- Added focused harness safety tests in `apps/api/src/hosted-tenant-isolation-proof.spec.ts`.
- The harness refuses missing allow gate, missing proof-run ID, production-looking URLs, hosted targets in local mode, and destructive/external operation flags. It redacts secret-like URL values and always reports no network and no mutation.
- Updated the hosted proof plan and added `docs/development/HOSTED_TENANT_ISOLATION_PROOF_READINESS_SPRINT_CLOSURE.md`.
- This is proof-readiness only. No hosted command, Supabase command, Vercel command, production DB command, schema change, migration, seed/reset/delete, provider call, ZATCA/UAE Peppol/ASP work, real email, real bank feed, payment processor integration, or hosted/customer-data mutation was performed.
- Hosted/customer-data proof, database-level row policy implementation, least-privilege runtime-role proof, object-storage/signed URL proof, backup/restore proof, concurrency/race proof, observability evidence, provider evidence, and accountant/legal/security sign-off remain blockers.

2026-06-18 Hosted tenant isolation proof plan:

- Added `feature/hosted-tenant-isolation-proof-plan` from clean `origin/main` at `0b9de9e9ec9ffa7c7e8f048c75a8efc72516e223` after PR #67 merged.
- Added `docs/security/HOSTED_TENANT_ISOLATION_PROOF_PLAN.md` and `docs/development/HOSTED_TENANT_ISOLATION_PROOF_PLAN_SPRINT_CLOSURE.md`.
- Confirmed PR #67 is the local/API baseline: it added tenant isolation/RBAC metadata regressions and fixed the bank-account opening-balance organization filter bug.
- Audited the Prisma schema and source patterns for hosted proof planning. Important production-domain models carry `organizationId`; app-source raw SQL is limited to the health `SELECT 1`; no repo migration was found that enables application-table RLS policies.
- The plan defines local/staging/production environment strategy, two synthetic proof tenants, synthetic data rules, read-only production posture, API proof checks, database/RLS review, storage proof checks, concurrency/race checks, observability checks, and production-grade acceptance criteria.
- This was docs/planning only. No hosted command, Supabase command, Vercel command, production database command, schema change, migration, seed/reset/delete, provider call, ZATCA/UAE Peppol/ASP work, real email, real bank feed, payment processor integration, or hosted/customer-data mutation was performed.
- Hosted/customer-data proof, database-level row policy implementation, least-privilege runtime-role proof, object-storage/signed URL tenant proof, backup/restore proof, concurrency/race proof, provider evidence, and accountant/legal/security sign-off remain blockers.

2026-06-18 Accounting tenant isolation regression:

- Added `feature/accounting-tenant-isolation-regression` from clean `origin/main` at `9bd65e4e3dceb34a8b38862ce880877e0e9fd8d1`.
- Added API-level regression coverage for tenant isolation and RBAC metadata across accounting and accounting-adjacent controllers.
- Confirmed the default Viewer role lacks accounting mutation permissions, controller mutation methods require non-view permissions, and controller read methods require view permissions.
- Found and fixed one tenant-isolation defect in bank-account transaction opening balances: `ledgerBalance` now requires `organizationId` and filters journal lines by organization.
- Verified with full API tests/typecheck, requested web slices, web typecheck, web build, `verify:diff`, and post-commit `verify:ci:local`.
- This improves local API regression confidence only. It does not prove hosted/customer-data behavior, database RLS, concurrency, live provider behavior, ZATCA/UAE production readiness, or production launch readiness.
- Added closure note: `docs/development/ACCOUNTING_TENANT_ISOLATION_REGRESSION_SPRINT_CLOSURE.md`.

2026-06-18 Accounting workflow regression baseline:

- Ran accounting workflow regression verification on `feature/accounting-workflow-regression-baseline` from clean `origin/main` at `e089690dd56cfb86911ecdfe3bcf5620227b9529d` (after PR #65 merge).
- Verified accounting command surfaces, tenant-aware invariants, and role/permission behavior with no functional code changes.
- Required environment step: `corepack pnpm --filter @ledgerbyte/api db:generate` (for `@prisma/client` typing resolution) before API test/typecheck success.
- Full command pass recorded: API + web suite/invoice/bills/customer-payments/supplier-payments/dashboard/reports/sidebar tests, web typecheck, web build, `verify:diff`, and diff whitespace checks.
- Frontend-only warning remains non-blocking: `@base-ui/react` ScrollArea `act(...)` warning under sidebar tests.
- No backend feature work, migrations, provider integration, hosted/customer-data mutation, or infrastructure/runtime change was performed in this pass.

2026-06-17 LedgerByte country edition clean reconciliation:

- PR `#63` was already merged during repo hygiene before this branch started from `origin/main` at `137f808d978e7afa0cce0dcc82fa6f06ffcc35a5`.
- Dirty country-edition work remains preserved on `feature/edition-split-preserve-current-changes` and through `E:\Repo-Hygiene-Safety\Accounting-App-20260617-192644\primary-country-edition-repo-hygiene-safety-20260617-192644.patch`.
- Added a frontend edition config for `GENERIC`, `KSA`, and `UAE`, with invalid or missing env values falling back to `GENERIC`.
- Generic/base surfaces are neutral by default: shell, topbar, dashboard, onboarding, marketing, document guidance, compliance settings, invoice detail, and invoice/bill forms.
- KSA surfaces expose ZATCA readiness, ZATCA actions, and SAR defaults only when `LEDGERBYTE_MARKET`/`NEXT_PUBLIC_LEDGERBYTE_MARKET` is `KSA`.
- UAE surfaces expose UAE eInvoicing/PINT-AE readiness, UAE actions, and AED defaults only when the market is `UAE`.
- Country routes are guarded and country links/panels are hidden outside the matching edition; shared accounting, reports, documents, inventory, banking, roles, permissions, and shell behavior remains shared.
- No backend API, Prisma schema, migration, accounting/business logic, provider integration, ZATCA core behavior, UAE PINT-AE logic, Vercel command, Supabase command, or production infrastructure changed.
- Existing Vercel URLs are prior deployment evidence only and were not touched in this branch.
- Provider evidence remains unavailable. ZATCA stash remains preserved.
- Recommended next prompt: `Review country edition split PR`.

2026-06-17 LedgerByte security settings route implementation plan:

- PR `#62` (`Owner security and organization settings visual QA`) was merged into `main` at `1fcbdce4da80341a58098070e34e2e37ef616fa1` before this branch was created from fresh `origin/main`.
- Added a docs-only capability inventory for existing LedgerByte auth/session/security-adjacent source files.
- Added a docs-only implementation plan for a future real `/settings/security` route.
- `feature/security-settings-read-only-route` added a read-only `/settings/security` route.
- Existing implemented capabilities documented from source: login, registration, `/auth/me`, JWT bearer auth, password reset tokens, invite tokens, invite acceptance, token cleanup, token-delivery rate-limit events, team member listing, member invite, member role/status updates, roles and permissions, organization setup/update, audit logs, audit export, and audit retention preview/settings.
- Missing capabilities documented instead of invented: persisted active sessions, refresh tokens, session revoke, logout-all, MFA, SSO, API-token management, logged-in password change, email verification, configurable security notifications, and dedicated security overview endpoint.
- Recommended first route scope: read-only account identity, password reset guidance, team access summary, role/permission summary, security activity/audit shortcut, organization setup posture, and links to existing real settings/setup routes.
- No backend API, frontend route implementation, Prisma schema, migration, auth/session/security business logic, accounting/business logic, UAE PINT-AE behavior, ZATCA behavior, provider behavior, hosted/customer-data mutation, fake security claim, certification claim, or production security/compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Implement read-only security settings route`.

2026-06-18 LedgerByte read-only security settings route:

- Implemented `feature/security-settings-read-only-route` with `apps/web/src/app/(app)/settings/security/page.tsx`, route permission mapping in `apps/web/src/lib/permissions.ts`, route wiring in `apps/web/src/lib/sidebar-nav.ts`, and settings security tests.
- Added visual QA coverage for `/settings/security` in `tests/visual/owner-security-organization-settings-visual-qa.visual.spec.ts`.
- Added `docs/development/SECURITY_SETTINGS_READ_ONLY_ROUTE_SPRINT_CLOSURE.md` and updated `docs/security/SECURITY_SETTINGS_ROUTE_IMPLEMENTATION_PLAN.md` to mark Phase A as implemented.
- Scope stays frontend/test/docs only: no backend API, Prisma schema, migration, auth/session/security business logic, accounting/business logic, UAE PINT-AE, ZATCA behavior, provider integration, real ASP/email/ZATCA calls, Vercel/Supabase commands, or production infrastructure changes.
- Capabilities shown are existing and read-only: account identity, password-reset guidance, team/roles shortcuts, audit logs shortcut, setup posture.
- Capabilities still explicitly not implemented: active session list, session/device revocation, refresh tokens, logout-all, MFA, SSO, API-token management, logged-in password change, email verification, configurable security notifications.

2026-06-17 LedgerByte Owner security organization settings visual QA:

- PR `#61` (`Add owner settings generated-document visual QA`) was merged into `main` at `b8799c8f4e77c7be87f8a4a5fde0aaec33bc3fde` before this branch was created from fresh `origin/main`.
- Added read-only visual fixture coverage for `/roles/:id`, enabling the existing `/settings/roles/[id]` route to be checked without real API calls.
- Added authenticated visual QA across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844` for real Owner organization/security-adjacent settings surfaces only.
- Checked Owner organization/security states for settings redirect, team/users, roles, role detail, system role protection, long custom role, permission matrix, audit retention, compliance readiness, guided setup, and organization setup form layout.
- Checked `Owner`, `Accountant`, and `Viewer` profiles. Owner admin/settings actions remain visible where existing permissions allow; Accountant and Viewer restricted actions are hidden, disabled, or blocked through existing behavior.
- Covered `/settings`, `/settings/team`, `/settings/roles`, `/settings/roles/role-owner`, `/settings/roles/role-custom-long`, `/settings/audit-logs`, `/settings/compliance`, `/setup`, and `/organization/setup`.
- Skipped `/settings/security`, `/settings/sessions`, `/settings/api`, `/settings/integrations`, `/settings/organization`, `/organization`, and `/settings/users` because those exact routes do not exist. `/settings/zatca` exists but ZATCA-specific visual expansion was intentionally skipped.
- Screenshots and `visual-results.json` are generated under `artifacts/visual-qa/owner-security-organization-settings-visual-qa/` and intentionally left uncommitted because `artifacts/` is ignored.
- Fixed only visual fixture/test-harness issues found by QA: role-detail fixture coverage and shell assertion calibration for existing account-menu/sign-out and organization-loading variants.
- No backend API, Prisma schema, migration, production auth behavior, auth/session/security business logic, payment/accounting/business logic, report calculation logic, generated-document business logic, storage provider logic, journal posting logic, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase command, infrastructure command, fake security/SSO/MFA/API/provider claim, certification claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Real security settings route implementation plan`.

2026-06-16 LedgerByte Owner settings generated-document storage evidence visual QA:

- PR `#60` (`Add secondary operational route visual QA`) was merged into `main` at `85813f7217d32babebf71412f43ea8034f0c0d07` before this branch was created from fresh `origin/main`.
- Extended the local-only visual fixture with generated-document archive rows for invoice, credit note, purchase bill, purchase debit note, failed, superseded, and local-ready database-storage states. The fixture remains read-only and local/test-only.
- Added metadata-only storage evidence fixture rows for database backup, generated-document backup, and RPO/RTO review. No backup, restore, provider, or storage migration operation runs.
- Added authenticated visual QA across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844` for Owner settings, generated-document archive, storage evidence, document settings, setup, accounts, tax rates, and source transaction document evidence routes.
- Checked Owner settings states for team/users, roles, storage, compliance, audit logs, number sequences, document settings, setup checklist, accounts, and tax rates with long names/emails, role chips, evidence notes, inactive rows, controlled-beta wording, disabled provider states, and owner/settings action restrictions.
- Checked generated-document/storage evidence states for generated/failed/superseded archive rows, long filenames, local database-storage metadata, source transaction PDF archive guidance, storage-readiness warnings, backup evidence rows, and filtered empty states.
- Checked `Owner`, `Accountant`, and `Viewer` profiles. Owner settings actions remain visible where existing permissions allow; Accountant follows existing accounting-adjacent permissions; Viewer mutation/create/delete/finalize/settings actions are hidden, disabled, or blocked through existing behavior.
- Covered `/settings`, `/settings/team`, `/settings/roles`, `/settings/storage`, `/settings/compliance`, `/settings/audit-logs`, `/settings/number-sequences`, `/settings/documents`, `/setup`, `/accounts`, `/tax-rates`, `/documents`, `/sales/invoices/invoice-1`, `/purchases/bills/bill-1`, `/sales/credit-notes/credit-note-1`, and `/purchases/debit-notes/debit-note-1`.
- Skipped `/settings/users`, `/settings/organization`, `/settings/taxes`, `/settings/numbering`, `/settings/chart-of-accounts`, `/settings/security`, `/settings/api`, `/settings/uae-einvoicing`, `/onboarding`, `/documents/document-1`, and `/generated-documents` because those exact routes do not exist. `/settings/zatca` exists but ZATCA-specific visual expansion was intentionally skipped.
- Screenshots and `visual-results.json` are generated under `artifacts/visual-qa/owner-settings-generated-document-storage-evidence/` and intentionally left uncommitted because `artifacts/` is ignored.
- Fixed only frontend/test issues found by visual QA: generated-document and storage evidence fixture realism was added, document guidance/debit note unsupported-network copy was tightened, and visual assertions were calibrated to existing Accountant and Viewer permission behavior.
- No backend API, Prisma schema, migration, production auth behavior, payment/accounting/business logic, report calculation logic, generated-document business logic, storage provider logic, journal posting logic, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase command, infrastructure command, fake provider/storage/archive claim, certification claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Owner security and organization settings visual QA`.

2026-06-16 LedgerByte secondary operational route polish visual QA:

- PR `#59` (`Add report drilldown dense entry visual QA`) was merged into `main` at `b36ffe56f83a79edbe04f148f4e1a86ecf38b5d9` before this branch was created from fresh `origin/main`.
- Extended the local-only visual fixture with secondary operational route data for customer/supplier lists, team members, roles, generated documents, chart of accounts, tax rates, number sequences, setup readiness, and bank account review. The fixture remains read-only and local/test-only.
- Added authenticated visual QA across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844` for secondary operational routes.
- Checked customers and suppliers with many rows, long legal names, TRN/TIN-style fields, balances, overdue states, inactive rows, and empty states.
- Checked settings overview/team/roles/storage/compliance/audit logs/numbering, chart of accounts, tax rates, setup checklist, documents/generated-document list states, bank-account list/detail, and bank statement transaction review states.
- Checked `Owner`, `Accountant`, and `Viewer` profiles. Viewer mutation/create/delete/finalize/export/settings actions are hidden, disabled, or blocked through existing behavior; Accountant checks focus on accounting-adjacent readability and owner-only action restrictions.
- Covered `/customers`, `/suppliers`, `/settings`, `/settings/team`, `/settings/roles`, `/settings/storage`, `/settings/compliance`, `/settings/audit-logs`, `/settings/number-sequences`, `/accounts`, `/tax-rates`, `/setup`, `/documents`, `/bank-accounts`, `/bank-accounts/bank-1`, and `/bank-accounts/bank-1/statement-transactions`.
- Skipped `/settings/users`, `/settings/organization`, `/settings/taxes`, `/settings/numbering`, `/settings/chart-of-accounts`, `/settings/security`, `/settings/api`, `/settings/uae-einvoicing`, `/onboarding`, `/documents/document-1`, `/generated-documents`, `/bank-accounts/bank-account-1`, and `/bank-accounts/bank-account-1/transactions` because those exact routes do not exist. Existing `/settings/team`, `/tax-rates`, `/settings/number-sequences`, `/accounts`, `/setup`, `/documents`, and `/bank-accounts/bank-1/statement-transactions` routes were covered instead. `/settings/zatca` exists but ZATCA-specific visual expansion was intentionally skipped.
- Screenshots and `visual-results.json` are generated under `artifacts/visual-qa/secondary-operational-route-polish/` and intentionally left uncommitted because `artifacts/` is ignored.
- Fixed only frontend/test issues found by visual QA: party list mutation links now require `contacts.manage`, the chart-of-accounts create form wraps safely on tablet/mobile, `/accounts/next-code` has local fixture coverage, and visual assertions verify route/action consistency without fake routes.
- No backend API, Prisma schema, migration, production auth behavior, payment/accounting/business logic, report calculation logic, journal posting logic, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase command, infrastructure command, fake automation, fake bank feed, fake AI, fake provider/storage connectivity, fake export success, certification claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Owner settings and generated-document storage evidence visual QA`.

2026-06-16 LedgerByte report drilldown dense entry visual QA:

- PR `#58` (`Add refund collections banking visual polish`) was merged into `main` at `643cc62dacb764d61e4f0acd7b99e51c4a43c502` before this branch was created from fresh `origin/main`.
- Extended the local-only visual fixture with report drilldown, VAT review, aged report, manual journal, customer/supplier statement, bank statement, document archive, and audit-log dense table data. The fixture remains read-only and local/test-only.
- Added authenticated visual QA across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844` for report drilldowns and dense accounting routes.
- Checked Profit & Loss hierarchy, Balance Sheet hierarchy, Trial Balance debit/credit columns, General Ledger opening/closing/running balances, VAT Summary/Return internal-review rows, aged receivables/payables buckets, long account/party names, zero rows, negative adjustments, large amounts, and totals rows.
- Checked dense-entry states for manual journals, bank statement transaction review, customer/supplier statements, customer/supplier transaction workspaces, invoice/bill line items and payment allocations, documents, and audit logs.
- Checked `Owner`, `Accountant`, and `Viewer` profiles. Viewer mutation/create/export/configuration actions are hidden, disabled, or blocked through existing behavior; Accountant checks focus on report readability and absence of owner-only admin affordances.
- Covered existing routes for report index, Profit & Loss, Balance Sheet, Trial Balance, General Ledger, VAT Summary, VAT Return, aged receivables, aged payables, manual journals, bank statement transactions, customer/supplier statements and details, invoice/bill detail tables, documents, and audit logs.
- Skipped `/reports/vat`, `/reports/cash-flow`, `/reports/customer-statement`, `/reports/supplier-statement`, and `/reports/audit-log` because those exact routes do not exist. Existing VAT summary/return, party statement, and audit-log routes were covered instead.
- Screenshots and `visual-results.json` are generated under `artifacts/visual-qa/report-drilldown-dense-entry-visual-qa/` and intentionally left uncommitted because `artifacts/` is ignored.
- Fixed only frontend/test issues found by visual QA: report export controls now require report-export permission, aging/VAT report guide create links respect create/payment permissions, audit-log fixture routing matches existing endpoints, and visual assertions match statement-load and mixed table/empty-state behavior.
- No backend API, Prisma schema, migration, production auth behavior, payment/accounting/business logic, report calculation logic, journal posting logic, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase command, infrastructure command, fake automation, fake bank feed, fake AI, fake report export success, report certification claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Secondary operational route polish visual QA`.

2026-06-16 LedgerByte refund collections banking detail polish:

- PR `#57` (`Add detail-state accountant mobile visual QA`) was merged into `main` at `c62a1a0f2232aca7fbffcf0400fed66f67d392b2` before this branch was created from fresh `origin/main`.
- Extended the local-only visual fixture with refund, collections, banking, bank statement, reconciliation, and cheque edge cases. The fixture remains read-only and local/test-only.
- Added authenticated visual QA across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844` for refund/collections/banking routes.
- Checked credit/debit note draft, finalized, applied, unapplied, partially applied, voided, long-field, large-amount, and zero-balance-after-application contexts; customer/supplier refund and collection/payable contexts; bank account, statement transaction, reconciliation, and cheque detail contexts.
- Checked `Owner`, `Accountant`, and `Viewer` profiles. Viewer mutation/refund/reconcile actions are hidden or blocked through existing behavior; Accountant checks focus on accounting-heavy readability and absence of owner-only admin affordances.
- Covered existing routes for credit notes, debit notes, customer refunds, supplier refunds, collections, customer/supplier detail, bank accounts, bank statement transactions, bank reconciliations, cheques, aged receivables, aged payables, General Ledger, and documents.
- Skipped `/banking`, `/reconciliation`, `/cheques`, `/customers/customer-collections`, and `/suppliers/supplier-payables` because those top-level/dedicated routes do not exist. Existing nested routes were covered instead.
- Screenshots and `visual-results.json` are generated under `artifacts/visual-qa/refund-collections-banking-detail-polish/` and intentionally left uncommitted because `artifacts/` is ignored.
- Fixed only frontend/test issues found by visual QA: debit-note mobile destructive action width, supplier long-detail AP summary fixture coverage, banking label expectations, and restricted Viewer banking assertions.
- No backend API, Prisma schema, migration, production auth behavior, payment/accounting/business logic, AR/AP state-machine behavior, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase command, infrastructure command, fake automation, fake bank feed, fake AI, bank-feed claim, reconciliation automation claim, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Report drilldown dense entry visual QA`.

2026-06-16 LedgerByte detail-state accountant mobile visual QA:

- PR `#56` (`Add role-filtered UI visual QA route polish`) was merged into `main` at `2467a195951a351db0c5b238eab5880ff8da2971` before this branch was created from fresh `origin/main`.
- Extended the local-only visual fixture with detail variants for sales invoices, purchase bills, customer payments, supplier payments, credit notes, debit notes, customer detail, and supplier detail. The fixture remains read-only and local/test-only.
- Added detail-state authenticated visual QA across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Checked invoice and bill draft, awaiting payment, partially paid, paid, overdue, and voided states; payment allocated, partially allocated, and unallocated/overpayment states; credit/debit note draft, finalized, applied, and unapplied states; and party detail open-balance, no-transaction, inactive/archived, and long-field states.
- Added accountant mobile/table review for invoice/bill line items, payment allocation tables, customer/supplier transaction tables, aged receivables, aged payables, General Ledger, Trial Balance, bank transactions, and documents across mobile `390x844` and tablet `1024x768`.
- Added accountant role visual checks for dashboard, invoice/bill list and creation routes, customer/supplier detail, AR/AP payments, credit/debit notes, reports, bank accounts, and documents.
- Screenshots and `visual-results.json` are generated under `artifacts/visual-qa/detail-states-accountant-mobile-table-review/` and intentionally left uncommitted because `artifacts/` is ignored.
- No backend API, Prisma schema, migration, production auth behavior, payment/accounting/business logic, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase command, infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Refund collections banking detail visual polish`.

2026-06-16 LedgerByte role-filtered UI visual QA route polish:

- PR `#55` (`Add authenticated UI visual QA route hardening`) was merged into `main` at `311ef752bf692c16f17cafa361c8b1522cb686e8` before this branch was created from fresh `origin/main`.
- Extended the local-only visual fixture to support the shared default role profiles `Owner`, `Accountant`, `Sales`, `Purchases`, and `Viewer`.
- Added role-filtered route visual QA for `Owner` and `Viewer` across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Checked route behavior for dashboard, invoice/bill list and creation routes, customer/supplier detail routes, AR/AP payment lists, credit/debit note lists, documents, reports, settings, storage settings, compliance settings, and bank accounts.
- Added create-menu visual QA for `Owner`, `Accountant`, `Sales`, `Purchases`, and `Viewer`, verifying allowed links, disabled unauthorized actions, and local route hrefs.
- Screenshots and `visual-results.json` are generated under `artifacts/visual-qa/role-filtered-route-polish/` and intentionally left uncommitted because `artifacts/` is ignored.
- No backend API, Prisma schema, migration, production auth behavior, payment/accounting/business logic, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase command, infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Role-filtered detail states and accountant mobile table review`.

2026-06-16 LedgerByte authenticated UI visual QA route hardening:

- PR `#54` (`Harden Stitch frontend foundation`) was merged into `main` at `0a6c5ddde244b5298933e88e4393516ff9996982` before this branch was created from fresh `origin/main`.
- Added a local-only authenticated Playwright visual QA matrix that primes the existing visual session and mocks read-only API responses; it does not use real auth provider behavior, hosted data, database mutation, or external provider calls.
- Expanded visual fixture responses for organization, user, permissions, dashboard, contacts, invoices, bills, AR/AP payments, credit/debit notes, compliance readiness, storage readiness, and backup planning.
- Checked 20 authenticated routes across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`: dashboard, invoice/bill list and creation routes, customer/supplier detail routes, customer/supplier payment list/create/detail routes, credit/debit note lists, documents, reports, compliance settings, storage settings, and bank accounts.
- Visual QA asserts authenticated shell visibility, primary route headings/actions, no document-level horizontal overflow, no severe topbar/content overlap, readable dashboard KPI/readiness content, and reduced-motion dashboard scene fallback.
- Screenshots and `visual-results.json` are generated under `artifacts/visual-qa/authenticated-route-hardening/` and intentionally left uncommitted because `artifacts/` is ignored.
- No backend API, Prisma schema, migration, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase command, infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Role-filtered UI visual QA and remaining route polish`.

2026-06-16 LedgerByte UI Stitch frontend foundation hardening:

- PR `#53` was merged into `main` at `90d617697a94aa34f7d6c20bb6d3b0b738d816ee` before this branch was created from fresh `origin/main`.
- The Stitch/MCP frontend foundation pass was reconciled from uncommitted local work, protected first with `stitch-frontend-pass-safety.patch`.
- The branch keeps the shadcn migration's split `ui-ledger` component structure and adds the missing readiness wrapper as `ComplianceReadinessPanel`.
- Real Three.js remains present only in the dashboard `FinancialFlowScene`, with reduced-motion, no-WebGL, cleanup, and jsdom fallback coverage.
- Dashboard, shell, onboarding, permissions copy, sidebar IA, and invoice/bill form currency presentation were hardened around UAE controlled-beta bookkeeping language.
- Browser route checks covered desktop, tablet, and mobile widths for dashboard, invoice/bill creation, customer/supplier detail, and customer/supplier payment create/detail URLs. Routes returned `200` with no horizontal overflow, but the local browser reached the authenticated access gate, so full in-app visual review remains a follow-up.
- No backend API, Prisma schema, migration, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase command, infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Recommended next prompt: `Authenticated UI visual QA fixture and remaining route hardening`.

2026-06-16 LedgerByte UI shadcn transaction workflows:

- PR `#51` was merged into `main` at `c19d69eba23eb01519ab70ece0bdaff960e2a223` before this branch was created from fresh `origin/main`.
- The beta deployment/Supabase gate evidence observed before this branch is preserved in `CODEX_HANDOFF.md`: Vercel beta API/web deployments were verified, the missing already-merged PR `#49` migration was applied to Supabase project `xynelbjqcmbgtscfmmzv`, Edge Functions were confirmed empty, and the stray Vercel CLI project was removed.
- Added `LineItemsTable` and `TransactionSummaryCard` wrappers under `apps/web/src/components/ui-ledger`.
- Migrated sales invoice creation, purchase bill creation, and the shared customer/supplier detail workspace to the shadcn/LedgerByte transaction workflow pattern.
- Existing accounting behavior is unchanged: invoice numbering, tax calculations, finalization/posting behavior, AP state logic, inventory posting mode, payment allocations, permissions, and real route links are preserved.
- No backend API, Prisma schema, migration, UAE PINT-AE, ZATCA, provider integration, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, or production compliance/readiness claim was added.
- Payment workflow screen migration was skipped for this branch and remains a follow-up scope item.
- Recommended next prompt: `Shadcn payment workflow migration`.

2026-06-16 LedgerByte UI shadcn shell/dashboard refresh:

- PR `#49` was already merged into `main` at `2d99e42be0ab2d6d2f45fd36091bb9f3f0bece6c`; this branch was created fresh from updated `origin/main`.
- Introduced shadcn/ui in `apps/web` as the frontend component foundation and added the requested primitive components.
- Added LedgerByte wrapper components for page headers, KPI cards, data tables, filter bars, status badges, empty states, action grids, and panel sections.
- Reworked the app shell with a dark grouped sidebar, polished topbar, existing organization switcher/search/create-menu behavior, permission-filtered navigation, and mobile sheet navigation.
- Redesigned `/dashboard` using existing dashboard summary/onboarding data only. The page now includes KPI cards, P&L/Cash Flow tabs, read-only attention panels, onboarding progress, quick actions, and a restrained Three.js financial-flow visual.
- Migrated the sales invoices list, purchase bills list, and sales invoice workflow guidance/detail surface to the new shadcn/LedgerByte component pattern.
- Three.js is used only for the dashboard background visual and includes reduced-motion and no-WebGL fallbacks.
- No backend API, Prisma schema, migration, UAE PINT-AE behavior, ZATCA behavior, provider adapter behavior, hosted/customer-data mutation, Vercel/Supabase change, infrastructure command, or production compliance claim was added.
- Remaining UI migration scope: secondary list/detail/form routes, deeper form ergonomics, authenticated visual QA across more roles, and design-system consolidation.
- Recommended next prompt: `LedgerByte secondary routes shadcn UI migration`.

2026-06-16 UAE PINT-AE scenario fixture validation QA:

- PR `#48` was merged into `main` at `363ee49a80737796a6f15ec606b7b7d99d9afdb1` before this branch started.
- Created branch `feature/uae-pint-ae-scenario-fixtures-validation-qa` from updated `origin/main`.
- Expanded package-level positive fixtures for standard tax invoice, commercial invoice `380`, tax credit note with reason/original reference, export receiver not registered in Peppol `9900000099`, deemed supply `9900000097`, buyer not subject `9900000098`, and multi-line invoice values.
- Added negative fixture coverage for missing buyer endpoint, invalid TIN/TRN, credit-note missing reason/reference, and unsupported legacy transaction flag.
- Added blocked fixture coverage for reverse charge, allowance/discount invoice, and provider-specific payload contract. Unsupported values remain blocked instead of guessed.
- Added local fixture QA helpers and tests. The summary is explicitly `local QA summary`, `certificationClaim=false`, and `legalComplianceEvidence=false`.
- No real provider evidence exists, no provider-specific adapter exists, no real ASP validation exists, no FTA reporting exists, no production UAE compliance claim exists, and ZATCA remains parked and blocked by default.
- API/UI integration was skipped to keep this slice package/dev-only.
- Recommended next prompt: `UAE ASP provider sandbox evidence review`.

2026-06-16 UAE PINT-AE official-code TODO review:

- PR `#47` was merged into `main` at `869d78ee02f603679ff0f462d2bd16d3a45fd481` before this branch started.
- Created branch `feature/uae-pint-ae-official-code-todo-review` from updated `origin/main`.
- Reviewed official UAE MoF and OpenPeppol sources for the unresolved official-code TODOs.
- Commercial invoice type code is now source-backed as `380`.
- Predefined endpoint participant identifications are now source-backed for deemed supply (`9900000097`), exports where the receiver is not registered in Peppol (`9900000099`), and buyers not subject to UAE eInvoicing regulations (`9900000098`).
- Transaction type flags now use the official 8-position `0`/`1` mapping and serialize through `cbc:ProfileExecutionID`.
- Unknown or legacy transaction flags still return structured `official-doc-required` validation results instead of being guessed.
- Provider-specific payload contracts remain blocked on provider sandbox docs, credentials, provider responses, and commercial terms.
- No real provider was selected and no real ASP adapter, ASP call, ASP validation, ASP submission, FTA reporting, real Peppol transmission, provider credentials, executable provider base URL, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, E2E, real email, real ZATCA call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was added.
- Recommended next prompt: `UAE ASP provider sandbox evidence review`.

2026-06-16 UAE PINT-AE official serializer rule pack:

- Created branch `feature/uae-pint-ae-official-serializer-rule-pack` from fresh `origin/main` at `eb80d4bd64ff5db398a95beaed67cb76debb7435` after PR `#46` was merged.
- Added a local-only official UAE PINT-AE serializer/rule-pack foundation in `@ledgerbyte/uae-peppol-pint-ae` while keeping the existing LedgerByte readiness XML path intact.
- Official local serializer output uses `urn:peppol:pint:billing-1@ae-1`, `urn:peppol:bis:billing`, endpoint scheme `0235`, seller/buyer endpoint data, line data, tax totals, document totals, and credit-note reason/original-reference checks.
- Structured rule results now distinguish local rules, official-doc-required gaps, and provider-required-later gaps.
- Unknown official commercial invoice type code mapping, predefined endpoint values, and transaction flag mappings were guarded here and resolved in the follow-up official-code TODO review where source-backed.
- Compliance-core local validation now records official local serialization attempts and metadata-only archive hashes while stating that ASP validation is not connected.
- No real provider was selected and no real ASP adapter, ASP call, ASP validation, ASP submission, FTA reporting, real Peppol transmission, provider credentials, executable provider base URL, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, E2E, real email, real ZATCA call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was added.
- Follow-up completed by the UAE PINT-AE official-code TODO review.

2026-06-15 UAE ASP outreach execution pack:

- Created branch `feature/uae-asp-outreach-execution-pack` from fresh `origin/main` at `5816a63309dd8104a81dfd47a5a6081cbed6ac6a` after PR `#45` was merged.
- Added provider-specific outreach packets, a response tracker, and an evaluation rubric so LedgerByte can contact UAE ASP providers and collect real sandbox/API/commercial/security evidence before coding any provider-specific adapter.
- Created provider-specific email drafts for Complyance, ClearTax, Taxilla, EDICOM, and Comarch.
- Seeded the provider response tracker for Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, Comarch, TronStride / Aigentrix, Storecove, Sovos, and OpenText.
- No real provider was selected. The outreach order remains evidence-gathering guidance only.
- No real ASP adapter, ASP call, ASP submission, FTA reporting, real Peppol transmission, provider credentials, executable provider base URL, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, E2E, real email, real ZATCA call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was added.
- Recommended next prompt: `UAE ASP provider response evidence review`.

2026-06-15 UAE ASP provider selection and sandbox contract plan:

- Created branch `feature/uae-asp-provider-selection-plan` from fresh `origin/main` at `b95685dc0dbdf142b161b242ee9ae731f14ff4e7` after PR `#44` was merged.
- Added provider-selection research, scoring, sandbox contract planning, and outreach template docs for a future UAE ASP integration.
- Reviewed official UAE MoF Electronic Invoicing Guidelines, MoF pre-approved provider list, MoF accreditation page, OpenPeppol BIS Billing 3.0, OpenPeppol PINT-AE, and provider-primary/provider-adjacent pages for Complyance, ClearTax, EDICOM, Comarch, Taxilla, Pagero / Thomson Reuters, Storecove, Sovos, OpenText, and TronStride / Aigentrix.
- Recommended first outreach order: Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, Comarch, TronStride / Aigentrix, Storecove, Sovos, OpenText.
- Recommendation is outreach guidance only: start with the most API-friendly MoF-listed providers first and do not implement a real provider until sandbox docs and commercial terms are reviewed.
- No real ASP call, ASP submission, FTA reporting, real Peppol transmission, production Peppol claim, production UAE compliance claim, provider credentials, executable provider base URL, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, E2E, real email, real ZATCA call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was added.
- Recommended next prompt: `UAE ASP first-provider outreach evidence and sandbox docs review`.

2026-06-15 UAE disabled ASP connector contracts:

- Created branch `feature/uae-disabled-asp-connector-contracts` from fresh `origin/main` at `9f57820af431cde2973d20c575137ecff72bec4f` after PR `#43` was merged.
- Added provider-neutral ASP adapter types and normalized keys/statuses/capabilities in `@ledgerbyte/uae-peppol-pint-ae`.
- Added disabled/default and explicit mock-only adapter implementations. Disabled blocks submission and never emits sent, FTA-reported, or buyer-delivered states. Mock behavior is deterministic, no-network, and clearly marked local/test-only.
- Added future-provider placeholders for Complyance, ClearTax, EDICOM, and generic ASP keys that return safe not-implemented results.
- Added provider factory rules: missing or disabled config falls back to disabled, mock requires explicit mock mode, future providers are placeholders, arbitrary external URLs are rejected, and secrets are redacted from responses.
- Added compliance-core API/service surface for provider readiness/config summary, redacted test config, local/mock preview, explicit mock submit, and provider status timeline.
- Existing tenant-scoped compliance document lookup gates preview/status/mock-submit behavior.
- Mock submit can create a local test-only `ComplianceTransmission` and event log without changing accounting finalization or compliance document status.
- No real ASP call, real ASP submission, FTA reporting, production Peppol claim, production UAE compliance claim, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, E2E, real email, real ZATCA call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was added.
- ZATCA remains parked and blocked by default.
- Recommended next prompt: `UAE ASP provider selection research and provider-specific sandbox contract plan`.

2026-06-15 UAE Peppol/PINT-AE data-entry UX and validation panels:

- Created branch `feature/uae-peppol-pint-ae-data-entry-validation` from fresh `origin/main` at `90201c170cb2ec7788135c7c3707adbc783ff406` after PR `#42` compliance core was merged.
- Added editable UAE organization compliance fields in settings for legal name, trade license, TRN/TIN, VAT status, UAE address/emirate, business activity, Peppol participant ID, ASP selection, and ASP onboarding status.
- Added a UAE eInvoicing readiness checklist for TIN/TRN, participant ID, UAE address, VAT status, ASP selection, and ASP onboarding status.
- Added optional UAE eInvoicing data-entry fields to contact creation, shared contact detail/edit, and customer/supplier detail surfaces. These fields do not block normal bookkeeping contact creation unless the operator uses the readiness workflow.
- Added local UAE eInvoicing/PINT-AE readiness panels to finalized sales invoices and finalized sales credit notes.
- Added read-only source readiness endpoints and explicit local prepare/validate actions that reuse compliance-core documents, validation results, event logs, and metadata-only archive records.
- Stored local validation status, hashes, warnings/errors, and archive metadata where applicable; PDFs are not treated as UAE compliance artifacts and no legal retention guarantee was added.
- Compliance delivery remains separate from accounting finalization. No invoice/credit-note posting, settlement, allocation, VAT math, report math, or PDF behavior was changed.
- No real ASP call, ASP submission, FTA reporting, production Peppol claim, production UAE compliance claim, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, E2E, real email, real ZATCA call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was added.
- ZATCA remains parked and blocked by default.
- Recommended next prompt: `UAE Peppol/PINT-AE disabled ASP connector contract tests`.

2026-06-13 Wafeq manual banking reconciliation reports and audit trail polish:

- PR `#40` `Wafeq banking clearing account accounting` was reverified green/safe and merged into `main` at `9ca5bfe2` before this branch was created.
- Added read-only reconciliation report summary fields for period statement rows, matched/categorized/ignored/unmatched/unreconciled counts, bank-rule application counts, linked treasury counts, journal-posted counts, operational-only counts, and missing clearing-account configuration where safely derivable.
- Added reconciliation audit timeline aggregation from existing statement import metadata, review events, bank-rule applications, linked deposit/card/cheque records, posted journal links, and sanitized audit-log metadata.
- Improved reconciliation CSV export with manual-only banking wording, header context, exception summary, linked treasury summary, accounting status summary, audit/review event rows, and generated timestamp.
- Added reconciliation detail UI panels for accountant review summary, exceptions, linked treasury activity, accounting status, missing clearing-account warning, operational-only warning, and audit timeline preview.
- No schema change, dependency change, live bank feed, bank API, credential handling, payment initiation, provider abstraction, new banking module, silent posting, silent reconciliation, silent matching, reconciliation workflow-state change, VAT/ZATCA/report math change, hosted/customer-data behavior, or production readiness claim was added.
- Recommended next prompt: `Wafeq manual banking beta QA and accountant review readiness`.

2026-06-14 Compliance Core + UAE Peppol/PINT-AE readiness foundation:

- Created branch `feature/compliance-core` from clean `origin/main` at `9ca5bfe2`, separate from the dirty ZATCA request-body checkout, then reconciled it after PR `#41` merged into `main` at `7d4b9fa7`.
- Added neutral compliance-core storage for profiles, providers, documents, transmissions, validation results, event logs, and XML/evidence archive metadata.
- Added nullable UAE organization/contact readiness fields for TRN, TIN, trade license, VAT status, address/emirate, Peppol participant ID, ASP selection/onboarding, and buyer endpoint metadata.
- Added local `@ledgerbyte/uae-peppol-pint-ae` helpers for TIN/TRN checks, `0235{TIN}` participant ID derivation, readiness reports, and fixture-tested invoice/credit-note XML generation.
- Added API readiness/document/local-validation endpoints and a read-only Compliance settings page.
- Compliance document lifecycle is separate from source accounting finalization; no journal posting, VAT math, AR/AP allocation, report math, PDF behavior, ASP network call, FTA call, ZATCA call, signing, clearance/reporting, PDF-A3, hosted-data mutation, or production claim was added.
- Recommended next prompt at that point: `UAE Peppol/PINT-AE data-entry UX and invoice/credit-note validation panels`.

2026-06-13 Wafeq manual banking clearing-account accounting:

- PR `#39` `Wafeq banking cheque lifecycle` was reverified green/safe and merged into `main` at `4fb018b8` before this branch was created.
- Added organization-scoped clearing-account configuration for existing chart-account selections, with no default account creation and no hosted migration execution.
- Added nullable journal-entry links on bank deposit batches, card settlements, and cheque instruments so explicit posting can be idempotently tracked.
- Added banking-accounting preflight for deposit batches, card settlements, and cheques.
- Added explicit deposit journal posting for safe configured cases only: Dr bank account and Cr source clearing/payment account. Ambiguous deposit sources remain blocked or operational-only with reasons.
- Added explicit card settlement journal posting for safe configured credit-card paydowns and prepaid-card top-ups only. Card credits/refunds remain operational-only until an offset policy is explicit.
- Kept direct cheque journal posting conservative and operational-only until source receivable/payable/payment policy is explicit.
- Added banking accounting settings UI plus deposit, card settlement, and cheque accounting status panels.
- Existing operational treasury records are not silently converted. Posting requires explicit operator action after preflight.
- No live bank feed, bank API, credential handling, payment initiation, provider abstraction, provider callback, silent posting, silent reconciliation, silent matching, AR/AP allocation change, VAT/ZATCA/report change, hosted/customer-data behavior, or production readiness claim was added.
- Prompt 8 next prompt at the time: `Wafeq manual banking polish: reconciliation reports and audit trail`.

2026-06-13 Wafeq manual banking cheque lifecycle:

- PR `#38` `Wafeq banking credit and prepaid card settlement flows` was reverified green/safe and merged into `main` at `3b14ed8a` before this branch was created.
- Added operational cheque instruments for received and issued manual cheques.
- Added draft, received, issued, deposited, cleared, bounced, and voided statuses with explicit create, update, mark received, mark issued, deposit, clear, bounce, void, match, and unmatch API behavior.
- Added cheque number, counterparty, drawer bank, payee, amount, currency, date, reference, memo, bounce reason, void reason, bank account, deposit batch, and statement transaction tracking.
- Added positive amount, cheque number, currency, bank account, organization-scope, active-source reuse, lifecycle transition, direction, and closed-reconciliation guards.
- Added received-cheque deposit integration using the existing bank deposit batch `CHEQUE_PLACEHOLDER` source line type.
- Added explicit direction-aware statement matching: received cheques match same-account credit rows; issued cheques match same-account debit rows.
- Closed reconciliation periods block cheque matching, unmatching, and linked void changes.
- Added bank account cheque list/detail UI at `/bank-accounts/[id]/cheques` plus on-demand cheque candidate links from the statement transaction review workspace.
- Added a narrow additive Prisma migration limited to `ChequeInstrument`.
- Accounting decision: cheque lifecycle is operational only and does not create journal entries because cheque-in-hand, outstanding-cheque, and clearing-account accounting need the next explicit design before journal-backed cheque posting is safe.
- No live bank feed, bank API, credential handling, payment initiation, provider abstraction, cheque printing, cheque book inventory, VAT/ZATCA/report change, hosted/customer-data behavior, or production readiness claim was added.
- Recommended next prompt: `Wafeq manual banking accounting: clearing-account design for deposits cards and cheques`.

2026-06-13 Wafeq banking credit/prepaid card settlement flows:

- PR `#37` `Wafeq banking bank deposit batches` was reverified green/safe and merged into `main` at `d86c9394` before this branch was created.
- Added operational card settlements for credit-card paydowns, credit-card credits/refunds, and prepaid-card top-ups.
- Added draft, posted, matched, and voided statuses with explicit create, update, post, void, match, and unmatch API behavior.
- Added same-organization, positive amount, same-account, account currency, funding account, and card/prepaid account validation.
- Added explicit direction-aware statement matching: paydowns/top-ups match funding-account debit rows; card credits/refunds match card-account credit rows.
- Closed reconciliation periods block card-settlement matching, unmatching, and linked void changes.
- Added bank account card settlement list/detail UI at `/bank-accounts/[id]/card-settlements` plus on-demand card settlement candidate links from the statement transaction review workspace.
- Added a narrow additive Prisma migration limited to `CardSettlement`.
- Accounting decision: card settlement posting is operational only and does not create journal entries because credit-card liability, prepaid-card asset, and clearing-account classification need an explicit design before journal-backed settlement posting is safe.
- No live bank feed, bank API, credential handling, payment initiation, cheque printing, cheque book inventory, card expense management, statement-cycle billing, VAT/ZATCA/report change, hosted/customer-data behavior, or production readiness claim was added.
- Recommended next prompt: `Wafeq manual banking accounting: clearing-account design for deposits cards and cheques`.

2026-06-13 Wafeq banking bank deposit batches:

- PR `#36` `Wafeq banking bank rules engine` was reverified green/safe and merged into `main` at `dcf8a3d1` before this branch was created.
- Added operational bank deposit batches for grouping receipt-like customer payment, cash receipt, receipt reference, cheque-placeholder, or other clearing-item lines into one bank account deposit total.
- Added draft, posted, matched, and voided statuses with explicit create, update, add-line, remove-line, post, void, match, and unmatch API behavior.
- Added explicit same-bank-account, same-currency, same-amount matching from a posted deposit batch to one imported statement credit row.
- Closed reconciliation periods block deposit-batch matching, unmatching, and linked void changes.
- Added bank account deposit list/detail UI at `/bank-accounts/[id]/deposits` plus on-demand deposit-batch candidate links from unmatched credit rows in the statement transaction review workspace.
- Added a narrow additive Prisma migration limited to `BankDepositBatch` and `BankDepositBatchLine`.
- Accounting decision: existing customer payments post directly to their selected paid-through account and no confirmed undeposited-funds/clearing model exists, so deposit-batch posting is operational only and does not create journal entries. Journal-backed clearing movement remains deferred until the clearing-account model is designed and tested.
- This is LedgerByte treasury workflow functionality, not a claim that public Wafeq evidence proves a dedicated Wafeq deposit-batch module.
- No live bank feed, bank API, credential handling, payment initiation, card settlement, cheque printing, cheque book inventory, VAT/ZATCA/report change, hosted/customer-data behavior, or production readiness claim was added.
- Recommended next prompt: `Wafeq banking treasury: credit and prepaid card settlement flows`.

2026-06-13 Wafeq banking bank rules engine:

- PR `#35` `Wafeq banking import safety hardening` was reverified green/safe and merged into `main` at `44ff1d7a` before this branch was created.
- Added deterministic bank rules for imported manual statement transactions.
- Rules are organization-scoped with optional bank account profile scope, priority, enabled/disabled state, safe condition fields, suggestion action type, explicit `autoApply: false`, and rule-application audit records.
- The evaluator is side-effect free and supports direction, description contains, bounded description regex, reference, bank reference, counterparty, amount equality/range, currency, source format, and date range.
- Dry-run evaluates recent unmatched statement rows without mutation.
- Explicit apply reuses existing categorize, ignore, and match service behavior; no silent posting, silent ignore, silent reconciliation, or reconciliation workflow-state change was added.
- Added rule management UI at `/bank-accounts/[id]/rules` and row-level rule suggestions in the statement transaction review workspace.
- Added a narrow additive Prisma migration for bank rule storage and rule application audit storage only.
- No live bank feed, bank API, credential handling, payment initiation, deposit, card settlement, cheque lifecycle, provider abstraction, VAT/ZATCA/report change, hosted/customer-data behavior, or production readiness claim was added.
- Recommended next prompt: `Wafeq banking treasury: bank deposit batches`.

2026-06-13 Wafeq banking import duplicate/idempotency/reconciliation safety hardening:

- PR `#34` `Wafeq banking inline statement transaction review` was reverified green/safe and merged into `main` at `43c428f6` before this branch was created.
- Added service-level deterministic import row identity using bank account profile, date, signed amount, currency, normalized description, normalized reference, normalized bank reference, and normalized counterparty.
- Bank reference is preferred for high-confidence duplicate detection when present; imports without bank reference fall back to the full normalized fingerprint.
- Preview now reports duplicate-in-file, high-confidence existing duplicates, possible existing duplicates, closed reconciliation overlaps, open reconciliation overlaps, currency mismatches, importable rows, blocked rows, and row-level warning actions.
- Full import blocks invalid rows, existing duplicate rows, and closed reconciliation overlaps. Partial import imports only safe rows and reports skipped invalid/duplicate/closed-period counts.
- No schema migration or DB-level unique fingerprint/index was added; that remains future hardening if database-enforced idempotency is needed.
- No live bank feed, bank API, credential handling, payment initiation, bank rule, deposit, card settlement, cheque lifecycle, provider abstraction, reconciliation-state change, accounting posting change, hosted/customer-data behavior, or production readiness claim was added.
- Recommended next prompt: `Wafeq banking automation: bank rules engine`.

2026-06-13 Wafeq banking inline statement transaction review workspace:

- PR `#33` `Wafeq banking XLSX statement import and template UX` was reverified green/safe and merged into `main` at `342120a9` before this branch was created.
- Added the Prompt 2 Wafeq-style inline statement transaction review workspace on `/bank-accounts/[id]/statement-transactions`.
- The workspace shows imported rows with date, description, reference, bank reference, counterparty, currency, debit, credit, current row status, needs-review badges, candidate summary, and a link to the full detail page.
- Filters now cover all, unmatched, matched, categorized, ignored, needs review, debit, and credit; local search covers description, reference, bank reference, and counterparty; sorting covers date, amount, and status.
- Row-level candidate preview and match confirmation reuse the existing match-candidates and match endpoints.
- Row-level categorize/ignore and bulk categorize/ignore reuse the existing single-row APIs and report partial failures without hiding failed rows.
- No backend endpoint, DTO, schema migration, reconciliation-state change, accounting posting change, bank rule, live bank feed, bank API call, bank credential handling, payment initiation, deposit, card settlement, cheque, hosted/customer-data behavior, or production readiness claim was added.
- Recommended next prompt: `Wafeq banking foundation: import duplicate idempotency and reconciliation safety hardening`.

2026-06-12 Wafeq banking XLSX statement import and template UX:

- PR `#32` `Backup and restore proof harness` was reverified green/safe and merged into `main` at `0bb4e721` before this branch was created.
- Added Wafeq-style manual banking foundation scope: downloadable CSV statement template plus XLSX statement preview/import support.
- XLSX parsing is API-side only, uses the first worksheet, warns when extra worksheets are ignored, ignores empty rows, normalizes Excel dates/numeric cells, and fails malformed workbooks safely.
- Existing CSV/JSON/text/OFX/CAMT XML/MT940 behavior remains supported.
- The import page now makes manual-only/no-live-feed/no-bank-credential wording explicit and documents canonical columns.
- Added `docs/banking/WAFEQ_BANKING_FOUNDATION_PLAN.md`.
- Dependency change: `@ledgerbyte/api` now depends on `read-excel-file@9.2.0`; no browser XLSX parser dependency was added. An initial `xlsx` package attempt was rejected after audit reported unpatched high-severity advisories. ExcelJS is dev-only for generated workbook tests.
- No live bank feed, WIO/Lean/Tarabut integration, bank API call, bank credentials, payment initiation, bank rules, bank deposits, cheques, card settlements, schema migration, accounting posting change, reconciliation state change, hosted/customer-data behavior, or production readiness claim was added.
- Recommended next prompt: `Wafeq banking foundation: inline statement transaction review workspace`.

2026-06-12 Backup and restore proof harness:

- PR `#31` `Object storage proof validation` was reverified green/safe and merged into `main` at `a5b506d9` before this branch was created.
- Added `scripts/backup-restore-proof-harness.cjs` and `scripts/backup-restore-proof-harness.test.cjs`.
- Added package scripts `backup:restore-proof` and `test:backup-restore-proof`.
- Added `docs/production/BACKUP_RESTORE_PROOF_HARNESS.md`.
- Dry-run status is `BACKUP_RESTORE_PROOF_DRY_RUN_READY`.
- Local mock-cycle status is `BACKUP_RESTORE_MOCK_CYCLE_PASSED`.
- The proof harness is safe by default: no network calls, no database calls, no env-secret reads, no real backup/restore execution, and no customer-data handling.
- The harness validates synthetic manifest creation, synthetic metadata payload creation, checksum verification, record-count verification, restore simulation, and temp-directory cleanup only.
- Current remaining backup/restore blockers are hosted Supabase/Postgres backup/PITR proof, hosted restore-drill proof, object-storage backup proof, object-storage restore proof, RPO/RTO review, monitoring/alerting ownership, and disaster-recovery runbooks.
- Recommended next prompt: `Production trust implementation ticket 3: monitoring and runtime health proof`.

2026-06-12 Object storage proof validation:

- PR `#30` `Production trust foundation gate` merged into `main` at `4411634c` before this branch was created.
- Added `scripts/object-storage-proof-validate.cjs` and `scripts/object-storage-proof-validate.test.cjs`.
- Added package scripts `storage:proof-validate` and `test:storage-proof-validate`.
- Added `docs/production/OBJECT_STORAGE_PROOF_PLAN.md`.
- Dry-run status is `OBJECT_STORAGE_PROOF_DRY_RUN_READY`.
- Local mock-cycle status is `OBJECT_STORAGE_MOCK_CYCLE_PASSED`.
- The proof harness is safe by default: no network calls, no real bucket access, no secret-value output, and no real customer-file handling.
- The current runtime still keeps attachments database-backed by default and generated documents database-backed only. S3-compatible attachment support remains groundwork; generated-document S3 writes remain unimplemented.
- Current remaining storage blockers are real non-production bucket validation, object-storage backup proof, object-storage restore proof, generated-document runtime object-storage writes, signed URL support, lifecycle/retention/legal-hold enforcement, malware scanning, and production-scale migration/rollback proof.
- Recommended next prompt at the time: `Production trust implementation ticket 2: backup and restore proof harness`.

2026-06-12 VAT return truthfulness and filing-export foundation:

- PR `#28` `Banking parser QA and match suggestion foundation` was verified green, then merged into `main` at `848c210d`.
- VAT Return now stays explicitly accountant-review and tax-advisor-review only, with visible draft/internal-only wording and no official filing, submission, government-format export, or compliance claim.
- Added a dedicated internal review CSV export for VAT Return that reuses the existing finalized-document VAT report data without adding new VAT math, filing status changes, submission records, or authority calls.
- VAT Summary and VAT Return now use aligned output/input VAT labels and clearer account-basis versus source-document review guidance.
- VAT Return empty states now explain that only finalized sales invoices and finalized purchase bills are included, with safe action links back into the existing invoice, bill, and VAT Summary flows.
- Recommended next prompt: `Production trust foundation: storage backup monitoring and security gate`.

2026-06-12 Production trust foundation audit and readiness gate:

- PR `#29` was reverified green/safe and merged into `main` at `4e00557f` before this branch was created.
- Added `docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md`.
- Added `scripts/production-trust-foundation-gate.cjs` and `scripts/production-trust-foundation-gate.test.cjs`.
- Added package scripts `production:trust-foundation-gate` and `test:production-trust-foundation-gate`.
- The gate reads committed docs only. It makes no network call, no database call, no provider call, no env-secret read, no storage operation, no email send, and no ZATCA execution.
- Default status is `PRODUCTION_TRUST_FOUNDATION_PLANNING_ONLY`.
- Strict pass status is `PRODUCTION_TRUST_FOUNDATION_GATE_PASSED_WITH_BLOCKERS`, which means the repository is honest about missing production-trust work. It does not mean production-ready.
- Current production trust blockers remain hosted backup/PITR proof, hosted restore drill proof, object-storage restore proof, monitoring/alerting, runtime DB role and RLS/Data API hardening, MFA/session hardening, immutable audit export strategy, and billing/legal/support ownership.
- Recommended next prompt after that lane: `Production trust implementation ticket 2: backup and restore proof harness`.

2026-06-12 Banking 2.0 parser QA and match suggestion foundation:

- PR `#26` `Controlled beta statement workspace polish` was already merged into `main` at `b0f312fc` before this branch was cut.
- Added targeted manual parser QA for existing CSV, JSON, unsupported plain text, OFX, CAMT.053/CAMT.054, and MT940 support, including empty-file and raw-content-safe invalid-input handling.
- Added deterministic non-mutating match suggestion scoring for the existing match-candidates endpoint. Suggestions score amount/direction, date tolerance, reference, normalized counterparty text, and document-number signals.
- No live bank feed, external bank API, raw-file archive execution, automatic posting/matching/reconciliation, schema migration, seed/reset/delete, ZATCA, email, deploy, or production infrastructure change was performed.
- Banking/reconciliation remains controlled-beta only and still needs live feeds, certified target-bank parser coverage, transfer fees, FX handling, hosted/customer-data proof, broad banking E2E/smoke/full-test coverage, and accountant sign-off before production claims.
- Recommended next prompt: `Production trust foundation: storage backup monitoring and security gate`.

2026-06-11 ZATCA PDF-A3 Approval Gate update:

- PR `#16` `ZATCA clearance reporting approval gate` was verified live, then merged into `main` with merge commit `edc306e6`.
- Added `docs/zatca/PDF_A3_APPROVAL_GATE.md`, `docs/zatca/PDF_A3_APPROVAL_RESULTS.md`, `docs/development/ZATCA_PDF_A3_APPROVAL_GATE_SPRINT_CLOSURE.md`, `scripts/zatca-pdf-a3-approval-gate.cjs`, and `scripts/zatca-pdf-a3-approval-gate.test.cjs`.
- Added root package scripts `zatca:pdf-a3-approval-gate` and `test:zatca-pdf-a3-approval-gate`.
- Observed default status is `PDF_A3_APPROVAL_BLOCKED`.
- The exact approval phrase with `--metadata-only` is recognized only as metadata approval and returns `PDF_A3_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No PDF-A3 was generated, no XML was embedded, no signed XML was embedded, no file was persisted, no object-storage/database/document-store write was executed, no invoice/customer data was read, and no signing/QR/ZATCA/clearance/reporting/production-compliance behavior was enabled.
- Current blockers are actual PDF-A3 generation, XML embedding, archive persistence, PDF/XML body handling, object-storage/database/document-store writes, and production compliance launch.
- Recommended next prompt: `ZATCA production compliance launch gate`.

2026-06-11 ZATCA Clearance Reporting Approval Gate update:

- PR `#15` `ZATCA signing and Phase 2 QR approval gate` was verified live, then merged into `main` with merge commit `154bbf82`.
- Added `docs/zatca/CLEARANCE_REPORTING_APPROVAL_GATE.md`, `docs/zatca/CLEARANCE_REPORTING_APPROVAL_RESULTS.md`, `docs/development/ZATCA_CLEARANCE_REPORTING_APPROVAL_GATE_SPRINT_CLOSURE.md`, `scripts/zatca-clearance-reporting-approval-gate.cjs`, and `scripts/zatca-clearance-reporting-approval-gate.test.cjs`.
- Added root package scripts `zatca:clearance-reporting-approval-gate` and `test:zatca-clearance-reporting-approval-gate`.
- Observed default status is `CLEARANCE_REPORTING_APPROVAL_BLOCKED`.
- The exact approval phrase with `--metadata-only` is recognized only as metadata approval and returns `CLEARANCE_REPORTING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No clearance was executed, no reporting was executed, no invoice or note was submitted, no ZATCA network call was made, no request body was created, no response body was processed, no CSID/token/secret/certificate/private-key was used, and no signing/QR/PDF-A3/production-compliance behavior was enabled.
- Current blockers are actual clearance execution, actual reporting execution, actual invoice/note submission, ZATCA API execution, request/response handling, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA PDF-A3 approval gate`.

2026-06-11 ZATCA Signing And Phase 2 QR Approval Gate update:

- PR `#14` `ZATCA sandbox CSID storage approval gate` was verified live, then merged into `main` with merge commit `ce2489a5`.
- Added `docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_GATE.md`, `docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_RESULTS.md`, `docs/development/ZATCA_SIGNING_AND_PHASE2_QR_APPROVAL_GATE_SPRINT_CLOSURE.md`, `scripts/zatca-signing-phase2-qr-approval-gate.cjs`, and `scripts/zatca-signing-phase2-qr-approval-gate.test.cjs`.
- Added root package scripts `zatca:signing-phase2-qr-approval-gate` and `test:zatca-signing-phase2-qr-approval-gate`.
- Observed default status is `SIGNING_PHASE2_QR_APPROVAL_BLOCKED`.
- The exact approval phrase with `--metadata-only` is recognized only as metadata approval and returns `SIGNING_PHASE2_QR_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No signing was executed, no QR was generated, no signed XML was generated, no private key/certificate/CSID was used, no SDK signing command was executed, and no ZATCA network/clearance/reporting/PDF-A3/production-compliance behavior was enabled.
- Current blockers are actual signing execution, actual Phase 2 QR generation, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA clearance reporting approval gate`.

2026-06-11 ZATCA Sandbox CSID Storage Approval Gate update:

- PR `#13` `ZATCA sandbox response custody approval gate` was verified live, then merged into `main` with merge commit `db8f058c`.
- Added `docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_RESULTS.md`, `docs/development/ZATCA_SANDBOX_CSID_STORAGE_APPROVAL_GATE_SPRINT_CLOSURE.md`, `scripts/zatca-sandbox-csid-storage-approval-gate.cjs`, and `scripts/zatca-sandbox-csid-storage-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-csid-storage-approval-gate` and `test:zatca-sandbox-csid-storage-approval-gate`.
- Observed default status is `SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED`.
- The exact approval phrase with `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_CSID_STORAGE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No custody provider was executed, no CSID was stored, no binary security token was stored, no CSID secret was stored, no certificate/private key/CSR was stored, no database write was executed, no secret-manager write was executed, no KMS/HSM/object-storage write was executed, and no request/response/network/adapter/signing/clearance/PDF-A3/production-compliance behavior was enabled.
- Current blockers are actual sandbox CSID storage execution, approved custody-provider implementation, signing, Phase 2 QR, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA signing and Phase 2 QR approval gate`.

2026-06-11 ZATCA Sandbox Response Custody Approval Gate update:

- PR `#12` `ZATCA sandbox response processing approval gate` was verified live, then merged into `main` with merge commit `d15884f8`.
- Added `docs/zatca/SANDBOX_RESPONSE_CUSTODY_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_RESPONSE_CUSTODY_APPROVAL_RESULTS.md`, `docs/development/ZATCA_SANDBOX_RESPONSE_CUSTODY_APPROVAL_GATE_SPRINT_CLOSURE.md`, `scripts/zatca-sandbox-response-custody-approval-gate.cjs`, and `scripts/zatca-sandbox-response-custody-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-response-custody-approval-gate` and `test:zatca-sandbox-response-custody-approval-gate`.
- Observed default status is `SANDBOX_RESPONSE_CUSTODY_APPROVAL_BLOCKED`.
- The exact approval phrase with `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_RESPONSE_CUSTODY_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No network request was executed, no adapter was executed, no request body was created, no response body was received, no response body was processed, no response custody was stored, no custody provider was executed, no secret-manager write was executed, no database write was executed, no object-storage write was executed, no real OTP was included, no CSID was requested, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Current blockers are real sandbox network execution, adapter execution, response body receipt, response processing approval, response custody approval, sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox CSID storage approval gate`.

2026-06-11 ZATCA Sandbox Response Processing Approval Gate update:

- PR `#11` `ZATCA sandbox network request approval gate` was verified live, then merged into `main` with merge commit `13bf16a5`.
- Added `docs/zatca/SANDBOX_RESPONSE_PROCESSING_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_RESPONSE_PROCESSING_APPROVAL_RESULTS.md`, `docs/development/ZATCA_SANDBOX_RESPONSE_PROCESSING_APPROVAL_GATE_SPRINT_CLOSURE.md`, `scripts/zatca-sandbox-response-processing-approval-gate.cjs`, and `scripts/zatca-sandbox-response-processing-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-response-processing-approval-gate` and `test:zatca-sandbox-response-processing-approval-gate`.
- Observed default status is `SANDBOX_RESPONSE_PROCESSING_APPROVAL_BLOCKED`.
- The exact approval phrase with `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_RESPONSE_PROCESSING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No network request was executed, no adapter was executed, no request body was created, no response body was received, no response body was processed, no response custody was stored, no real OTP was included, no CSID was requested, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Current blockers are real sandbox network execution, adapter execution, response body receipt, response processing approval, response custody approval, sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox response custody approval gate`.

2026-06-11 ZATCA Sandbox Network Request Approval Gate update:

- PR `#9` `ZATCA manual OTP capture approval gate` was merged into `main` with merge commit `a4190941`.
- PR `#10` `ZATCA request body creation approval gate` was merged into `main` with merge commit `feb32ccc`.
- Added `docs/zatca/SANDBOX_NETWORK_REQUEST_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_NETWORK_REQUEST_APPROVAL_RESULTS.md`, `docs/development/ZATCA_SANDBOX_NETWORK_REQUEST_APPROVAL_GATE_SPRINT_CLOSURE.md`, `scripts/zatca-sandbox-network-request-approval-gate.cjs`, and `scripts/zatca-sandbox-network-request-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-network-request-approval-gate` and `test:zatca-sandbox-network-request-approval-gate`.
- Observed default status is `SANDBOX_NETWORK_REQUEST_APPROVAL_BLOCKED`.
- The exact approval phrase with `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_NETWORK_REQUEST_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No network request was executed, no adapter was executed, no request body was created, no response body was processed, no real OTP was included, no CSID was requested, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Current blockers are real sandbox network execution, adapter execution, response processing approval, response custody approval, sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox response processing approval gate`.

2026-06-11 ZATCA Sandbox Request Body Creation Approval Gate update:

- PR `#9` `ZATCA manual OTP capture approval gate` and PR `#10` `ZATCA request body creation approval gate` were both merged into `main` before the network-request gate branch was created.
- Added `docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_RESULTS.md`, `docs/development/ZATCA_SANDBOX_REQUEST_BODY_CREATION_APPROVAL_GATE_SPRINT_CLOSURE.md`, `scripts/zatca-sandbox-request-body-creation-approval-gate.cjs`, and `scripts/zatca-sandbox-request-body-creation-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-request-body-creation-approval-gate` and `test:zatca-sandbox-request-body-creation-approval-gate`.
- Observed default status is `REQUEST_BODY_CREATION_APPROVAL_BLOCKED`.
- The exact approval phrase with `--metadata-only` is recognized only as metadata approval and returns `REQUEST_BODY_CREATION_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No request body was created, no real OTP was included, no CSID was requested, no ZATCA network call was made, no response body was processed, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Current blockers are actual request body creation, real sandbox network request approval, response processing approval, response custody approval, sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox network request approval gate`.

2026-06-11 ZATCA Manual OTP Capture Approval Gate update:

- Added `docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_GATE.md`, `docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_RESULTS.md`, `docs/development/ZATCA_MANUAL_OTP_CAPTURE_APPROVAL_GATE_SPRINT_CLOSURE.md`, `scripts/zatca-manual-otp-capture-approval-gate.cjs`, and `scripts/zatca-manual-otp-capture-approval-gate.test.cjs`.
- Added root package scripts `zatca:manual-otp-capture-approval-gate` and `test:zatca-manual-otp-capture-approval-gate`.
- Observed default status is `MANUAL_OTP_CAPTURE_APPROVAL_BLOCKED`.
- The exact approval phrase with `--metadata-only` is recognized only as metadata approval and returns `MANUAL_OTP_CAPTURE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No OTP was captured, no OTP value was stored, no OTP value was shared with Codex, no CSID was requested, no ZATCA network call was made, no request body was created, no response body was processed, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Current blockers are manual OTP execution, request body creation approval, real sandbox network request approval, response processing approval, response custody approval, sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox request body creation approval gate`.

2026-06-06 ZATCA Sandbox CSID Preflight Guard update:

- Added `scripts/zatca-sandbox-csid-preflight.cjs`, `scripts/zatca-sandbox-csid-preflight.test.cjs`, `docs/zatca/SANDBOX_CSID_PREFLIGHT_GUARD.md`, and `docs/zatca/SANDBOX_CSID_PREFLIGHT_RESULTS.md`.
- Added root package scripts `zatca:sandbox-csid-preflight` and `test:zatca-sandbox-csid-preflight`.
- Current preflight status is `PREFLIGHT_BLOCKED`. The guard verifies local reference presence, CSR keys, code surfaces, package scripts, env presence booleans, sandbox adapter blocking, mock-only adapter status, and custody blockers.
- It did not request OTPs, request CSIDs, call ZATCA, execute the sandbox adapter, expose private-key/certificate/CSID/token/header/request/response bodies, generate signed XML/QR payloads, enable production signing, deploy, migrate, seed, reset, delete, or send email.
- Current blockers are key custody, CSID response custody, sandbox adapter execution, OTP approval, compliance CSID request approval, and production signing. Completed follow-up: `ZATCA sandbox OTP and compliance CSID approval plan`; recommended next prompt: `ZATCA sandbox CSID request execution guard`.

2026-06-06 ZATCA Sandbox OTP And Compliance CSID Approval Plan update:

- Added `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_PLAN.md`, `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`, and `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RESULTS.md`.
- Extended `scripts/zatca-sandbox-csid-preflight.cjs` and its tests with planning-only `--approval-phrase` plus `--approval-plan` recognition.
- Observed approval status is `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- The approval phrase was recognized for planning only. No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no secrets/bodies were exposed, and production signing/compliance remained disabled.
- Current blockers are key custody, CSID response custody, sandbox adapter execution guard, actual OTP capture approval, compliance CSID request execution approval, and production signing. Recommended next prompt: `ZATCA sandbox CSID request execution guard`.

2026-06-07 ZATCA CSID Response Custody Implementation Plan update:

- Added `docs/zatca/CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md`, `docs/zatca/CSID_RESPONSE_CUSTODY_GUARD.md`, `docs/zatca/CSID_RESPONSE_CUSTODY_RESULTS.md`, `scripts/zatca-csid-response-custody-guard.cjs`, and `scripts/zatca-csid-response-custody-guard.test.cjs`.
- Added root package scripts `zatca:csid-response-custody-guard` and `test:zatca-csid-response-custody-guard`.
- Observed custody guard status is `CUSTODY_METADATA_SIMULATION_BLOCKED` with the exact metadata-only custody approval phrase and simulation flag.
- The guard found the disabled custody provider, metadata-only custody model, and legacy raw PEM-capable fields (`privateKeyPem`, `complianceCsidPem`, `productionCsidPem`).
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no real response body was processed, no DB connection or write was attempted, no token/secret/certificate body was persisted, no env values were printed, and no secrets/bodies were exposed.
- Current blockers are custody provider implementation/approval, legacy raw PEM-capable fields, real response-body processing approval, DB write approval, CSID request approval, sandbox adapter execution approval, production signing, production CSID lifecycle, clearance/reporting, PDF-A3, signed artifact storage, official reviews, and repeatable SDK CI. Completed follow-up: `ZATCA sandbox adapter execution approval plan`.

2026-06-07 ZATCA Sandbox Adapter Execution Approval Plan update:

- Added `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`, `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`, `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-adapter-execution-approval.cjs`, and `scripts/zatca-sandbox-adapter-execution-approval.test.cjs`.
- Added root package scripts `zatca:sandbox-adapter-execution-approval` and `test:zatca-sandbox-adapter-execution-approval`.
- Observed approval status is `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED` with the exact planning phrase and `--adapter-execution-approval`.
- Observed execute-adapter status is `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- The guard found the sandbox adapter, disabled adapter, mock-only adapter, custody prerequisites, and request/response body handling risks.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no request body was created, no response body was processed, no DB connection or write was attempted, no env values were printed, and no secrets/bodies were exposed.
- Current blockers are CSID response custody provider approval, legacy raw PEM-capable fields, request/response body approval, env gate approval, OTP capture approval, CSID request approval, real network approval, adapter execution approval, production signing, production CSID lifecycle, clearance/reporting, PDF-A3, signed artifact storage, official reviews, and repeatable SDK CI. Recommended next prompt: `ZATCA sandbox adapter mock-to-real boundary test plan`.

2026-06-07 ZATCA Sandbox Adapter Mock-to-Real Boundary Test Plan update:

- Added `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md`, `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md`, `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md`, `scripts/zatca-sandbox-adapter-boundary-check.cjs`, and `scripts/zatca-sandbox-adapter-boundary-check.test.cjs`.
- Added root package scripts `zatca:sandbox-adapter-boundary-check` and `test:zatca-sandbox-adapter-boundary-check`.
- Observed boundary status is `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS` using `--plan --no-network --json --static-only`.
- The guard found the sandbox adapter, disabled fail-closed adapter, mock-only adapter, env gate source references, request/response risk markers, and custody dependency by static inspection only.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no mock adapter was executed, no request body was created, no response body was processed, no DB connection or write was attempted, no env values were printed, and no secrets/bodies were exposed.
- Current blockers are CSID response custody provider approval, legacy raw PEM-capable fields, request/response body approval, env gate approval, OTP capture approval, CSID request approval, real network approval, adapter execution approval, production signing, production CSID lifecycle, clearance/reporting, PDF-A3, signed artifact storage, official reviews, repeatable SDK CI, and future no-network adapter contract tests. Completed follow-up: `ZATCA sandbox adapter no-network contract tests`.

2026-06-07 ZATCA Sandbox Adapter No-Network Contract Tests update:

- Added `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_TESTS.md`, `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md`, `scripts/zatca-sandbox-adapter-no-network-contract.cjs`, and `scripts/zatca-sandbox-adapter-no-network-contract.test.cjs`.
- Added root package scripts `zatca:sandbox-adapter-no-network-contract` and `test:zatca-sandbox-adapter-no-network-contract`.
- Observed contract status is `NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS` using `--plan --no-network --json --contract`.
- The guard installs a local no-network trap and detects sandbox, disabled, and mock adapter contract surfaces by static inspection only.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no mock or disabled adapter was executed, no request body was created, no response body was processed, no DB connection or write was attempted, no env values were printed, and no secrets/bodies were exposed.
- Current blockers are CSID dry-run request body schema planning, CSID response custody provider approval, legacy raw PEM-capable fields, request/response body approval, env gate approval, OTP capture approval, CSID request approval, real network approval, adapter execution approval, production signing, production CSID lifecycle, clearance/reporting, PDF-A3, signed artifact storage, official reviews, and repeatable SDK CI. Recommended next prompt: `ZATCA sandbox CSID dry-run request body schema plan`.

2026-06-06 ZATCA Key Custody and CSID Lifecycle Design update:

- Added `docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`, `docs/zatca/CSID_LIFECYCLE_CHECKLIST.md`, and `docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md`.
- This is docs-only design/readiness metadata. It did not request OTPs, request compliance CSIDs, request production CSIDs, call ZATCA, generate production credentials, execute signing, persist signed XML, persist QR payloads, run clearance/reporting, implement PDF/A-3, deploy, migrate, seed, reset, delete, send email, or change production/beta data.
- Current key finding: existing legacy EGS PEM-capable fields are not production-acceptable custody; metadata-only CSID custody records and a disabled custody-provider boundary exist; real sandbox CSID HTTP and production CSID remain blocked.
- Recommended custody model: KMS/HSM/external signing or equivalent custody for production private keys, with application tables storing metadata only. Secrets manager may be a controlled interim only for non-production/sandbox CSID token/secret/certificate custody after approval.
- Remaining blockers include sandbox OTP/CSID preflight, compliance CSID lifecycle, production CSID lifecycle, production key custody, production signing, Phase 2 QR proof, clearance/reporting, PDF/A-3, error/retry queue, production signed-artifact storage, official/legal/accounting review, and repeatable SDK CI.

2026-06-06 ZATCA Preparation and Key Custody Sprint update:

- Closure doc: `docs/development/ZATCA_PREPARATION_KEY_CUSTODY_SPRINT_CLOSURE.md`.
- Created ZATCA preparation documents for environment separation, key custody decision drafting, invoice eligibility, audit evidence, sandbox onboarding, and official SDK validation readiness.
- Extended the existing read-only ZATCA readiness metadata and settings UI with preparation gates that state production compliance, real network calls, signing, clearance/reporting, and PDF/A-3 remain disabled.
- This is preparation and safe local readiness only. It does not request OTP, request compliance or production CSID, generate or store real private keys, sign invoices, clear/report invoices, create PDF/A-3, call real ZATCA networks, mutate invoice/accounting data, or claim production compliance.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

2026-06-06 Official ZATCA SDK Validation Pipeline Sprint update:

- Closure doc: `docs/development/ZATCA_OFFICIAL_SDK_VALIDATION_PIPELINE_SPRINT_CLOSURE.md`.
- Added `corepack pnpm zatca:sdk-validate-local` as a local/no-network metadata-only official SDK validation wrapper for official standard/simplified invoice samples and LedgerByte local XML fixture IDs.
- Added the fixture registry, evidence format, and evidence directory policy under `docs/zatca/`, with a sanitized sample evidence JSON.
- Extended the existing read-only ZATCA readiness metadata and settings UI with SDK pipeline, command, fixture registry, evidence format, no-network mode, and latest evidence status fields.
- The wrapper currently finds the local SDK but safely blocks validation under default Java `17.0.16`; it requires Java 11-14 or `ZATCA_SDK_JAVA_BIN` pointing to a compatible runtime.
- This sprint does not request OTP, request compliance or production CSID, generate or store real private keys, sign invoices, clear/report invoices, create PDF/A-3, call real ZATCA networks, mutate invoice/accounting data, or claim production compliance.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

2026-06-06 ZATCA Local Generated XML Fixture Validation Sprint update:

- Closure doc: `docs/development/ZATCA_LOCAL_GENERATED_XML_FIXTURE_VALIDATION_SPRINT_CLOSURE.md`.
- Added deterministic sanitized local XML fixture generation for `ledgerbyte-generated-standard-invoice` and `ledgerbyte-generated-credit-note`.
- Validated both generated fixtures through the local official SDK wrapper under Java 11.0.26 with no-network metadata-only evidence at `docs/zatca/evidence/generated-xml-fixture-validation-20260606.json`.
- Default Java 17 remains safely blocked as unsupported for the official SDK range; `ZATCA_SDK_JAVA_BIN` can point to Java 11-14 without changing global Java or committing machine-specific defaults.
- Extended read-only ZATCA readiness metadata and settings UI with generated fixture statuses, latest generated fixture evidence status, runtime blocker visibility, `noNetworkOnly=true`, and `productionCompliance=false`.
- This sprint does not request OTP, request compliance or production CSID, generate or store real private keys, sign invoices, clear/report invoices, create PDF/A-3, call real ZATCA networks, mutate production/beta data, send email, deploy, or claim production compliance.

2026-06-06 ZATCA SDK CI Readiness Guard update:

- Added `corepack pnpm zatca:sdk-ci-readiness -- --plan --no-network --json` and `corepack pnpm test:zatca-sdk-ci-readiness`.
- Added `docs/zatca/ZATCA_SDK_CI_RUNNER_PLAN.md`.
- Current guard status is `CI_BLOCKED_MISSING_SDK_REFERENCE`: the official SDK exists locally under ignored `reference/`, but it is not reproducible from a fresh checkout; default Java 17 is also unsupported.
- PR CI remains non-ZATCA. SDK validation is not enabled in GitHub Actions, and XML bodies must not be uploaded as artifacts.
- Real network calls, signing, CSID/OTP, clearance/reporting, PDF/A-3, production credentials, email, deploys, migrations, seed/reset/delete, production/beta/customer data mutation, and production compliance remain disabled.

2026-06-06 ZATCA Local Signed XML Validation Plan update:

- Added `docs/zatca/LOCAL_SIGNED_XML_VALIDATION_PLAN.md`.
- Added `corepack pnpm zatca:local-signed-xml-plan -- --plan --no-network --json` and `corepack pnpm test:zatca-local-signed-xml-plan`.
- The guard is metadata-only and blocked by default. It inspects SDK/reference, Java, generated fixture, and documented command readiness without running SDK `-sign`, `-qr`, `-generateHash`, or signed XML validation.

2026-06-06 ZATCA Approved Local Dummy Signing Execution update:

- Added `docs/zatca/LOCAL_DUMMY_SIGNING_EXECUTION_RESULTS.md`.
- Added metadata-only evidence at `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`.
- The approved local dummy-material run used explicit Java `11.0.26` and SDK `238-R3.4.8`; generated standard invoice and credit-note fixtures passed SDK sign, QR, and signed XML validation stages.
- Temp unsigned/signed XML and SDK runtime/config copies were cleaned up. Evidence excludes XML bodies, signed XML bodies, QR payload bodies, private-key bodies, certificate bodies, OTPs, CSID material, tokens, headers, request/response bodies, and customer/vendor payloads.
- This remains local-only SDK evidence. It does not enable production signing, CSID/OTP, real ZATCA network calls, clearance/reporting, PDF/A-3, signed artifact persistence, or production compliance.
- No signing was executed, no CSID/OTP/network was used, no private-key/certificate body was exposed, and production compliance remains false.

2026-05-30 DEV-11 implementation-status update:

- Closure doc: `docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md`.
- The local evidence covers marker fixture math, manual sales stock issue COGS post/reverse, compatible purchase receipt asset post/reverse, clearing variance proposal lifecycle, inventory valuation reports, clearing reports, GL, Trial Balance, P&L, Balance Sheet, dashboard totals, and no-body/no-secret checks.
- Inventory accounting is not production-complete. FIFO/cost layers, landed-cost posting/valuation update, automatic posting, negative-stock production policy, serial/batch/bin/location, purchase return inventory/accounting impact, sales returns inventory impact, historical direct-mode migration, multi-currency inventory, transfer-fee/landed allocation, accountant review, generated-document retention, hosted/beta/customer-data proof, broad E2E/smoke/full-test coverage, and load/concurrency proof remain open.

2026-05-30 DEV-12 implementation-status update:

- Closure doc: `docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_CLOSURE.md`.
- The local evidence covers marker `DEV12-DOC-20260530T000000`, one synthetic DB-backed generated document, safe metadata list/detail/filter checks, one approved local download metadata/hash check, storage readiness and migration dry-run counts, and retention/legal-hold cleanup policy preflight.
- Generated-document storage is not production-complete. Object storage for generated documents, database/base64 migration, signed URLs, lifecycle policy, legal hold, tax/accounting retention approval, customer-data deletion/retention conflict handling, malware scanning, backup proof, restore proof, purge execution, versioning/supersede policy, PDF/A-3/ZATCA artifact boundaries, hosted/beta/customer-data proof, broad E2E/smoke/full-test coverage, load/concurrency for large PDFs, and accountant/legal review remain open.

2026-06-03 Accountant Workflow Sprint update:

- Closure doc: `docs/development/ACCOUNTANT_WORKFLOW_SPRINT_CLOSURE.md`.
- Accountant-feedback changes were implemented for navigation consolidation, customer/supplier ledger visibility, visible invoice number sequence preview, invoice-line revenue-account coding, tax exclusive/inclusive/no-tax invoice calculation modes, a dedicated operational Tax workspace, a VAT Return frontend route, and Chart of Accounts next-code suggestion.
- This is controlled beta/user-testing product development only. It does not implement recurring invoices, quotes/proformas, live bank feeds, payment gateway capture, real email sending, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, or hosted/customer-data proof.

2026-06-03 Sales Quote / Proforma Workflow Sprint update:

- Closure doc: `docs/development/SALES_QUOTES_PROFORMAS_SPRINT_CLOSURE.md`.
- Added non-posting tenant-scoped sales quotes/proformas with quote numbering, customer selection, revenue-account coded lines, tax exclusive/inclusive/no-tax totals, lifecycle actions, customer transaction-history visibility, and conversion into a draft sales invoice.
- Quotes/proformas do not post journals, update AR or VAT balances, affect reports/aging/dashboard financial totals, update inventory, send email, or call ZATCA behavior.
- This is controlled beta/user-testing product development only. It does not implement recurring invoices, delivery notes, quote PDFs/archive, online acceptance, payment gateway capture, real email sending, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, or hosted/customer-data proof.

2026-06-04 Quote PDF / Archive Sprint update:

- Closure doc: `docs/development/QUOTE_PDF_ARCHIVE_SPRINT_CLOSURE.md`.
- Added safe Sales Quote PDF output and generated-document archive support for non-posting sales quotes/proformas.
- Quote PDFs are titled `Sales Quote`, include non-posting wording, and do not imply tax invoice status, AR posting, VAT filing, ZATCA clearance/reporting, PDF/A-3, email delivery, payment, or production compliance.
- This is controlled beta/user-testing product development only. It does not implement online acceptance, customer email sending, delivery notes, recurring invoices, payment gateway capture, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, or hosted/customer-data proof.

2026-06-04 Focused Quote Workflow Browser Sprint update:

- Closure doc: `docs/development/QUOTE_BROWSER_WORKFLOW_SPRINT_CLOSURE.md`.
- Added focused mocked Playwright browser coverage for sales quote list, create, detail, edit, lifecycle actions, tax modes, account-coded lines, PDF download, generated-document archive metadata/download, conversion to draft invoice, and customer non-posting quote activity.
- The sprint found no quote product-code defects; changes were limited to browser coverage and documentation.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.
- This is controlled beta/user-testing product development only. It does not implement online acceptance, customer email sending, delivery notes, recurring invoices, payment gateway capture, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, deployed E2E, or hosted/customer-data proof.

2026-06-04 Recurring Invoices Sprint update:

- Closure doc: `docs/development/RECURRING_INVOICES_SPRINT_CLOSURE.md`.
- Added non-posting recurring invoice templates with `REC-` numbering, account-coded lines, tax exclusive/inclusive/no-tax totals, weekly/monthly/quarterly/yearly schedule preview, lifecycle actions, customer non-posting activity visibility, duplicate-run prevention, and manual generation into draft sales invoices.
- Recurring templates do not post journals, affect AR/revenue/VAT/inventory, create generated documents, send email, collect payment, run a scheduler, or call ZATCA behavior.
- This is controlled beta/user-testing product development only. It does not implement delivery notes, automatic scheduling, customer email sending, payment gateway capture, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, deployed E2E, or hosted/customer-data proof.

2026-06-04 Focused Recurring Invoice Browser Workflow Sprint update:

- Closure doc: `docs/development/RECURRING_INVOICE_BROWSER_WORKFLOW_SPRINT_CLOSURE.md`.
- Added focused mocked Playwright browser coverage for recurring invoice list, create, detail, edit, schedule preview, tax modes, account-coded lines, lifecycle actions, restricted-role behavior, duplicate generation blocking, manual draft-invoice generation, generated invoice link, global create/search behavior, and customer non-posting activity.
- The sprint found two frontend confidence gaps and fixed them: the form now shows a visible schedule-preview panel, and the detail page now shows `Last run` after generation. No backend accounting, posting, tenant, permission, VAT, AR, email, payment, or ZATCA defects were found.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.
- This is controlled beta/user-testing product development only. It does not implement delivery notes, automatic scheduling, customer email sending, payment gateway capture, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, deployed E2E, or hosted/customer-data proof.

2026-06-04 Delivery Notes Sprint update:

- Closure doc: `docs/development/DELIVERY_NOTES_SPRINT_CLOSURE.md`.
- Added non-posting delivery notes with `DN-` numbering, draft/edit, issue, mark delivered, cancel, void, customer/source invoice/accepted quote links, optional backend sales-stock-issue reference support, safe Delivery Note PDF/archive output, customer non-posting fulfillment activity, navigation, global create/search exposure, and targeted API/frontend tests.
- Delivery notes do not post journals, affect AR/revenue/VAT/customer balances/reports, send email, collect payment, call ZATCA, create PDF/A-3, or move inventory by themselves.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.
- This is controlled beta/user-testing product development only. It does not implement automatic inventory movement, logistics/carrier integration, customer email sending, payment gateway capture, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, deployed E2E, or hosted/customer-data proof.

2026-06-04 Focused Delivery Note Browser Workflow Sprint update:

- Closure doc: `docs/development/DELIVERY_NOTE_BROWSER_WORKFLOW_SPRINT_CLOSURE.md`.
- Added focused mocked Playwright browser coverage for delivery-note list, create, detail, edit, issue, mark delivered, PDF/archive metadata/download, customer non-posting activity, source invoice/accepted quote copy paths, restricted permissions, global create, and global search.
- The sprint found two delivery-note UI confidence gaps and fixed them: voided source invoices are no longer shown as source options, and the generated-document archive filter now includes Delivery Note rows.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.
- This is controlled beta/user-testing product development only. It does not implement automatic inventory movement, logistics/carrier integration, customer email sending, payment gateway capture, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, deployed E2E, or hosted/customer-data proof.

2026-06-04 Delivery Note Source Visibility and Wording Sprint update:

- Closure doc: `docs/development/DELIVERY_NOTE_SOURCE_VISIBILITY_WORDING_SPRINT_CLOSURE.md`.
- Added related delivery-note panels on sales invoice and sales quote detail pages using the existing tenant-scoped delivery-note list data, plus clearer source invoice, source quote, and reference-only stock issue cards on delivery-note detail.
- Tightened Delivery Note wording across the touched source surfaces so the workflow stays explicitly non-posting and does not imply AR creation, VAT filing, ZATCA, payment, email, or automatic stock movement.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.
- This is controlled beta/user-testing product development only. It does not implement automatic inventory movement, stock issue picker UI, logistics/carrier integration, customer email sending, payment gateway capture, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, deployed E2E, or hosted/customer-data proof.

2026-06-04 Collections Workflow Sprint update:

- Closure doc: `docs/development/COLLECTIONS_WORKFLOW_SPRINT_CLOSURE.md`.
- Added controlled non-payment-gateway Sales/AR collections workflow with `COL-` numbering, tenant-scoped collection cases and activities, promise-to-pay/dispute/hold/close lifecycle actions, summary workspace, invoice detail visibility, customer detail visibility, global create/search exposure, and audit logging.
- Collection cases do not post journals, allocate payments, create customer payments, create credit notes/refunds, alter invoice totals, alter invoice balances, change customer statement balances, send email, create payment links, file VAT, call ZATCA, or move inventory.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.
- This is controlled beta/user-testing product development only. It does not implement real email sending, automated reminders, background schedulers, payment gateways, legal debt collection tooling, customer portals, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, deployed E2E, or hosted/customer-data proof.

2026-06-04 Focused Collections Browser Workflow Sprint update:

- Closure doc: `docs/development/COLLECTIONS_BROWSER_WORKFLOW_SPRINT_CLOSURE.md`.
- Added focused mocked Playwright browser coverage for collections workspace, new case, detail, edit, lifecycle actions, activity timeline, promise/dispute/hold/start/close states, invoice related collection cases, customer collections panel, restricted permissions, global create, and global search.
- The sprint found and fixed collections UI confidence gaps: the workspace now exposes full summary data, the form shows selected invoice due date and aging bucket context, on-hold cases can be started again through the UI, payment received note wording is explicitly note-only, and related panels use readable activity labels instead of raw enum values.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.
- This is controlled beta/user-testing product development only. It does not implement real email sending, automated reminders, background schedulers, payment gateways, legal debt collection tooling, customer portals, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, deployed E2E, or hosted/customer-data proof.

2026-06-04 Focused Dashboard / Accountant Threshold Review Sprint update:

- Closure doc: `docs/development/DASHBOARD_ATTENTION_THRESHOLD_REVIEW_SPRINT_CLOSURE.md`.
- Added `docs/development/DASHBOARD_SALES_AR_ATTENTION_THRESHOLD_POLICY.md` to define Sales/AR dashboard attention windows, inclusion/exclusion rules, ordering, top limits, empty states, permissions, and read-only safety boundaries.
- Hardened dashboard Sales/AR attention logic with named policy constants, separate quote/recurring date windows, deterministic top-row ordering, active sent-quote handling, and exact conservative empty states.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.
- This is controlled beta/user-testing product development only. It does not implement real email sending, automated reminders, background schedulers, payment gateways, legal debt collection tooling, customer portals, production billing, production hosting, object-storage migration, real ZATCA CSID/signing/clearance/reporting, official VAT filing submission, deployed E2E, hosted/customer-data proof, or dashboard mutation actions.

2026-06-05 Local Sales/AR Fixture Idempotency Execute Route Metadata update:

- Closure doc: `docs/development/SALES_AR_LOCAL_FIXTURE_IDEMPOTENCY_EXECUTE_ROUTE_METADATA_CLOSURE.md`.
- The local-only marker fixture `SALES-AR-WALKTHROUGH-20260604` now completes through customer, items, invoices, payment, credit note/allocation, refund, quotes, quote conversion, recurring template, generated draft invoice, delivery notes, collection cases, and collection activities.
- Metadata-only local route checks returned HTTP `200` for the Sales/AR dashboard, customer, invoice, quote, recurring invoice, delivery note, collections, reports, and tax routes that were checked. `/documents` was not run because generated-document count was `0`.
- No accountant review, accountant approval, PDF metadata check, hosted/customer-data proof, real email, payment gateway, VAT filing, ZATCA, seed/reset/delete, cleanup/delete, broad E2E, or OS power command was run.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-05 Purchase Matching Exception Center update:

- Closure doc: `docs/development/PURCHASE_MATCHING_EXCEPTION_CENTER_SPRINT_CLOSURE.md`.
- Added a read-only purchase matching exception center at `GET /purchase-matching/exceptions` and `/purchases/matching`.
- Exceptions are grouped by supplier and severity across purchase orders, purchase bills, and purchase receipts, with filters for supplier, severity, exception type, source type, and search.
- This sprint did not post journals, book variances, change AP balances, change inventory quantities, mutate source purchase documents, create purchase returns, send email, call ZATCA, run hosted/customer-data workflows, run seed/reset/delete, or run OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-05 Purchase Matching Review Workflow update:

- Closure doc: `docs/development/PURCHASE_MATCHING_REVIEW_WORKFLOW_SPRINT_CLOSURE.md`.
- Policy doc: `docs/development/PURCHASE_MATCHING_REVIEW_POLICY.md`.
- Added schema-backed purchase matching review tracking with status, reason code, assignment, review dates, and safe notes for PO/bill/receipt matching exceptions.
- Added review lifecycle endpoints under `purchase-matching`, review metadata and filters in `GET /purchase-matching/exceptions`, review-only actions on `/purchases/matching`, and review status visibility on source matching panels.
- Added audit logging for review lifecycle transitions without logging full note bodies or document bodies.
- This sprint did not post journals, book variances, change AP balances, change inventory quantities, mutate source purchase documents, create purchase returns, send email, call ZATCA, run hosted/customer-data workflows, run seed/reset/delete, or run OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-05 Purchase Returns Workflow update:

- Closure doc: `docs/development/PURCHASE_RETURNS_WORKFLOW_SPRINT_CLOSURE.md`.
- Policy doc: `docs/development/PURCHASE_RETURNS_POLICY.md`.
- Added schema-backed operational purchase returns with `PRN-` numbering, draft/submit/approve/complete/cancel/void lifecycle, source links to suppliers, purchase bills, purchase orders, purchase receipts, and `NEEDS_RETURN_REVIEW` matching reviews.
- Added `GET/POST/PATCH /purchase-returns` endpoints and lifecycle endpoints, frontend routes under `/purchases/returns`, matching exception center links, matching panel return metadata, supplier activity visibility, and neutral supplier ledger rows.
- Purchase returns remain non-posting: they do not post journals, change AP balances, change purchase bill balances, create debit notes/refunds automatically, move inventory, book variances, affect VAT/financial reports, send email, call ZATCA, run hosted/customer-data workflows, run seed/reset/delete, or run OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-05 Inventory Valuation Variance Preview update:

- Closure doc: `docs/development/INVENTORY_VALUATION_VARIANCE_PREVIEW_SPRINT_CLOSURE.md`.
- Policy doc: `docs/development/INVENTORY_VALUATION_VARIANCE_PREVIEW_POLICY.md`.
- Added read-only valuation variance preview endpoints under `/inventory/valuation-variances`, including summary and source-specific purchase receipt, purchase bill, and matching review views.
- Added `/inventory/valuation-variances` with supplier grouping, filters, summary cards, source document links, preview variance amount/type/severity/action, and source panels/links from purchase receipts, bills, returns, and matching review surfaces.
- This sprint did not post journals, reverse journals, book variances, change AP balances, change purchase bill balances, change inventory quantities, change moving average, create FIFO layers, create purchase returns, create debit notes/refunds, change landed cost, send email, call ZATCA, affect VAT/financial reports, run hosted/customer-data workflows, run seed/reset/delete, or run OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-05 Supplier/AP Dashboard Improvements update:

- Closure doc: `docs/development/SUPPLIER_AP_DASHBOARD_SPRINT_CLOSURE.md`.
- Policy doc: `docs/development/SUPPLIER_AP_DASHBOARD_ATTENTION_POLICY.md`.
- Added read-only Supplier/AP dashboard endpoints at `GET /contacts/suppliers/ap-dashboard` and `GET /contacts/suppliers/:id/ap-summary`.
- Added `/purchases/ap-dashboard` with AP summary cards, top supplier panels, due bill, matching exception, purchase return, valuation variance preview, and recent supplier activity lists.
- Enhanced supplier detail with a Supplier AP Summary panel and financial posting versus operational/non-posting activity grouping.
- Purchase returns remain operational/non-posting, valuation variance previews remain read-only, and matching reviews classify exceptions only.
- This sprint did not post journals, reverse journals, book variances, change AP balances, change bill balances, create supplier payments, create debit notes/refunds, create/approve/complete purchase returns automatically, change inventory quantities/valuation, change landed cost/FIFO, send email, call ZATCA, affect VAT/financial reports, run hosted/customer-data workflows, run seed/reset/delete, or run OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-05 Inventory Returns Integration update:

- Closure doc: `docs/development/INVENTORY_RETURNS_INTEGRATION_SPRINT_CLOSURE.md`.
- Policy doc: `docs/development/INVENTORY_RETURNS_INTEGRATION_POLICY.md`.
- Added explicit operational purchase return stock-out movement preview and post endpoints at `GET /purchase-returns/:id/inventory-return-preview` and `POST /purchase-returns/:id/post-inventory-return`.
- Added `PURCHASE_RETURN_OUT` movement support, reserved `SALES_RETURN_IN`, purchase-return movement status visibility, linked movement IDs, Supplier/AP dashboard movement counts, and valuation variance preview context for posted purchase-return stock-out.
- Sales return stock-in is deferred because existing credit notes do not safely identify returned-stock warehouse/source stock issue or delivery line.
- This sprint did not post journals, reverse journals, change AP/AR balances, change bill/invoice balances, create debit notes/refunds, post variances, change landed cost/FIFO, affect VAT/financial reports, send email, call ZATCA, run hosted/customer-data workflows, run seed/reset/delete, or run OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-06 Sales Inventory Returns update:

- Closure doc: `docs/development/SALES_INVENTORY_RETURNS_SPRINT_CLOSURE.md`.
- Policy doc: `docs/development/SALES_INVENTORY_RETURNS_POLICY.md`.
- Added dedicated operational sales inventory returns with `SRN-` numbering, source links to customer, sales invoice, credit note, delivered delivery note, and posted sales stock issue, lifecycle actions, read-only stock-in preview, and explicit `SALES_RETURN_IN` post action.
- Sales inventory returns appear in customer activity as zero-value operational stock rows and do not affect customer statement balances or AR.
- Credit notes and refunds remain separate Sales/AR documents; stock-in posting does not create credit notes, refunds, journals, AR/VAT changes, ZATCA behavior, email, payment links, COGS reversal, landed cost, FIFO/cost layers, hosted/customer-data workflows, seed/reset/delete, or OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-06 Landed Cost Preview update:

- Closure doc: `docs/development/LANDED_COST_PREVIEW_SPRINT_CLOSURE.md`.
- Policy doc: `docs/development/LANDED_COST_PREVIEW_POLICY.md`.
- Added read-only landed cost preview endpoints under `/inventory/landed-cost`, with purchase receipt and purchase bill source support, purchase order source blocker, cost categories, allocation methods, rounding reconciliation, return quantity context, and no-mutation response flags.
- Added `/inventory/landed-cost` with source selection, cost-line entry, allocation method controls, manual allocation entry, preview result table, blockers/warnings, and safe limitations wording.
- Added read-only source links from purchase receipt detail, purchase bill detail, Inventory Valuation Variance Preview, and Supplier/AP Dashboard.
- This sprint did not persist landed cost previews, create landed cost documents, post journals, change inventory item cost, update moving average, create FIFO/cost layers, change AP or bill balances, create supplier payments, create debit notes/refunds, affect VAT/financial reports, mutate purchase documents, send email, call ZATCA, run hosted/customer-data workflows, run seed/reset/delete, or run OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-06 FIFO Cost-Layer Groundwork update:

- Closure doc: `docs/development/FIFO_COST_LAYER_GROUNDWORK_SPRINT_CLOSURE.md`.
- Policy doc: `docs/development/FIFO_COST_LAYER_PREVIEW_POLICY.md`.
- Added read-only FIFO preview endpoints under `/inventory/fifo-preview` for all inventory, item, warehouse, and item+warehouse scopes.
- Added a computed FIFO preview service that reconstructs in-memory layers from stock movements ordered by movement date, created time, and ID.
- Added oldest-layer consumption preview, missing-cost warnings, insufficient-layer blockers, return-cost traceability warnings, transfer-shape warnings, and no-mutation response flags.
- Added `/inventory/fifo-preview` with item, warehouse, and as-of filters, summary metrics, layer table, consumption table, warnings/blockers, source links, and safe limitations wording.
- Added read-only FIFO source links from inventory balances, stock valuation, stock movement ledger, warehouse detail, landed cost preview, and valuation variance preview.
- This sprint did not persist active FIFO layers, switch valuation method, update moving average, update stock valuation, create stock movements, post COGS, reverse COGS, post journals, affect AP/AR/VAT/ZATCA/financial statements, mutate source documents, run hosted/customer-data workflows, run seed/reset/delete, or run OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

2026-06-06 Serial Batch Bin Location Groundwork update:

- Closure doc: `docs/development/SERIAL_BATCH_BIN_LOCATION_GROUNDWORK_SPRINT_CLOSURE.md`.
- Policy doc: `docs/development/SERIAL_BATCH_BIN_LOCATION_POLICY.md`.
- Added additive item tracking settings for `NONE`, `SERIAL`, `BATCH`, and `SERIAL_AND_BATCH`, plus expiry and bin tracking flags. Existing items default to `NONE`.
- Added tenant-scoped bin/location, batch/lot, and serial-number setup records, including optional in-transit location type groundwork.
- Added read-only traceability and setup endpoints under `/inventory/traceability`, `/inventory/bin-locations`, `/inventory/batches`, and `/inventory/serial-numbers`.
- Added Inventory routes for bin locations, batches/lots, serial numbers, and item traceability, plus safe links from item, warehouse, stock valuation, stock movement, and valuation variance surfaces.
- Added conservative movement validation helpers and blockers for advanced-tracked items in legacy flows that do not yet capture serial, batch, expiry, or bin metadata. Non-tracked item flows remain compatible.
- This sprint did not change stock quantities unexpectedly, force tracking on existing items, mutate historical movements, run backfill, update valuation, activate FIFO, create active cost layers, post COGS, post journals, affect AP/AR/VAT/ZATCA/financial statements, change landed cost behavior, run hosted/customer-data workflows, run seed/reset/delete, or run OS power commands.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked typecheck blocker and was not modified.

Status values:

- `COMPLETE_FOR_MVP`: usable in the current local MVP.
- `PARTIAL`: substantial behavior exists, but important workflow gaps remain.
- `GROUNDWORK_ONLY`: data structures or scaffolding exist without a full user workflow.
- `NOT_STARTED`: no meaningful implementation yet.
- `NEEDS_MANUAL_SETUP`: requires credentials, services, or human setup.
- `NEEDS_PRODUCTION_HARDENING`: works locally but needs security, scale, operations, or compliance hardening.

## Foundation

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Monorepo | COMPLETE_FOR_MVP | `package.json`, `pnpm-workspace.yaml`, `apps/*`, `packages/*`, `.github/workflows/deployed-e2e.yml` | Shared workspace scripts, packages, API/web separation, and manual deployed browser E2E workflow. | No full CI pipeline for typecheck/test/build/API smoke yet. | Add CI pipeline for typecheck/test/build and safe API smoke. |
| Production foundation planning | PARTIAL | `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md`, `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`, `docs/production/LAUNCH_GATE_CHECKLIST.md`, `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md`, `docs/production/ARCHITECTURE_DECISION_RECORDS.md`, `docs/production/NEXT_10_PRODUCTION_TICKETS.md` | Roadmap, gap matrix, launch gates, owned implementation tickets, ADR placeholders, and next-10 ticket sequence now document what remains before paid Saudi-first SaaS v1 without pretending Vercel is final production hosting. | Planning only; no hosting decision, runtime DB role cutover, RLS/Data API final strategy, object-storage migration, monitoring, billing, legal package, accountant sign-off, ZATCA specialist sign-off, full smoke, or full E2E completion. | Start with `PROD-A1 Final hosting ADR`, then proceed through runtime DB role validation, hosted backup/PITR proof, object-storage validation, monitoring stack selection, incident/support runbook, email provider validation plan, billing/legal ownership, ZATCA onboarding plan, and safe smoke/E2E rerun planning. |
| Docker/local infra | PARTIAL | `infra/docker-compose.yml`, `infra/README.md` | Local Postgres, Redis, API, web services. | Production infra not defined; Docker Desktop may be unavailable locally. | Add production deployment plan and compose health notes. |
| Auth | COMPLETE_FOR_MVP | `apps/api/src/auth`, `apps/web/src/app/(auth)` | Register, login, JWT, `GET /auth/me`, invite preview/accept, password reset request/confirm using hashed tokens and active email provider routing, DB-backed token request rate limits, and expired-token cleanup. | Mock email remains default; no MFA, refresh-token rotation, or advanced session management. | Add MFA, abuse monitoring, and stronger session policy after provider/domain review. |
| Tenant/org model | COMPLETE_FOR_MVP | `organizations`, `OrganizationMember`, `OrganizationContextGuard` | `x-organization-id` scoping and membership checks. | Cross-org test coverage should continue expanding as modules grow. | Add central tenant-scoping checklist for new modules. |
| Roles/permissions | COMPLETE_FOR_MVP | `Role`, `OrganizationMember.roleId`, `packages/shared/src/permissions.ts`, `PermissionGuard`, role/member APIs, web permission helpers | Default roles are seeded/protected, `/auth/me` exposes role permissions, API routes enforce `@RequirePermissions`, role/member management APIs exist, UI navigation/actions are permission-aware, and invites create email/token onboarding records through the active provider. | SMTP is opt-in; no approval workflow or dual-control policy. | Add approval rules for high-risk actions. |
| Dashboard overview | COMPLETE_FOR_MVP | `apps/api/src/dashboard`, `apps/web/src/app/(app)/dashboard`, `dashboard.view`, `docs/development/DASHBOARD_SALES_AR_ATTENTION_THRESHOLD_POLICY.md` | `GET /dashboard/summary` provides tenant-scoped read-only sales, purchase, Sales/AR attention, banking, inventory, report-health, compliance/admin, attention-item metrics, last-six-month trends, aging buckets, cash trend points, low-stock items, documented Sales/AR attention thresholds, deterministic top-row ordering, and safe empty states; `/dashboard` renders KPI cards, lightweight charts, permission-aware Sales/AR attention panels, drill-downs, review panels, and permission-gated quick actions. | No customizable layout, advanced charting, saved widgets, or accountant-signed KPI/attention thresholds yet. | Review the documented dashboard Sales/AR attention threshold policy with accountant/product owners, then add user-customizable widgets. |
| Email outbox and provider routing | GROUNDWORK_ONLY | `EmailOutbox`, `EmailSenderDomainEvidence`, `EmailProviderEvent`, `EmailSuppression`, `EmailDeliveryMonitoringEvidence`, `AuthToken`, `AuthTokenRateLimitEvent`, `apps/api/src/email`, `/settings/email-outbox` | Mock remains default; invite/password reset/test-send records are stored in outbox; `GET /email/readiness` reports provider/SMTP production readiness, sender-domain SPF/DKIM/DMARC evidence status, relay diagnostics, retry counts/processor/worker flags, webhook verification booleans, suppression counts, monitoring evidence status, and bounce/provider-event/alerting/monitoring blockers without secrets; `POST /email/diagnostics`, default `POST /email/retry-process`, and default `POST /email/retry-worker/run` return no-send/no-mutation skipped plans; SMTP adapter can be enabled by env and records `SENT_PROVIDER`; invite/reset delivery is DB-rate-limited; provider events, suppressions, and monitoring evidence capture metadata-only bounce/complaint/retry evidence. | No production scheduler, provider-specific production webhook adapter, live DNS/provider validation, real relay execution evidence, external monitoring integration, or paid/provider-specific API adapter. | Add provider-specific webhook adapters and external monitoring integration before real customer email use. |
| Audit logs | COMPLETE_FOR_MVP | `apps/api/src/audit-log`, `AuditLog`, `AuditLogRetentionSettings`, `/settings/audit-logs`, `docs/AUDIT_LOG_COVERAGE_REVIEW.md` | High-risk mutating actions are standardized through shared audit event constants, metadata is recursively redacted before persistence/response, list/detail APIs support filters, admins can review logs in the Settings UI, permitted users can export filtered sanitized CSV, and admins can configure retention settings with dry-run preview. | Low-risk reads are intentionally not logged; CSV export is manual only; retention preview does not delete logs; no immutable external audit store, scheduled export, automatic purge job, alerting, anomaly detection, or tamper-evident chain. | Add scheduled export/archival, immutable audit storage, alerting, and a reviewed purge executor before production compliance claims. |
| Number sequences | COMPLETE_FOR_MVP | `apps/api/src/number-sequences`, `NumberSequence`, `/settings/number-sequences` | Invoice, sales quote, delivery note, recurring invoice template, payment, purchase order, bill, refund, credit note, journal, inventory document, and variance proposal numbering; admins/accountants can review configured prefixes, next numbers, padding, examples, and safely update future numbering with duplicate-prevention checks and audit logging. | No reset workflow, per-branch numbering, document-template numbering rules, historical renumbering, or preview of possible future collisions beyond lowering prevention. | Add reviewed reset/skip workflow, branch/device numbering options, and deeper collision analysis before production rollout. |
| Document settings | COMPLETE_FOR_MVP | `document-settings`, settings page | Organization PDF titles/colors/visibility flags. | Template designer not present. | Add template preview and advanced layouts. |
| Generated document archive | PARTIAL | `generated-documents`, `GeneratedDocument`, storage readiness, `docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_CLOSURE.md` | Generated operational and report PDFs are archived, downloadable, including sales quote and delivery note PDFs, included in storage readiness/migration dry-run counts, and closed DEV-12 local evidence for marker metadata list/detail/filter, one approved download metadata/hash check, and count-only storage dry-run behavior. | Stores base64 in DB; no generated-document object storage path, database/base64 migration executor, signed URL policy, object lifecycle, legal hold, retention/legal compliance proof, malware scanning, backup proof, restore proof, broad E2E/smoke/full-test, hosted behavior, or load/concurrency. | Move to S3-compatible storage after migration executor, rollback plan, retention/legal-hold approval, restore proof, scanning plan, and load/concurrency checks. |
| Uploaded attachments | PARTIAL | `attachments`, `Attachment`, `AttachmentPanel`, `storage`, key detail pages, `/settings/storage` | JSON/base64 file upload remains the default; tenant-scoped linked-entity validation, metadata listing without base64 content, download, notes update, soft delete, permissions, smoke checks, reusable panels on sales/purchase/banking/inventory detail pages, storage readiness API, a feature-flagged S3-compatible upload/download adapter for new attachments, and dry-run migration counts. | Database/base64 storage remains the default; no DB-to-S3 migration executor, virus scanning, OCR, retention/lifecycle policy, drag/drop polish, email sending, or ZATCA attachment submission. | Test against a real non-production bucket, then add migration executor, scanning policy, and OCR/import workflows after storage review. |

## Accounting

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Chart of accounts | COMPLETE_FOR_MVP | `chart-of-accounts`, `Account` | CRUD, system account protections, posting flags, next-code preview by seeded account-type range, auto-generated code on create, duplicate prevention, and manual override audit logging. | Descendant cycle prevention, richer account templates, and production COA review remain. | Add accountant-reviewed COA templates and approval rules for high-risk COA changes. |
| Bank account profiles and transfers | COMPLETE_FOR_MVP | `bank-accounts`, `bank-transfers`, `BankAccountProfile`, `BankTransfer`, web `/bank-accounts`, `/bank-transfers` | Cash/bank/wallet/card profile metadata linked to posting asset accounts, default Cash/Bank profiles, ledger balances, posted transaction visibility, archive/reactivate, payment/expense dropdown labels, posted bank transfers, transfer void reversal, and guarded one-time opening-balance posting. | No live feeds, transfer fees, or multi-currency FX transfer handling. | Add transfer fee/FX handling after bank workflow review. |
| Bank statement import and reconciliation | PARTIAL | `bank-statements`, `bank-reconciliations`, `BankStatementImport`, `BankStatementTransaction`, `BankReconciliation`, `BankReconciliationItem`, `BankReconciliationReviewEvent`, web statement/reconciliation routes, `docs/development/DEV_09_BANKING_RECONCILIATION_CLOSURE.md` | Manual CSV/JSON/text plus limited OFX/CAMT/MT940 upload or paste preview, sanitized parser fixtures, compatibility matrix, sample collection guide, parser validation checklist, debit/credit and signed amount parsing, partial import option, duplicate/closed-period warnings, statement transaction records, candidate lookup against posted bank journal lines, manual match, categorize-to-journal, ignore, reconciliation summary, draft reconciliation creation, submit/approve/reopen review workflow, approved-only close, item snapshots, closed-period statement/import locks, administrative void/unlock, reconciliation report data/CSV/PDF archive, design-only raw-file archive policy, attachment panels on statement transaction/reconciliation detail pages, and closed DEV-09 local evidence for synthetic fixtures, parser/preview checks, match/categorize/ignore, and close/void. | No live feeds, auto-match, raw statement-file archive implementation, strict dual-control queue, email delivery, transfer fees, FX transfer handling, certified bank-specific OFX/CAMT/MT940 coverage, hosted/beta/customer-data proof, broad E2E/smoke/full-test coverage, or accountant sign-off. | Convert DEV-09 gaps into sanitized target-bank parser, raw-archive policy, approval-queue, transfer-fee/FX, and QA tickets before widening readiness claims. |
| Tax rates and tax workspace | COMPLETE_FOR_MVP | `tax-rates`, `TaxRate`, `/tax`, `/reports/vat-summary`, `/reports/vat-return` | Sales/purchase/both scope, validation, seed VAT rates, operational Tax workspace with period selection, VAT Summary, draft VAT Return source-document review, and internal VAT Return review CSV export. | Not official VAT filing readiness; no tax authority submission, filing approval workflow, government-format export, or certified VAT definitions. | Add accountant-reviewed tax definitions and official filing readiness only after legal/tax specialist review. |
| Manual journals | COMPLETE_FOR_MVP | `accounting`, `JournalEntry`, `JournalLine`, `fiscal-periods` | Create/edit draft, post, reverse, balance validation, fiscal posting guard. | Reversal date is current date only. | Add user-selected reversal date if needed. |
| Journal posting | COMPLETE_FOR_MVP | `accounting-core`, business services, `reports` | Balanced entries from AR/AP workflows and accountant reports. | Production report definitions still need accountant review. | Add accountant review and export/PDF outputs. |
| Journal reversal | COMPLETE_FOR_MVP | `AccountingService.reverse`, workflow voids, `FiscalPeriodGuardService` | Reversal entries, idempotent workflow reuse, and fiscal guard on reversal date. | Manual and workflow reversal race behavior should be load-tested. | Add concurrency/load tests. |
| Fiscal periods | PARTIAL | `FiscalPeriod`, `apps/api/src/fiscal-periods`, `/fiscal-periods` | API/UI for create/update/close/reopen/lock and posting-date locks across journal-producing workflows. | No unlock/admin approval, fiscal year wizard, or retained earnings close. | Add year-end close and approval workflow. |
| Reports | COMPLETE_FOR_MVP | `reports`, `/reports/*`, `/report-packs`, `docs/development/DEV_10_REPORTS_FINANCIAL_STATEMENTS_CLOSURE.md`, `docs/development/openbooks-adoption/REPORT_PACK_PREVIEW_UI_CONSUMPTION_EVIDENCE.md`, `docs/architecture/REPORT_PACK_GENERATION_EXPORT_ARCHIVE_DESIGN.md` | General Ledger, Trial Balance, P&L, Balance Sheet, VAT Summary, draft/internal-review VAT Return JSON and CSV review export, AR/AP aging, grouped Reports landing page/sidebar menu, CSV exports, simple PDF exports, generated-document archive records for PDFs, read-only report-pack manifest preview UI, docs-only future report-pack execution design, and closed DEV-10 local evidence for marker fixtures, report JSON, aging/VAT Return JSON, output/archive/download metadata, no-body handling, and selected permission gates. | VAT Summary/Return evidence is not official filing; no scheduled/email delivery, report-pack generation/export/download/archive runtime, accountant-certified layout/definitions, advanced branch/multi-period/consolidation proof, generated-document object-storage retention proof, hosted/beta/customer-data proof, load/concurrency proof, or broad E2E/smoke/full-test coverage. | Convert DEV-10 gaps into accountant-review, official VAT, scheduled/email delivery, report-pack contract/foundation slices, generated-document storage, restricted-role matrix, E2E, and load/concurrency tickets. |

## Sales

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Contacts/customers | COMPLETE_FOR_MVP | `contacts`, `Contact`, `/customers` | Customer/supplier/BOTH contacts, dedicated customer list/detail view, outstanding receivable balance, overdue balance, invoice/credit/payment/refund activity counts, non-posting quote/recurring/delivery-note activity, full transaction table, and related workflow/report links. | No import/export, duplicate detection, or browser E2E across every customer row type. | Add CSV import/merge workflow and browser QA for ledger row types. |
| Items/products | PARTIAL | `items`, `Item`, `StockMovement` | Items with revenue/expense accounts, tax defaults, inventory-tracking flag, reorder points, and quantity-on-hand display for tracked items. | Purchase receiving and sales stock issue are manual operational workflows only; no automatic stock posting or stock accounting yet. | Add item detail stock history later. |
| Sales invoices | COMPLETE_FOR_MVP | `sales-invoices`, invoice form/pages | Draft, edit, finalize, void, PDF, ZATCA local metadata, visible read-only invoice-number sequence preview on create, searchable grouped revenue-account picker on lines, item default revenue-account prefill, backend revenue-account validation, and tax exclusive/inclusive/no-tax calculation modes. | Official tax compliance and production ZATCA are not present. Recurring generation creates draft invoices only and does not finalize/post automatically. | Add accountant-reviewed invoice browser QA and keep scheduler design separate from draft generation. |
| Sales quotes/proformas | COMPLETE_FOR_MVP | `sales-quotes`, quote form/pages, customer transaction history, `renderSalesQuotePdf`, `tests/visual/quote-workflow.visual.spec.ts` | Non-posting quote/proforma create, edit while draft, mark sent, accept, reject, expire, cancel, visible read-only quote-number preview, customer selection, revenue-account coded lines, tax exclusive/inclusive/no-tax totals, safe Sales Quote PDF/archive output, conversion of accepted quotes into draft sales invoices, and focused mocked browser coverage for list/create/detail/edit/lifecycle/PDF/archive/convert/customer-activity paths. | No real customer email sending, online acceptance, hosted/customer-data proof, deployed E2E with seeded data, or accountant sign-off. | Add accountant review of quote/invoice wording and source-document browser QA. |
| Recurring invoices | COMPLETE_FOR_MVP | `recurring-invoices`, `RecurringInvoiceTemplate`, `RecurringInvoiceTemplateLine`, `RecurringInvoiceRun`, web `/sales/recurring-invoices`, `tests/visual/recurring-invoice-workflow.visual.spec.ts` | Non-posting recurring invoice templates, `REC-` numbering, draft/edit, activate/pause/resume/end/cancel, browser-visible schedule preview, weekly/monthly/quarterly/yearly frequencies, account-coded lines, tax exclusive/inclusive/no-tax totals, customer non-posting activity visibility, duplicate-run prevention, manual generation of draft sales invoices linked back to the template, focused browser coverage for list/new/detail/edit/generate/customer activity, and permission-aware global create/search behavior. | No automatic scheduler, background worker, customer email, payment links, recurring PDF, deployed E2E with safe seeded data, hosted/customer-data proof, or accountant sign-off. | Add accountant-reviewed wording before any scheduler design. |
| Delivery notes | COMPLETE_FOR_MVP | `delivery-notes`, `DeliveryNote`, `DeliveryNoteLine`, web `/sales/delivery-notes`, `renderDeliveryNotePdf`, customer transaction history, `tests/visual/delivery-note-workflow.visual.spec.ts` | Non-posting delivery-note create/edit while draft, issue, mark delivered, cancel, void, visible read-only `DN-` number preview, customer links, source invoice and accepted quote line copy, reverse delivery-note panels on source invoice/quote detail pages, optional backend sales-stock-issue reference, reference-only stock issue wording, safe Delivery Note PDF/archive output, customer non-posting fulfillment activity, permission-aware navigation/global create/search behavior, and focused browser coverage for list/new/detail/edit/lifecycle/PDF/archive/source/customer-activity paths. | No automatic inventory movement, stock-issue picker UI, carrier/logistics workflow, customer email sending, deployed E2E with safe seeded data, hosted/customer-data proof, or accountant sign-off. | Add stock-issue source UI only after inventory policy review, keeping it reference-only unless an explicit accounting/inventory policy changes. |
| Collections | COMPLETE_FOR_MVP | `collections`, `CollectionCase`, `CollectionActivity`, web `/sales/collections`, customer and invoice detail panels, `tests/visual/collections-workflow.visual.spec.ts` | Controlled non-payment-gateway collection cases with `COL-` numbering, customer and outstanding-invoice links, duplicate open invoice case prevention, status/priority tracking, promise-to-pay details, dispute/hold/start/close/cancel lifecycle actions, activity timeline, workspace summary with top customers and aging buckets, customer and invoice visibility, dashboard attention visibility, permission-aware navigation/global create/search, audit logging, and focused browser coverage for list/new/detail/edit/lifecycle/timeline/customer/invoice/global-search paths. | No real email sending, scheduled reminders, customer portal, payment links, payment gateway capture, legal debt collection tooling, deployed E2E with safe seeded data, hosted/customer-data proof, or accountant sign-off. | Run accountant review for collection wording before designing reminder/email/payment automation. |
| Invoice finalization | COMPLETE_FOR_MVP | `sales-invoice.service.ts`, `sales-invoice-accounting.ts`, `FiscalPeriodGuardService` | AR/revenue/VAT posting, idempotency, fiscal posting guard. | Generated recurring invoices remain drafts until finalized manually; no automatic scheduler/finalizer. | Add recurring browser QA and keep scheduler design separate. |
| Customer payments | COMPLETE_FOR_MVP | `customer-payments` | Posted payments, allocations, voids, receipts. | Gateway integration not present. | Add bank/gateway integration later. |
| Payment allocation | COMPLETE_FOR_MVP | `CustomerPaymentAllocation` | Invoice balance updates and over-allocation guards. | Allocation editing is void/recreate only. | Add UX for corrections if needed. |
| Unapplied payment application | COMPLETE_FOR_MVP | `CustomerPaymentUnappliedAllocation` | Apply/reverse overpayments to later invoices. | No automatic matching suggestions. | Add matching suggestions. |
| Customer refunds | COMPLETE_FOR_MVP | `customer-refunds` | Manual refunds from unapplied payments/credits, voids, PDFs. | No gateway refunds or bank reconciliation. | Add bank workflow first. |
| Credit notes | COMPLETE_FOR_MVP | `credit-notes` | Draft/finalize/void, PDFs, ledger rows. | ZATCA credit note XML not implemented. | Implement official credit note XML after ZATCA base is real. |
| Credit note allocation | COMPLETE_FOR_MVP | `CreditNoteAllocation` | Apply credit notes to invoices. | No automatic suggestions. | Add matching assistant later. |
| Credit note allocation reversal | COMPLETE_FOR_MVP | `reversedAt`, reverse endpoint | Restores invoice and credit balances without journals. | No dedicated reversal history page. | Add audit view. |
| Customer ledger | COMPLETE_FOR_MVP | `contact-ledger.service.ts`, contact page | AR running balance and neutral allocation rows. | Needs browser QA across row types. | Add E2E tests. |
| Customer statement | COMPLETE_FOR_MVP | statement endpoints/PDF | Date-filtered statement and PDF with customer-specific statement title, period, opening/closing balance, activity, debit/credit, and archive guidance. | No scheduled/email delivery; final accountant wording review still recommended. | Add email provider later and review statement presentation with an accountant. |
| Invoice/receipt/statement PDFs | COMPLETE_FOR_MVP | `pdf-core`, PDF endpoints | Operational PDFs and archive, with customer/supplier statement readability labels and conservative generated-from-ledger wording. | Not legal PDF/A-3 or template-complete. | Add storage/template roadmap and accountant-reviewed statement/report presentation. |

## Purchases

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Suppliers | COMPLETE_FOR_MVP | `Contact.type=SUPPLIER/BOTH`, `/suppliers`, supplier contact APIs | Dedicated Suppliers module under Purchases, supplier list/detail view, open/overdue payable balance, bills, purchase orders, supplier credits, payments, refunds, expenses, operational purchase returns, full AP transaction table, and report/workflow links. | Supplier onboarding fields are basic; no supplier bank detail model or import/merge workflow. | Add supplier tax/bank details and browser QA for AP row types. |
| Purchase orders | COMPLETE_FOR_MVP | `purchase-orders`, `purchase-matching`, `PurchaseOrder`, `renderPurchaseOrderPdf`, web `/purchases/purchase-orders`, `/purchases/matching` | Draft/edit/delete, approve, mark sent, close, void, PDF/archive, conversion into draft purchase bills, operational receiving status/action links, read-only PO/bill/receipt matching visibility, supplier-grouped matching exception center, review workflow tracking, and local DEV-08C lifecycle evidence. | No production-grade partial billing, approval workflow, supplier email sending, automatic stock receipt, or accountant-approved tolerance policy. Review tracking exists but does not approve variances, returns, or production matching behavior. | Add accountant-reviewed tolerance policy and variance/return handoff design before widening readiness claims. |
| Purchase bills | COMPLETE_FOR_MVP | `purchase-bills`, `purchase-matching`, `purchase-returns` | Draft/edit/finalize/void, AP posting, PDF/archive, source purchase order link, read-only PO/bill/receipt matching visibility, supplier-grouped matching exception center, review workflow tracking, operational non-posting purchase return links, read-only landed cost preview for eligible bill lines, and local DEV-08/DEV-08F bill lifecycle evidence. | No multi-PO matching, production-grade partial matching policy, valuation variance booking, landed cost posting/valuation update, automatic debit note/refund creation from returns, or return accounting. Review tracking exists but does not mutate bills or accounting. | Add accountant-reviewed matching tolerance policy and valuation-variance/return-accounting design after AP policy review. |
| Purchase returns | PARTIAL | `purchase-returns`, `PurchaseReturn`, `PurchaseReturnLine`, web `/purchases/returns`, `docs/development/PURCHASE_RETURNS_POLICY.md`, `docs/development/INVENTORY_RETURNS_INTEGRATION_POLICY.md` | Operational supplier returns with `PRN-` numbering, draft/submit/approve/complete/cancel/void lifecycle, supplier/source bill/order/receipt/matching-review links, source-line quantity validation, audit logging, matching exception center return links, neutral supplier activity/ledger visibility, and explicit receipt-linked operational stock-out posting for safe tracked lines. | No automatic debit notes, supplier refunds, journal entries, AP balance changes, VAT/report impact, PDF/archive, landed cost, FIFO/cost-layer reversal, sales return stock-in, or broad browser E2E. | Add purchase return PDF/archive or source-options/browser QA next; design dedicated sales returned-goods stock-in separately. |
| Bill finalization | COMPLETE_FOR_MVP | `purchase-bill-accounting.ts`, `FiscalPeriodGuardService` | Direct mode posts Dr expense/asset, Dr VAT receivable, Cr AP; explicit inventory-clearing mode posts tracked lines to Inventory Clearing with fiscal posting guard and local closed-period blocker evidence. | Receipt asset posting is separate/manual and only for compatible clearing-mode bills; production variance, landed-cost posting/valuation update, and return accounting remain unproven. | Add landed-cost posting, returns, and variance posting policy later. |
| Supplier payments | COMPLETE_FOR_MVP | `supplier-payments` | Posted payments, allocations, void restore, receipts, bank account profile dropdown labels. | No bank reconciliation. | Add reconciliation matching. |
| Supplier ledger | COMPLETE_FOR_MVP | `supplierLedger`, contact page, `/suppliers` | AP balance and bill/payment/void rows plus supplier detail activity summary, purchase order activity, supplier credits/refunds, expenses, neutral operational purchase return rows, and supplier-specific payable wording. | Needs browser QA across every AP row type and stronger statement drill-down affordances. | Add AP row-type browser QA and supplier statement drill-down polish. |
| Supplier statement | COMPLETE_FOR_MVP | `/contacts/:id/supplier-statement`, `/contacts/:id/supplier-statement.pdf`, `GeneratedDocument.documentType=SUPPLIER_STATEMENT` | Date-filtered AP statement JSON and PDF export using existing supplier statement rows; PDF downloads create generated-document archive rows and use supplier-specific payable labels. | Local AP generated-document email outbox evidence is mock/no-send only; no real remittance email/send workflow, provider retry/webhook/domain proof, or final accountant wording review. PostgreSQL enum rollback would require a reviewed enum rebuild rather than a simple value drop. | Add real provider AP remittance/email workflow only after provider/domain/retry/webhook readiness is approved. |
| Purchase order PDFs | COMPLETE_FOR_MVP | `renderPurchaseOrderPdf` | Operational purchase order PDF and archive. | No supplier email/send workflow. | Add email/send workflow later. |
| Purchase bill PDFs | COMPLETE_FOR_MVP | `renderPurchaseBillPdf` | Operational PDF and archive. | Vendor attachment capture is basic database-backed groundwork only; no OCR/scanning or object storage. | Add OCR and production storage later. |
| Supplier payment PDFs | COMPLETE_FOR_MVP | `renderSupplierPaymentReceiptPdf` | Receipt PDF and archive. | No remittance email/send flow. | Add email/send workflow. |
| Debit notes | COMPLETE_FOR_MVP | `purchase-debit-notes`, `PurchaseDebitNote` | Draft/finalize/void, bill allocation/reversal, PDFs, and AP reduction posting. | No automatic matching, automatic purchase return credit creation, or inventory return linkage. | Add matching suggestions or explicit return-to-debit-note handoff later. |
| Cash expenses | COMPLETE_FOR_MVP | `cash-expenses`, `CashExpense` | Posted cash expenses, void reversal, PDF/archive, optional supplier/contact link, bank account profile dropdown labels, and supporting-file attachment panel. | No OCR, receipt scanning, or import workflow. | Add OCR/import after storage hardening. |

## Inventory

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Items | PARTIAL | `items`, `Item.inventoryTracking`, `Item.reorderPoint`, web `/items` | Product/service records, inventory tracking flag, reorder point/quantity fields, and total quantity-on-hand display for tracked items. | No automatic stock movements from documents. | Add item detail stock history later. |
| Warehouses | COMPLETE_FOR_MVP | `Warehouse`, `apps/api/src/warehouses`, web `/inventory/warehouses` | Tenant-scoped warehouse CRUD, `MAIN` default warehouse, archive/reactivate, active warehouse validation, warehouse detail balances/movements, and warehouse transfer/adjustment history. | No bin/location hierarchy or warehouse accounting. | Add bin design after transfer QA. |
| Stock movements | GROUNDWORK_ONLY | `StockMovement`, `apps/api/src/stock-movements`, web `/inventory/stock-movements` | Direct opening balance creation, generated adjustment/transfer/receipt/issue/purchase-return/sales-return movement rows, positive-quantity ledger, duplicate opening balance rejection, negative stock prevention, accounting design inputs, and read-only FIFO preview source links. | No landed-cost stock movement or valuation update, automatic COGS, automatic inventory asset posting, serial/batch tracking, return movement reversal, or automatic invoice/bill stock posting. | Keep landed cost, FIFO, reversal, and accounting automation separate until policy/accountant review is complete. |
| COGS | PARTIAL | `apps/api/src/sales-stock-issues`, `InventorySettings`, web sales stock issue detail, `docs/inventory/*`, `docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md` | Sales stock issue detail/API can preview Dr COGS / Cr Inventory Asset, manually post one reviewed COGS journal, reverse it once, block stock issue void while active, let P&L reflect posted journals naturally, and has closed DEV-11 local evidence for marker manual COGS post/reverse, duplicate-post blocker, active-COGS void blocker, and net-zero source/reversal financial effect. | Manual only; no invoice auto-posting, FIFO/cost layers, landed-cost posting/valuation update, inventory-affecting returns workflow, hosted/beta/customer-data proof, broad E2E/smoke/full-test coverage, load/concurrency proof, or automatic inventory clearing actions. | Convert DEV-11 COGS gaps into accountant-review, FIFO/landed-cost posting, inventory return effects, automatic-posting, E2E, and load/concurrency tickets before widening readiness claims. |
| Inventory clearing and bill/receipt matching | PARTIAL | `InventorySettings.inventoryClearingAccountId`, `InventoryPurchasePostingMode`, `PurchaseBill.inventoryPostingMode`, `purchase-matching`, purchase bill preview/finalization, purchase receipt asset posting, clearing reconciliation/variance reports, variance proposals, integrity audit, web receipt/bill/PO/report/proposal panels, `docs/inventory/*`, `docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md` | Inventory clearing account mapping, purchase receipt posting mode, enhanced receipt accounting preview, purchase bill receipt matching status, read-only purchase order/bill/receipt matching visibility on source details, supplier-grouped matching exception center, review workflow tracking, purchase bill direct/clearing accounting preview, explicit clearing-mode bill finalization, explicit compatible receipt asset post/reverse journals, receipt void protection, purchase receipt posting readiness compatibility counts, read-only reconciliation/variance reporting with CSV export, read-only landed cost preview for eligible receipt/bill lines, accountant-reviewed variance proposal draft/submit/approve/post/reverse/void workflow, a 2026-05-15 integrity audit finding no code-level double-counting defect in the current manual paths, and closed DEV-11 local evidence for compatible receipt asset post/reverse plus variance proposal lifecycle. | No automatic purchase receipt GL posting, no direct-mode receipt posting, no accountant-approved tolerance policy, no landed cost posting/valuation update, no automatic variance posting, no historical direct-mode migration, no generated-document retention proof, no hosted/beta/customer-data proof, no broad E2E/smoke/full-test coverage, and no load/concurrency proof. Review tracking exists but does not post variances, create returns, or mutate source documents. | Convert clearing/matching gaps into tolerance policy, landed-cost posting, historical migration/exclusion, automatic-posting, accountant-review, generated-document retention, hosted-proof, E2E, and load/concurrency tickets. |
| Inventory adjustments | COMPLETE_FOR_MVP | `InventoryAdjustment`, `apps/api/src/inventory-adjustments`, web `/inventory/adjustments` | Draft/create/edit/delete, approve, void, reason/cost fields, approval and void movement links, negative-stock guard, permissions, attachment panel, tests, and no-journal behavior. | No reason-code catalog, dual-control queue, or GL impact. | Add approval inbox and valuation policy later. |
| Warehouse transfers | COMPLETE_FOR_MVP | `WarehouseTransfer`, `apps/api/src/warehouse-transfers`, web `/inventory/transfers` | Immediate posted transfer, paired out/in stock movements, insufficient-stock guard, void reversal movements, permissions, tests, and no-journal behavior. | No in-transit status, shipping documents, bin/location support, or GL impact. | Add in-transit/bin support after operational QA. |
| Purchase receiving | PARTIAL | `PurchaseReceipt`, `PurchaseReceiptLine`, `apps/api/src/purchase-receipts`, web `/inventory/purchase-receipts` | PO, purchase bill, and standalone receipts create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements; source remaining quantity/status helpers; void reversal with negative-stock guard; enhanced accounting panel/API with bill matching values; compatible clearing-mode receipts can manually post/reverse Dr Inventory Asset / Cr Inventory Clearing journals; active asset posting blocks receipt void; permissions, tests, smoke coverage, clearing report detail panels, landed cost preview links, and variance proposal linkage from clearing differences. | No automatic receipt posting, no direct-mode receipt posting, no landed cost posting/valuation update, supplier delivery documents, serial/batch tracking, automatic variance posting, or automatic bill/PO receipt. | Add landed-cost posting policy and historical migration/exclusion reporting. |
| Sales stock issue | PARTIAL | `SalesStockIssue`, `SalesStockIssueLine`, `apps/api/src/sales-stock-issues`, web `/inventory/sales-stock-issues` | Finalized-invoice stock issue creates `SALES_ISSUE_PLACEHOLDER` movements; invoice remaining quantity/status helper; availability guard; void reversal; COGS preview; manual COGS post/reverse actions; permissions, tests, and smoke coverage. | No delivery document, returns workflow, serial/batch tracking, automatic invoice stock issue, or automatic COGS posting. | Add delivery/returns design after inventory accounting scope is stable. |
| Inventory settings | GROUNDWORK_ONLY | `InventorySettings`, `apps/api/src/inventory`, web `/inventory/settings` | Per-organization valuation method, negative-stock flag, value-tracking flag, inventory accounting enable flag, account mappings including inventory clearing, purchase receipt posting mode, validation, purchase receipt posting readiness panel with bill-mode compatibility counts, and manual COGS/receipt asset no-auto-post warnings. | FIFO remains inactive; read-only FIFO preview exists but does not change the active valuation method. Enable flag permits manual COGS and compatible receipt asset posting but does not auto-post accounting. | Use readiness as an audit gate before automatic receipt posting, reconciliation, active FIFO migration, and valuation tasks. |
| Inventory reports | PARTIAL | `apps/api/src/inventory`, web `/inventory/reports/*`, `docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md` | Stock valuation estimate, movement summary, low-stock report, inventory clearing reconciliation, inventory clearing variance, read-only FIFO cost-layer preview, CSV export, draft proposal links from variance rows, tests, smoke coverage, integrity audit evidence, and closed DEV-11 local evidence for stock valuation, movement, low-stock, clearing, GL, Trial Balance, P&L, Balance Sheet, dashboard totals, and direct journal aggregate checks. | Valuation reports remain operational estimates; clearing variance and FIFO previews are review-only and do not post corrections or change active valuation automatically; no active FIFO/cost-layer ledger, landed cost posting, accountant certification, generated-document retention proof, hosted/beta/customer-data proof, broad E2E/smoke/full-test coverage, or load/concurrency proof. | Add active FIFO policy/backfill design, landed-cost posting, accountant review, generated-document retention proof, hosted-proof, E2E, and load/concurrency before broader inventory accounting claims. |

## ZATCA

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Profile | COMPLETE_FOR_MVP | `zatca.service.ts`, settings page | Seller profile fields and readiness checks. | Official production validation missing. | Validate against official docs/SDK. |
| EGS units | COMPLETE_FOR_MVP | `ZatcaEgsUnit`, EGS APIs | Local device records, active selection, CSR state. | Private keys are dev-only DB fields. | Move real keys to KMS later. |
| CSR generation | PARTIAL | `zatca-core`, `generate-csr` | Local CSR/private key generation and CSR download. | Official CSR profile must be verified. | Compare with SDK and official onboarding docs. |
| Mock CSID | COMPLETE_FOR_MVP | mock adapter | Local mock compliance CSID flow. | Not legal issuance. | Replace with real sandbox only after verification. |
| Adapter config | COMPLETE_FOR_MVP | `zatca.config.ts` | Mock default and real-network disabled gates. | Real URLs/payloads unverified. | Keep disabled until official setup. |
| Sandbox adapter scaffolding | GROUNDWORK_ONLY | `http-zatca-sandbox.adapter.ts` | Method shapes and safe gates. | Real calls not implemented. | Implement only after official contract verification. |
| XML skeleton | PARTIAL | `zatca-core/src/index.ts`, XML docs | Deterministic local XML fixtures now use official sample-backed UBL ordering, `ICV`/`PIH`/`QR` additional document references, standard/simplified transaction flags, seller identifiers, tax totals, monetary totals, line tax category structure, supply date, and official first-PIH fallback. The standard local fixture now passes SDK XSD/EN/KSA/PIH and global validation. API-generated standard invoice XML now validates locally through the SDK wrapper with address/identifier warnings. | Still not production-ready for compliance: signing/certificate, Phase 2 QR, CSID, clearance/reporting, and PDF/A-3 remain missing. | Use fresh-EGS SDK hash mode only for local verification, then proceed to signing/key-custody design. |
| QR TLV | PARTIAL | `generateZatcaQrBase64` | Local TLV base64 with byte lengths. | Phase 2 QR signature fields missing. | Implement official QR after signing. |
| Hash/ICV chain | PARTIAL | `ZatcaInvoiceMetadata`, `ZatcaEgsUnit.hashMode`, EGS last hash, `zatca-core/src/index.ts`, `zatca-sdk`, `zatca-hash-mode.ts` | Local hash/ICV idempotent generation remains default. `ZatcaHashMode` and per-EGS `hashMode` fields allow explicit `SDK_GENERATED` opt-in on a fresh EGS only; metadata stores `hashModeSnapshot`; SDK mode runs local SDK `-generateHash`, persists the SDK hash, chains PIH from the previous SDK hash, remains idempotent, and blocks partial mutation on SDK failures. | SDK hash persistence is local-only and disabled unless SDK execution/readiness and per-EGS enablement are explicit. Existing EGS chains with metadata are not migrated. Signing, CSID, clearance/reporting, and PDF/A-3 remain missing. | Validate fresh-EGS SDK mode with Java 11-14 repeatedly, then design signing/key custody and sandbox submission. |
| SDK wrapper | PARTIAL | `zatca-sdk`, `docs/zatca/OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` | Readiness, dry-run command planning, disabled-by-default local XML validation endpoints for request XML, allowlisted fixtures, generated invoice XML, official fixture registry, Java `>=11 <15` readiness fields, official launcher preference, local official fixture validation evidence, SDK `-generateHash` parsing, generated-invoice hash comparison, no-mutation invoice hash-compare endpoint, dry-run hash-chain reset plan with SDK-mode blockers, fresh-EGS SDK hash-mode enablement, and generated XML validation/debug scripts. Official samples pass under Java 11. LedgerByte standard now passes SDK XSD/EN/KSA/PIH and global validation; simplified passes XSD/EN/PIH but fails expected signing/QR/certificate checks. Fresh generated standard invoices in SDK hash mode now pass SDK validation globally after invoice-specific PIH config handling. | Repeatable CI/Docker Java 11-14 path still pending; buyer building-number data, signing/QR/cert work remain. | Add proper buyer address fields, then proceed to signing/certificate work only after hash-chain evidence remains stable. |
| Official references map | COMPLETE_FOR_MVP | `docs/zatca/*` | Inventory, gap report, implementation map. | Manual page confirmation remains. | Use map to drive real work. |
| Real compliance CSID | NOT_STARTED | N/A | None. | Needs FATOORA access/OTP/API. | Obtain sandbox access and implement safely. |
| Invoice signing | NOT_STARTED | N/A | None. | Required for production. | Implement through SDK-verified path. |
| Clearance | NOT_STARTED | N/A | Safe blocked endpoints only. | No real standard invoice clearance. | Implement after signing/CSID. |
| Reporting | NOT_STARTED | N/A | Safe blocked endpoints only. | No real simplified invoice reporting. | Implement after signing/CSID. |
| PDF/A-3 | NOT_STARTED | N/A | None. | XML not embedded. | Add after official XML/signing. |

## Platform

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Frontend UI | PARTIAL | `apps/web/src/app`, `components`, `tests/e2e`, `tests/visual` | MVP screens for implemented modules, a useful business dashboard, plus Playwright browser smoke/visual coverage for auth, navigation, sales, sales quotes, purchases, banking, reports, inventory, attachments, permissions, email, ZATCA, storage, and validated local demo workflow data. | Browser suite is still focused/smoke-level by area; deployed E2E CI is manual-only; no exhaustive visual regression or safe data-reset strategy. | Expand Playwright coverage, add UX pass, and decide when deployed E2E should run on a schedule. |
| API coverage | PARTIAL | `apps/api/src` | Broad CRUD/workflow endpoints. | No OpenAPI docs or versioning. | Add API documentation generation. |
| Smoke tests | COMPLETE_FOR_MVP | `apps/api/scripts/smoke-accounting.ts`, `apps/api/scripts/seed-demo-workflows.ts`, `tests/e2e`, `playwright.config.ts`, `.github/workflows/deployed-e2e.yml` | API smoke covers deep accounting workflows; Playwright browser smoke covers critical user-facing routes/forms/readiness panels and now local validated demo workflow records seeded through API endpoints; deployed E2E has a manual GitHub Actions workflow. | Requires local API/web for local runs; browser suite does not assert every accounting branch; no automated DB reset before deployed E2E. | Add safe CI wiring for typecheck/test/build/API smoke and decide deployed E2E schedule after DB reset policy. |
| Production deployment | GROUNDWORK_ONLY | `infra`, `docs/DEPLOYMENT_VERCEL_SUPABASE.md`, `docs/deployment/*`, `docs/BACKUP_AND_RESTORE_READINESS_PLAN.md`, `.github/workflows/deployed-e2e.yml` | Local compose, Vercel/Supabase deployment checklist, API root/health/readiness docs, CI DB readiness checklist, Supabase security review, deployed E2E runbook/workflow, metadata-only backup/restore readiness planning, and one local non-production Postgres restore drill with sanitized evidence. | Production IaC, hosted Supabase backup/PITR proof, real object-storage restore proof, monitoring, RLS/private-network decision, deployment approval gates, and operations runbooks are not complete. | Verify hosted Supabase PITR/object-storage backup in non-production, then create production readiness plan covering monitoring, secrets, storage, email, and security controls. |
| Cloud storage | PARTIAL | `apps/api/src/storage`, `apps/api/src/attachments`, `/settings/storage`, `docs/storage/*`, `apps/api/src/system`, `docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_CLOSURE.md` | Provider env config, database default readiness, redacted S3 config checks, feature-flagged S3-compatible upload/download storage for new uploaded attachments, dry-run migration counts for attachments/generated documents, backup/object-storage evidence readiness on the storage settings page, local database-backed restore-count evidence, and DEV-12 generated-document count-only dry-run evidence. | Database remains default; generated documents are still DB-backed; no migration executor, signed URL policy, object lifecycle/deletion policy, legal hold, virus scanning, backup proof, real-bucket production validation, hosted proof, or object-storage restore drill exists. | Test S3 mode with a non-production bucket, then add generated-document storage alignment, a resumable migration executor, retention/legal-hold controls, signed URL/object lifecycle policy, scanning, and object-storage restore evidence. |
| Email sending | GROUNDWORK_ONLY | `apps/api/src/email`, `EmailOutbox`, `EmailSenderDomainEvidence`, `EmailProviderEvent`, `EmailSuppression`, `EmailDeliveryMonitoringEvidence`, `AuthTokenRateLimitEvent`, `/settings/email-outbox`, `docs/email/*` | Mock/local organization invite and password reset email records are stored and inspectable by default; readiness endpoint and UI show production SMTP readiness, metadata-only SPF/DKIM/DMARC evidence, relay diagnostics status, retry processor/worker counts, provider event status, signed-webhook plan, suppression count, monitoring evidence status, and no-customer-email safeguards without secrets; disabled-by-default diagnostics, retry processing, and worker runs return skipped/no-send/no-mutation status; webhook verification is disabled by default; `POST /email/test-send` still exercises the active provider unless a matched active suppression blocks it; DB-backed invite/reset rate limits and manual expired-token cleanup exist; SMTP can send only when explicitly configured. | No invoice/statement send, production scheduler, provider-specific production webhook adapter, live DNS/provider validation, real relay execution evidence, external monitoring integration, or alert delivery. | Add provider-specific webhook adapters and external monitoring integration after non-production relay evidence. |
| WhatsApp sending | NOT_STARTED | N/A | None. | No WhatsApp provider. | Select provider if needed. |
| Subscription billing | NOT_STARTED | N/A | None. | No SaaS billing. | Choose Stripe or other provider. |
| User permissions enforcement | COMPLETE_FOR_MVP | `Role.permissions`, `PermissionGuard`, `organization-members`, `roles`, `apps/web/src/lib/permissions.ts` | Tenant-scoped API guards, role editor, member list, role/status changes, active-provider invite onboarding, frontend route/nav/action gating, and audit-log view/export/retention permissions now use shared permission strings. | SMTP delivery is opt-in; approvals are not modeled; audit review/export exists but has no scheduled delivery or alerting. | Add approval workflows, scheduled audit exports, and alerting. |

## 2026-05-18 Email readiness diagnostics

- `GET /email/readiness` now returns read-only/no-mutation production-readiness booleans, blockers, warnings, diagnostics gate state, and redaction guarantees. It sends no email and does not expose raw SMTP host, username, password, API key, token, connection URL, authorization header, or provider secret values.
- `POST /email/diagnostics` is disabled by default with `LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED=false`; default responses are `SKIPPED_DISABLED`, `executionAttempted=false`, `noEmailSent=true`, `noCustomerEmailSent=true`, and `noMutation=true`.
- Optional diagnostics execution requires an explicit recipient plus `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS` or `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_DOMAINS`; responses use masked recipients and redacted delivery summaries only.
- Environment variables now documented: `EMAIL_FROM`, `EMAIL_REPLY_TO`, SMTP settings, `LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED`, `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS`, and `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_DOMAINS`.
- `/settings/email-outbox` shows production readiness, invite/password-reset reliability warnings, disabled diagnostics status, and no-customer-email messaging.
- Verification scope: targeted API email tests, targeted web email helper/status tests, typecheck, build, `smoke:accounting`, and `git diff --check`.

## 2026-05-19 Email sender-domain readiness

- Added `EmailSenderDomainEvidence` for tenant-scoped, metadata-only sender-domain evidence. Supported evidence types are SPF, DKIM, DMARC, MX, return path, provider verification, and other.
- Added `/email/sender-domain-evidence` list/create/verify/revoke endpoints requiring `users.manage`. They send no email, create no outbox record, store no customer email body, and reject SMTP passwords, API keys, tokens, authorization headers, connection URLs, provider secrets, and private DKIM keys.
- `GET /email/readiness` now includes sender-domain readiness, missing/verified SPF/DKIM/DMARC, relay diagnostics status, and explicit false states for bounces, retries, and monitoring.
- `GET /email/diagnostics-plan` and `POST /email/diagnostics` expose safe non-production relay plans while keeping diagnostics disabled by default.
- `/settings/email-outbox` now shows sender-domain evidence state and safe metadata controls in addition to disabled diagnostics and outbox inspection.
- Full email `productionReady` remains false until sender-domain evidence, non-production relay diagnostics, bounce handling, retry policy, monitoring, and provider review are complete.

## 2026-05-19 Email retry and bounce readiness

- Added durable retry metadata to `EmailOutbox`: attempts, max attempts, next/last attempt timestamps, redacted last error, provider event status, delivery/bounce/complaint timestamps, and retry lock fields.
- Added `EmailProviderEvent` for tenant-scoped, metadata-only provider event summaries. Mock events can record delivered, bounced, complained, failed, opened, clicked, or unknown statuses without storing raw payloads or secrets.
- Added `/email/retry-plan`, `/email/retry-process`, `/email/provider-events/plan`, and `/email/provider-events/mock`; all require `users.manage`, send no email by default, and expose only redacted metadata.
- `LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED=false` keeps retry execution skipped/no-send/no-mutation by default. Enabled runs process only due retryable records, obey max attempts, and update existing outbox metadata.
- `/settings/email-outbox` now shows retry readiness, pending/blocked counts, retry processor disabled/enabled state, mock-only provider event readiness, bounce signature status, and monitoring blockers.
- Full email `productionReady` remains false until relay diagnostics, sender-domain evidence, enabled retry processing, signed provider webhooks, suppression handling, and monitoring are truly configured.

## 2026-05-19 Email webhook suppression readiness

- Added `EmailSuppression` for tenant-scoped bounce, complaint, manual, and provider-event suppression metadata. Records store `emailHash` and `emailMasked`, not raw suppression emails, and contain no customer message body or provider secrets.
- Added `GET /email/provider-events/webhook-plan` and `POST /email/provider-events/webhook`. Webhook verification is disabled by default with `EMAIL_PROVIDER_WEBHOOK_VERIFICATION_ENABLED=false`; disabled or unsigned input persists no provider event, mutates no outbox record, and sends no email.
- Added `EMAIL_PROVIDER_WEBHOOK_SECRET` and `EMAIL_PROVIDER_WEBHOOK_ALLOWED_PROVIDERS` env placeholders. The current verifier is provider-agnostic/test-only HMAC; no provider-specific production webhook semantics are claimed.
- Added `GET /email/suppressions`, `POST /email/suppressions`, and `POST /email/suppressions/:id/revoke`, all `users.manage` gated and metadata-only. Manual suppression accepts an email only as request input and returns masked/hash metadata only.
- Bounce/complaint provider events create suppression metadata only when a signed webhook is verified or when a local/mock provider event is explicitly captured. Active suppressions block matched send/retry attempts without provider calls.
- `/settings/email-outbox` now shows webhook verification status, webhook-secret configured/missing, suppression count/list controls, suppressed retry counts, and alerting/monitoring blockers.
- Full email `productionReady` remains false until non-production relay evidence, provider-specific signed webhook verification, scheduled retry execution, alert thresholds, monitoring, and live domain/provider validation are complete.
- Tests run for this phase: targeted API email specs, targeted frontend email specs, `corepack pnpm db:generate`, `corepack pnpm db:migrate`, typecheck, build, `corepack pnpm smoke:accounting`, `git diff --check`, and `git diff --cached --check`.
- Recommended next prompt: add a scheduled transactional email retry worker and monitoring dashboard evidence for retry throughput, bounce/complaint thresholds, and suppression trends while real customer sends remain disabled by default.

## 2026-05-19 Email worker monitoring readiness

- Added `EmailDeliveryMonitoringEvidence` for tenant-scoped, metadata-only retry throughput, bounce alert, complaint alert, suppression trend, delivery dashboard, and provider webhook health evidence.
- Added `GET /email/retry-worker/plan` and disabled-by-default `POST /email/retry-worker/run`; `LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED=false` keeps worker execution skipped/no-send/no-mutation by default, and enabled worker runs still require the retry processor gate.
- Added `GET /email/monitoring-plan` plus `/email/monitoring-evidence` list/create/verify/revoke endpoints. Evidence rejects SMTP/API/webhook secrets, auth headers, raw provider payloads, customer recipient lists, and customer message bodies.
- `/settings/email-outbox` now shows retry worker configured/enabled state, worker plan controls, monitoring evidence status, bounce/complaint threshold blockers, suppression trend blockers, webhook health blockers, and metadata-only monitoring evidence controls.
- Full email `productionReady` remains false until non-production relay evidence, provider-specific signed webhooks, production scheduler, external monitoring/alerting, and live domain/provider validation are complete.
- Tests run for this phase: targeted API email specs, targeted frontend email specs, `corepack pnpm db:generate`, `corepack pnpm db:migrate`, typecheck, build, `corepack pnpm smoke:accounting`, `git diff --check`, and `git diff --cached --check`.
- Recommended next prompt: add provider-specific production webhook adapters and an external monitoring integration runbook for email delivery alerts while keeping real customer sends disabled by default.

## 2026-05-19 Backup restore readiness

- Added `BackupRestoreEvidence` for metadata-only database backup, PITR, migration-history, object-storage backup, generated-document backup, attachment backup, restore-drill, restore-verification, RPO/RTO review, and other evidence.
- Added `GET /system/backup-readiness`, `GET /system/restore-drill-plan`, and backup evidence list/create/verify/revoke endpoints. They require audit retention administration permission, run no backup, run no restore, export no customer data, and reject database URLs, service role keys, storage credentials, signed XML/QR bodies, document bodies, attachment bodies, API keys, tokens, auth headers, private keys, and provider secrets.
- `/settings/storage` now shows database/object/document backup readiness, restore-drill planning, missing evidence, metadata-only evidence controls, and `productionReady=false` until all required evidence is verified.
- Full production operations readiness remains false until hosted Supabase backup/PITR proof, real object-storage backup validation, RPO/RTO business review, monitoring, and incident runbooks are completed.
- Tests run for this phase: `corepack pnpm db:generate`, `corepack pnpm db:migrate`, targeted API system specs, targeted frontend storage specs, typecheck, build, `corepack pnpm smoke:accounting`, `git diff --check`, and `git diff --cached --check`.
- Recommended next prompt: verify hosted Supabase backup/PITR and S3-compatible object-storage backup/restore in a real non-production project, then capture sanitized evidence without exposing secrets or customer content.

## 2026-05-19 Non-production restore drill verification

- Executed a local Docker Postgres restore drill with seeded local/demo data only. The drill restored a custom-format dump into an isolated temporary local database, verified counts only, and removed the temporary database plus dump afterward.
- Verified matching counts for 76 tables, 55 Prisma migrations, 11 organizations, 77 users, 186 attachments, 820 generated documents, and 3121 journal entries.
- Created verified metadata-only `BackupRestoreEvidence` records for `DATABASE_BACKUP`, `MIGRATION_HISTORY`, `RESTORE_DRILL`, `RESTORE_VERIFICATION`, `GENERATED_DOCUMENT_BACKUP`, and `ATTACHMENT_BACKUP`.
- Created draft blocked `OBJECT_STORAGE_BACKUP` evidence because no S3-compatible object-storage backup/provider export was configured in the local non-production environment.
- `GET /system/backup-readiness` remains `productionReady=false` with `POINT_IN_TIME_RECOVERY`, `OBJECT_STORAGE_BACKUP`, and `RPO_RTO_REVIEW` still missing.
- Endpoint checks confirmed no database URL, service role key, storage credential, SMTP secret, API key, auth header, bearer token, private key, Postgres URL, or SMTP URL pattern appeared in backup/storage/email/ZATCA safety responses.
- Remaining gap: hosted Supabase backup/PITR proof, real object-storage backup/restore proof, RPO/RTO business review, monitoring, and incident runbooks.
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

## ZATCA immutable policy approval metadata

Implemented metadata-only immutable policy approval records for future signed artifact storage. The feature adds draft/list/approve/revoke API support and ZATCA settings visibility for approval status, retention review, technical storage review gates, and the continued body-persistence block.

Signed XML body persistence, QR payload persistence, CSID requests, ZATCA network calls, clearance/reporting, PDF-A3, production credentials, and production compliance claims remain not implemented.

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

# Sellable-v1 readiness update - 2026-05-18

- Added a tenant-scoped read-only dashboard onboarding checklist at `GET /dashboard/onboarding-checklist`.
- The checklist covers organization profile, chart of accounts, VAT/tax profile, customer setup, first invoice, bank/payment profile, ZATCA local-readiness visibility, contact VAT/ID validation, and storage readiness.
- Dashboard now shows a sellable-v1 onboarding card without mutating data or changing dashboard query concurrency.
- ZATCA remains blocked for real CSID requests, real network calls, clearance/reporting, PDF-A3, signed XML/QR body persistence, production credentials, and production compliance claims.
- Detailed audit: `docs/SELLABLE_V1_READINESS_AUDIT.md`.

## Guided setup wizard update - 2026-05-18

## 2026-06-16 - shadcn payment workflow migration

- PR `#52` (`Continue shadcn migration for transaction workflows`) was reverified and merged into `main` at merge commit `25cb9ef9a0ef3225cde03dcfa935703743601762`.
- Completed frontend-only shadcn/LedgerByte migration for customer and supplier payment list, creation, and detail workflows.
- Added shared payment UI wrappers:
  - `apps/web/src/components/ui-ledger/allocation-table.tsx`
  - `apps/web/src/components/ui-ledger/payment-method-badge.tsx`
  - `apps/web/src/components/ui-ledger/payment-summary-card.tsx`
- Preserved existing routes, API calls, payment payloads, permission behavior, allocation behavior, invoice/bill links, receipt/PDF explicit actions, void actions, and unapplied apply/reverse behavior.
- No backend/API/schema/migration/payment provider/UAE PINT-AE/ZATCA behavior changed, and no production compliance claim was added.
- Closure doc: `docs/development/UI_SHADCN_PAYMENT_WORKFLOWS_SPRINT_CLOSURE.md`.

- Added `/setup`, a read-only wizard sourced from `GET /dashboard/onboarding-checklist`.
- The wizard maps checklist items to existing setup routes and shows status, evidence, blockers, warnings, safe explanations, and action links.
- Dashboard onboarding now links to `/setup` and shows progress percentage, next incomplete step, and concise blocker summary.
- No backend mutation, schema change, contact VAT/ID validation change, dashboard concurrency change, ZATCA execution change, CSID request, real ZATCA network call, clearance/reporting, PDF-A3, signed XML/QR body persistence, production credential use, or production compliance claim was added.

## 2026-06-04 - Sales/AR accountant wording review preparation

- Tightened accountant-facing wording across Sales/AR surfaces for collections, invoice ZATCA readiness, quotes, AR Aging, VAT Summary, VAT Return, and the Tax workspace.
- Added focused frontend wording coverage for collection activity labels, invoice ZATCA readiness action labels, generated-document labels, AR Aging report guidance, and quote form wording.
- Added Sales/AR accountant review handoff docs:
  - `docs/accountant-review/SALES_AR_ACCOUNTANT_REVIEW_CHECKLIST.md`
  - `docs/accountant-review/SALES_AR_SAMPLE_REVIEW_INDEX.md`
  - `docs/development/SALES_AR_ACCOUNTANT_WORDING_REVIEW_SPRINT_CLOSURE.md`
- This is review preparation only. It does not change accounting calculations, posting, payment allocation, VAT math, email behavior, payment links, inventory movement, ZATCA behavior, hosted infrastructure, or production readiness.

## 2026-06-04 - Sales/AR accountant findings intake

- Searched the accountant review packet, Sales/AR checklist, sample review index, findings template, development closures, GitHub issue templates, and `BUG_AUDIT.md` for completed Sales/AR accountant findings.
- No completed accountant findings were found; the repo contains review-preparation materials and explicit pending-review notes only.
- Added:
  - `docs/accountant-review/SALES_AR_ACCOUNTANT_REVIEW_FINDINGS_TRIAGE.md`
  - `docs/accountant-review/SALES_INVOICE_DOCUMENT_TITLE_POLICY.md`
  - `docs/development/SALES_AR_ACCOUNTANT_REVIEW_FINDINGS_SPRINT_CLOSURE.md`
- No app code, backend code, PDF output, accounting calculation, posting behavior, payment allocation, VAT math, ZATCA behavior, email behavior, payment-link behavior, inventory movement, or production infrastructure behavior changed.

## 2026-06-04 - Dashboard Sales/AR attention links

- Closure doc: `docs/development/DASHBOARD_SALES_AR_ATTENTION_LINKS_SPRINT_CLOSURE.md`.
- Added a permission-aware `salesAttention` section to `GET /dashboard/summary` for overdue invoices, collection follow-ups, promise-to-pay/disputed collections, quotes awaiting action, recurring templates due for manual generation, generated recurring draft invoices, delivery notes awaiting fulfillment action, and top customers by outstanding AR.
- `/dashboard` now renders read-only Sales/AR attention panels that link to sales invoices, collection cases, sales quotes, recurring invoice templates, generated draft invoices, delivery notes, and customer detail pages when the user has the relevant view permissions.
- Dashboard attention items remain read-only workflow signals. They do not post journals, mutate invoice balances, allocate payments, send emails/reminders, create payment links, generate recurring invoices automatically, file VAT, call ZATCA, or move inventory.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 - Sales/AR sample data and accountant walkthrough pack

- Closure doc: `docs/development/SALES_AR_SAMPLE_DATA_WALKTHROUGH_PACK_SPRINT_CLOSURE.md`.
- Added a docs-only guided Sales/AR accountant walkthrough pack covering customer, quote, quote PDF, quote-to-draft-invoice conversion, finalized invoice, customer payment, credit note/refund review, recurring template, generated draft invoice, delivery note, collection case, customer ledger/activity, AR Aging, VAT Summary/Return, and dashboard attention items.
- Added synthetic sample-data planning, expected-results checkpoints, route review checklist, empty findings log, and sample-output naming guidance:
  - `docs/accountant-review/SALES_AR_WALKTHROUGH_PACK.md`
  - `docs/accountant-review/SALES_AR_SYNTHETIC_SAMPLE_DATA_PLAN.md`
  - `docs/accountant-review/SALES_AR_EXPECTED_RESULTS_CHECKLIST.md`
  - `docs/accountant-review/SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`
  - `docs/accountant-review/SALES_AR_ROUTE_REVIEW_CHECKLIST.md`
  - `docs/accountant-review/SALES_AR_SAMPLE_OUTPUT_NAMING_GUIDE.md`
- This is reviewer-readiness documentation only. It does not create sample data, run seeds, run reset/delete, generate PDFs, run smoke/E2E, use hosted/customer data, send email, create payment links, file VAT, call ZATCA, change accounting calculations, change posting behavior, change dashboard behavior, or change app/API/backend behavior.
- Accountant approval remains pending. Findings must be recorded as concrete reviewer observations before implementation.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 - Controlled local Sales/AR accountant walkthrough execution preflight

- Closure doc: `docs/development/SALES_AR_LOCAL_ACCOUNTANT_WALKTHROUGH_EXECUTION_SPRINT_CLOSURE.md`.
- Added local execution preflight, marker data plan, evidence status, route status, and expected-results status docs for the Sales/AR accountant walkthrough:
  - `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXECUTION_PREFLIGHT.md`
  - `docs/development/SALES_AR_LOCAL_WALKTHROUGH_DATA_PLAN.md`
  - `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
  - `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
  - `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`
- Planned marker: `SALES-AR-WALKTHROUGH-20260604`.
- Local execution was blocked before data creation because local database/API/web services were not running, Docker was unavailable, safe local login was not verified, and no explicit write-capable execute approval existed.
- No sample data, seed/reset/delete, PDF generation, browser walkthrough, smoke/E2E, hosted/customer-data workflow, real email, payment link, VAT filing, ZATCA call, app code, API code, backend code, accounting calculation, posting behavior, dashboard behavior, or production infrastructure behavior changed.
- No accountant findings were recorded or approved.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 - Local services bring-up and Sales/AR walkthrough dry-run preflight

- Closure doc: `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_DRY_RUN_SPRINT_CLOSURE.md`.
- Added local services bring-up preflight and dry-run fixture planning docs:
  - `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_PREFLIGHT.md`
  - `docs/development/SALES_AR_WALKTHROUGH_FIXTURE_DRY_RUN_PLAN.md`
- Local target configuration was verified as local at the inspected env-key level, with database, direct, Redis, and web API target keys classified as `localhost`.
- Runtime bring-up remained blocked because the Docker Desktop Linux engine is unavailable and local Postgres, Redis, API, and web listeners are not running.
- API health/readiness and web root checks were unreachable.
- Safe local login was not verified.
- Fixture dry-run plan was documented, but no fixture script was added and no dry-run was executed.
- No sample data, seed/reset/delete, migrations, fixture execute, login, PDF generation, browser walkthrough, smoke/E2E, hosted/customer-data workflow, real email, payment link, VAT filing, ZATCA call, app code, API code, backend code, accounting calculation, posting behavior, dashboard behavior, or production infrastructure behavior changed.
- No accountant findings were recorded or approved.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-05 - Local Sales/AR fixture payment-account hardening

- Closure doc: `docs/development/SALES_AR_LOCAL_FIXTURE_PAYMENT_ACCOUNT_HARDENING_CLOSURE.md`.
- Hardened the local-only Sales/AR walkthrough fixture so customer payment and refund payloads use the linked active posting `ASSET` chart-of-account id instead of the bank account profile id.
- Local safety gates passed: Docker, local Postgres, local Redis, API/web ports, health/readiness, `/login`, local seed/demo login, `/auth/me`, and local-only env target classification.
- Status-only Sales/AR endpoint checks returned HTTP `200`.
- Fixture dry-run passed with marker `SALES-AR-WALKTHROUGH-20260604`.
- One guarded local execute retry was attempted after dry-run passed. It passed the prior customer payment account blocker, created marker-scoped local synthetic payment and credit-note records, then stopped safely at credit-note application because the fixture sent an unsupported `note` field.
- Current marker-scoped local synthetic counts: one customer, two items, three sales invoices, one customer payment, one credit note, and zero refunds, quotes, recurring templates, delivery notes, collections, and generated documents.
- No retry loop, cleanup/delete, seed/reset/delete, PDF generation, browser walkthrough, smoke/E2E, hosted/customer-data workflow, real email, payment link, payment gateway, VAT filing, ZATCA call, app product behavior change, API validation change, accounting calculation change, posting behavior change, dashboard behavior change, or production infrastructure behavior changed.
- No accountant findings were recorded or approved.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-06 - ZATCA local dummy signing dry-run guard

- Added `corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json` as a metadata-only, disabled-by-default guard for future local dummy signing experiments.
- The guard checks Java compatibility, local official SDK/reference paths, generated fixture paths, SDK dummy certificate/private-key paths, approval-marker presence, and documented sign/QR/validate/hash command shapes.
- It does not execute SDK signing, QR generation, signed XML validation, network calls, CSID/OTP, clearance/reporting, PDF/A-3, migrations, deploys, email, or production compliance behavior.
- Default Java 17 remains unsupported; Java 11-14 is readiness metadata only until a future approved execution sprint.

## 2026-06-06 - ZATCA approved local dummy signing execution plan

- Added `docs/zatca/APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PLAN.md` with the exact future approval phrase, fixture scope, temp-only command plan, metadata-only evidence shape, cleanup policy, and failure behavior.
- Updated the dummy signing guard so exact approval text is recognized as planning metadata; `--execute-approved-plan` remains blocked as `BLOCKED_EXECUTION_NOT_IMPLEMENTED_IN_THIS_SPRINT`.
- SDK signing, SDK QR, signed XML validation, ZATCA network calls, CSID/OTP, clearance/reporting, PDF/A-3, private-key/certificate body exposure, signed XML persistence, and production compliance remain disabled.

## 2026-06-06 - ZATCA dummy signing result review and QR gap analysis

- Added `docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md` and `docs/zatca/PHASE_2_QR_GAP_ANALYSIS.md`.
- Reviewed `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`: both sanitized generated fixtures remain sign/QR/signed-validation `PASSED`, exit codes `0`, no network, production compliance false, cleanup `SUCCESS`, and metadata-only redaction intact.
- No SDK signing, QR, validation, hash, network, CSID/OTP, clearance/reporting, PDF/A-3, migration, seed/reset/delete, deployment, email, or production check was run in this review.
- Completed follow-up: key custody and CSID lifecycle design is documented before any production Phase 2 QR/signing work.
- Next ZATCA gap: sandbox CSID preflight guard, still with no OTP/CSID/network execution by default.

## 2026-06-07 - ZATCA sandbox CSID request execution guard

- Extended `corepack pnpm zatca:sandbox-csid-preflight -- --plan --no-network --json` with `--execution-guard` and `--execute-csid-request`.
- Added `docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md` and `docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md`.
- Observed guard status: `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`.
- Observed execute flag status: `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- No OTP, CSID request, network call, sandbox adapter execution, request body creation, response body processing, secret/body exposure, signing, clearance/reporting, PDF-A3, migration, seed/reset/delete, deployment, email, or production compliance behavior occurred.
- Remaining next step: `ZATCA CSID response custody implementation plan`.

## 2026-07-02 - Security diagnostic review findings resolved

- SECURITY-HARDENING-02 reviewed the PR #222 API tenancy and safe-script diagnostic queues.
- API tenancy audit now reports `NO_RISKY_ROUTES_DETECTED` after exact reviews of the 8 prior service findings.
- Safe-script audit now reports 10 review-required entries, reduced from 32; retained entries cover DB migration/seed, demo seed, API smoke, and ZATCA validation/debug commands.
- Added `docs/security/evidence/API_TENANCY_REVIEW_02.md` and `docs/security/evidence/SAFE_SCRIPT_REVIEW_02.md`.
- No backend API behavior, Prisma schema, migration, seed/reset/delete, Supabase/Vercel mutation, provider call, storage operation, email/payment action, accounting/report/VAT/inventory valuation/banking behavior, or compliance behavior changed.

## 2026-07-03 - Safe-script review queue reduced to owner-approval gates

- SECURITY-SAFE-SCRIPTS-03 reviewed the 10 retained safe-script findings from SECURITY-HARDENING-02.
- Safe-script audit now reports `OWNER_APPROVAL_REQUIRED`: 0 review-required entries and 10 owner-approval-required entries.
- Added reusable guard/redaction helpers and tests for local-only API target approval, production/remote refusal, disposable non-production owner approval, demo seed target guards, smoke target guards, and retained ZATCA validation/debug wrappers.
- Added `docs/security/evidence/SAFE_SCRIPT_REVIEW_03.md` and regenerated `docs/security/evidence/SAFE_SCRIPT_AUDIT.md`/JSON.
- No dangerous script was executed. No backend API behavior, Prisma schema, migration, seed/reset/delete, Supabase/Vercel mutation, provider call, storage operation, email/payment action, accounting/report/VAT/inventory valuation/banking behavior, or compliance behavior changed.

## 2026-07-02 - UAE pre-ASP adapter foundation strengthened

- UAE-PRE-ASP-ADAPTER-02 strengthened `@ledgerbyte/uae-peppol-pint-ae` before ASP access: official identifier/endpoint helpers, serializer mode separation, provider capability flags, `_MOCK` transmission statuses, local transmission draft/timeline helpers, timestamped fake webhook replay guard, and typed provider error normalization.
- Updated UAE pre-ASP docs and retention mapping to show what is stored now versus future provider/legal evidence.
- The implementation remains local-only and no-network. There is still no ASP access, no real provider connection, no FTA reporting, no Peppol transmission, no production UAE compliance, no production hosting, and no storage/signed-URL proof.

## 2026-07-02 - UAE official serializer readiness deepened

- UAE-PRE-ASP-ADAPTER-03 deepens local official-draft readiness without ASP access: draft invoice and credit-note model helpers, structured validators, richer serializer metadata, and expanded package fixture coverage.
- Added `docs/uae-peppol/UAE_PINT_AE_SERIALIZER_READINESS_MATRIX.md` to track implemented-local areas, partial coverage, documented gaps, and official/provider blockers.
- The implementation remains local-only and no-network. There is still no ASP access, provider envelope, official conformance evidence, FTA reporting, Peppol transmission, production UAE compliance, production hosting, storage/signed-URL proof, or provider credential.
