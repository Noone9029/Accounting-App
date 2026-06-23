# LedgerByte Product Readiness Scorecard

Audit date: 2026-06-19

Latest commit audited: `a2863e5fcf89b7894914f17be4e196a013eb65f0` (`origin/main` after Goal 12 merge/stabilization) plus the typed onboarding persistence schema/API service foundation branches.

## 2026-06-23 BETA-FIX-01 Controlled Beta Evidence Closure

- Controlled beta readiness improves to `GO with restrictions` because the two remaining beta evidence blockers were closed on branch `codex/beta-fix-01` at baseline `bbd784e482c3e250ad75795570c8bcefebdbff82`.
- Visual evidence blocker: closed with 1,077/1,077 required Playwright visual tests passing by direct specs or documented splits. Timed-out full-file commands were not counted.
- Live walkthrough blocker: closed against the deployed Vercel/Supabase test stack. API readiness returned `database: ok`, login succeeded, seeded reconciliation history loaded, and 23/23 walkthrough checks passed.
- No production readiness score increase is taken. This remains controlled-beta/user-testing evidence, not production launch evidence.
- Remaining restrictions: no provider/compliance production readiness, object storage readiness, signed URL readiness, live bank feed, payment collection, real email delivery, public production launch, or public/marketing/auth visual fixture completeness claim.
- No backend APIs, Prisma schema changes, hosted migrations, Supabase mutations, Vercel env mutations, provider calls, storage/signed URL operations, payment/email actions, seed/reset/delete behavior, accounting/report/VAT/inventory valuation/banking/reconciliation logic, or production compliance claims changed.

## 2026-06-23 Redesigned Frontend Beta Walkthrough Evidence

- Controlled beta frontend confidence improves because `BETA-WALKTHROUGH-01` completed the redesigned walkthrough through local mocked route/auth/visual evidence on branch `codex/beta-walkthrough-01` at baseline `31e932920d7a488f50baffba3dd651e567b8654f`.
- Completed commands passed 23 Jest tests and 272 Playwright visual tests after one confirmed tablet overflow fix and one stale quote visual fixture refresh.
- No production readiness score increase is taken. This pass did not run a live disposable demo-org/API walkthrough and did not complete the broad owner/settings/report/detail/secondary/role visual suites because combined attempts timed out.
- No backend APIs, Prisma schema changes, hosted migrations, Supabase/Vercel mutations, provider calls, live banking, automated reconciliation, generated-document object storage, signed URLs, storage moves, ZATCA/UAE/Peppol/ASP production behavior, tax-authority submission, seed/reset/delete behavior, payment collection, email delivery, deployment behavior, or production compliance claims changed.
- Next readiness work is `BETA-FIX-01`: split and complete the timed-out visual evidence plus prepare an explicitly disposable demo org/runtime for live walkthrough signoff.

## 2026-06-22 Frontend Redesign Stabilization Evidence Update

- Controlled beta frontend confidence improves because `UI-REBUILD-STABILIZE-01` adds route-load, visual QA, accessibility, responsive, truthfulness, permission/action, and beta walkthrough evidence on top of merged `origin/main` at `d12535cd2fc608797bc4664543cbbb1920379406`.
- Confirmed frontend regressions fixed in this pass: app-shell/topbar tablet wrapping and audit-log page overflow. Stale visual assertions were updated to current conservative copy.
- No production readiness score increase is taken. This pass does not add backend APIs, Prisma schema changes, hosted migrations, Supabase/Vercel mutations, provider calls, live banking, automated reconciliation, generated-document object storage, signed URLs, storage moves, ZATCA/UAE/Peppol/ASP production behavior, tax-authority submission, seed/reset/delete behavior, deployment behavior, or production compliance claims.
- Next readiness work is `BETA-WALKTHROUGH-01`: run the redesigned frontend walkthrough in a safe local or controlled beta environment and convert concrete findings into bounded fixes.

## 2026-06-22 Frontend Redesign Full-Stack Merge Update

- Usability baseline improves because the full frontend redesign PR stack #146 through #210 is merged into `main` at `cb34543d16389344ba45e69a2db277fce4c633ad`.
- The merged baseline covers the scoped sales, purchase, banking, contacts/statements, inventory, accounting/admin, reports, documents/storage, settings/compliance, setup/onboarding, dashboard, public/auth, and placeholder route-family migrations tracked in the redesign checklist.
- Final local verification passed with `verify:ci:local` and the OpenBooks clean-room guard. Focused visual coverage was refreshed and the dashboard/mobile workflow navigation overflow regression was fixed.
- No production readiness score increase is taken for launch readiness. This merge does not add backend APIs, hosted migrations, Supabase mutations, Vercel deployments, provider calls, live banking, automated reconciliation, generated-document object storage, signed URLs, storage moves, ZATCA/UAE/Peppol/ASP production behavior, tax-authority submission, seed/reset/delete behavior, or shutdown behavior.
- Next readiness work is `UI-REBUILD-STABILIZE-01`: expand visual fixtures and fix only confirmed frontend regressions on final `main`.

## 2026-06-22 Frontend Redesign Loop Engineering Update

- Product usability improves because LedgerByte now has a full route-family frontend redesign checklist and the first Sales workspace list loop is in progress.
- `/sales/quotes` and `/sales/invoices` list surfaces now use the shared LedgerByte redesign primitives for page layout, filters, table structure, date/money cells, status badges, action buttons, summary copy, and empty states.
- `/purchases/bills` and `/purchases/debit-notes` list surfaces now use the same shared primitives for AP table structure, date/money cells, status badges, action buttons, summary copy, and empty states.
- `/bank-accounts` and `/bank-transfers` list surfaces now use the shared primitives for manual banking table structure, date/money cells, status badges, action buttons, summary copy, and empty states.
- `/contacts` list/create surface now uses the shared primitives for contact profile setup, readiness copy, table structure, active/inactive status badges, action buttons, and empty states.
- `/inventory/balances` now uses the shared primitives for operational stock review, warning copy, table structure, warehouse status badges, action buttons, and empty states.
- No production readiness score increase is taken for launch readiness. This branch does not add backend behavior, hosted migrations, Supabase mutations, Vercel deployments, provider calls, live banking, automatic reconciliation, email sending, payment collection, generated-document object storage, signed URLs, storage moves, ZATCA/UAE/Peppol/ASP production behavior, tax-authority submission, seed/reset/delete behavior, or shutdown behavior.
- Full frontend readiness still depends on completing the remaining Sales, Purchase, Banking, Contacts, Inventory, and all other route-family loops in `docs/product/FRONTEND_REDESIGN_ROUTE_FAMILY_CHECKLIST.md`.

## 2026-06-22 Frontend Redesign Continuation Update

- Product usability improves because the shared LedgerByte frontend system now covers route layout, tables, forms, loading/error/empty states, workflow cards, summary bands, review panels, and breadcrumbs.
- `/settings`, `/documents`, and `/report-packs` now use the shared system while preserving their existing route truth and disabled-boundary wording.
- No production readiness score increase is taken for launch readiness. This branch does not implement hosted migrations, Supabase mutations, Vercel deployments, provider calls, live banking, automated reconciliation, generated-document object storage, signed URLs, storage moves, ZATCA/UAE/Peppol/ASP production behavior, tax-authority submission, seed/reset/delete behavior, or shutdown behavior.
- Remaining frontend maturity depends on follow-up redesign slices for sales, purchases, contacts, inventory, banking, report drilldowns, settings subroutes, setup/onboarding, dashboard, and auth/entry screens.

## 2026-06-21 Report-Pack Generation/Export/Download/Archive Design Update

- Product clarity improves because LedgerByte now has a docs-only future design for report-pack execution, artifacts, downloads, archive writes, email delivery, schedules, permissions, audit events, idempotency, failure/retry handling, and blocked storage/signed URL boundaries.
- No production readiness score increase is taken because this does not implement runtime API endpoints, runtime UI behavior, Prisma migrations, report generation, PDF/CSV/XLSX generation, download/export behavior, email sending, scheduling, archive writes, generated-document mutation, object storage behavior, signed URLs, provider calls, compliance behavior, ZATCA/UAE/Peppol/ASP behavior, AI proposals, Inbox behavior, or hosted mutations.
- Object storage approval remains `BLOCKED`; real object storage remains unimplemented/unproven; signed URLs remain unimplemented/unproven; runtime generated documents remain DB-backed unless separately changed.
- Report-pack archive writes remain blocked until storage approval; download links remain blocked until signed URL behavior is proven.

## 2026-06-20 Setup Wizard Typed Onboarding API Consumption Update

- Product implementation depth improves because the setup wizard typed onboarding preview now consumes the LedgerByte typed onboarding API/service foundation.
- The slice covers API-backed profile/checklist load, selected-archetype update, checklist recompute refresh, and non-destructive fallback when API state is missing or unavailable.
- Feature status remains `PARTIAL`. No production readiness score increase is taken for production launch readiness because full typed onboarding, broader setup checklist integration, audit UI, hosted proof, provider behavior, storage behavior, signed URL behavior, and production compliance behavior remain incomplete or unchanged.
- No browser durable persistence was added: no localStorage, sessionStorage, indexedDB, cookies, or URL query persistence for selected archetype/checklist state.
- Inbox, AI proposals, deterministic pipeline, report packs, integration health, document review, generated-document object storage, signed URLs, provider behavior, hosted behavior, and production compliance behavior remain out of scope.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 Typed Onboarding API/Service Foundation Update

- Product implementation depth improves because LedgerByte now has a local typed onboarding service foundation for persisted profile and checklist state.
- The foundation covers explicit actor context permission checks, organization scoping, optional branch scoping, selected-archetype validation, checklist generation/recompute, complete/skip/reopen state transitions, blocked-item fail-closed behavior, and onboarding checklist event records.
- Feature status remains `PARTIAL`. No production readiness score increase is taken for production launch readiness because setup wizard persistence, frontend/UI persistence, public frontend API writes, hosted migration, Supabase mutation, Vercel mutation, provider behavior, storage behavior, signed URL behavior, and production compliance behavior were not added.
- Full typed onboarding backend behavior remains incomplete. Setup wizard persistence remains unimplemented.
- Inbox, AI proposals, deterministic pipeline, report packs, integration health, document review, generated-document object storage, signed URLs, provider behavior, hosted behavior, and production compliance behavior remain out of scope.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 Typed Onboarding Persistence Schema Foundation Update

- Product implementation depth improves because LedgerByte now has additive Prisma schema and migration groundwork for future typed onboarding persistence.
- The foundation covers onboarding profiles, generated checklist containers, checklist items, checklist events, template version metadata, state enums, organization scoping, optional branch scope, actor fields, indexes, and active-record uniqueness guards.
- Feature status remains `PARTIAL`. No production readiness score increase is taken for production launch readiness because no public API behavior, setup wizard persistence, frontend persistence, hosted migration, Supabase mutation, provider behavior, storage behavior, signed URL behavior, or production compliance behavior was added.
- Full typed onboarding backend behavior remains planned. Setup wizard persistence remains unimplemented.
- Inbox, AI proposals, deterministic pipeline, report packs, integration health, document review, generated-document object storage, signed URLs, provider behavior, hosted behavior, and production compliance behavior remain out of scope.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 OpenBooks Adoption Post-Merge Baseline Update

- PR #89 through PR #95 are merged into `main`; the OpenBooks clean-room adoption frontend metadata stack is now part of the LedgerByte main baseline.
- Baseline includes the clean-room validator, app shell route registry, setup/onboarding route registry consumers, setup progress metadata, typed onboarding profile metadata, setup checklist template UI consumption, and typed onboarding selector/default helpers.
- Product clarity improves for setup and future clean-room adoption sequencing, but no readiness score increase is taken for production launch readiness.
- Full typed onboarding backend remains planned; persistent setup checklist state remains unimplemented.
- Inbox, AI proposals, deterministic bookkeeping pipeline, report pack, integration health/degraded mode runtime, and document/receipt review remain planned.
- Generated-document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed; real object storage and signed URLs remain unimplemented and unproven.
- UAE/ZATCA/Peppol/ASP production readiness remains blocked unless separately proven and approved.

## 2026-06-20 Typed Onboarding Persistence Design Update

- Product clarity improves because LedgerByte now has a design-only plan for future typed onboarding profile and setup checklist persistence.
- The design covers future-only model sketches, API sketches, state machines, template versioning, recompute rules, tenant scoping, permissions, audit events, Inbox interaction boundaries, and integration-health interaction boundaries.
- No readiness score increase is taken for production launch readiness. This does not implement a full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, Prisma schema changes, migrations, API modules, controllers, services, setup wizard runtime behavior, UI persistence, database persistence, hosted behavior, provider adapters, generated-document object storage, signed URLs, or production compliance behavior.
- Persistent setup checklist state remains planned and unimplemented.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 Archetype-Aware Setup Guidance Copy Update

- Product clarity improves because the setup checklist preview now renders LedgerByte-native guidance copy for the selected typed onboarding archetype.
- Guidance covers every archetype with active-now, planned-next, and blocked-until-proven copy while keeping planned and blocked items non-actionable.
- The selected archetype remains ephemeral React state only and is not persisted to an API, database, local storage, session storage, cookies, URL query parameters, or hosted service.
- No readiness score increase is taken for production launch readiness. This does not implement a full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, hosted behavior, API runtime behavior, provider adapters, generated-document object storage, signed URLs, or production compliance behavior.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 Typed Onboarding Profile Selector Defaults Update

- Product clarity improves because setup checklist preview defaults and selector behavior now come from a LedgerByte-native frontend/shared helper.
- The selector helper derives options from typed onboarding metadata, resolves invalid values to `general_services`, and summarizes active, planned, blocked, actionable, and non-actionable preview items.
- The selected archetype remains ephemeral React state only and is not persisted to an API, database, local storage, session storage, cookies, URL query parameters, or hosted service.
- No readiness score increase is taken for production launch readiness. This does not implement a full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, hosted behavior, API runtime behavior, provider adapters, generated-document object storage, signed URLs, or production compliance behavior.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 Setup Checklist Template UI Consumption Update

- Product clarity improves because the setup wizard now renders archetype-aware checklist previews from typed onboarding metadata.
- The selector is client-side only and does not persist selected archetypes to an API, database, local storage, cookies, or hosted service.
- Active preview items link only through active setup/onboarding route helpers and the app route registry. Planned and blocked items remain non-actionable and do not activate inactive future routes.
- No readiness score increase is taken for production launch readiness. This does not implement a full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, hosted behavior, API runtime behavior, provider adapters, generated-document object storage, signed URLs, or production compliance behavior.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 Typed Onboarding Profile Metadata Foundation Update

- Product clarity improves because business archetypes and setup checklist template metadata are centralized in a LedgerByte-native frontend/shared helper.
- Active template items use route registry keys and setup/onboarding route helpers without duplicating route hrefs.
- Planned and blocked template items remain non-actionable and do not activate inactive future routes.
- No readiness score increase is taken for production launch readiness. This does not implement a full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, hosted behavior, UI runtime behavior, API runtime behavior, provider adapters, generated-document object storage, signed URLs, or production compliance behavior.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 Setup Progress Metadata Refinements Update

- Product clarity improves because setup progress categories, labels, descriptions, statuses, route keys, hrefs, action labels, safe explanations, planned metadata, and unknown-item fallback are now centralized in a LedgerByte-native frontend helper.
- Dashboard/setup wizard helpers now consume the setup progress metadata helper plus route-registry-backed setup/onboarding helpers while preserving existing labels, read-only checklist behavior, return-to links, and local-readiness wording.
- Planned typed-onboarding metadata remains non-actionable and does not activate inactive future routes.
- No readiness score increase is taken for production launch readiness. This does not implement a full typed onboarding backend, persistent setup checklist state, setup state-machine behavior, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, hosted behavior, API runtime behavior, provider adapters, generated-document object storage, signed URLs, or production compliance behavior.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 Setup/Onboarding Route Registry Consumers Update

- Product clarity improves because setup/onboarding route helpers now consume the app route registry for setup navigation, breadcrumbs, checklist route mapping, missing-route fallback, and dashboard completion destination.
- Focused web tests cover the setup/onboarding route-consumer slice and existing setup wizard behavior remains read-only.
- No readiness score increase is taken for production launch readiness. This does not implement a full typed onboarding backend, persistent setup checklist state, Prisma migrations, Inbox runtime, AI proposals, deterministic pipeline, report packs, integration health, document review, hosted behavior, API runtime behavior, provider adapters, generated-document object storage, signed URLs, or production compliance behavior.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-20 LedgerByte App Shell Route Registry Update

- Product clarity improves because LedgerByte now has a typed frontend route registry for app-shell metadata, active/planned route status, shell/mobile visibility, permissions, and compliance/storage/provider sensitivity tags.
- Sidebar and mobile first-workflow navigation now consume registry-backed metadata while preserving existing labels and edition-aware compliance navigation.
- No readiness score increase is taken for production launch readiness. This does not implement Inbox, AI proposal review, deterministic bookkeeping pipeline, report packs, integration health, document review, evidence packs, hosted behavior, API modules, Prisma migrations, provider adapters, Convex, generated-document object storage, signed URLs, or production compliance behavior.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-19 OpenBooks Clean-Room Adoption Planning Update

- Product clarity improves because LedgerByte now has a clean-room implementation plan, legal policy, evidence template, and validator for future OpenBooks-inspired behaviors.
- No readiness score increase is taken. OpenBooks adoption is `PLANNED` only; no OpenBooks runtime behavior, API module, web route, Prisma migration, provider integration, storage behavior, or production behavior is implemented.
- No OpenBooks code, schema, comments, UI text, file structure, implementation detail, dependency, source import, translated source, ported source, or vendored source is copied into LedgerByte.
- Future exception Inbox, deterministic bookkeeping pipeline, AI proposal boundary, report pack, typed onboarding, integration health, document review, evidence packs, and disposable test-business fixtures remain LedgerByte-native planned work.
- Production compliance status remains unchanged. Generated document object storage approval remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven; UAE/ZATCA/Peppol/ASP production claims remain blocked unless separately proven.

## 2026-06-19 Complete Generated Document Object Adapter Staging Approval Artifact Intake Update

- Production-readiness clarity improves because LedgerByte now records that the follow-up complete-artifact prompt still contained placeholders only.
- Current status remains `BLOCKED`, not approved. The prompt did not supply the required approval phrase, approver identities/sign-offs, staging environment, dedicated bucket, synthetic tenants, credential-scope reference, rollback/evidence confirmations, bucket-policy review, credential-scope review, no-production-target confirmation, or final sign-off.
- No readiness score increase is taken for production launch readiness. This intake does not approve gates, does not run staging proof, does not connect to hosted storage, does not mutate hosted/customer data, does not generate signed URLs, does not implement real generated-document object storage, and does not change runtime storage defaults.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.

## 2026-06-19 Generated Document Object Adapter Staging Approval Artifact Intake Update

- Production-readiness clarity improves because LedgerByte now records the current approval-artifact intake attempt and its exact missing items.
- Current status remains `BLOCKED`, not approved. The prompt supplied placeholders only; required approval phrase, approver identities/sign-offs, staging environment, dedicated bucket, synthetic tenants, credential-scope reference, rollback/evidence confirmations, bucket-policy review, credential-scope review, no-production-target confirmation, and final sign-off remain missing.
- No readiness score increase is taken for production launch readiness. Intake recording does not approve gates, does not run staging proof, does not connect to hosted storage, does not mutate hosted/customer data, does not generate signed URLs, does not implement real generated-document object storage, and does not change runtime storage defaults.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.

## 2026-06-19 Generated Document Object Adapter Staging Approval Evidence Package Update

- Production-readiness clarity improves because LedgerByte now has a human-facing approval evidence packet and placeholder-only sign-off template for future generated-document object adapter staging proof approval.
- Current status remains `BLOCKED`, not approved. Required sign-offs, staging-only credentials, dedicated bucket, synthetic tenants, proofRunId pattern, rollback/evidence confirmations, bucket-policy review, credential-scope review, no-production-target confirmation, and final approval remain missing.
- No readiness score increase is taken for production launch readiness. The package does not approve gates, does not run staging proof, does not connect to hosted storage, does not mutate hosted/customer data, does not generate signed URLs, does not implement real generated-document object storage, and does not change runtime storage defaults.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.

## 2026-06-19 Generated Document Object Adapter Staging Gate Approval Record Update

- Production-readiness clarity improves because LedgerByte now has a canonical record for generated-document object adapter staging gate approval status.
- Current status is `BLOCKED`, not approved. Required approval evidence, staging-only credentials, dedicated bucket, synthetic tenants, rollback/evidence confirmations, bucket-policy review, credential-scope review, and sign-offs remain missing.
- No readiness score increase is taken for production launch readiness. The record does not run staging proof, does not connect to hosted storage, does not mutate hosted/customer data, does not generate signed URLs, does not implement real generated-document object storage, and does not change runtime storage defaults.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.

## 2026-06-19 Generated Document Object Adapter Staging Runner Design Update

- Production-readiness clarity improves because LedgerByte now has a documented future staging proof runner contract and a local-only fail-closed runner skeleton.
- Local harness confidence improves because the runner supports `help`, `plan`, `preflight`, and `dry-run`; delegates preflight safely; blocks hosted read/write/cleanup/evidence modes; redacts secrets through the preflight result; and reports `proofExecuted=false`, `hostedStorageTouched=false`, and `signedUrlsGenerated=false`.
- No readiness score increase is taken for production launch readiness. The runner does not run staging proof, does not connect to hosted storage, does not mutate hosted/customer data, does not generate signed URLs, does not implement real generated-document object storage, and does not change runtime storage defaults.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.

## 2026-06-19 Generated Document Object Adapter Staging Preflight Helper Update

- Production-readiness clarity improves because LedgerByte now has a local-only helper that evaluates whether a future generated-document object adapter staging proof has the required preflight inputs before any proof runner is used.
- Local harness confidence improves because `scripts/generated-document-object-adapter-staging-preflight.cjs` checks target classification, proofRunId, bucket naming, distinct synthetic tenant ids, allow flags, rollback/evidence confirmations, bucket-policy review, credential-scope review, no-production-target confirmation, and secret redaction.
- No readiness score increase is taken for production launch readiness. The helper does not run staging proof, does not connect to hosted storage, does not mutate hosted/customer data, does not generate signed URLs, and does not implement real generated-document object storage.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenants, dedicated staging bucket, staging tenant isolation proof, runtime-role/RLS staging proof, hosted object-storage proof, bucket policy proof, real generated-document object adapter/proof, signed URL proof if used, schema/migration approval if future metadata is required, migration rehearsal, backup/restore, retention/legal-hold/malware-scan evidence, observability, owner/security/accounting/legal sign-off, and provider evidence.

## 2026-06-19 Generated Document Object Adapter Staging Proof Gates Update

- Production-readiness clarity improves because the required gates before a future staging generated-document object adapter proof are now documented explicitly.
- Local harness confidence improves because `scripts/object-storage-proof-validate.cjs` now reports generated-document object adapter staging gate status, required approvals/inputs, production-looking target refusal, and no-network/no-mutation posture.
- No readiness score increase is taken for production launch readiness. Runtime generated-document storage remains DB-backed by default, real object storage remains unimplemented, signed URLs remain unimplemented, hosted bucket/storage proof was not run, and no real hosted signed URL was generated.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenants, dedicated staging bucket, staging tenant isolation proof, runtime-role/RLS staging proof, hosted object-storage proof, bucket policy proof, real generated-document object adapter/proof, signed URL proof if used, schema/migration approval if future metadata is required, migration rehearsal, backup/restore, retention/legal-hold/malware-scan evidence, observability, owner/security/accounting/legal sign-off, and provider evidence.

## 2026-06-19 Fake Local Generated Document Object Adapter Proof Update

- Controlled-beta API confidence improves because the generated-document adapter boundary now has local fake-object behavior covering write/readback, hash verification, size verification, missing-object failure, tenant-context mismatch rejection, deterministic duplicate writes, and production-looking fake-adapter selection refusal.
- Local test confidence improves because fake object behavior is proven without network calls, hosted storage, credentials, signed URLs, schema changes, migrations, or customer data.
- Local harness confidence improves because `scripts/object-storage-proof-validate.cjs` now reports fake local proof status as local-test-only, while real object adapter implementation remains false and hosted object storage/signature generation remain untouched.
- No readiness score increase is taken for production launch readiness. Runtime generated-document storage remains DB-backed by default, generated-document object storage is not enabled, signed URLs are not implemented, hosted bucket/storage proof was not run, and no real hosted signed URL was generated.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenants, dedicated staging bucket, hosted object-storage proof, bucket policy proof, real generated-document object adapter/proof, real signed URL implementation/proof if URLs are used, schema/migration approval if future metadata is required, backup/restore, retention/legal-hold/malware-scan evidence, observability, owner/legal/accounting/security sign-off, and provider evidence.

## 2026-06-19 Disabled Generated Document Object Adapter Proof Update

- Controlled-beta API confidence improves because explicit generated-document object/S3-compatible adapter modes now resolve to a disabled fail-closed adapter instead of relying only on the absence of a real adapter.
- Local test confidence improves because adapter tests cover DB default selection, disabled object adapter read/write refusal, absence of signed URL capability on the disabled adapter, fake local adapter local-test-only gating, and unknown-mode fail-closed behavior.
- Local harness confidence improves because `scripts/object-storage-proof-validate.cjs` now reports disabled object adapter detection, selector detection, explicit object-mode disabled selection, and unknown-mode fail-closed behavior.
- No readiness score increase is taken for production launch readiness. Generated documents remain database-backed by default, generated-document object storage is not enabled, signed URLs are not implemented, hosted bucket/storage proof was not run, and no real hosted signed URL was generated.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenants, dedicated staging bucket, hosted object-storage proof, bucket policy proof, real generated-document object adapter/proof, real signed URL implementation/proof if URLs are used, schema/migration approval if future metadata is required, backup/restore, retention/legal-hold/malware-scan evidence, observability, owner/legal/accounting/security sign-off, and provider evidence.

## 2026-06-19 Generated Document Storage Adapter Interface Update

- Controlled-beta API confidence improves because generated-document archive writes and downloads now pass through a generated-document-specific adapter boundary while preserving the existing database-backed behavior.
- Local test confidence improves because adapter tests cover the DB default, missing DB content failure, generated-document-id anchored fake local object keys, traversal rejection, and in-memory fake read/hash behavior.
- Local harness confidence improves because `scripts/object-storage-proof-validate.cjs` now reports adapter-interface guardrails: DB default, fake local adapter test-only status, object storage disabled by default, no hosted object storage touched, no real signed URLs generated, and no schema migration required.
- No readiness score increase is taken for production launch readiness. Generated documents remain database-backed by default, generated-document object storage is not enabled, signed URLs are not implemented, hosted bucket/storage proof was not run, and no real hosted signed URL was generated.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenants, dedicated staging bucket, hosted object-storage proof, bucket policy proof, real generated-document object adapter/proof, real signed URL implementation/proof if URLs are used, schema/migration approval if future metadata is required, backup/restore, retention/legal-hold/malware-scan evidence, observability, owner/legal/accounting/security sign-off, and provider evidence.

## 2026-06-19 Generated Document Object Storage Implementation Plan Update

- Production-readiness clarity improves because the generated-document object-storage path is now sequenced into DB-adapter, fake local adapter, disabled object adapter, metadata/schema approval, staging proof, backfill rehearsal, optional signed URLs, and production approval phases.
- Local harness confidence improves because `scripts/object-storage-proof-validate.cjs` now reports generated-document implementation-plan guardrails and tests require disabled defaults, DB fallback, generated-document-id anchored keys, migration approval, local-only fake adapter posture, and hosted-mutation refusal.
- One local proof-helper defect was fixed: mock-cycle generated-document object keys now use the generated document id anchor instead of source-field fallback.
- No readiness score increase is taken for production launch readiness. Generated documents remain database-backed, generated-document object storage is not implemented, signed URLs are not implemented, hosted bucket/storage proof was not run, and no real hosted signed URL was generated.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenants, dedicated staging bucket, hosted object-storage proof, bucket policy proof, generated-document object-storage implementation/proof, real signed URL implementation/proof if URLs are used, schema/migration approval if required, backup/restore, retention/legal-hold/malware-scan evidence, observability, owner/legal/accounting/security sign-off, and provider evidence.

## 2026-06-19 Generated Document Object Storage Contract Update

- Production-readiness clarity improves because generated-document object-storage metadata, object-key, authorization, hash/integrity, write/read, migration/rollback, failure, and acceptance contracts are now documented explicitly.
- Local harness confidence improves because `scripts/object-storage-proof-validate.cjs` now reports generated-document object-storage contract posture and tests require generated-document-id anchored future object keys.
- No readiness score increase is taken for production launch readiness. Generated documents remain database-backed, generated-document object storage is not implemented, signed URLs are not implemented, hosted bucket/storage proof was not run, and no real hosted signed URL was generated.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenants, dedicated staging bucket, hosted object-storage proof, bucket policy proof, real signed URL implementation/proof if URLs are used, generated-document object-storage implementation/proof, backup/restore, retention/legal-hold/malware-scan evidence, observability, owner sign-off, and provider evidence.

## 2026-06-19 Signed URL Object Storage Proof Harness Update

- Production-readiness clarity improves because signed URL/object-storage authorization rules, object-key requirements, staging proof requirements, and acceptance criteria are now documented explicitly.
- Local harness confidence improves because `scripts/object-storage-proof-validate.cjs` now reports signed URL proof-plan posture, refuses production-looking storage targets, requires staging allow/proofRunId gates for staging planning, and validates object-key policy shapes.
- One local proof-harness defect was fixed: planned object-key helpers now remove `..` traversal markers before constructing keys.
- No readiness score increase is taken for production launch readiness. Signed URLs remain not implemented, generated documents remain database-backed, hosted bucket/storage proof was not run, and no real hosted signed URL was generated.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenants, dedicated staging bucket, hosted object-storage proof, bucket policy proof, real signed URL implementation/proof, generated-document object-storage proof, backup/restore, retention/legal-hold/malware-scan evidence, observability, owner sign-off, and provider evidence.

## 2026-06-19 Storage Generated Document Isolation Proof Update

- Controlled beta API confidence improves because local storage/generated-document tenant-isolation tests now cover uploaded attachment metadata/content denial, generated-document metadata/content denial, supported source ownership before archive creation, S3 object-key filename normalization, and storage migration-plan organization scoping.
- Two local defects were fixed: generated-document archive creation now verifies supported source records by `{ id, organizationId }`, and S3 attachment object-key filenames remove path traversal markers before key construction.
- No readiness score increase is taken for production launch readiness. Generated documents remain database-backed, signed URLs are not implemented, generated-document object storage is not implemented, and hosted bucket/storage proof was not run.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, hosted object-storage mutation, signed URL generation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenants, hosted object-storage proof, bucket policy proof, signed URL design/proof, generated-document object-storage design/proof, backup/restore, retention/legal-hold/malware-scan evidence, observability, owner sign-off, and provider evidence.

## 2026-06-18 Accounting Concurrency Idempotency Regression Update

- Controlled beta API confidence improves because representative duplicate/race accounting mutations now have focused local regression coverage.
- One real stale-write defect was fixed: manual bank statement matching now uses a conditional `UNMATCHED` claim before writing match fields.
- Coverage added for duplicate sales invoice finalization, duplicate customer payment allocation, and stale bank statement match attempts; existing local specs cover many related payment, bill, credit/debit note, journal, and void/reversal guards.
- No readiness score increase is taken for hosted/customer-data or production launch readiness. No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, SQL template application, RLS rollout, runtime role application, object-storage mutation, signed URL generation, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, or hosted/customer-data mutation occurred.
- Remaining blockers are API idempotency-key design, schema/locking strategy review if required, approved staging/proof credentials, synthetic tenants, hosted multi-process accounting race evidence, runtime-role/RLS proof, storage/signed URL proof, backup/restore proof, observability, owner sign-off, and provider evidence.

## 2026-06-18 Least-Privilege Runtime Role And RLS Staging Design Update

- Production-readiness clarity improves because the runtime DB role split and RLS staging rollout are now designed as explicit next steps after PR #72.
- No readiness score increase is taken. No runtime role was applied to hosted DB, no RLS policy was applied, no SQL template was run, no schema or migration changed, and no hosted/customer data was touched.
- The target runtime-role direction is a separate non-admin API runtime role for ordinary Prisma traffic, with migrations/admin maintenance kept on a separate migration/admin role.
- The target RLS staging direction is transaction-scoped tenant context in a reviewed Prisma helper, starting with critical actual model names and two synthetic tenants in an isolated staging/proof database.
- SQL templates under `docs/security/sql/` are planning artifacts only and require review before any staging use.
- Remaining blockers are approved staging/proof credentials, synthetic tenant IDs, read-only and synthetic proof adapters, runtime-role staging proof, RLS or accepted compensating control, storage/signed URL proof, backup/restore, concurrency, observability, owner sign-off, and provider evidence.

## 2026-06-18 Database RLS And Storage Isolation Decision Update

- Production-readiness clarity improves because database/RLS/runtime-role and storage tenant-isolation blockers are now documented as explicit production decisions instead of being implied by local API tests.
- No readiness score increase is taken. Database-enforced application-table RLS remains absent/pending, staging tenant isolation proof remains blocked by missing credentials, and storage/signed URL proof remains pending.
- Recommended production direction is hybrid: keep application-level `organizationId` scoping, add a least-privilege non-admin API runtime database role, then prove critical-table RLS in staging before production.
- Storage remains not production-proven: uploaded attachments are database/base64-backed by default with feature-flagged S3-compatible uploads, generated documents remain database-backed, and no hosted object-storage, signed URL, backup/restore, or archive immutability proof exists yet.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, RLS implementation, object-storage mutation, signed URL generation, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Remaining blockers are approved staging/proof credentials, synthetic tenant IDs, read-only and synthetic proof adapters, runtime-role evidence, RLS or accepted compensating control, storage/signed URL proof, backup/restore, concurrency, observability, owner sign-off, and provider evidence.

## 2026-06-18 Staging Tenant Isolation Proof Run Blocker Update

- Production-readiness tracking improves because the PR #70 staging proof execution path was attempted only up to the safe local classification boundary and the missing staging inputs are now recorded explicitly.
- No readiness score increase is taken. Staging proof was not executed because the approved staging/proof URL, proof-run ID, auth token, synthetic tenant A/B IDs, base allow gate, read-only allow gate, and staging mutation allow gate were not present.
- Local evidence remains useful but limited: harness tests, accounting tenant isolation regression, bank account service slice, API/web typechecks, diff checks, local dry-run, and local read-only plan passed without network or mutation.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, seed/reset/delete, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, hosted/customer-data mutation, or production target was touched.
- Hosted/customer-data isolation, database RLS/runtime-role evidence, object-storage/signed URL proof, backup/restore proof, concurrency proof, observability evidence, provider evidence, and owner sign-off remain blockers.

## 2026-06-18 Staging Tenant Isolation Proof Execution Contract Update

- Production-readiness process improves because the hosted tenant isolation harness now separates dry-run classification, staging read-only probe readiness, staging synthetic proof readiness, and production read-only posture classification.
- The new staging contract remains fail-closed: staging proof modes require explicit allow variables, a proof-run ID, auth token presence, two synthetic proof tenant IDs, a clearly staging/test/proof target, and proof-run-ID-scoped cleanup.
- The harness now reports missing variables and sanitized human-readable/JSON summaries without printing auth tokens or secret-like URL values.
- No score increase is taken for production launch readiness. No actual staging proof was executed, network execution remains disabled in this branch, database RLS is still not implemented, and hosted/customer-data isolation remains unproven.
- No hosted command, Supabase command, Vercel deploy command, production database command, schema change, migration, seed/reset/delete, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, or customer-data mutation occurred.

## 2026-06-18 Hosted Tenant Isolation Proof Readiness Update

- Production-readiness process improves because the hosted tenant isolation proof plan now has a disabled-by-default harness shell with fail-closed target classification.
- The harness is safety/readiness infrastructure only. It does not run hosted checks, connect to databases, call Supabase/Vercel, call providers, send email, connect bank feeds, create payment objects, or mutate hosted/customer data.
- Guard coverage now proves missing allow gate, missing proof-run ID, production-looking URL, hosted target in local mode, destructive/external flags, and secret-like URL values are handled conservatively.
- No score increase is taken for production launch readiness. Hosted/customer-data proof, staging synthetic tenant execution, RLS/runtime-role proof, storage/signed URL proof, concurrency proof, observability evidence, provider evidence, and accountant/legal/security sign-off remain blockers.

## 2026-06-18 Hosted Tenant Isolation Proof Plan Update

- Production-readiness clarity improves because hosted tenant isolation proof is now planned explicitly instead of being implied by local API tests.
- PR #67 remains local/API evidence only: it added accounting tenant isolation/RBAC metadata regressions and fixed the bank-account transaction opening-balance organization filter bug.
- This pass documents the hosted proof still needed across staging/dedicated proof environments, synthetic tenants, cross-tenant API checks, database row-policy/runtime-role review, storage/signed URL checks, concurrency/race checks, observability, and acceptance criteria.
- Schema review found important production-domain models carry `organizationId`; app-source raw SQL is limited to the health `SELECT 1`; no repo migration was found that enables application-table RLS policies.
- No score increase is taken for production launch readiness. Hosted/customer-data proof, storage proof, backup/restore proof, concurrency proof, runtime-role/RLS strategy, provider evidence, and accountant/legal/security sign-off remain blockers.
- No hosted command, Supabase command, Vercel command, production database command, schema change, migration, seed/reset/delete, provider call, ZATCA/UAE production work, real email, payment processor integration, real bank feed, or customer-data mutation occurred.

## 2026-06-18 Accounting Tenant Isolation Regression Update

- Controlled beta API confidence improves because tenant-isolation and RBAC metadata regressions now cover real accounting and accounting-adjacent controllers.
- Coverage includes sales invoices, purchase bills, customer payments, supplier payments, credit notes, purchase debit notes, bank accounts/reconciliation, compliance readiness, audit logs, attachments, generated documents, and reports.
- One real tenant-isolation bug was fixed: bank-account transaction opening balances now include `organizationId` in the journal-line balance query.
- Verification passed locally, including full API tests/typecheck, requested web slices, web typecheck/build, `verify:diff`, and post-commit `verify:ci:local`.
- This does not increase provider, hosted/customer-data, database RLS, legal/accountant, ZATCA production, UAE production, or launch readiness. It is local API/test evidence only.
- Provider evidence remains unavailable and no provider/certification/production compliance claim was added.

## 2026-06-18 Accounting Workflow Regression Baseline Update

- Completed a full baseline verification run for shared API + web accounting workflow coverage with no feature/code changes, from clean `origin/main` (`e089690dd56cfb86911ecdfe3bcf5620227b9529d`).
- Passed API regression validation (`test`, `typecheck`) and web coverage (`invoices`, `bills`, `customer-payments`, `supplier-payments`, `dashboard`, `reports`, `sidebar`) plus web typecheck, web build, and diff checks.
- Initial API suite failed due stale/generated Prisma typing mismatch; resolved with `corepack pnpm --filter @ledgerbyte/api db:generate` and re-ran successfully.
- No accounting-production claims were introduced; this run confirms frontend/API baseline confidence only.
- Known accepted warning remains non-blocking: `@base-ui/react` `act(...)` warning in sidebar render tests.
- Provider evidence remains unavailable and no UAE PINT-AE/ZATCA/security provider production claim was added.

## 2026-06-17 Country Edition Clean Reconciliation Update

- Controlled beta positioning improves because the base LedgerByte frontend now defaults to neutral accounting workspace copy instead of implying UAE/KSA/ZATCA/FTA/PINT-AE globally.
- KSA and UAE market wording is edition-gated through one frontend config layer. This reduces wrong-market surface risk, but it does not add legal, provider, hosted, or production compliance readiness.
- KSA readiness remains local ZATCA readiness only. UAE readiness remains local UAE eInvoicing/PINT-AE readiness only.
- Generic readiness remains limited to neutral VAT/accounting review surfaces.
- This branch does not increase provider readiness. Provider evidence remains unavailable.
- Existing Vercel project URLs are prior evidence only; no deploy or infrastructure command ran.

## 2026-06-17 Security Settings Route Implementation Plan Update

- Controlled beta planning clarity improved and was implemented as a read-only `/settings/security` route using existing auth, token, member, role, organization, permission, and audit-log capabilities.
- The route now provides account identity, password reset guidance, team access summary, roles/permissions summary, audit-log shortcut, and organization setup posture without adding backend/auth/session/security control logic.
- Missing backend-backed capabilities (sessions, MFA, SSO, API-token controls, logged-in password change, logout-all, email verification, and security notifications) are explicitly callouted as not available.
- Explicitly out of scope until backend support exists: persisted sessions, refresh tokens, session revoke, logout-all, MFA, SSO, API-token management, logged-in password change, email verification, and configurable security notifications.
- This does not increase production security readiness. It reduces the risk of future UI overclaiming by defining what the route may truthfully show first.

## 2026-06-17 Owner Security Organization Settings Visual QA Update

- Controlled beta UI confidence improves because real Owner organization/security-adjacent settings surfaces now have local Playwright visual coverage.
- The fixture remains local/test-only and read-only. It models existing route contracts, role permissions, long-field content, team members, roles, role detail, audit retention, compliance readiness, setup states, and hidden/disabled restricted actions without changing backend behavior.
- The route matrix checks existing routes across desktop, tablet, and mobile, including the now-implemented `/settings/security` route, plus `/settings/team`, `/settings/roles`, `/settings/roles/[id]`, `/settings/audit-logs`, `/settings/compliance`, `/setup`, and `/organization/setup`.
- The role matrix checks `Owner`, `Accountant`, and `Viewer`, including Owner team/role/admin affordances and restricted Accountant/Viewer behavior according to existing permissions.
- Screenshots and report output are generated under ignored `artifacts/visual-qa/owner-security-organization-settings-visual-qa/` and are not committed.
- This is frontend test/readability evidence only. It does not increase auth/session/security business-logic readiness, provider readiness, legal readiness, hosted/customer-data readiness, storage-provider readiness, UAE eInvoicing readiness, ZATCA readiness, or production compliance readiness.
- Remaining UI readiness gaps are real security/session/API settings depth if product routes are added later, organization profile editing beyond setup, generated-document detail route breadth if added later, and accountant/legal sign-off on final settings/compliance wording.

## 2026-06-16 Owner Settings Generated-Document Storage Evidence Visual QA Update

- Controlled beta UI confidence improves because Owner-heavy settings, generated-document archive, storage evidence, document settings, setup, accounts, tax rates, and source transaction document evidence surfaces now have local Playwright visual coverage.
- The fixture remains local/test-only and read-only. It models existing route contracts, role permissions, long-field content, generated/failed/superseded document rows, metadata-only storage evidence, conservative compliance wording, blocked provider-evidence states, and hidden/disabled restricted actions without changing backend behavior.
- The route matrix checks existing routes across desktop, tablet, and mobile. It uses `/settings/documents` for document settings and `/documents` for generated-document archive because `/generated-documents` is API-only.
- The role matrix checks `Owner`, `Accountant`, and `Viewer`, including Owner settings/storage actions, Accountant accounting-adjacent permissions, and Viewer restricted settings/mutation behavior.
- Screenshots and report output are generated under ignored `artifacts/visual-qa/owner-settings-generated-document-storage-evidence/` and are not committed.
- This is frontend test/readability evidence only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, storage-provider, generated-document business logic, report calculation, report export, or production compliance readiness.
- Remaining UI readiness gaps are owner/security settings depth, generated-document detail route breadth if added later, storage execution evidence after real provider proof, and accountant sign-off on final settings/compliance wording.

## 2026-06-16 Secondary Operational Route Polish Visual QA Update

- Controlled beta UI confidence improves because secondary operational routes now have local Playwright visual coverage for contact lists, settings, setup, documents, chart of accounts, tax rates, and banking-adjacent review surfaces.
- The fixture remains local/test-only and read-only. It models existing route contracts, role permissions, long-field content, list density, empty states, conservative compliance wording, blocked provider-evidence states, and disabled/restricted actions without changing backend behavior.
- The route matrix checks existing secondary operational routes across desktop, tablet, and mobile. It uses `/settings/team`, `/tax-rates`, `/settings/number-sequences`, `/accounts`, `/setup`, `/documents`, and `/bank-accounts/bank-1/statement-transactions` where those features actually live.
- The role matrix checks `Owner`, `Accountant`, and `Viewer`, including restricted settings/mutation behavior for Viewer and owner-only admin affordance checks for Accountant.
- Screenshots and report output are generated under ignored `artifacts/visual-qa/secondary-operational-route-polish/` and are not committed.
- This is frontend test/readability evidence only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, storage-provider, banking-provider, report calculation, report export, or production compliance readiness.
- Remaining UI readiness gaps are owner/security settings depth, generated-document storage execution evidence, secondary route component migration breadth, and accountant sign-off on final settings/compliance wording.

## 2026-06-16 Report Drilldown Dense Entry Visual QA Update

- Controlled beta UI confidence improves because report drilldowns, dense accounting tables, ledger-style entry screens, statements, documents, and audit logs now have local Playwright visual coverage.
- The fixture remains local/test-only and read-only. It models existing report routes, VAT review wording, aged buckets, journal rows, statement rows, document archive rows, audit-log rows, long-field content, and restricted-role behavior without changing backend behavior.
- The route matrix checks existing report and dense-entry routes across desktop, tablet, and mobile. It uses `/reports/vat-summary`, `/reports/vat-return`, party statement routes, and `/settings/audit-logs` where those features actually live.
- The role matrix checks `Owner`, `Accountant`, and `Viewer`, including restricted export/create behavior for Viewer and accounting-heavy readability for Accountant.
- Screenshots and report output are generated under ignored `artifacts/visual-qa/report-drilldown-dense-entry-visual-qa/` and are not committed.
- This is frontend test/readability evidence only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, banking provider, report calculation, report export, or production compliance readiness.
- Remaining UI readiness gaps are secondary operational route migration, dense entry-form ergonomics beyond the checked screens, and accountant sign-off on final report wording.

## 2026-06-16 Refund Collections Banking Detail Polish Update

- Controlled beta UI confidence improves because refund, collections, banking, reconciliation, cheque, report, and document detail surfaces now have local Playwright visual coverage.
- The fixture remains local/test-only and read-only. It models existing app statuses, balances, manual banking records, statement rows, reconciliation snapshots, cheques, long-field content, and restricted-role behavior without changing backend behavior.
- The route matrix checks existing refund/collections/banking/detail routes across desktop, tablet, and mobile. It uses nested banking/reconciliation/cheque routes where those features actually live.
- The role matrix checks `Owner`, `Accountant`, and `Viewer`, including restricted-action behavior for Viewer and accounting-heavy readability for Accountant.
- Screenshots and report output are generated under ignored `artifacts/visual-qa/refund-collections-banking-detail-polish/` and are not committed.
- This is frontend test/readability evidence only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, banking provider, or production compliance readiness.
- Remaining UI readiness gaps are report drilldown depth, dense entry-form ergonomics, secondary operational route migration, and accountant review of final refund/banking wording.

## 2026-06-16 Detail-State Accountant Mobile Visual QA Update

- Controlled beta UI confidence improves because realistic transaction detail states and accountant-heavy mobile/table surfaces now have local Playwright visual coverage.
- The fixture remains local/test-only and read-only. It models existing app statuses, balances, due dates, allocation records, party states, and long-field content without adding production statuses or touching backend behavior.
- The detail-state matrix checks sales invoice, purchase bill, customer payment, supplier payment, credit note, debit note, customer, and supplier detail pages across desktop, tablet, and mobile.
- The accountant mobile/table matrix checks line items, payment allocations, party transactions, aged reports, General Ledger, Trial Balance, bank transactions, and documents across tablet and mobile.
- Screenshots and report output are generated under ignored `artifacts/visual-qa/detail-states-accountant-mobile-table-review/` and are not committed.
- This is frontend test/readability evidence only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, or production compliance readiness.
- Remaining UI readiness gaps are refund/collections/banking detail polish, report drilldowns, dense entry-form ergonomics, and staged secondary-route migration.

## 2026-06-16 Role-Filtered UI Visual QA Route Polish Update

- Controlled beta UI confidence improves because role-filtered app-shell, route, and create-menu behavior now has local Playwright visual coverage.
- The fixture uses the existing shared default roles: `Owner`, `Accountant`, `Sales`, `Purchases`, and `Viewer`.
- The route matrix checks `Owner` and `Viewer` across desktop, tablet, and mobile. The create-menu matrix checks all five role profiles across the same viewports.
- The checks verify allowed route access, existing access-denied behavior, sidebar/topbar shell visibility, disabled unauthorized create actions, local route hrefs, no document-level horizontal overflow, no severe topbar overlap, and conservative visible wording.
- Screenshots and report output are generated under ignored `artifacts/visual-qa/role-filtered-route-polish/` and are not committed.
- This is frontend test/readability evidence only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, or production compliance readiness.
- Remaining UI readiness gaps are deeper role-filtered detail states, refund/collections/banking detail polish, and accountant review of dense mobile table/card surfaces.

## 2026-06-16 Authenticated UI Visual QA Route Hardening Update

- Controlled beta UI confidence improves because 20 authenticated app routes now have local Playwright visual checks across desktop, tablet, and mobile viewports.
- The fixture is local/test-only and read-only. It primes the existing visual session and mocks API responses for app-shell/dashboard/routes without real auth provider behavior, hosted data, database mutation, or external provider calls.
- The route matrix checks authenticated shell visibility, primary route headings/actions, no document-level horizontal overflow, no severe topbar/content overlap, conservative visible wording, dashboard KPI/readiness content, and reduced-motion dashboard scene fallback.
- Screenshots and report output are generated under ignored `artifacts/visual-qa/authenticated-route-hardening/` and are not committed.
- This is frontend test/readability evidence only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, or production compliance readiness.
- Remaining UI readiness gaps are deeper role-filtered route states, route-specific form polish, refund/collections/banking detail surfaces, and accountant review of dense operational screens.

## 2026-06-16 UI Stitch Frontend Foundation Hardening Update

- Controlled beta usability improves because the Stitch/MCP shell, dashboard, readiness, and form polish was reconciled with the merged shadcn shell, transaction, and payment workflow branches.
- This is a frontend experience/readability improvement only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, or production compliance readiness.
- The real Three.js dashboard visual remains dashboard-only and keeps reduced-motion/no-WebGL fallback behavior.
- No backend API, schema, migration, accounting logic, tax logic, payment behavior, compliance behavior, provider adapter, Vercel/Supabase setting, or production infrastructure changed.
- Remaining UI readiness gaps are authenticated visual QA with a safe local fixture, route coverage for documents/reports/compliance/settings, mobile edge states, and accountant review of dense data screens.

## 2026-06-16 UI Shadcn Transaction Workflows Update

- Controlled beta usability improves for daily AR/AP entry and party review because sales invoice creation, purchase bill creation, and customer/supplier detail workspaces now use the shadcn/LedgerByte transaction layout.
- This is a frontend experience/readability improvement only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, or production compliance readiness.
- Existing accounting, tax, finalization, AP state, payment allocation, permission, and route-link behavior is preserved.
- PR `#51` beta deployment/Supabase gate evidence was observed before this branch and is documented in the handoff trail, but it remains beta/non-production evidence only.
- Remaining UI readiness gaps include customer/supplier payment forms/details, other transaction details, reports, settings, mobile edge states, and broader role-filtered browser verification.

Scoring uses a 0-100 practical readiness scale for the current codebase. A high score means the area is usable in the current MVP; it does not imply production legal/compliance readiness.

## 2026-06-16 UI Shadcn Shell/Dashboard Refresh Update

- Overall controlled beta usability improves because the core web shell, dashboard, sales invoice list, purchase bill list, and sales invoice workflow guidance now share a shadcn/ui-based component foundation.
- This is a frontend experience/readability improvement only. It does not increase UAE eInvoicing, ZATCA, provider, legal, hosted/customer-data, or production compliance readiness.
- Three.js is limited to one subtle dashboard financial-flow visual with reduced-motion and no-WebGL fallbacks.
- No backend API, schema, migration, accounting logic, tax logic, payment behavior, compliance behavior, provider adapter, Vercel/Supabase setting, or production infrastructure changed.
- Remaining UI readiness gaps are route coverage and visual QA breadth: secondary workspaces, dense forms, report pages, mobile edge states, and role-filtered authenticated states still need gradual migration and browser review.

## 2026-06-16 UAE PINT-AE Scenario Fixture Validation QA Update

- UAE eInvoicing readiness moves from `53` to `55` because the package now has a structured local scenario fixture suite, positive and negative golden fixtures, blocked fixture coverage, and a metadata-only local QA summary for the existing official local serializer/rule pack.
- This improvement is package/local QA only. It does not prove real provider validation, ASP submission, FTA reporting, real Peppol transmission, legal compliance, certification, hosted/customer-data behavior, or production UAE eInvoicing readiness.
- Covered positive scenarios: standard tax invoice, commercial invoice `380`, tax credit note with reason/original reference, export receiver not registered in Peppol `9900000099`, deemed supply `9900000097`, buyer not subject `9900000098`, and multi-line invoice values.
- Covered negative scenarios: missing buyer endpoint, invalid TIN/TRN, credit-note missing reason/reference, and unsupported legacy transaction flag.
- Blocked scenarios: reverse charge, allowance/discount invoices, and provider-specific payload contracts.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- ZATCA remains parked and blocked by default.
- Next priority is `UAE ASP provider sandbox evidence review`.

| Category | Score | Current evidence | Biggest gaps | Next priority |
| --- | ---: | --- | --- | --- |
| Core accounting | 78 | Chart of accounts, manual journals, fiscal-period guard, posting/reversal, balanced reports, smoke coverage. | Year-end close, retained earnings, approval workflow, concurrency/load testing, accountant sign-off. | Add fiscal year close and accountant-reviewed report definitions. |
| Sales/AR | 94 | Invoices, non-posting sales quotes/proformas with draft-invoice conversion, safe sales quote PDF/archive, manual recurring invoice templates with draft-invoice generation, non-posting delivery notes with safe PDF/archive and reverse source visibility on invoice/quote detail pages, controlled non-payment-gateway collections with case/activity tracking and invoice/customer visibility, dedicated operational sales inventory returns with explicit stock-in posting, payments, unapplied payments, credit notes, refunds, customer ledgers/statements, PDFs for existing posted documents, attachments, smoke coverage, targeted quote/recurring/delivery-note/collections/sales-return tests, and focused quote, recurring, and delivery-note browser workflow coverage. | Automatic recurring scheduler, sales inventory return source visibility panels, scheduled collection reminders, payment gateway/payment links, real customer email sending, online quote acceptance, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off. | Run focused sales inventory return and collections browser workflow coverage plus accountant wording review before designing reminders/email/payment automation. |
| Purchases/AP | 84 | Purchase orders, bills, clearing mode, supplier payments, debit notes, refunds, cash expenses, AP ledgers/statements, PDFs, supplier statement PDF export/archive tracking, guided AP drill-down panels, read-only purchase matching visibility, matching exception center, matching review workflow, non-posting purchase returns, read-only valuation variance previews, read-only landed cost preview links for purchase receipt/bill sources, Supplier/AP Dashboard workspace, supplier AP summary panels, supplier activity grouping, and closed DEV-08 local AP evidence for state machines, output/archive/download, permissions, generated-document mock email, fiscal blockers, and cleanup/retention posture. | Not production-complete: no variance posting, landed cost posting/valuation update, FIFO/cost layers, automatic AP adjustment, automatic inventory adjustment, automatic debit note/refund creation, supplier email/remittance delivery, broad E2E/smoke/full-test coverage, hosted/customer-data behavior, or accountant sign-off on AP dashboard thresholds and AP statement layout. | Run focused Purchases/AP browser workflow QA and accountant review of AP attention wording before designing supplier email, payment automation, variance posting, landed cost posting, or FIFO work. |
| Banking/reconciliation | 76 | Bank profiles, transfers, opening balances, manual CSV/JSON/text plus limited OFX/CAMT/MT940/XLSX statement upload or paste preview, downloadable canonical CSV statement template UX, service-level duplicate/idempotency/reconciliation-overlap import safety, parser QA for common sanitized variants and safe errors, deterministic non-mutating match suggestions, deterministic bank-rule suggestions with explicit apply/audit behavior, operational bank deposit batches with explicit statement-credit matching, operational credit/prepaid card settlements with explicit direction-aware statement-row matching, operational received/issued cheque lifecycle with deposit-batch links and direction-aware statement-row matching, clearing-account configuration, explicit accounting preflight, safe configured deposit/card journal posting, inline statement transaction review workspace, matching, categorization, reconciliation approval/close/void, reconciliation report/audit summary and CSV evidence polish, design-only raw-file archive policy, visible banking/reconciliation drill-down guidance, and closed DEV-09 local evidence for synthetic fixtures, parser/preview checks, match/categorize/ignore, and reconciliation close/void. | No live feeds, auto-match execution, silent auto-rule application, silent auto-posting, DB-level unique statement fingerprint/index, certified bank-specific parser coverage, direct cheque-in-hand/outstanding-cheque source accounting, card credit/refund offset posting, transfer fees, FX handling, production raw-file archive workflow, broad E2E/smoke/full-test coverage, hosted/beta/customer-data behavior, or accountant sign-off. | Run banking beta QA/accountant review; keep direct cheque accounting/card credit offset, parser certification, hosted/customer-data proof, and broad coverage as separate gaps. |
| Reports | 76 | GL, Trial Balance, P&L, Balance Sheet, VAT Summary, draft/internal-review VAT Return, VAT Return internal review CSV export, AR/AP aging, CSV/PDF exports, generated archive, read-only report-pack manifest preview UI, and closed DEV-10 local evidence for marker fixtures, core report JSON, aging/VAT Return JSON, output/archive/download metadata, no-body handling, and selected permission gates. | Official VAT filing, scheduled/email delivery, report-pack generation/export/download/archive behavior, accountant layout review, advanced branch/multi-period/consolidation behavior, inventory valuation/FIFO/landed-cost report coverage, generated-document object-storage retention, broad E2E/smoke/full-test coverage, hosted/beta/customer-data behavior, and load/concurrency proof. | Convert DEV-10 gaps into accountant-review, official VAT, report-pack generation/export/download design, generated-document storage, restricted-role matrix, and E2E/load tickets before claiming production readiness. |
| Inventory | 79 | Warehouses, movements, adjustments, transfers, receipts, issues, explicit purchase-return operational stock-out for safe receipt-linked tracked lines, explicit sales inventory return stock-in for validated tracked lines, read-only landed cost preview for eligible purchase receipt/bill lines, read-only FIFO cost-layer preview from existing movements, serial/batch/bin/location setup groundwork with read-only item traceability visibility, valuation reports, manual COGS, receipt asset posting, clearing reports, variance proposals, visible inventory drill-down guidance, and closed DEV-11 local evidence for marker fixture math, manual COGS, receipt asset posting, variance proposal posting, and inventory/report financial summaries. | No active FIFO valuation, no persistent cost-layer ledger/backfill, landed cost posting/valuation update, full tracked movement capture for serial/batch/bin items, automatic postings, negative-stock production policy, sales/purchase return movement reversal, FIFO COGS reversal policy, historical direct-mode migration, multi-currency inventory, transfer-fee/landed allocation, accountant certification, hosted/beta/customer-data proof, broad E2E/smoke/full-test, or load/concurrency proof. | Design tracked movement capture, active FIFO policy/backfill, return movement reversal, landed cost posting, accountant-review, generated-document retention, E2E, hosted-proof, and load/concurrency tickets before claiming production readiness. |
| Documents/attachments | 71 | Generated PDFs, archive, document action guidance, clearer template/settings copy, archive status labels, supplier statement PDF export/archive tracking, attachment upload/list/download/soft-delete, linked panels, storage readiness/migration dry run, feature-flagged S3-compatible storage for new uploaded attachments, backup evidence planning, local restore-count evidence for database-backed records, and closed DEV-12 local generated-document metadata/download/storage dry-run/retention-gap evidence. | DB/base64 remains default, no migration executor, no generated-document S3 path, no signed URLs, no lifecycle policy, no legal hold, no virus scanning, no OCR, no retention/legal compliance proof, no backup/restore proof, no real object-storage restore proof. | Validate S3 mode with a non-production bucket, implement generated-document object storage and migration executor, then capture retention/legal-hold, scanning, backup, and object-storage restore evidence. |
| Roles/permissions/security | 72 | Shared permission strings, backend guards, frontend gating, team/role UI, invite onboarding, rate limits, and user-testing Supabase `anon`/`authenticated` Data API grants revoked. | No MFA, advanced sessions, dual control, full RLS policies, least-privilege runtime DB role, production identity controls. | Create a least-privilege Prisma runtime DB role and validate it in user-testing. |
| Audit/compliance visibility | 78 | Standard events, metadata redaction, audit UI, filters, CSV export, retention settings, dry-run preview, smoke checks. | No immutable store, scheduled export, purge executor, alerting, anomaly detection, tamper evidence. | Add scheduled export/immutable storage design and sensitive-action alerts. |
| UAE eInvoicing readiness | 55 | Neutral compliance core, UAE readiness fields, editable organization and contact/customer/supplier data-entry UX, `0235{TIN}` participant ID helper, local readiness XML fixtures, official local PINT-AE serializer/rule-pack foundation with official identifiers, source-backed commercial invoice/predefined endpoint/transaction flag mappings, structured positive/negative/blocked scenario fixture QA, metadata-only local fixture coverage summary, local invoice/credit-note readiness panels, explicit local validation actions, disabled/default ASP adapter, explicit mock-only adapter, future-provider placeholders, redacted config summary, metadata-only XML/evidence archive records, provider-selection/sandbox-contract planning docs, and provider outreach execution pack. | No selected provider, no provider-specific API contract, no provider response evidence, no sandbox docs received from a provider, provider-specific payload contract still blocked, no EmaraTax automation, no provider credentials, no real FTA confirmation, no production retention guarantee, no legal/accountant review, no broad E2E/smoke/full-test coverage, and no production compliance claim. | Collect provider sandbox payload evidence before any real network or provider submission work. |
| ZATCA | 41 | Profile, EGS, CSR groundwork, mock CSID, local XML/QR/hash, SDK readiness docs, disabled-by-default local SDK validation endpoints, repeatable local/no-network SDK validation wrapper, metadata-only evidence format, SDK fixture registry, generated standard invoice and credit-note fixture SDK pass under Java 11.0.26, SDK CI readiness guard with metadata-only blocked status, local signed XML validation plan guard with signing execution disabled, official fixture registry/results doc, official sample validation pass under Java 11, local standard fixture SDK global pass, simplified fixture XSD/EN/PIH pass, API-generated standard XML local SDK validation, no-mutation SDK/app hash comparison, dry-run hash-chain reset plan, explicit fresh-EGS SDK hash mode, SDK-hash metadata snapshot, invoice-specific PIH validation config, blocked real network behavior, key custody/CSID lifecycle design, sandbox CSID preflight guard status `PREFLIGHT_BLOCKED`, sandbox OTP/CSID approval-plan status `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`, sandbox request execution guard status `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`, CSID response custody guard status `CUSTODY_METADATA_SIMULATION_BLOCKED`, sandbox adapter execution approval status `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED` with `--execute-adapter` still blocked, sandbox adapter boundary status `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`, sandbox adapter no-network contract status `NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS`, manual OTP capture approval gate status `MANUAL_OTP_CAPTURE_APPROVAL_BLOCKED`, sandbox request body creation approval gate status `REQUEST_BODY_CREATION_APPROVAL_BLOCKED`, sandbox network request approval gate status `SANDBOX_NETWORK_REQUEST_APPROVAL_BLOCKED`, sandbox response processing approval gate status `SANDBOX_RESPONSE_PROCESSING_APPROVAL_BLOCKED`, sandbox response custody approval gate status `SANDBOX_RESPONSE_CUSTODY_APPROVAL_BLOCKED`, sandbox CSID storage approval gate status `SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED`, signing/Phase 2 QR approval gate status `SIGNING_PHASE2_QR_APPROVAL_BLOCKED`, clearance/reporting approval gate status `CLEARANCE_REPORTING_APPROVAL_BLOCKED`, and PDF-A3 approval gate status `PDF_A3_APPROVAL_BLOCKED` with exact-phrase metadata recognition still blocked from execution. | Signing execution, Phase 2 QR execution, production CSID, clearance execution, reporting execution, PDF-A3 execution, implemented KMS/key custody, approved custody-provider storage execution, real sandbox network request execution, error/retry queue, approved SDK reference/acquisition policy for CI, Java 11-14 CI runtime, metadata-only artifact retention approval, repeatable Java/SDK CI execution, and production compliance launch remain missing. Existing local hash chains are not migrated. | Add the production compliance launch gate without enabling production compliance, network execution, or customer-data claims. |

## 2026-06-15 UAE ASP Outreach Execution Pack Update

- UAE eInvoicing readiness moves from `46` to `47` because the repo now has provider-specific outreach drafts, a response tracker, and a provider response evaluation rubric for collecting real sandbox/API/commercial/security evidence before adapter coding.
- The improvement is process and procurement readiness only. It does not prove production UAE eInvoicing compliance, provider accreditation, Peppol certification, FTA certification, official provider status, real ASP connectivity, FTA reporting, hosted/customer-data behavior, or legal retention compliance.
- No provider has been selected and no provider-specific adapter has been implemented.
- Provider email drafts were created for Complyance, ClearTax, Taxilla, EDICOM, and Comarch.
- Storecove, Sovos, and OpenText remain lower-priority global fallback/comparator providers unless updated MoF UAE evidence or an authorized UAE ASP partnership is received.
- ZATCA remains parked and blocked by default; no ZATCA production behavior, real network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- Next priority is `UAE ASP provider response evidence review`.

## 2026-06-16 UAE PINT-AE Official Serializer Rule Pack Update

- UAE eInvoicing readiness moves from `47` to `51` because the repo now has a local official PINT-AE serializer/rule-pack foundation using official identifiers, endpoint scheme `0235`, structured validation results, and metadata-only compliance-core integration.
- The improvement is local serializer and validation readiness only. It does not prove production UAE eInvoicing compliance, provider accreditation, Peppol certification, FTA certification, official provider status, real ASP connectivity, ASP validation, FTA reporting, hosted/customer-data behavior, or legal retention compliance.
- Unknown official commercial-invoice type-code mapping, predefined endpoint scenario values, and transaction flag mappings were intentionally guarded and then resolved in the follow-up official-code TODO review where source-backed.
- Provider-specific payload contracts remain blocked on actual provider sandbox docs.
- ZATCA remains parked and blocked by default; no ZATCA production behavior, real network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- Follow-up completed by the UAE PINT-AE official-code TODO review.

## 2026-06-16 UAE PINT-AE Official-Code TODO Review Update

- UAE eInvoicing readiness moves from `51` to `53` because the repo now resolves the source-backed commercial invoice type code, predefined endpoint participant identifications, and transaction type flag mappings.
- The improvement is still local serializer and validation readiness only. It does not prove production UAE eInvoicing compliance, provider accreditation, Peppol certification, FTA certification, official provider status, real ASP connectivity, ASP validation, FTA reporting, hosted/customer-data behavior, or legal retention compliance.
- Provider-specific payload contracts remain blocked on actual provider sandbox docs, credentials, provider responses, and commercial terms.
- Unknown values are not guessed; unsupported transaction flags still return structured `official-doc-required` validation results.
- ZATCA remains parked and blocked by default; no ZATCA production behavior, real network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- Next priority is `UAE ASP provider sandbox evidence review`.

## 2026-06-15 UAE Peppol/PINT-AE Data-Entry And Validation Panel Update

- UAE eInvoicing readiness moves from `36` to `42` because operators can now enter/read key UAE readiness data and run local-only source readiness checks from finalized invoice and credit-note pages.
- The improvement is UX/readiness only. It does not prove production UAE eInvoicing compliance, provider accreditation, Peppol certification, FTA certification, official provider status, ASP connectivity, FTA reporting, hosted/customer-data behavior, or legal retention compliance.
- Added editable organization settings for legal name, trade license, TRN/TIN, VAT status, UAE address/emirate, business activity, Peppol participant ID, ASP selection, and ASP onboarding status.
- Added optional UAE fields to contact creation, shared contact detail/edit, and customer/supplier detail views without blocking normal bookkeeping contact creation.
- Added invoice and credit-note panels that expose seller, buyer, invoice/reference, tax identity, Peppol participant, local XML attempt, and latest validation metadata readiness.
- Validation remains explicit and local-only, stores metadata/hashes/status/errors where applicable, and does not submit to an ASP or report to the FTA.
- ZATCA remains parked and blocked by default; no ZATCA production behavior, real network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- Next priority is `UAE Peppol/PINT-AE disabled ASP connector contract tests`.

## 2026-06-15 UAE Disabled ASP Connector Contracts Update

- UAE eInvoicing readiness moves from `42` to `45` because the repo now has provider-neutral adapter contracts, disabled/default behavior, explicit mock-only behavior, redaction helpers, future-provider placeholders, and API/service contract tests.
- The improvement is architecture and safety only. It does not prove production UAE eInvoicing compliance, provider accreditation, Peppol certification, FTA certification, official provider status, real ASP connectivity, FTA reporting, hosted/customer-data behavior, or legal retention compliance.
- Disabled behavior blocks submission and never emits sent, FTA-reported, or buyer-delivered states.
- Mock behavior is deterministic, no-network, and local/test-only; accepted/rejected mock submissions require explicit mock mode.
- Future provider keys for Complyance, ClearTax, EDICOM, and generic ASP return safe not-implemented results until commercial provider selection and API documentation review.
- ZATCA remains parked and blocked by default; no ZATCA production behavior, real network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- Follow-up completed by the UAE ASP provider selection and sandbox contract plan.

## 2026-06-15 UAE ASP Provider Selection Plan Update

- UAE eInvoicing readiness moves from `45` to `46` because the repo now has provider-selection research, a weighted scoring matrix, sandbox contract requirements, and a conservative outreach template.
- The improvement is planning and procurement readiness only. It does not prove production UAE eInvoicing compliance, provider accreditation, Peppol certification, FTA certification, official provider status, real ASP connectivity, FTA reporting, hosted/customer-data behavior, or legal retention compliance.
- Recommended first outreach order is Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, Comarch, TronStride / Aigentrix, Storecove, Sovos, OpenText.
- The outreach order is not a final production provider decision.
- ZATCA remains parked and blocked by default; no ZATCA production behavior, real network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- Next priority is `UAE ASP first-provider outreach evidence and sandbox docs review`.

## 2026-06-13 Wafeq Manual Banking Reconciliation Report And Audit Update

- Banking/reconciliation remains scored at `76`; this branch improves review evidence and accountant-facing reconciliation visibility but does not close hosted-data, broad coverage, parser-certification, or accountant-signoff gaps.
- PR `#40` `Wafeq banking clearing account accounting` was reverified green/safe and merged into `main` at `9ca5bfe2` before this branch was created.
- Reconciliation reports now expose clearer manual-only summary counts, linked treasury counts, accounting status counts, exception counts, and audit/review timeline evidence where safely derivable.
- CSV export now includes manual-only banking wording, linked treasury summary, accounting status summary, and audit/review event summary.
- No schema/dependency change, live feed, bank API, credentials, payment initiation, provider abstraction, new banking module, silent posting, silent reconciliation, workflow-state change, VAT/ZATCA/report math change, hosted/customer-data behavior, or production-readiness claim was added.
- Remaining blockers are banking beta QA/accountant review, direct cheque accounting policy, card credit/refund offset policy, DB-level fingerprint/index if needed, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, and broad banking E2E/smoke/full-test coverage.

## 2026-06-13 Wafeq Manual Banking Clearing-Account Accounting Update

- Banking/reconciliation remains scored at `76`; this branch strengthens accounting controls but does not close production, hosted-data, or accountant-review gaps.
- PR `#39` `Wafeq banking cheque lifecycle` was reverified green/safe and merged into `main` at `4fb018b8` before this branch was created.
- Added clearing-account configuration, preflight, and explicit journal-backed posting for safe configured deposit/card cases.
- Deposit and card posting require explicit operator action and do not silently post, reconcile, match, convert historical records, or mutate AR/AP allocations.
- Direct cheque posting remains operational-only until source receivable/payable/payment policy is explicit.
- Card credits/refunds remain operational-only until an offset account policy is explicit.
- This remains manual banking only and does not add live feeds, bank APIs, credentials, payment initiation, provider abstraction, provider callbacks, VAT/ZATCA/report changes, hosted/customer-data proof, or production-readiness claims.
- Remaining blockers at that point were reconciliation reports/audit polish, banking beta QA/accountant review, direct cheque accounting policy, card credit/refund offset policy, DB-level fingerprint/index if needed, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, and broad banking E2E/smoke/full-test coverage.

## 2026-06-13 Wafeq Manual Banking Cheque Lifecycle Update

- Banking/reconciliation moves from `75` to `76` because manual banking now has operational received/issued cheque lifecycle records with explicit deposit-batch links and direction-aware statement-row matching.
- PR `#38` `Wafeq banking credit and prepaid card settlement flows` was reverified green/safe and merged into `main` at `3b14ed8a` before this branch was created.
- Cheque instruments are organization-scoped, bank-account scoped when known, currency-validated, and limited to explicit draft/received/issued/deposited/cleared/bounced/voided lifecycle actions.
- Received cheques can be explicitly linked to draft bank deposit batches through cheque source lines with active-source reuse protection.
- Matching requires a same-account, same-currency, same-amount statement row; received cheques match credit rows, and issued cheques match debit rows.
- Closed reconciliation periods block match, unmatch, and linked void changes.
- This remains manual banking only and does not add live feeds, bank APIs, credentials, payment initiation, provider abstraction, cheque printing, cheque book inventory, silent posting, silent auto-match, automatic reconciliation, VAT/ZATCA/report changes, hosted/customer-data proof, or production-readiness claims.
- Journal-backed cheque-in-hand, outstanding-cheque, and clearing-account posting remains deferred until clearing-account classification is explicitly designed and tested.
- Remaining blockers are clearing-account accounting design for deposits/cards/cheques, reconciliation reports/audit polish, banking beta QA/accountant review, DB-level fingerprint/index if needed, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, and broad banking E2E/smoke/full-test coverage.

## 2026-06-13 Wafeq Banking Card Settlement Update

- Banking/reconciliation moves from `74` to `75` because manual banking now has operational credit/prepaid card settlement records with explicit direction-aware statement-row matching.
- PR `#37` `Wafeq banking bank deposit batches` was reverified green/safe and merged into `main` at `d86c9394` before this branch was created.
- Card settlements are organization-scoped, account-scoped, currency-validated, and limited to explicit draft/post/void/match/unmatch actions.
- Matching requires a posted settlement and a same-account, same-currency, same-amount statement row; paydowns/top-ups match funding-account debit rows, and card credits/refunds match card-account credit rows.
- Closed reconciliation periods block match, unmatch, and linked void changes.
- This remains manual banking only and does not add live feeds, bank APIs, credentials, payment initiation, cheque printing, cheque book inventory, provider abstraction, card expense management, statement-cycle billing, silent posting, silent auto-match, automatic reconciliation, VAT/ZATCA/report changes, hosted/customer-data proof, or production-readiness claims.
- Journal-backed card settlement posting remains deferred until credit-card liability, prepaid-card asset, and clearing-account classification is explicitly designed and tested.
- Remaining blockers are cheque lifecycle, clearing-account accounting design for deposits/cards/cheques, reconciliation reports/audit polish, banking beta QA/accountant review, DB-level fingerprint/index if needed, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, and broad banking E2E/smoke/full-test coverage.

## 2026-06-13 Wafeq Banking Bank Deposit Batch Update

- Banking/reconciliation moves from `73` to `74` because manual banking now has operational deposit batches that group receipt-like lines and can be explicitly matched to one imported statement credit row.
- PR `#36` `Wafeq banking bank rules engine` was reverified green/safe and merged into `main` at `dcf8a3d1` before this branch was created.
- Deposit batches are organization-scoped, bank-account scoped, currency-validated, and limited to explicit draft/post/void/match/unmatch actions.
- Matching requires a posted batch and a same-account, same-currency, same-amount credit statement row; closed reconciliation periods block match, unmatch, and linked void changes.
- This remains manual banking only and does not add live feeds, bank APIs, credentials, payment initiation, card settlement, cheque printing, cheque book inventory, provider abstraction, silent posting, silent auto-match, automatic reconciliation, VAT/ZATCA/report changes, hosted/customer-data proof, or production-readiness claims.
- Journal-backed clearing movement remains deferred because the existing customer payment model posts directly to the selected paid-through account and no confirmed undeposited-funds/clearing-account model exists.
- Remaining blockers are card settlements, cheque lifecycle, clearing-account accounting design, DB-level fingerprint/index if needed, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, broad banking E2E/smoke/full-test coverage, and accountant sign-off.

## 2026-06-13 Wafeq Banking Bank Rules Update

- Banking/reconciliation moves from `72` to `73` because manual imported statement rows now have deterministic bank-rule suggestions, dry-run behavior, explicit apply behavior, and rule-application audit metadata.
- PR `#35` `Wafeq banking import safety hardening` was reverified green/safe and merged into `main` at `44ff1d7a` before this branch was created.
- Rules are organization-scoped with optional bank account profile scope, priority, enabled/disabled state, safe condition fields, suggestion action type, and explicit `autoApply: false`.
- Dry-run evaluates recent unmatched statement rows without mutation. Explicit apply reuses existing categorize, ignore, and match behavior.
- This remains manual banking only and does not add live feeds, bank APIs, credentials, payment initiation, deposits, card settlement, cheque lifecycle, provider abstraction, silent posting, silent auto-reconciliation, silent auto-ignore, VAT/ZATCA/report changes, hosted/customer-data proof, or production-readiness claims.
- Remaining blockers are deposits, card settlements, cheque lifecycle, live feeds/provider abstraction, DB-level fingerprint/index if needed, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, broad banking E2E/smoke/full-test coverage, and accountant sign-off.

## 2026-06-13 Wafeq Banking Import Safety Update

- Banking/reconciliation moves from `71` to `72` because manual imports now have service-level duplicate/idempotency checks, explicit skipped-row reporting, and reconciliation-overlap warnings/blocks.
- PR `#34` `Wafeq banking inline statement transaction review` was reverified green/safe and merged into `main` at `43c428f6` before this branch was created.
- Full import now blocks invalid rows, existing duplicate rows, and closed reconciliation overlaps. Partial import imports safe rows and reports skipped invalid/duplicate/closed-period rows.
- Preview now surfaces duplicate-in-file, high-confidence existing duplicate, possible existing duplicate, closed reconciliation overlap, open reconciliation overlap, currency mismatch, importable, blocked, and skipped counts.
- No schema migration or DB-level unique fingerprint/index was added; database-enforced import idempotency remains future hardening if needed.
- The workspace remains manual banking only and does not add live feeds, bank APIs, credentials, payment initiation, bank rules, deposits, card settlement, cheque lifecycle, provider abstraction, reconciliation-state changes, accounting posting changes, or production/customer-data proof.
- Remaining blockers are bank rules, deposits, card settlements, cheque lifecycle, live feeds/provider abstraction, DB-level fingerprint/index if needed, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, broad banking E2E/smoke/full-test coverage, and accountant sign-off.

## 2026-06-13 Wafeq Banking Inline Statement Review Update

- Banking/reconciliation remains scored at `71`; no readiness increase is taken from this controlled-beta UX layer alone.
- PR `#33` `Wafeq banking XLSX statement import and template UX` was reverified green/safe and merged into `main` at `342120a9` before this branch was created.
- Added an inline statement transaction review workspace that reuses existing row APIs for candidate preview, match, categorize, ignore, bulk ignore, and bulk categorize.
- The workspace remains manual banking only and does not add live feeds, bank APIs, credentials, payment initiation, bank rules, deposits, card settlement, cheque lifecycle, provider abstraction, schema changes, reconciliation-state changes, or production/customer-data proof.
- Remaining blockers are import duplicate/idempotency/reconciliation safety hardening, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, broad banking E2E/smoke/full-test coverage, and accountant sign-off.

## 2026-06-12 Wafeq Banking XLSX Statement Import And Template UX

- Banking/reconciliation moves from `70` to `71` because manual banking UX now includes a downloadable canonical CSV template and API-side XLSX preview/import support through the existing validation path.
- XLSX parsing uses the first worksheet, ignores empty rows, normalizes Excel dates and numeric cells, warns when extra sheets are ignored, and returns safe validation warnings for malformed workbooks.
- The statement import page now lists XLSX, exposes the template download action, and keeps visible manual-only/no-live-feed/no-credentials wording.
- No live bank feed, external bank API, WIO/Lean/Tarabut integration, payment initiation, bank rules, deposits, cheques, card settlements, accounting posting change, reconciliation state change, schema migration, hosted/customer-data behavior, or production-readiness claim was added.
- Remaining blockers after Prompt 1 were inline transaction review, duplicate/idempotency hardening, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, broad banking E2E/smoke/full-test coverage, and accountant sign-off.

## 2026-06-12 VAT Return Truthfulness And Review Export Foundation

- Reports stays at `76`; this lane improves truthfulness and accountant-review readiness, but it does not increase official filing capability.
- VAT Return now states clearly that it is a draft/internal review surface built from finalized sales invoices and finalized purchase bills only.
- Added a dedicated internal review CSV export for VAT Return. It reuses existing report data and does not claim government-format filing, submission workflow, ZATCA exchange, or compliance approval.
- VAT Summary and VAT Return now use aligned output/input VAT labels with clearer account-basis versus source-document review guidance.
- Remaining blockers are official filing format implementation, accountant/tax advisor sign-off, authority submission workflow, ZATCA execution, PDF-A3, hosted/customer-data proof, and broader reports E2E/load coverage.

## 2026-06-12 Production Trust Foundation Audit And Gate

- No score increases are taken in this lane. This pass improves honesty and launch-gate discipline, not production capability.
- Added `docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md` plus the static gate at `corepack pnpm production:trust-foundation-gate -- --json --strict`.
- The default gate status is `PRODUCTION_TRUST_FOUNDATION_PLANNING_ONLY`; strict success is `PRODUCTION_TRUST_FOUNDATION_GATE_PASSED_WITH_BLOCKERS`.
- `PASSED_WITH_BLOCKERS` means the repo is explicit about current blockers. It does not mean LedgerByte is production-ready, paid SaaS ready, official VAT filing ready, or ZATCA compliant.
- Current trust blockers remain hosted backup/PITR proof, hosted restore drill proof, object-storage restore proof, monitoring/alerting, runtime DB role and RLS/Data API hardening, MFA/session hardening, immutable audit export strategy, and billing/legal/support ownership.

## 2026-06-12 Backup And Restore Proof Harness

- No score increase is taken in this lane. This pass improves local/mock mechanical proof only; it does not improve hosted recovery readiness.
- Added `scripts/backup-restore-proof-harness.cjs`, `scripts/backup-restore-proof-harness.test.cjs`, and package scripts `backup:restore-proof` plus `test:backup-restore-proof`.
- Added `docs/production/BACKUP_RESTORE_PROOF_HARNESS.md`.
- Dry-run status is `BACKUP_RESTORE_PROOF_DRY_RUN_READY`; local mock-cycle status is `BACKUP_RESTORE_MOCK_CYCLE_PASSED`.
- The proof is synthetic-only, temp-directory-only, and no-network/no-database/no-secret-read by design.
- Current blockers remain hosted Supabase/Postgres backup/PITR proof, hosted restore-drill proof, object-storage backup proof, object-storage restore proof, RPO/RTO review, monitoring/alerting ownership, and incident-response evidence.

## 2026-06-12 Banking 2.0 Parser QA And Match Suggestion Foundation

- Banking/reconciliation moves from `69` to `70` because manual parser QA now covers more existing CSV/JSON/OFX/CAMT/MT940 edge cases and the existing match-candidates path uses deterministic non-mutating suggestion scoring.
- Parser QA now covers debit/credit aliases, signed amounts, decimal commas, date-times, existing balance parsing, reference/counterparty extraction, multiline narratives, missing reference warnings, duplicate warnings, safe unsupported/invalid input errors, empty file handling, and ambiguous direction handling.
- Match suggestions remain suggestions only. They score amount/direction, date tolerance, reference, normalized counterparty text, and document-number signals, and return no suggestions for already reviewed statement rows.
- No live feeds, external bank APIs, raw-file archive execution, automatic posting/matching/reconciliation, transfer-fee handling, FX handling, production/beta/customer-data behavior, or certified bank-specific parser claim was added.
- Remaining blockers are live bank feeds, certified target-bank parser coverage, raw statement archive execution, transfer fees, FX handling, hosted/customer-data proof, broad banking E2E/smoke/full-test coverage, and accountant sign-off.

## 2026-06-11 ZATCA PDF-A3 Approval Gate Update

- ZATCA remains scored at `41`; the new PDF-A3 approval gate improves governance/readiness only and does not add compliance capability.
- PR `#16` (`ZATCA clearance reporting approval gate`) merged into `main` at `edc306e6` before this lane started.
- Added `docs/zatca/PDF_A3_APPROVAL_GATE.md`, `docs/zatca/PDF_A3_APPROVAL_RESULTS.md`, `scripts/zatca-pdf-a3-approval-gate.cjs`, and `scripts/zatca-pdf-a3-approval-gate.test.cjs`.
- Added root package scripts `zatca:pdf-a3-approval-gate` and `test:zatca-pdf-a3-approval-gate`.
- No score increase is taken: status is `PDF_A3_APPROVAL_BLOCKED`, and the exact phrase plus `--metadata-only` still returns `PDF_A3_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No PDF-A3 generation, XML embedding, signed XML embedding, file persistence, object-storage/database/document-store writes, invoice/customer data reads, signing, QR, ZATCA network calls, clearance/reporting, or production compliance behavior occurred.
- Next ZATCA priority: `ZATCA production compliance launch gate`.

## 2026-06-11 ZATCA Clearance Reporting Approval Gate Update

- ZATCA remains scored at `41`; the new clearance/reporting approval gate improves governance/readiness only and does not add compliance capability.
- PR `#15` (`ZATCA signing and Phase 2 QR approval gate`) merged into `main` at `154bbf82` before this lane started.
- Added `docs/zatca/CLEARANCE_REPORTING_APPROVAL_GATE.md`, `docs/zatca/CLEARANCE_REPORTING_APPROVAL_RESULTS.md`, `scripts/zatca-clearance-reporting-approval-gate.cjs`, and `scripts/zatca-clearance-reporting-approval-gate.test.cjs`.
- Added root package scripts `zatca:clearance-reporting-approval-gate` and `test:zatca-clearance-reporting-approval-gate`.
- No score increase is taken: status is `CLEARANCE_REPORTING_APPROVAL_BLOCKED`, and the exact phrase plus `--metadata-only` still returns `CLEARANCE_REPORTING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No clearance execution, reporting execution, invoice or note submission, ZATCA network call, request body creation, response body processing, CSID/token/secret/certificate/private-key use, signing, QR, PDF-A3, or production compliance behavior occurred.
- Next ZATCA priority: `ZATCA PDF-A3 approval gate`.

## 2026-06-11 ZATCA Sandbox CSID Storage Approval Gate Update

- ZATCA remains scored at `41`; the new sandbox CSID storage approval gate improves governance/readiness only and does not add compliance capability.
- PR `#13` (`ZATCA sandbox response custody approval gate`) merged into `main` at `db8f058c` before this lane started.
- Added `docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-csid-storage-approval-gate.cjs`, and `scripts/zatca-sandbox-csid-storage-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-csid-storage-approval-gate` and `test:zatca-sandbox-csid-storage-approval-gate`.
- Observed status is `SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED`; the exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_CSID_STORAGE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No custody provider execution, CSID/token/secret/certificate/private-key/CSR storage, database writes, secret-manager writes, KMS writes, HSM writes, object-storage writes, OTP inclusion, CSID request, request/response/network/adapter execution, signing, clearance/reporting, PDF-A3, or production compliance behavior occurred.
- Next ZATCA priority: `ZATCA signing and Phase 2 QR approval gate`.

## 2026-06-11 ZATCA Signing And Phase 2 QR Approval Gate Update

- ZATCA remains scored at `41`; the new signing and Phase 2 QR approval gate improves governance/readiness only and does not add compliance capability.
- PR `#14` (`ZATCA sandbox CSID storage approval gate`) merged into `main` at `ce2489a5` before this lane started.
- Added `docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_GATE.md`, `docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_RESULTS.md`, `scripts/zatca-signing-phase2-qr-approval-gate.cjs`, and `scripts/zatca-signing-phase2-qr-approval-gate.test.cjs`.
- Added root package scripts `zatca:signing-phase2-qr-approval-gate` and `test:zatca-signing-phase2-qr-approval-gate`.
- No score increase is taken: status is `SIGNING_PHASE2_QR_APPROVAL_BLOCKED`, and the exact phrase plus `--metadata-only` still returns `SIGNING_PHASE2_QR_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No signing execution, QR generation, signed XML generation, private-key/certificate/CSID use, SDK signing command execution, ZATCA network call, clearance/reporting, PDF-A3, or production compliance behavior occurred.
- Next ZATCA priority: `ZATCA clearance reporting approval gate`.

## 2026-06-11 ZATCA Sandbox Response Custody Approval Gate Update

- ZATCA remains scored at `41`; the new sandbox response custody approval gate improves governance/readiness only and does not add compliance capability.
- PR `#12` (`ZATCA sandbox response processing approval gate`) merged into `main` at `d15884f8` before this lane started.
- Added `docs/zatca/SANDBOX_RESPONSE_CUSTODY_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_RESPONSE_CUSTODY_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-response-custody-approval-gate.cjs`, and `scripts/zatca-sandbox-response-custody-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-response-custody-approval-gate` and `test:zatca-sandbox-response-custody-approval-gate`.
- Observed status is `SANDBOX_RESPONSE_CUSTODY_APPROVAL_BLOCKED`; the exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_RESPONSE_CUSTODY_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No network request execution, adapter execution, request body creation, response body receipt, response body processing, response custody storage, custody provider execution, secret-manager writes, database writes, object-storage writes, OTP inclusion, CSID request, signing, clearance/reporting, PDF-A3, or production compliance behavior occurred.
- Next ZATCA priority: `ZATCA sandbox CSID storage approval gate`.

## 2026-06-11 ZATCA Sandbox Response Processing Approval Gate Update

- ZATCA remains scored at `41`; the new sandbox response processing approval gate improves governance/readiness only and does not add compliance capability.
- PR `#11` (`ZATCA sandbox network request approval gate`) merged into `main` at `13bf16a5` before this lane started.
- Added `docs/zatca/SANDBOX_RESPONSE_PROCESSING_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_RESPONSE_PROCESSING_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-response-processing-approval-gate.cjs`, and `scripts/zatca-sandbox-response-processing-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-response-processing-approval-gate` and `test:zatca-sandbox-response-processing-approval-gate`.
- Observed status is `SANDBOX_RESPONSE_PROCESSING_APPROVAL_BLOCKED`; the exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_RESPONSE_PROCESSING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No network request execution, adapter execution, request body creation, response body receipt, response body processing, response custody storage, OTP inclusion, CSID request, signing, clearance/reporting, PDF-A3, or production compliance behavior occurred.
- Next ZATCA priority: `ZATCA sandbox response custody approval gate`.

## 2026-06-11 ZATCA Sandbox Request Body Creation Approval Gate Update

- ZATCA remains scored at `41`; the new request-body approval gate improves governance/readiness only and does not add compliance capability.
- PR `#9` and PR `#10` were merged into `main` before the follow-on sandbox network request approval gate branch was created, so this gate is now part of the mainline approval ladder.
- Added `docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-request-body-creation-approval-gate.cjs`, and `scripts/zatca-sandbox-request-body-creation-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-request-body-creation-approval-gate` and `test:zatca-sandbox-request-body-creation-approval-gate`.
- Observed status is `REQUEST_BODY_CREATION_APPROVAL_BLOCKED`; the exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `REQUEST_BODY_CREATION_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No request body creation, OTP inclusion, CSID request, network call, response processing, signing, clearance/reporting, PDF-A3, or production compliance behavior occurred.
- Next ZATCA priority: `ZATCA sandbox response processing approval gate`.

## 2026-06-11 ZATCA Sandbox Network Request Approval Gate Update

- ZATCA remains scored at `41`; the new sandbox network request approval gate improves governance/readiness only and does not add compliance capability.
- PR `#9` (`ZATCA manual OTP capture approval gate`) merged into `main` at `a4190941`, and PR `#10` (`ZATCA request body creation approval gate`) merged into `main` at `feb32ccc` before this lane was started.
- Added `docs/zatca/SANDBOX_NETWORK_REQUEST_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_NETWORK_REQUEST_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-network-request-approval-gate.cjs`, and `scripts/zatca-sandbox-network-request-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-network-request-approval-gate` and `test:zatca-sandbox-network-request-approval-gate`.
- Observed status is `SANDBOX_NETWORK_REQUEST_APPROVAL_BLOCKED`; the exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_NETWORK_REQUEST_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No network request execution, adapter execution, request body creation, OTP inclusion, CSID request, response body processing, signing, clearance/reporting, PDF-A3, or production compliance behavior occurred.
- Next ZATCA priority: `ZATCA sandbox response processing approval gate`.
| Email/communications | 62 | Mock email outbox default, invites, password reset, redacted readiness API/UI, disabled-by-default diagnostics/retry processor/retry worker, metadata-only SPF/DKIM/DMARC evidence capture, opt-in SMTP adapter, test-send, durable retry metadata, metadata-only provider events, disabled-by-default signed webhook plan/test verifier, suppression metadata, delivery monitoring evidence, DB-backed rate limits. | No production scheduler, provider-specific production webhook adapter, live DNS/provider validation, executed relay validation, external monitoring/alert delivery, polished templates, invoice/statement sending, or MFA/session invalidation. | Add provider-specific webhook adapters and external monitoring integration after non-production relay evidence. |
| Storage/scalability | 56 | Storage config/readiness, feature-flagged S3-compatible attachment upload/download, migration plan counts, database default works locally, backup/restore evidence readiness, local database-backed restore-count evidence, and DEV-12 count-only generated-document storage readiness/migration dry-run evidence. | No DB-to-S3 migration executor, signed URLs, object lifecycle, generated-document S3 path, scanning, hosted PITR proof, backup proof, restore proof, or real-bucket validation evidence. | Test S3 mode against a non-production bucket, add generated-document storage alignment, and execute backup/object-storage restore drills. |
| Browser QA/E2E | 72 | Focused Playwright specs for critical routes including the focused quote create/edit/lifecycle/PDF/archive/convert path, recurring invoice list/create/edit/lifecycle/schedule-preview/generate/customer-activity path, delivery-note list/create/edit/lifecycle/PDF/archive/source/customer-activity path, and collections list/new/detail/edit/lifecycle/activity/customer/invoice/global-search path; deployed E2E workflow/docs; focused mocked visual regression coverage for polished beta workflows; API smoke remains deep accounting check. | No scheduled browser CI, browser tests are smoke-level/focused by area, visual suite is focused rather than exhaustive, no data reset strategy. | Schedule non-production deployed E2E and keep visual baselines current for reviewed UI changes. |
| Deployment readiness | 56 | Vercel/Supabase docs, API health/root/readiness, deployed E2E runbook/workflow, CI DB checklist, Supabase security review, user-testing Data API grant mitigation, backup/restore readiness endpoints, and one local non-production Postgres restore drill. | No production IaC, hosted Supabase backup/PITR proof, real object-storage restore proof, monitoring, broad RLS/private-network decision, least-privilege runtime DB role, environment promotion policy. | Implement least-privilege runtime DB role validation, then verify hosted Supabase PITR/object storage and add monitoring/incident runbooks. |
| UX/product polish | 74 | Broad route coverage, dashboard KPI cards, lightweight charts/drill-downs, settings pages, panels, helper tests, permission-aware nav, guided first-workflow setup, invoice/payment success guidance, AR/AP ledger/report drill-down polish, banking/reconciliation drill-down polish, inventory drill-down polish, document/PDF/template UX polish, and focused visual regression coverage. | List filters, bulk actions, customizable dashboards, broader empty/error states, and accountant-reviewed report/document wording. | Keep visual baselines current and complete accountant wording review on high-traffic workflows. |
| Production operations | 34 | Readiness docs, manual smoke/E2E workflows, disabled email worker planning, backup/restore evidence planning, and local non-production restore-drill evidence. | No incident response, observability, real background jobs, data retention executors, support tools, billing, SLAs, hosted PITR proof, or real object-storage restore proof. | Define operations baseline: monitoring, alerts, hosted restore drills, runbooks, and support evidence. |

## 2026-06-06 ZATCA Key Custody And CSID Lifecycle Design Update

- ZATCA remains scored at `41`; this design reduces planning ambiguity but does not add production compliance capability.
- Added `docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`, `docs/zatca/CSID_LIFECYCLE_CHECKLIST.md`, and `docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md`.
- Recommended custody model is KMS/HSM/external signing or equivalent custody for production private keys, with application tables storing metadata only.
- No OTP/CSID/network/signing behavior was performed or enabled. Production signing, production CSID, production Phase 2 QR, clearance/reporting, PDF-A3, signed artifact storage, official reviews, and repeatable SDK CI remain blockers.
- Completed follow-up: `ZATCA sandbox CSID preflight guard`.

## 2026-06-06 ZATCA Sandbox CSID Preflight Guard Update

- ZATCA remains scored at `41`; the preflight improves readiness visibility but does not add compliance capability.
- Added `scripts/zatca-sandbox-csid-preflight.cjs`, `scripts/zatca-sandbox-csid-preflight.test.cjs`, `docs/zatca/SANDBOX_CSID_PREFLIGHT_GUARD.md`, and `docs/zatca/SANDBOX_CSID_PREFLIGHT_RESULTS.md`.
- Current preflight status is `PREFLIGHT_BLOCKED`; references and code surfaces are present, but key custody, CSID response custody, sandbox adapter execution, OTP approval, CSID request approval, and production signing remain blocked.
- No OTP/CSID/network/signing behavior was performed or enabled, and no private-key/certificate/CSID/token/header/request/response body was exposed.
- Completed follow-up: `ZATCA sandbox OTP and compliance CSID approval plan`.

## 2026-06-06 ZATCA Sandbox OTP And Compliance CSID Approval Plan Update

- ZATCA remains scored at `41`; the approval plan improves governance/readiness but does not add compliance capability.
- Added `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_PLAN.md`, `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`, and `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RESULTS.md`.
- Extended `scripts/zatca-sandbox-csid-preflight.cjs` with planning-only approval recognition.
- Observed status is `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`; OTP request, CSID request, network calls, sandbox adapter execution, signing, clearance/reporting, PDF-A3, and production compliance remain disabled.
- Next ZATCA priority: `ZATCA sandbox CSID request execution guard`.

## 2026-06-07 ZATCA CSID Response Custody Guard Update

- ZATCA remains scored at `41`; the custody plan and guard improve readiness evidence but do not add compliance capability.
- Added `docs/zatca/CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md`, `docs/zatca/CSID_RESPONSE_CUSTODY_GUARD.md`, `docs/zatca/CSID_RESPONSE_CUSTODY_RESULTS.md`, `scripts/zatca-csid-response-custody-guard.cjs`, and `scripts/zatca-csid-response-custody-guard.test.cjs`.
- Observed status is `CUSTODY_METADATA_SIMULATION_BLOCKED`; no OTP request, CSID request, network call, sandbox adapter execution, real response body processing, DB write, token/secret/certificate persistence, env value output, signing, clearance/reporting, PDF-A3, or production compliance occurred.
- Completed follow-up: `ZATCA sandbox adapter execution approval plan`.

## 2026-06-07 ZATCA Sandbox Adapter Approval Guard Update

- ZATCA remains scored at `41`; the adapter approval plan improves governance/readiness but does not add compliance capability.
- Added `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`, `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`, `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-adapter-execution-approval.cjs`, and `scripts/zatca-sandbox-adapter-execution-approval.test.cjs`.
- Observed status is `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`; `--execute-adapter` remains `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- No OTP request, CSID request, network call, sandbox adapter execution, request body creation, response body processing, DB write, env value output, signing, clearance/reporting, PDF-A3, or production compliance occurred.
- Completed follow-up: `ZATCA sandbox adapter mock-to-real boundary test plan`.

## 2026-06-07 ZATCA Sandbox Adapter Boundary Check Update

- ZATCA remains scored at `41`; the boundary check improves static safety evidence but does not add compliance capability.
- Added `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md`, `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md`, `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md`, `scripts/zatca-sandbox-adapter-boundary-check.cjs`, and `scripts/zatca-sandbox-adapter-boundary-check.test.cjs`.
- Observed status is `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`; no OTP request, CSID request, network call, sandbox adapter execution, mock adapter execution, request body creation, response body processing, DB write, env value output, signing, clearance/reporting, PDF-A3, or production compliance occurred.
- Completed follow-up: `ZATCA sandbox adapter no-network contract tests`.

## Overall Readiness Interpretation

- Local MVP: strong enough to demonstrate serious accounting workflows.
- Private beta: possible only with limited users and explicit non-production limitations.
- Production: blocked by operations, security, compliance, storage, email, and SaaS-business gaps.
- Compliance: ZATCA and official tax filing remain the largest domain-specific blockers.
- Current practical stage: controlled beta/user-testing. Vercel is beta/user-testing only, not final production hosting.
- Paid production SaaS v1 requires the production foundation roadmap, gap matrix, and launch gates under `docs/production/`.
- LedgerByte is not production-launched, and real ZATCA production compliance is not enabled.

## 2026-06-03 Sales Quote / Proforma Workflow Update

- Sales/AR moves from `82` to `85` because the base quote/proforma workflow now exists as non-posting product behavior with customer selection, account-coded lines, tax modes, lifecycle actions, and accepted-quote conversion into a draft invoice.
- This score change does not change production readiness. Quote/proforma PDF/archive, recurring invoices, delivery notes, customer email sending, online acceptance/payment, broad browser E2E, hosted/customer-data proof, and accountant sign-off remain open.

## 2026-06-04 Quote PDF / Archive Update

- Sales/AR moves from `85` to `87` because the quote/proforma workflow now includes safe Sales Quote PDF output and generated-document archive support.
- This score change does not change production readiness. Recurring invoices, delivery notes, customer email sending, online acceptance/payment, broad browser E2E, hosted/customer-data proof, production storage hardening, and accountant sign-off remain open.

## 2026-06-04 Focused Quote Workflow Browser Update

- Browser QA/E2E moves from `68` to `69` because the quote workflow now has focused mocked Playwright coverage for list, create, detail, edit, lifecycle, quote PDF download, generated-document archive metadata/download, conversion to draft invoice, restricted permissions, and customer non-posting quote activity.
- Sales/AR remains `87`: this improves workflow confidence but does not add new accounting capability.
- This score change does not change production readiness. Recurring invoices, delivery notes, customer email sending, online acceptance/payment, deployed E2E with safe seeded data, hosted/customer-data proof, production storage hardening, and accountant sign-off remain open.

## 2026-06-04 Recurring Invoices Update

- Sales/AR moves from `87` to `89` because the base recurring invoice template workflow now exists with account-coded lines, tax modes, schedule preview, lifecycle controls, customer non-posting visibility, and manual generation into draft invoices.
- This score change does not change production readiness. Delivery notes, automatic scheduler, customer email sending, online acceptance/payment, deployed E2E with safe seeded data, hosted/customer-data proof, production storage hardening, and accountant sign-off remain open.

## 2026-06-04 Focused Recurring Invoice Browser Update

- Browser QA/E2E moves from `69` to `70` because recurring invoices now have focused mocked Playwright coverage for list, create, detail, edit, schedule preview, lifecycle actions, restricted permissions, duplicate generation blocking, manual draft-invoice generation, generated invoice link, customer non-posting activity, and global create/search behavior.
- Sales/AR remains `89`: this improves workflow confidence and frontend schedule visibility, but it does not add new accounting capability.
- This score change does not change production readiness. Delivery notes, automatic scheduler, customer email sending, online acceptance/payment, deployed E2E with safe seeded data, hosted/customer-data proof, production storage hardening, and accountant sign-off remain open.

## 2026-06-04 Delivery Notes Update

- Sales/AR moves from `89` to `91` because the base non-posting delivery-note workflow now exists with `DN-` numbering, source invoice/accepted quote links, lifecycle actions, safe Delivery Note PDF/archive, customer non-posting fulfillment visibility, and targeted API/frontend tests.
- This score change does not change production readiness. Automatic scheduler, delivery-note browser workflow coverage, stock-issue source UI, customer email sending, online acceptance/payment, deployed E2E with safe seeded data, hosted/customer-data proof, production storage hardening, and accountant sign-off remain open.

## 2026-06-04 Focused Delivery Note Browser Workflow Update

- Browser QA/E2E moves from `70` to `71` because delivery notes now have focused mocked Playwright coverage for list, create, detail, edit, issue, mark delivered, PDF/archive metadata and download, customer non-posting activity, source invoice/accepted quote copy paths, restricted permissions, global create, and global search.
- Sales/AR remains `91`: this improves workflow confidence and fixes two UI gaps, but it does not add new accounting capability.
- This score change does not change production readiness. Automatic scheduler, stock-issue source UI, customer email sending, online acceptance/payment, deployed E2E with safe seeded data, hosted/customer-data proof, production storage hardening, and accountant sign-off remain open.

## 2026-06-04 Delivery Note Source Visibility And Wording Update

- Sales/AR remains `91`: source invoice/quote reverse panels and reference-only stock issue wording improve traceability and accountant-safe UI wording, but do not add new accounting capability.
- Browser QA/E2E remains `71`: the existing delivery-note browser spec was extended to cover reverse source panels, but the suite is still focused rather than broad scheduled browser CI.
- This score change does not change production readiness. Automatic scheduler, stock-issue source UI, customer email sending, online acceptance/payment, deployed E2E with safe seeded data, hosted/customer-data proof, production storage hardening, and accountant sign-off remain open.

## 2026-06-04 Collections Workflow Update

- Sales/AR moves from `91` to `93` because the base controlled collections workflow now exists with case numbering, customer/outstanding-invoice links, status/priority tracking, activities, promise-to-pay details, disputes, holds, close/cancel actions, workspace summary, invoice/customer visibility, global create/search exposure, and audit logging.
- Browser QA/E2E remains `71`: this sprint added targeted frontend coverage, but not broad or scheduled browser coverage.
- This score change does not change production readiness. Automatic scheduler, stock-issue source UI, scheduled collection reminders, real customer email sending, payment links/payment gateway, online acceptance/payment, deployed E2E with safe seeded data, hosted/customer-data proof, production storage hardening, and accountant sign-off remain open.

## 2026-06-04 Focused Collections Browser Workflow Update

- Browser QA/E2E moves from `71` to `72` because Collections now has focused mocked Playwright coverage for workspace summary, new case, detail, edit, lifecycle actions, activity timeline, restricted permissions, invoice/customer panels, global create, and global search.
- Sales/AR remains `93`: this improves workflow confidence and fixes UI gaps, but it does not add new accounting capability.
- This score change does not change production readiness. Automatic scheduler, stock-issue source UI, scheduled collection reminders, real customer email sending, payment links/payment gateway, online acceptance/payment, deployed E2E with safe seeded data, hosted/customer-data proof, production storage hardening, and accountant sign-off remain open.

## 2026-05-30 DEV-08Z AP Local Evidence Readiness Update

- DEV-08 through DEV-08M are closed as local AP evidence; the map is captured in `docs/development/DEV_08Z_AP_LOCAL_EVIDENCE_MAP.md`.
- The AP production-gap register is captured in `docs/development/DEV_08Z_AP_PRODUCTION_GAP_REGISTER.md`.
- Purchases/AP remains scored conservatively at `80`: the local evidence is strong for the DEV-08 scope, but production, beta, customer-data, real provider email, real ZATCA, broad E2E/smoke/full-test, and advanced purchase/inventory accounting gaps remain open.
- Do not treat DEV-08 local evidence as production readiness, beta readiness, customer-data proof, accountant certification, or ZATCA compliance.

## 2026-06-05 Supplier/AP Dashboard Improvements Update

- Purchases/AP moves from `80` to `84` because recent AP product work is now unified in a supplier-focused dashboard and supplier detail summary: open payables, due bills, open purchase orders, matching exceptions, matching reviews, non-posting purchase returns, valuation variance previews, and grouped supplier activity are visible from accountant-oriented surfaces.
- This score change does not change production readiness. The dashboard is read-only and does not post journals, adjust AP balances, change bill balances, move inventory, book variances, create debit notes/refunds, send email, call ZATCA, affect VAT reports, implement landed cost, implement FIFO, or prove hosted/customer-data behavior.
- Remaining AP gaps include accountant/product sign-off on attention thresholds, focused AP browser workflow QA, broad E2E/smoke/full-test coverage, hosted/customer-data proof, supplier email/remittance delivery, payment automation, variance posting policy, landed cost, FIFO/cost layers, and production hardening.

## 2026-06-05 Inventory Returns Integration Update

- Inventory moves from `74` to `75` because safe receipt-linked purchase returns now have explicit operational stock-out movement preview/posting with duplicate prevention, permission gating, linked movement IDs, audit logging, and purchase-return detail visibility.
- This score change does not change production readiness. The movement is operational only and does not post journals, adjust AP/AR balances, create debit notes/refunds, affect VAT, book variances, update landed cost, create FIFO layers, send email, call ZATCA, or prove hosted/customer-data behavior.
- Remaining inventory gaps include sales return stock-in source modeling, purchase return movement reversal, accountant review before automated accounting, FIFO/cost layers, landed cost, negative-stock production policy, broad E2E/smoke/full-test coverage, hosted/customer-data proof, and load/concurrency.

## 2026-06-06 Sales Inventory Returns Update

- Sales/AR moves from `93` to `94` because customer-side sales inventory returns now exist as a dedicated operational document with `SRN-` numbering, source links, lifecycle actions, customer activity visibility, and targeted frontend tests.
- Inventory moves from `75` to `76` because safe validated sales returns can now explicitly post `SALES_RETURN_IN` stock-in movements with preview, duplicate prevention, permission gating, linked movement IDs, and audit logging.
- This score change does not change production readiness. Sales inventory returns are operational only and do not post journals, reverse revenue/COGS, adjust AR, create credit notes/refunds, affect VAT, send email, create payment links, call ZATCA, update landed cost/FIFO, or prove hosted/customer-data behavior.
- Remaining gaps include return movement reversal, source visibility panels, focused browser workflow QA, accountant-approved COGS reversal policy, FIFO/cost layers, landed cost, broad E2E/smoke/full-test coverage, hosted/customer-data proof, and load/concurrency.

## 2026-06-06 Landed Cost Preview Update

- Inventory moves from `76` to `77` because users can now preview landed cost allocation for eligible purchase receipt and purchase bill inventory lines using freight, customs/duty, insurance, handling, brokerage, storage, and other cost categories.
- Purchases/AP remains `84` because the new AP-facing links improve review visibility but do not change AP posting capability, bill balances, supplier payments, debit notes/refunds, or supplier statement behavior.
- This score change does not change production readiness. Landed cost preview is read-only and does not persist landed cost documents, post journals, update inventory valuation, update moving average, create FIFO/cost layers, adjust AP/bill balances, affect VAT/financial reports, send email, call ZATCA, or prove hosted/customer-data behavior.
- Remaining gaps include accountant-approved landed cost posting policy, saved document lifecycle, inventory valuation update design, FIFO/cost-layer treatment, reversal/void behavior, multi-currency handling, weight/volume allocation, focused browser QA, broad E2E/smoke/full-test coverage, hosted/customer-data proof, and load/concurrency.

## 2026-06-06 FIFO Cost-Layer Groundwork Update

- Inventory moves from `77` to `78` because users can now preview FIFO cost layers by reconstructing item/warehouse/as-of layers from existing movements and consuming oldest layers first.
- This score change does not change production readiness. FIFO preview is read-only and does not switch valuation method, persist active cost layers, update moving average, update stock valuation, create journals, create or reverse COGS, affect AP/AR, affect VAT, call ZATCA, update financial statements, mutate inventory movements, or mutate purchase/sales documents.
- Remaining gaps include active FIFO policy, persistent cost-layer ledger/backfill, accountant review, landed-cost-to-layer capitalization, FIFO COGS posting/reversal design, return movement reversal, focused browser QA, broad E2E/smoke/full-test coverage, hosted/customer-data proof, and load/concurrency.

## 2026-06-06 Serial Batch Bin Location Groundwork Update

- Inventory moves from `78` to `79` because item tracking settings, bin/location setup, batch/lot setup, serial-number setup, and read-only item traceability visibility now exist without forcing existing items into tracking.
- This score change does not change production readiness. Traceability setup is operational metadata only and does not change stock quantities unexpectedly, mutate historical movements, run backfill, update inventory valuation, activate FIFO, persist active cost layers, create journals, create or reverse COGS, affect AP/AR, affect VAT, call ZATCA, update financial statements, post landed cost, or prove hosted/customer-data behavior.
- Remaining gaps include full tracked movement capture for purchase receipts, sales stock issues, adjustments, transfers, purchase returns, and sales inventory returns; serial status automation; batch expiry/quarantine workflows; bin-to-bin and in-transit transfer workflow; historical migration/reconciliation tooling; accountant review; focused browser QA; broad E2E/smoke/full-test coverage; hosted/customer-data proof; and load/concurrency.

## 2026-06-06 ZATCA Preparation and Key Custody Update

- ZATCA moves from `39` to `40` because environment separation, key custody decision drafting, invoice eligibility, audit evidence, sandbox onboarding, and official SDK validation readiness are now documented and visible through read-only preparation gates.
- This score change does not change production readiness. Production compliance remains disabled; real network calls, OTP submission, compliance/production CSID requests, real private key generation/storage, signing, clearance/reporting, PDF/A-3, and production compliance claims remain blocked.
- Remaining gaps include final key custody decision, KMS/HSM or equivalent implementation, sandbox OTP access, sandbox CSID onboarding, signed XML, Phase 2 QR, clearance, reporting, PDF/A-3, error/retry queue, official accountant/tax/ZATCA specialist review, repeatable SDK CI, and production operations gates.

## 2026-06-06 Official ZATCA SDK Validation Pipeline Update

- ZATCA moves from `40` to `41` because official SDK validation is now repeatable or safely blocked through a local/no-network wrapper, fixture registry, and metadata-only evidence format.
- This score change does not change production readiness. Production compliance remains disabled; real network calls, OTP submission, compliance/production CSID requests, real private key generation/storage, signing, clearance/reporting, PDF/A-3, and production compliance claims remain blocked.
- Current local execution finds SDK `238-R3.4.8` but blocks on default Java `17.0.16`; a Java 11-14 runtime or Docker/pinned runner is still required for actual fixture execution.
- Remaining gaps include generated credit-note fixture coverage, generated invoice fixture execution, repeatable CI/Docker SDK validation, final key custody decision, sandbox OTP access, sandbox CSID onboarding, signed XML, Phase 2 QR, clearance, reporting, PDF/A-3, error/retry queue, official accountant/tax/ZATCA specialist review, and production operations gates.

## 2026-06-06 ZATCA Local Signed XML Plan Update

- ZATCA remains `41`: the local signed XML guard improves planning discipline but does not execute signing or add compliance capability.
- `corepack pnpm zatca:local-signed-xml-plan -- --plan --no-network --json` reports blocked metadata only with signing execution false, dummy signing disallowed, production compliance false, and evidence body policy metadata-only.
- No score change is applied because signed XML, Phase 2 QR, CSID, clearance/reporting, PDF/A-3, key custody, and production compliance remain blocked.

## 2026-05-30 DEV-09 Banking/Reconciliation Local Evidence Readiness Update

- DEV-09 is closed as local banking/reconciliation evidence; the closure is captured in `docs/development/DEV_09_BANKING_RECONCILIATION_CLOSURE.md`.
- The local evidence covers marker-scoped fixtures, synthetic parser/preview checks, match/categorize/ignore actions, and reconciliation `DRAFT -> PENDING_APPROVAL -> APPROVED -> CLOSED -> VOIDED`.
- Banking/reconciliation was scored conservatively at `69` after DEV-09: the local evidence was useful, but live bank connectivity, automatic matching, certified target-bank parser coverage, production raw-file archive operations, transfer fees, FX handling, broad E2E/smoke/full-test, hosted/beta/customer-data behavior, and accountant sign-off remained open.
- Do not treat DEV-09 local evidence as production readiness, beta readiness, customer-data proof, accountant certification, or banking integration certification.

## 2026-05-30 DEV-10 Reports/Financial Statements Local Evidence Readiness Update

- DEV-10 is closed as local reports and financial statements evidence; the closure is captured in `docs/development/DEV_10_REPORTS_FINANCIAL_STATEMENTS_CLOSURE.md`.
- The local evidence covers marker-scoped report fixtures, core financial report JSON checks, aging and VAT Return JSON checks, Trial Balance CSV/PDF/archive/download metadata, no-body output handling, and selected permission gates.
- Reports move from `74` to `76`: the local evidence is stronger for the DEV-10 scope, but official VAT filing, accountant-reviewed definitions/layouts, scheduled/email delivery, report packs, advanced branch/multi-period/consolidation behavior, inventory valuation/FIFO/landed-cost reporting, generated-document storage/retention, broad E2E/smoke/full-test, hosted/beta/customer-data behavior, and load/concurrency proof remain open.
- Do not treat DEV-10 local evidence as production readiness, beta readiness, customer-data proof, accountant certification, official VAT filing readiness, or report-pack readiness.

## 2026-05-30 DEV-11 Inventory Valuation And COGS Local Evidence Readiness Update

- DEV-11 is closed as local-only inventory valuation and COGS evidence; the closure is captured in `docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md`.
- The local evidence covers the marker fixture, manual sales stock issue COGS post/reverse, compatible purchase receipt asset post/reverse, clearing variance proposal lifecycle, inventory valuation reports, clearing reports, GL, Trial Balance, P&L, Balance Sheet, dashboard totals, and no-body/no-secret checks.
- Inventory moves from `72` to `74`: the local evidence is stronger for the DEV-11 scope, but FIFO/cost layers, landed cost, automatic posting, negative-stock production policy, serial/batch/bin/location, purchase returns, sales returns inventory impact, historical direct-mode migration, multi-currency inventory, transfer-fee/landed allocation, accountant review, generated-document retention, hosted/beta/customer-data proof, broad E2E/smoke/full-test, and load/concurrency proof remain open.
- DEV-11 does not prove production readiness, beta readiness, customer-data behavior, accountant certification, FIFO/landed-cost completeness, automatic COGS, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.

## 2026-05-30 DEV-12 Generated Documents Storage Retention Local Evidence Readiness Update

- DEV-12 is closed as local-only generated documents storage retention evidence; the closure is captured in `docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_CLOSURE.md`.
- The local evidence covers marker-scoped fixture creation, safe metadata list/detail/filter checks, one approved local download metadata/hash check, storage readiness and migration dry-run counts, and retention/legal-hold cleanup policy gaps.
- Documents/attachments moves from `70` to `71` and storage/scalability moves from `55` to `56`: the local evidence is stronger for generated-document archive visibility, but generated-document object storage, database/base64 migration, signed URLs, lifecycle policy, legal hold, tax/accounting retention approval, malware scanning, backup proof, restore proof, broad E2E/smoke/full-test, hosted/beta/customer-data proof, and load/concurrency remain open.
- DEV-12 does not prove production readiness, beta readiness, customer-data behavior, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.

## 2026-05-22 Production Foundation Roadmap Update

- Added `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md` to document the hosting, database/security, monitoring/operations, billing/SaaS operations, compliance/legal, ZATCA, and product-readiness path from controlled beta to paid Saudi-first SaaS v1.
- Added `docs/production/PAID_SAAS_V1_GAP_MATRIX.md` to map current state, paid-v1 requirements, owners, risk, dependencies, and recommended next tasks across hosting, database security, backups, monitoring, email, billing, support, ZATCA, legal, UX, accounting review, bank imports, inventory, reporting, and CI/testing.
- Added `docs/production/LAUNCH_GATE_CHECKLIST.md` with controlled beta, paid private beta, public production, ZATCA-compliance, security, backup/restore, monitoring/support, and billing/legal gates.
- This documentation pass does not change app code, schema, deployment configuration, Vercel/Supabase settings, Supabase RLS, runtime DB roles, real email, ZATCA behavior, backups/restores, seeds, or customer data.

## 2026-05-22 Production Implementation Backlog Update

- Added `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md` to convert the roadmap into ticket-ready scopes with stages, owner disciplines, priorities, risks, dependencies, acceptance criteria, expected validation, out-of-scope items, and Codex prompt titles.
- Added `docs/production/ARCHITECTURE_DECISION_RECORDS.md` with ADR placeholders for final hosting, database provider, object storage, queue/worker hosting, email, billing, monitoring, secrets, ZATCA strategy, raw bank archive policy, RLS/Data API strategy, and least-privilege runtime DB role.
- Added `docs/production/NEXT_10_PRODUCTION_TICKETS.md` to sequence the first risk-reducing production-foundation tickets.
- Current state remains controlled beta/user-testing. Vercel remains beta/user-testing only, and no production implementation was performed.

## Highest Leverage Improvements

1. `PROD-A1 Final hosting ADR`.
2. `PROD-B1 Least-privilege Prisma runtime role` validation plan and approved non-production cutover path.
3. Hosted backup/PITR proof and hosted restore-drill plan.
4. Object-storage validation and generated-document storage policy.
5. Monitoring stack selection with uptime/API/worker/email/backup alerting.
6. Incident/support runbook for paid users.
7. Email provider production validation plan.
8. Billing/legal ownership plan.
9. ZATCA production onboarding plan.
10. Full smoke/E2E controlled rerun plan.

## 2026-05-21 Supabase Data API/RLS hardening update

- Roles/permissions/security moved from 70 to 72 and deployment readiness moved from 54 to 56 because the user-testing Supabase project no longer grants `anon` or `authenticated` direct access to public application tables, sequences, or functions.
- The web app was confirmed to use the Nest API only; no direct Supabase REST, GraphQL, Realtime, or Storage client path was found in the app code inspected.
- RLS remains disabled on 76 public tables. This is still a production blocker, but it should be addressed with a compatible policy/runtime-role design rather than blind enablement.
- Data API Dashboard disablement and a least-privilege Prisma runtime role were not completed in this pass and remain the next security hardening steps.
- A follow-up role pass designed `ledgerbyte_app_runtime_user_testing`, but did not create it because the current tool surface could not safely update the Vercel API `DATABASE_URL`, store the new password, redeploy, and validate without printing secrets.
- Recommended next prompt: establish a safe Vercel API env mutation path, then create and validate `ledgerbyte_app_runtime_user_testing` in the user-testing Supabase project with rollback and narrow smoke validation, without enabling broad RLS.

## 2026-05-21 Guided first-workflow UX update

- UX/product polish moved from 58 to 62 because the setup wizard, dashboard empty state, contacts, first sales invoice, customer payment, and reports surfaces now steer a new business user through one complete first sale.
- `GET /dashboard/onboarding-checklist` now reports first-payment and first-reportable-activity steps from real tenant data instead of marking progress artificially.
- The dashboard onboarding card and empty-state prompt now point to the next incomplete profile/VAT/customer/invoice/payment/report action.
- Customer, invoice, payment, and report pages now include clearer helper copy and next-action links for first-use setup.
- ZATCA messaging remains conservative: the UI can show readiness guidance, but it does not claim production ZATCA connectivity or compliance.

## 2026-05-21 Customer ledger and report drill-down UX update

- UX/product polish moved from 62 to 64 because the post-payment customer ledger and aged receivables drill-down path now explains what changed, how invoice/payment allocations affect balances, and where the user should go next.
- Customer ledger rows now use readable activity/status labels, helper text for debit/credit/balance, and direct links back to source invoices/payments.
- Aged receivables/payables now include plain-language guidance, richer empty states, next-action links, linked customer/document rows, and mobile-safe horizontal table handling.
- Browser QA covered contact ledger, aged receivables, reports, payment detail, and invoice detail at desktop/tablet/mobile widths with no document overflow or console warning/error entries.
- No accounting calculations, posting behavior, report math, ZATCA behavior, email behavior, security configuration, migrations, or data resets were changed.

## 2026-05-21 Supplier AP drill-down UX update

- Purchases/AP moved from 78 to 80 and UX/product polish moved from 64 to 66 because supplier ledger, purchase bill, supplier payment, debit-note, and aged payables drill-downs now explain what happened and where to go next.
- Supplier ledger guidance now explains purchase bills, supplier payments, debit notes, refunds, reversals, and running payable balance without changing ledger math.
- Purchase bill, supplier payment, and purchase debit note details now show visible AP status guidance, next actions, supplier ledger links, AP report links, dashboard links, and mobile-safe action layouts.
- Supplier payment creation redirects back to the payment detail with recorded-payment success context.
- Browser QA covered supplier ledger, purchase bill detail, supplier payment detail, purchase debit note detail, aged payables, and reports at desktop/tablet/mobile widths with no document overflow or console warning/error entries.
- No AP posting behavior, journal behavior, report math, ZATCA behavior, email behavior, security configuration, migrations, seeds, or data resets were changed.

## 2026-05-21 Banking and reconciliation UX update

- Banking/reconciliation moved from 64 to 66 and UX/product polish moved from 66 to 68 because bank accounts, transfers, statement imports, statement matching, reconciliation summaries, and reconciliation details now explain visible workflow state and next actions.
- Bank account pages now explain ledger balance movement, debit/credit/running balance columns, imported statement rows, manual matching, and closed-period lock implications.
- Bank transfer detail now shows posted-transfer success guidance, source/destination movement, void/reversal meaning, bank-ledger links, bank-account links, and dashboard navigation without changing transfer posting behavior.
- Statement import and transaction pages now clarify manual CSV/JSON review, matched/unmatched/categorized/ignored states, match candidates, categorization, locked-period warnings, and no-live-bank-feed behavior.
- Reconciliation summary/detail pages now explain zero-difference close readiness, unmatched-row blockers, review history, captured close rows, and closed-period locks without changing reconciliation logic.
- Browser QA covered bank account list/detail, transfer creation/detail, statement imports, statement transactions, statement row detail, reconciliation summary/detail, and reports at desktop/tablet/mobile widths with no document overflow, console warning/error entries, page errors, request failures, or unknown mocked API calls.
- No banking posting behavior, reconciliation matching logic, ledger math, report calculations, ZATCA behavior, email behavior, security configuration, migrations, seeds, or data resets were changed.

## 2026-05-21 Inventory drill-down UX update

- Inventory moved from 70 to 72 and UX/product polish moved from 68 to 70 because item, warehouse, receipt, stock issue, adjustment, transfer, stock ledger, balance, and inventory report surfaces now explain visible workflow state and next actions.
- Warehouse and stock movement pages now explain quantity in/out, on-hand balance, movement references, empty states, and links to adjustments, transfers, balances, reports, and dashboard.
- Purchase receipt and sales stock issue details now clarify posted/voided stock effects, linked stock movements, explicit manual receipt-asset/COGS posting boundaries, and where to inspect reports.
- Adjustment and warehouse transfer details now explain draft/approval/void states, source/destination quantity movement, reversal behavior, and stock ledger navigation.
- Inventory movement, stock valuation, and low-stock reports now include plain-language report guidance, richer empty states, next-action links, and operational valuation warnings.
- Browser QA covered item, warehouse, receipt, issue, adjustment, transfer, stock movement, balance, inventory report, and reports routes at desktop/tablet/mobile widths with no document overflow, console warning/error entries, page errors, request failures, or unknown mocked API calls.
- No inventory posting behavior, stock movement math, valuation logic, COGS logic, journal behavior, report calculations, ZATCA behavior, email behavior, security configuration, migrations, seeds, or data resets were changed.

## 2026-05-21 Manual bank statement import groundwork

- Banking/reconciliation moved from 66 to 68 because beta users can now upload or paste manual CSV/JSON/text statement exports, preview parsed rows locally, and send the same sanitized text through the existing tenant-scoped preview/import API.
- Supported manual shapes now include debit/credit columns, signed amount columns, balance, counterparty, currency, and bank reference aliases. Invalid date/amount, conflicting debit/credit, currency mismatch, missing description/reference, and duplicate candidate states are surfaced before import.
- Import storage remains conservative: the app stores import metadata and parsed statement transaction rows through existing `BankStatementImport` and `BankStatementTransaction` records, not raw uploaded file bodies.
- No live bank feed, external bank API, automatic matching, reconciliation matching logic, journal posting behavior, report calculation, migration, seed, reset, full smoke, or full E2E was part of this pass.

## 2026-05-22 Bank statement format parser groundwork

- Banking/reconciliation moved from 68 to 69 because the existing manual import path now detects CSV, JSON, OFX, CAMT XML, MT940, and unknown text, with expanded sanitized fixtures for OFX SGML/XML, CAMT.053/CAMT.054, and MT940 variants.
- Limited parser support now normalizes common OFX transaction blocks including XML-style tags and missing-FITID warnings, CAMT entry amounts/directions/date-time/remittance/reference fallbacks, and MT940 debit/credit rows with comma decimals and multiline `:86:` narratives into the existing statement transaction preview/import shape.
- Unsupported or unrecognized text returns a safe validation error without echoing raw file content. Empty OFX/CAMT/MT940 files and ambiguous CAMT direction cases produce explicit parser warnings.
- `docs/banking/RAW_STATEMENT_FILE_ARCHIVE_POLICY.md` now documents a design-only raw statement-file archive policy. Beta remains metadata/parsed-row only, with no raw bank file body storage.
- This is manual upload/paste parser groundwork only: no live bank feed, external aggregation, automatic matching, reconciliation logic change, bank ledger math change, posting change, migration, seed/reset, full smoke, or full E2E was part of this pass.

## 2026-05-22 Bank parser compatibility program

- Added `docs/banking/BANK_STATEMENT_COMPATIBILITY_MATRIX.md` to track target-bank sample status, parser status, extraction coverage, duplicate-key confidence, warnings, and support level without claiming certification.
- Added `docs/banking/SANITIZED_BANK_SAMPLE_COLLECTION_GUIDE.md` and `docs/banking/BANK_PARSER_VALIDATION_CHECKLIST.md` so beta testers can provide safe sanitized samples and developers can validate parser behavior consistently.
- Added fixture governance in `apps/api/src/bank-statements/fixtures/README.md` covering fake data rules, naming conventions, fixture categories, and the targeted parser test command.
- This is documentation and sample-intake preparation only: no parser behavior, reconciliation matching logic, live bank feed, external aggregation, automatic matching, migration, seed/reset, full smoke, or full E2E changed.

## 2026-05-21 Document and PDF UX polish

- Documents/attachments moved from 68 to 70 and UX/product polish moved from 70 to 72 because invoice, receipt, bill, debit-note, credit-note, statement, archive, document-settings, and number-sequence surfaces now explain generated PDF behavior more clearly.
- Source-record PDF actions now use more specific labels such as invoice, receipt, purchase bill, debit note, and archived PDF downloads, with links to the generated archive, document settings, and number sequence settings.
- `/documents` now explains that archived downloads do not post accounting entries or send anything outside LedgerByte, shows readable source/status labels, and gives empty-state next actions.
- Document settings now explain which future generated PDFs are affected, how templates only change presentation density, and that totals, VAT, posting data, and compliance status are unchanged.
- Supplier statement PDF export parity is available from the supplier statement tab using the existing supplier ledger rows; archive tracking is now handled by the dedicated `SUPPLIER_STATEMENT` generated-document type.
- PDF/A-3, real ZATCA network submission, CSID execution, clearance/reporting, and production compliance remain disabled and are described conservatively in the UI.
- No PDF renderer math, accounting posting behavior, tax calculation, ZATCA behavior, migration, seed/reset, full smoke, or full E2E was part of this pass.

## 2026-05-21 Document download beta QA and supplier statement export

- Restored the local DPAPI-backed beta credential store and ran authenticated API-level document download/archive QA against deployed commit `ff01b2b` without printing passwords, tokens, auth headers, request/response bodies, PDF bodies, document numbers, or customer/vendor names.
- Real beta records existed for invoice, customer payment receipt, credit note, purchase bill, supplier payment receipt, purchase debit note, customer statement, supplier statement, and generated archive download checks.
- Verified HTTP `200`, `application/pdf`, attachment filename presence, `.pdf` filename extension, nonzero byte length, and `%PDF` magic bytes for every available source-document PDF plus generated archive download.
- Archive rows were created for invoice, customer payment receipt, credit note, purchase bill, supplier payment receipt, purchase debit note, and customer statement downloads. A follow-up non-destructive enum migration now adds `SUPPLIER_STATEMENT` so supplier statement PDF downloads can use the same archive path.
- User-testing deployment `da45544` applied the enum migration and targeted supplier statement archive QA passed: the supplier statement PDF download created exactly one `SUPPLIER_STATEMENT` archive row, and the archived PDF download returned `200` `application/pdf` with `%PDF` magic bytes.
- Authenticated browser UI width checks remain pending because the deployed browser session was unauthenticated, login automation could not safely fill the email/password controls, and JavaScript URL token injection was rejected by browser security policy.
- Full smoke, full E2E, migrations, seed/reset, RLS/runtime-role work, real ZATCA, real email, backups, and restores were intentionally not run.

## 2026-05-21 Statement PDF readability review

- Customer and supplier statement PDFs now use role-specific titles, period labels, opening/closing balance labels, activity headings, balance-column labels, and empty-state text instead of generic statement wording.
- Statement PDFs now include short plain-language AR/AP explanations: invoices increase customer balances, purchase bills increase supplier payables, and payments/credits/debit notes reduce or adjust balances.
- Customer and supplier contact statement tabs now use clearer download labels, period guidance, archive links, and AR/AP-specific helper copy while preserving generated-document archive behavior.
- No customer/supplier ledger math, AP/AR balances, posting behavior, tax/VAT calculation, PDF totals, generated-document archive behavior, migration, full smoke, or full E2E changed.
- Accountant review is still recommended for final statement wording and presentation before production use.

## 2026-05-21 Visual regression coverage update

- Browser QA/E2E moved from 64 to 68 and UX/product polish moved from 72 to 74 because the polished beta workflow surfaces now have a focused mocked Playwright visual regression suite.
- `corepack pnpm test:visual` covers setup, dashboard, reports, AR/customer statement and invoice detail, AP/supplier statement and bill detail, banking, inventory valuation, documents, and settings surfaces without live beta credentials or real API data.
- Critical pages are snapshotted at desktop, tablet, and mobile widths; additional AR, AP, banking, inventory, document, statement, setup, dashboard, and report routes get non-visual guidance, overflow, and unsafe-claim assertions.
- The suite asserts no production ZATCA submission/compliance claim, no implemented PDF/A-3 claim, and no live bank integration claim.
- Full smoke and full E2E remain pending and intentionally separate from this visual safety net.

## 2026-05-22 Beta feedback triage intake

- Added `docs/beta-testing/BETA_FEEDBACK_TRIAGE_SUMMARY.md` to document the first sanitized feedback intake check.
- Local beta/accountant feedback templates and review docs were present, but no completed sanitized beta reports, accountant findings, redacted screenshots, or redacted videos were found in the repository.
- The public GitHub issues query for `Noone9029/Accounting-App` returned zero issue records, so there were no blocker/high findings to fix in product code.
- No readiness score changed in this pass because no user-facing defect was submitted or corrected.
- Next step: collect sanitized tester/accountant findings through the beta feedback templates, then rerun triage and fix only blocker/high UX, route, wording, document, security/privacy, or compliance-wording issues.

## Fresh EGS SDK Hash Update

The fresh-EGS SDK hash-mode validation step is now complete locally. It proved opt-in SDK hash persistence, first-PIH seed usage, invoice-to-invoice SDK PIH chaining, hash-compare `MATCH`, and idempotent regeneration for two invoices without network calls. A follow-up debug pass resolved the generated invoice 2 `KSA-13` validation failure by using an invoice-specific temporary SDK `pihPath` file containing metadata `previousInvoiceHash`. The ZATCA score remains constrained because buyer building-number data, signing/CSID/clearance/PDF-A3, and repeatable CI SDK execution are not implemented.

## 2026-05-18 Email readiness diagnostics update

- Email/communications moved from 50 to 54 because production SMTP readiness now exposes redacted configuration booleans, blockers, warnings, diagnostics gate state, and no-customer-email guarantees.
- `POST /email/diagnostics` remains disabled by default and returns no-send/no-mutation status unless an explicit flag and allowlisted recipient are configured.
- The score remains limited because real SMTP relay validation, domain authentication evidence, retries, bounces/webhooks, monitoring, and transactional send workflows are still pending.
- Recommended next prompt: validate SMTP readiness against a non-production relay and add sender-domain authentication evidence without sending customer emails.

## 2026-05-19 Email sender-domain readiness update

- Email/communications moved from 54 to 56 because LedgerByte now stores tenant-scoped metadata-only SPF/DKIM/DMARC evidence, exposes sender-domain status in `GET /email/readiness`, and shows evidence controls on `/settings/email-outbox`.
- `GET /email/diagnostics-plan` and `POST /email/diagnostics` keep non-production relay diagnostics disabled/no-send/no-mutation by default.
- The score remains limited because relay execution evidence, live DNS/provider validation, retries, bounces/webhooks, monitoring, transactional send workflows, and MFA/session hardening are still pending.
- Recommended next prompt: run an allowlisted non-production SMTP relay diagnostic and record provider result evidence without sending customer email.

## 2026-05-19 Email retry and bounce readiness update

- Email/communications moved from 56 to 58 because `EmailOutbox` now has durable retry metadata, `/email/retry-plan` is read-only/no-send, `/email/retry-process` is disabled/no-send/no-mutation by default, and `EmailProviderEvent` supports metadata-only mock delivery/bounce/complaint evidence.
- `/settings/email-outbox` now shows retry processor state, pending/blocked retry counts, mock-only provider event readiness, bounce webhook signature status, and monitoring blockers without exposing secrets or message contents.
- The score remains limited because retry execution is not scheduled, provider events are unsigned/mock-only, bounce suppression and monitoring are not production-ready, and real relay execution evidence/live DNS validation are still pending.
- Recommended next prompt: add signed provider webhook verification, suppression-list handling, and monitoring-safe alerts for bounce/complaint events without enabling real customer email by default.

## 2026-05-19 Email webhook suppression readiness update

- Email/communications moved from 58 to 60 because signed webhook readiness is now explicit and disabled by default, `EmailSuppression` stores masked/hash metadata only, bounce/complaint events can create suppression metadata when signed or explicitly local/mock, and active suppressions block matched send/retry attempts without provider calls.
- `/settings/email-outbox` now shows webhook verification, webhook-secret configured/missing, suppression count/list controls, suppressed retry counts, and alerting/monitoring blockers.
- The score remains limited because the webhook verifier is provider-agnostic/test-only, no scheduled retry worker exists, no real relay evidence has been captured, no alert thresholds/dashboard exist, and live DNS/provider validation remains pending.
- Recommended next prompt: add a scheduled transactional email retry worker and monitoring dashboard evidence for retry throughput, bounce/complaint thresholds, and suppression trends while real customer sends remain disabled by default.

## 2026-05-19 Email worker monitoring readiness update

- Email/communications moved from 60 to 62 because `GET /email/retry-worker/plan`, default-skipped `POST /email/retry-worker/run`, `GET /email/monitoring-plan`, and metadata-only `EmailDeliveryMonitoringEvidence` now cover retry throughput, bounce/complaint thresholds, suppression trends, delivery dashboards, and webhook health readiness.
- `/settings/email-outbox` now shows retry worker configured/enabled state, monitoring evidence status, bounce/complaint threshold blockers, suppression trend blockers, webhook health blockers, and monitoring evidence controls without exposing secrets or customer recipients.
- The score remains limited because the worker shell is not a production scheduler, the webhook verifier is provider-agnostic/test-only, no real relay evidence has been captured, no external monitoring/alert delivery exists, and live DNS/provider validation remains pending.
- Recommended next prompt: add provider-specific production webhook adapters and an external monitoring integration runbook for email delivery alerts while keeping real customer sends disabled by default.

## 2026-05-19 Backup restore readiness update

- Storage/scalability moved from 45 to 52, deployment readiness from 46 to 50, documents/attachments from 62 to 66, and production operations from 25 to 30 because `BackupRestoreEvidence`, `/system/backup-readiness`, `/system/restore-drill-plan`, and storage settings evidence controls now make backup/restore gaps visible and reviewable.
- The new readiness surface is read-only/no-mutation, executes no backup or restore, exports no customer data, and exposes no database URLs, service role keys, storage credentials, signed XML/QR bodies, customer document bodies, attachment bodies, API keys, tokens, auth headers, private keys, or provider secrets.
- The score remains limited because actual Supabase/Postgres backup/PITR validation, object-storage backup validation, restore drill execution, RPO/RTO review, monitoring, and incident runbooks are still pending.
- Recommended next prompt: execute a non-production Supabase/Postgres restore drill and object-storage backup verification with sanitized evidence, without exposing secrets or customer content.

## 2026-05-19 Non-production restore drill evidence update

- Storage/scalability moved from 52 to 55, deployment readiness from 50 to 54, documents/attachments from 66 to 68, and production operations from 30 to 34 because a local non-production Postgres dump/restore drill now has metadata-only evidence.
- The drill used seeded local/demo data only, restored into an isolated temporary local database, verified counts only, and removed the temporary database plus dump afterward.
- Verified counts matched for 76 tables, 55 migrations, 11 organizations, 77 users, 186 attachments, 820 generated documents, and 3121 journal entries. No document payloads, attachment payloads, signed XML bodies, QR payloads, database URLs, service role keys, or storage credentials were exposed.
- Verified evidence now exists for `DATABASE_BACKUP`, `MIGRATION_HISTORY`, `GENERATED_DOCUMENT_BACKUP`, `ATTACHMENT_BACKUP`, `RESTORE_DRILL`, and `RESTORE_VERIFICATION`.
- Readiness remains `productionReady=false` because hosted Supabase PITR, real object-storage backup/restore, and RPO/RTO business review are still missing.
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

## Scorecard update: ZATCA immutable storage policy approval

Readiness improved for planning and audit visibility because immutable policy approval records now exist. Production readiness remains blocked because body persistence is disabled, retention duration is not legally approved, immutable storage enforcement is not implemented, and CSID/signing/clearance/reporting/PDF-A3 remain out of scope.

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

## 2026-06-16 shadcn payment workflow migration

- Payment workflow UI consistency improved for controlled beta/user-testing: customer payments and supplier payments now use the same LedgerByte/shadcn page headers, buttons, table wrappers, status badges, allocation tables, and summary cards as the newer transaction workflows.
- No readiness score increase is taken from this frontend-only migration. It improves usability and reviewability, but it does not add provider evidence, backend capability, compliance capability, hosted proof, or production hardening.
- No backend/API/schema/payment posting/allocation/provider/UAE PINT-AE/ZATCA behavior changed.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.

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

# Sellable-v1 scorecard update - 2026-05-18

- Authentication/users/permissions: 82%.
- Tenant isolation and organization context: 84%.
- Onboarding: 82% after adding the read-only dashboard onboarding checklist and `/setup` guided setup wizard.
- Accounting workflows: 82%.
- Reliability and deployment readiness: 76%.
- Documents and storage: 62%.
- Admin/supportability: 70%.
- ZATCA local readiness: 39%; generated standard invoice and credit note XML fixtures now pass local/no-network SDK validation under Java 11.0.26, while production compliance remains false and blocked.
- Overall controlled beta readiness: 75%.

## 2026-05-22 Accountant review packet

- Added `docs/accountant-review/ACCOUNTANT_REVIEW_PACKET.md`, `ACCOUNTANT_REVIEW_CHECKLIST.md`, `ACCOUNTANT_REVIEW_FINDINGS_TEMPLATE.md`, and `SAMPLE_OUTPUT_INDEX.md` to prepare LedgerByte document/report/output review with a qualified accountant.
- The packet covers sales invoices, customer receipts, credit notes, customer statements, purchase bills, supplier payment receipts, purchase debit notes, supplier statements, AR/AP aging, GL/report terminology, inventory reports, bank reconciliation, VAT/ZATCA wording safety, and overall accountant usability.
- Sample output handling is text-only: no binary PDFs are committed, real beta PDFs must not be committed, and the index points reviewers to safe mock visual snapshots, local PDF renderer tests, UI routes, and authenticated endpoint patterns.
- This is preparation material only. Accountant review, legal/tax certification, ZATCA production approval, PDF/A-3, real ZATCA submission, full smoke, full E2E, and security runtime-role hardening remain pending.

## 2026-05-22 Beta testing feedback kit

- Added `docs/beta-testing/BETA_TESTING_GUIDE.md`, `BETA_TESTING_SCRIPT.md`, `BETA_FEEDBACK_FORM_TEMPLATE.md`, and `BETA_TRIAGE_GUIDE.md` so selected testers can evaluate guided setup, dashboard, AR, AP, banking, reconciliation, inventory, documents, statements, reports, and archive workflows consistently.
- Added lightweight GitHub issue templates for beta bug reports, accounting review findings, and UX feedback, each with explicit safety checks against secrets, real customer-sensitive data, PDF/document bodies, signed XML, QR payloads, and production document data.
- The kit states that Vercel is beta/user-testing only, not final production hosting; testers should use safe sample data only; no real ZATCA submission, CSID execution, clearance/reporting, PDF/A-3, production compliance certification, live bank integration, or real customer email sending is enabled by default.
- Accountant review remains pending and must not be treated as approval or certification. Full smoke, full E2E, and security runtime-role hardening remain separate pending work.

## 2026-05-22 Beta access management guidance

- Added `docs/beta-testing/BETA_ACCESS_MANAGEMENT.md` to guide a controlled 3-5 tester cohort, least-privilege role selection, beta organization labeling, invite handling, password reset, suspension/reactivation, and tester data cleanup requests.
- `/settings/team`, `/settings/roles`, and `/settings/roles/:id` now show lightweight beta guidance: keep Owner/Admin internal, use Viewer for read-only review, use scoped roles only for assigned workflows, avoid real data, and suspend testers after the beta window.
- This is access/onboarding guidance only: no auth architecture, permission logic, Supabase RLS, runtime DB role, Vercel environment, migration, seed/reset, full smoke, or full E2E changed.

## 2026-05-22 Beta access dry run

- Ran an authenticated API-level dry run against the deployed user-testing environment with the local DPAPI-backed credential store and no secret/body output.
- Confirmed email readiness before inviting: provider `mock`, mock mode true, and real sending disabled.
- Invited a dummy `.example.test` tester with `Viewer`, verified the member appeared in Team Members, confirmed mock outbox status `SENT_MOCK`, changed role to `Sales` and back to `Viewer`, then suspended/reactivated/suspended the membership.
- Final dry-run state: dummy tester remained `SUSPENDED`, final role was `Viewer`, and `Owner`/`Admin` was not assigned.
- No real external email, real customer data, production invoice, live bank feed, real ZATCA action, auth architecture change, permission logic change, migration, seed/reset/delete, full smoke, or full E2E action was used.

## 2026-06-06 ZATCA local dummy signing guard

- ZATCA readiness remains non-production and blocked for signing.
- Added a local metadata-only guard for future dummy signing experiments. It plans sign/QR/validate command shapes but keeps SDK execution disabled, reads no certificate/private-key bodies, creates no signed XML, and keeps `productionCompliance=false`.
- No score increase is taken from this guard; it improves safety around a future local experiment rather than closing production ZATCA blockers.

## 2026-06-06 ZATCA approved dummy signing execution plan

- Added the future execution runbook and exact approval phrase for local dummy-material signing against sanitized fixtures only.
- No score increase is taken: approval recognition is planning metadata only, and SDK signing, QR generation, signed validation, CSID/OTP, network calls, PDF/A-3, signed XML persistence, and production compliance remain disabled.

## 2026-06-06 ZATCA approved local dummy signing execution

- One approved local dummy-material SDK run passed for the generated standard invoice and credit-note fixtures under Java `11.0.26`.
- This improves local ZATCA preparation evidence but does not increase production readiness: CSID/OTP, real credentials, production signing, Phase 2 QR production proof, clearance/reporting, PDF/A-3, signed artifact storage, repeatable SDK CI, and production compliance remain blocked.
- Evidence is metadata-only at `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`.

## 2026-06-06 ZATCA dummy signing result review

- Reviewed the metadata-only local dummy signing evidence and added `docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md`.
- Added `docs/zatca/PHASE_2_QR_GAP_ANALYSIS.md` to record production QR/signing gaps after local QR generation passed.
- No score increase is taken from the review. ZATCA local readiness stays preparation-only; production readiness remains blocked on key custody, CSID lifecycle, production signing, Phase 2 QR proof, clearance/reporting, PDF/A-3, signed artifact storage, repeatable SDK CI, and official review.

## 2026-06-07 ZATCA sandbox CSID request execution guard

- Added `docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md` and `docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md`.
- Extended the no-network preflight guard with execution-guard approval recognition.
- No score increase is taken: status is `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`, and `--execute-csid-request` remains `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- No OTP, CSID request, network call, adapter execution, secret/body exposure, signing, clearance/reporting, PDF-A3, or production compliance behavior occurred.

## 2026-06-07 ZATCA sandbox adapter no-network contract tests

- Added `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_TESTS.md` and `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md`.
- Added the standalone contract guard and tests at `scripts/zatca-sandbox-adapter-no-network-contract.cjs` and `scripts/zatca-sandbox-adapter-no-network-contract.test.cjs`.
- No score increase is taken: status is `NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS`, and real sandbox readiness remains blocked.
- No OTP, CSID request, network call, sandbox adapter execution, mock/disabled adapter execution, request body creation, response body processing, DB write, env value output, secret/body exposure, signing, clearance/reporting, PDF-A3, or production compliance behavior occurred.

## 2026-06-11 ZATCA manual OTP capture approval gate

- ZATCA remains scored at `41`; this gate improves governance and evidence quality but does not add compliance capability.
- Added `docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_GATE.md`, `docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_RESULTS.md`, `scripts/zatca-manual-otp-capture-approval-gate.cjs`, and `scripts/zatca-manual-otp-capture-approval-gate.test.cjs`.
- Added root package scripts `zatca:manual-otp-capture-approval-gate` and `test:zatca-manual-otp-capture-approval-gate`.
- No score increase is taken: default status is `MANUAL_OTP_CAPTURE_APPROVAL_BLOCKED`, and the exact approval phrase plus `--metadata-only` still returns `MANUAL_OTP_CAPTURE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No OTP was captured, no OTP value was stored, no OTP value was shared with Codex, no CSID was requested, no ZATCA network call was made, no request body was created, no response body was processed, and no signing, clearance/reporting, PDF-A3, or production compliance behavior occurred.
