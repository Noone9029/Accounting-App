# Remaining Roadmap

## 2026-06-17 Country Edition Clean Reconciliation Update

- Clean branch `feature/edition-split-clean-reconciliation` ports only edition-split changes from the preserved dirty country-edition work.
- Dirty preservation branch remains `feature/edition-split-preserve-current-changes`; safety patch remains under `E:\Repo-Hygiene-Safety\Accounting-App-20260617-192644\`.
- Next edition arc: review and merge the clean PR, then configure environment variables in Vercel projects outside this branch when deployment work is explicitly requested.
- Do not add custom domains yet. Existing prior URLs remain `https://ledgerbyte-ksa.vercel.app`, `https://ledgerbyte-uae.vercel.app`, and `https://ledgerbyte-web-test.vercel.app`.
- Keep provider evidence and certification/accreditation claims blocked until real provider responses exist.
- ZATCA stash remains parked and preserved.

## 2026-06-17 Security Settings Route Planning Update

- PR `#62` was merged into `main` at `1fcbdce4da80341a58098070e34e2e37ef616fa1` before this docs-only planning branch began.
- Added `docs/security/SECURITY_SETTINGS_CAPABILITY_INVENTORY.md` and `docs/security/SECURITY_SETTINGS_ROUTE_IMPLEMENTATION_PLAN.md`.
- Phase A (`/settings/security`) has been implemented as a read-only overview backed by existing `/auth/me`, team, roles, organization setup, and audit-log data.
- Keep unsupported controls out of UI: persisted sessions, refresh tokens, session revocation, logout-all, MFA, SSO, API-token management, logged-in password change, email verification, and configurable security notifications.
- Future phases need explicit backend design, migrations, tests, security review, permission review, and visual QA before any session/password/MFA/SSO/API-token control is added.
- ZATCA remains parked and preserved; provider evidence remains unavailable.

## 2026-06-18 LedgerByte read-only security settings route update

- Added `feature/security-settings-read-only-route`.
- Implemented `/settings/security` as a read-only settings surface with truthful copy and explicit capability-not-available notices.
- Added route permission mapping and side-navigation integration in `apps/web/src/lib/permissions.ts` and `apps/web/src/lib/sidebar-nav.ts`.
- Added unit tests for the new route and updated visual QA coverage in `tests/visual/owner-security-organization-settings-visual-qa.visual.spec.ts`.
- Added `docs/development/SECURITY_SETTINGS_READ_ONLY_ROUTE_SPRINT_CLOSURE.md`.
- Kept implementation scoped to frontend/test/docs with no backend API, schema, migration, auth/session/security business logic, provider integration, ASP/email/ZATCA calls, or production-infrastructure changes.

Audit date: 2026-06-18

For the updated Product Audit v2 planning artifacts, see:

- `docs/PRODUCT_AUDIT_V2.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/NEXT_30_PROMPTS_ROADMAP.md`
- `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md`
- `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`
- `docs/production/LAUNCH_GATE_CHECKLIST.md`
- `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md`
- `docs/production/ARCHITECTURE_DECISION_RECORDS.md`
- `docs/production/NEXT_10_PRODUCTION_TICKETS.md`

## Current Stage

LedgerByte is at the controlled beta/user-testing stage. The current Vercel deployment is beta/user-testing only and must not be treated as final production hosting. LedgerByte is not production-launched, real ZATCA production compliance is not enabled, UAE eInvoicing work is readiness groundwork only, and paid production SaaS v1 requires the production foundation work documented under `docs/production/`. UAE Peppol/PINT-AE now has data-entry UX, local invoice/credit-note readiness panels, official local serializer/rule-pack foundation, source-backed official code mappings, local scenario fixture QA coverage, disabled/mock ASP connector contracts, provider-selection planning, and a provider outreach execution pack, but no real ASP connection, ASP validation, FTA reporting, production Peppol claim, or production UAE compliance claim. Local authenticated visual QA now covers role-filtered routes, create-menu behavior, realistic detail states, refund/collections/banking detail polish, report drilldowns, dense accounting tables, ledger-style entry screens, secondary operational routes, contact lists, Owner settings, Owner organization/security-adjacent settings surfaces, storage evidence, generated-document archive states, source transaction document evidence, setup, documents, and accountant-heavy mobile/table surfaces; this improves frontend confidence only and does not prove hosted/customer-data, provider, legal, security/session business logic, storage-provider, banking-provider, generated-document business logic, report calculation, report export, or production compliance readiness. The production ticket backlog, ADR index, and first 10 production tickets are planning artifacts only; no production implementation has been performed. DEV-08 local AP evidence is strong and closed for its local-only scope, but AP is not production-complete. DEV-09 local banking/reconciliation evidence is also closed for its local-only scope, but banking remains unproven for production, beta, customer data, live bank feeds, automatic matching, certified parser coverage, DB-enforced import fingerprints, and broad E2E/smoke/full-test coverage. The Wafeq manual banking route now has clearing-account configuration, explicit journal-backed posting for safe configured deposit/card cases, and reconciliation report/audit polish for accountant review, but direct cheque source accounting, card credit/refund offset policy, beta QA, accountant review, hosted/customer-data proof, and production banking readiness remain open. DEV-10 local reports/financial statements evidence is closed for its local-only scope, but reporting remains unproven for production, beta, customer data, accountant-certified definitions, official VAT filing, scheduled/email delivery, report packs, advanced branch/multi-period/consolidation behavior, broad E2E/smoke/full-test coverage, and load/concurrency. DEV-11 local inventory valuation and COGS evidence is closed for its local-only scope, but inventory accounting remains unproven for production, beta, customer data, accountant certification, FIFO/landed-cost completeness, automatic COGS, broad E2E/smoke/full-test coverage, hosted behavior, and load/concurrency. DEV-12 is closed as local-only generated documents storage retention evidence, but generated-document storage remains unproven for production, beta, customer data, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test coverage, hosted behavior, and load/concurrency.

## 2026-06-17 Owner security organization settings visual QA

- PR `#61` was merged into `main` at `b8799c8f4e77c7be87f8a4a5fde0aaec33bc3fde` before this branch started.
- Added read-only `/roles/:id` visual fixture coverage for the real role-detail route.
- Verified existing Owner organization/security-adjacent settings routes across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Verified `Owner`, `Accountant`, and `Viewer` role behavior for team invite controls, role list/detail controls, audit retention actions, compliance readiness actions, setup states, shell variants, route/action consistency, and existing permission behavior.
- Covered `/settings`, `/settings/team`, `/settings/roles`, `/settings/roles/role-owner`, `/settings/roles/role-custom-long`, `/settings/audit-logs`, `/settings/compliance`, `/setup`, and `/organization/setup`.
- Skipped `/settings/security`, `/settings/sessions`, `/settings/api`, `/settings/integrations`, `/settings/organization`, `/organization`, and `/settings/users` because those exact routes do not exist; existing real surfaces were covered instead. `/settings/zatca` exists but was intentionally skipped to avoid ZATCA-specific visual expansion.
- Screenshots and `visual-results.json` were written to ignored `artifacts/visual-qa/owner-security-organization-settings-visual-qa/` and were intentionally not committed.
- Fixed visual fixture/test-harness issues found by visual QA: role-detail fixture coverage and app-shell assertion calibration. No frontend product layout, permission, link, or copy defect required a source UI change.
- No backend API, schema, migration, production auth behavior, auth/session/security business logic, payment/accounting/business logic, report calculation logic, journal posting logic, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, fake security/SSO/MFA/API/provider claim, certification claim, or production compliance claim was added.
- Remaining UI migration scope: real security/session/API settings if product routes are added later, organization profile editing beyond setup, generated-document detail route if added later, storage execution evidence after real provider proof, and accountant/legal wording review.
- Recommended next prompt: `Real security settings route implementation plan`.

## 2026-06-16 Owner settings generated-document storage evidence visual QA

- PR `#60` was merged into `main` at `85813f7217d32babebf71412f43ea8034f0c0d07` before this branch started.
- Extended the local visual fixture with read-only generated-document archive rows, source transaction document evidence data, storage readiness, and metadata-only storage evidence rows.
- Verified existing Owner settings/generated-document/storage evidence routes across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Verified `Owner`, `Accountant`, and `Viewer` role behavior for admin/settings actions, generated-document downloads, disabled settings forms, source PDF archive guidance, route/action consistency, and existing permission behavior.
- Covered `/settings`, `/settings/team`, `/settings/roles`, `/settings/storage`, `/settings/compliance`, `/settings/audit-logs`, `/settings/number-sequences`, `/settings/documents`, `/setup`, `/accounts`, `/tax-rates`, `/documents`, `/sales/invoices/invoice-1`, `/purchases/bills/bill-1`, `/sales/credit-notes/credit-note-1`, and `/purchases/debit-notes/debit-note-1`.
- Skipped `/settings/users`, `/settings/organization`, `/settings/taxes`, `/settings/numbering`, `/settings/chart-of-accounts`, `/settings/security`, `/settings/api`, `/settings/uae-einvoicing`, `/onboarding`, `/documents/document-1`, and `/generated-documents` because those exact app routes do not exist; existing routes were covered instead. `/settings/zatca` exists but was intentionally skipped to avoid ZATCA-specific visual expansion.
- Screenshots and `visual-results.json` were written to ignored `artifacts/visual-qa/owner-settings-generated-document-storage-evidence/` and were intentionally not committed.
- Fixed frontend/test issues found by visual QA: generated-document and storage evidence fixture realism was added, unsupported ZATCA network wording was tightened in document guidance and debit note detail, and visual assertions were aligned to existing role permissions.
- No backend API, schema, migration, production auth behavior, payment/accounting/business logic, report calculation logic, generated-document business logic, storage provider logic, journal posting logic, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, fake provider/storage/archive claim, certification claim, or production compliance claim was added.
- Remaining UI migration scope: owner/security settings depth, generated-document detail route if added later, storage execution evidence after real provider proof, and accountant wording review.
- Recommended next prompt: `Owner security and organization settings visual QA`.

## 2026-06-16 Secondary operational route polish visual QA

- PR `#59` was merged into `main` at `b36ffe56f83a79edbe04f148f4e1a86ecf38b5d9` before this branch started.
- Extended the local visual fixture with read-only customer/supplier list, team, roles, generated document, chart of accounts, tax rate, number sequence, setup readiness, and bank-account review data.
- Verified existing secondary operational routes across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Verified `Owner`, `Accountant`, and `Viewer` role behavior for settings/admin actions, contact mutation links, secondary table readability, restricted access, and existing permission behavior.
- Covered `/customers`, `/suppliers`, `/settings`, `/settings/team`, `/settings/roles`, `/settings/storage`, `/settings/compliance`, `/settings/audit-logs`, `/settings/number-sequences`, `/accounts`, `/tax-rates`, `/setup`, `/documents`, `/bank-accounts`, `/bank-accounts/bank-1`, and `/bank-accounts/bank-1/statement-transactions`.
- Skipped `/settings/users`, `/settings/organization`, `/settings/taxes`, `/settings/numbering`, `/settings/chart-of-accounts`, `/settings/security`, `/settings/api`, `/settings/uae-einvoicing`, `/onboarding`, `/documents/document-1`, `/generated-documents`, `/bank-accounts/bank-account-1`, and `/bank-accounts/bank-account-1/transactions` because those exact routes do not exist; existing routes were covered instead. `/settings/zatca` exists but was intentionally skipped to avoid ZATCA-specific visual expansion.
- Screenshots and `visual-results.json` were written to ignored `artifacts/visual-qa/secondary-operational-route-polish/` and were intentionally not committed.
- Fixed frontend permission/layout issues found by visual QA: contact list add links require `contacts.manage`, and the chart-of-accounts create form no longer causes tablet/mobile overflow. Test fixture/assertion fixes stayed local to visual QA.
- No backend API, schema, migration, production auth behavior, payment/accounting/business logic, report calculation logic, journal posting logic, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, fake automation, fake bank feed, fake AI, fake provider/storage connectivity, fake export success, certification claim, or production compliance claim was added.
- Remaining UI migration scope: owner/security settings depth, generated-document storage execution evidence, secondary route component migration breadth, and accountant wording review.
- Recommended next prompt: `Owner settings and generated-document storage evidence visual QA`.

## 2026-06-16 Report drilldown dense entry visual QA

- PR `#58` was merged into `main` at `643cc62dacb764d61e4f0acd7b99e51c4a43c502` before this branch started.
- Extended the local visual fixture with read-only report, VAT review, aged report, journal, statement, document archive, and audit-log dense table data.
- Verified existing routes across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Verified `Owner`, `Accountant`, and `Viewer` role behavior for report visibility, dense accounting readability, restricted export/create actions, and existing access-denied behavior.
- Covered reports index, Profit & Loss, Balance Sheet, Trial Balance, General Ledger, VAT Summary, VAT Return, aged receivables, aged payables, manual journals, bank statement transactions, customer/supplier statement and detail routes, invoice/bill detail tables, documents, and audit logs.
- Skipped `/reports/vat`, `/reports/cash-flow`, `/reports/customer-statement`, `/reports/supplier-statement`, and `/reports/audit-log` because those exact routes do not exist; existing VAT summary/return, party statement, and audit-log routes were covered instead.
- Screenshots and `visual-results.json` were written to ignored `artifacts/visual-qa/report-drilldown-dense-entry-visual-qa/` and were intentionally not committed.
- Fixed frontend permission issues found by visual QA: report export controls now require report-export permission, and report guide create links respect invoice, bill, and payment create permissions. Test fixture/assertion fixes stayed local to visual QA.
- No backend API, schema, migration, production auth behavior, payment/accounting/business logic, report calculation logic, journal posting logic, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, fake automation, fake bank feed, fake AI, fake report export success, report certification claim, or production compliance claim was added.
- Remaining UI migration scope: secondary operational route polish, dense entry-form ergonomics beyond the checked screens, report export implementation review if/when real exports exist, and accountant wording review.
- Recommended next prompt: `Secondary operational route polish visual QA`.

## 2026-06-16 Refund collections banking detail polish

- PR `#57` was merged into `main` at `c62a1a0f2232aca7fbffcf0400fed66f67d392b2` before this branch started.
- Extended the local visual fixture with read-only refund, collections, banking, statement transaction, reconciliation, and cheque edge cases.
- Verified existing routes across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Verified `Owner`, `Accountant`, and `Viewer` role behavior for accounting-heavy routes and restricted actions.
- Covered credit/debit notes, customer/supplier refunds, collections, party detail, bank accounts, statement transactions, reconciliation summary/list/detail, cheques, aged receivables, aged payables, General Ledger, and documents.
- Skipped `/banking`, `/reconciliation`, `/cheques`, `/customers/customer-collections`, and `/suppliers/supplier-payables` because those routes do not exist; nested existing routes were covered instead.
- Screenshots and `visual-results.json` were written to ignored `artifacts/visual-qa/refund-collections-banking-detail-polish/` and were intentionally not committed.
- No backend API, schema, migration, production auth behavior, payment/accounting/business logic, AR/AP state-machine behavior, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, fake automation, fake bank feed, fake AI, bank-feed claim, reconciliation automation claim, or production compliance claim was added.
- Remaining UI migration scope: report drilldown visual QA, dense entry-form ergonomics, secondary operational route polish, and accountant wording review.
- Recommended next prompt: `Report drilldown dense entry visual QA`.

## 2026-06-16 Detail-state accountant mobile visual QA

- PR `#56` was merged into `main` at `2467a195951a351db0c5b238eab5880ff8da2971` before this branch started.
- Extended the local visual fixture with read-only detail states for invoices, bills, customer payments, supplier payments, credit notes, debit notes, customers, and suppliers.
- Verified detail routes across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Verified accountant-heavy table/card surfaces across tablet `1024x768` and mobile `390x844`: line items, allocations, party transactions, aged reports, General Ledger, Trial Balance, bank transactions, and documents.
- Verified accountant route behavior for dashboard, AR/AP lists and create routes, party detail, payments, credit/debit notes, reports, bank accounts, and documents.
- Screenshots and `visual-results.json` were written to ignored `artifacts/visual-qa/detail-states-accountant-mobile-table-review/` and were intentionally not committed.
- No backend API, schema, migration, production auth behavior, payment/accounting/business logic, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Remaining UI migration scope: refund/collections/banking detail polish, report drilldowns, dense entry-form ergonomics, and staged secondary-route migration.
- Recommended next prompt: `Refund collections banking detail visual polish`.

## 2026-06-16 Role-filtered UI visual QA route polish

- PR `#55` was merged into `main` at `311ef752bf692c16f17cafa361c8b1522cb686e8` before this branch started.
- Extended the local visual fixture with test-only role profiles mapped to the existing shared default roles: `Owner`, `Accountant`, `Sales`, `Purchases`, and `Viewer`.
- Verified `Owner` and `Viewer` route access across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844` for dashboard, AR/AP, party detail, documents, reports, settings, compliance, storage, and bank-account routes.
- Verified create-menu behavior for `Owner`, `Accountant`, `Sales`, `Purchases`, and `Viewer`, including allowed links, disabled unauthorized actions, and local route hrefs.
- Screenshots and `visual-results.json` were written to ignored `artifacts/visual-qa/role-filtered-route-polish/` and were intentionally not committed.
- No backend API, schema, migration, production auth behavior, payment/accounting/business logic, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Remaining UI migration scope: role-filtered detail states, refund/collections/banking route polish, report-depth review, and accountant review of dense mobile table/card readability.
- Recommended next prompt: `Role-filtered detail states and accountant mobile table review`.

## 2026-06-16 Authenticated UI visual QA route hardening

- PR `#54` was merged into `main` at `0a6c5ddde244b5298933e88e4393516ff9996982` before this branch started.
- Added a local authenticated visual QA fixture/matrix that primes the existing visual session and mocks read-only API responses for app-shell, dashboard, AR/AP, contact, document, report, compliance, storage, and banking routes.
- Verified 20 authenticated routes across desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`, with screenshots and `visual-results.json` written to ignored `artifacts/visual-qa/authenticated-route-hardening/`.
- The checked routes passed app-shell visibility, route heading/action visibility, no document-level horizontal overflow, no severe topbar/content overlap, conservative visible wording, and dashboard reduced-motion scene fallback checks.
- No backend API, schema, migration, production auth behavior, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Remaining UI migration scope: role-filtered states, refund/collections/banking detail polish, deeper report pages, dense form ergonomics, and accountant review of mobile table/card readability.
- Recommended next prompt: `Role-filtered UI visual QA and remaining route polish`.

## 2026-06-16 LedgerByte UI Stitch frontend foundation hardening

- PR `#53` was merged into `main` before this branch, completing the payment workflow shadcn migration.
- Reconciled the Stitch/MCP frontend foundation pass into a fresh branch without overwriting the merged shadcn wrapper structure.
- Preserved the dashboard-only real Three.js financial-flow scene and kept UAE controlled-beta wording on touched frontend surfaces.
- No backend API, schema, migration, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Browser checks covered selected routes across desktop/tablet/mobile and found no horizontal overflow, but full authenticated visual review remains open because no safe local auth/API fixture was used.
- Remaining UI migration scope: authenticated screenshot QA, credit/debit note and refund surfaces, banking/manual reconciliation detail polish, documents, reports, compliance, settings, and dense mobile table/card states.
- Recommended next prompt: `Authenticated UI visual QA fixture and remaining route hardening`.

## 2026-06-16 LedgerByte UI shadcn transaction workflows

- PR `#51` was merged before this branch, and the observed beta Vercel/Supabase gate evidence is preserved in `CODEX_HANDOFF.md`.
- Completed the next frontend-only shadcn migration pass for sales invoice creation, purchase bill creation, and the shared customer/supplier detail workspace.
- Added reusable transaction line-item and totals wrappers for future dense transaction form migrations.
- No backend API, schema, migration, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, or production compliance claim was added.
- Remaining UI migration scope: customer/supplier payment forms and detail pages, credit/debit note forms, collections/supplier refund surfaces, transaction detail consistency, report pages, settings, and broader authenticated browser coverage.
- Recommended next prompt: `Shadcn payment workflow migration`.

## 2026-06-16 LedgerByte UI shadcn shell/dashboard refresh

- Completed the first frontend-only UI modernization pass using shadcn/ui as the component foundation.
- Added a restrained Three.js dashboard financial-flow visual only on `/dashboard`, with reduced-motion and no-WebGL fallbacks.
- Refreshed the app shell, dashboard, sales invoices list, purchase bills list, and sales invoice workflow guidance/detail surface.
- No backend API, schema, migration, UAE PINT-AE behavior, ZATCA behavior, provider adapter, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, or production compliance claim was added.
- Remaining UI migration scope: secondary operational routes, dense entry forms, report workspaces, settings screens, mobile edge states, role-filtered screenshots, and broader browser visual verification.
- Recommended next prompt: `LedgerByte secondary routes shadcn UI migration`.

## 2026-06-16 UAE PINT-AE scenario fixture validation QA

- Completed local-only scenario fixture expansion for the official local UAE PINT-AE serializer/rule pack.
- Positive fixtures now cover standard tax invoice, commercial invoice `380`, tax credit note with reason/original reference, export receiver not registered in Peppol `9900000099`, deemed supply `9900000097`, buyer not subject `9900000098`, and multi-line invoice values.
- Negative fixtures now cover missing buyer endpoint, invalid TIN/TRN, credit-note missing reason/reference, and unsupported legacy transaction flag.
- Blocked scenarios are documented for reverse charge, allowance/discount invoices, and provider-specific payload contract. Unsupported official values and unsupported model fields remain blocked instead of guessed.
- Local fixture QA summary is not certification, not legal compliance evidence, not provider validation, not FTA reporting, and not production Peppol evidence.
- Remaining UAE blockers: actual provider responses, sandbox docs, provider payload samples, commercial terms, SaaS/ISV permission, security/data residency answers, legal/accountant review, hosted/customer-data proof, broad coverage, and production-go-live approval before any production claim.
- Recommended next prompt: `UAE ASP provider sandbox evidence review`.

## 2026-06-16 UAE PINT-AE official-code TODO review

- Completed the focused official-code TODO review against UAE MoF and OpenPeppol primary sources.
- Resolved commercial invoice type code `380`.
- Resolved predefined endpoint participant identifications for deemed supply (`9900000097`), exports where the receiver is not registered in Peppol (`9900000099`), and buyers not subject to UAE eInvoicing regulations (`9900000098`).
- Resolved official transaction type flag mappings and now serialize them as `cbc:ProfileExecutionID`.
- Provider-specific payload contract remains blocked on provider sandbox docs, credentials, provider responses, and commercial terms.
- No provider has been selected. No real ASP adapter, credential, executable provider base URL, real ASP call, real ASP validation, real ASP submission, FTA reporting, real Peppol transmission, production Peppol claim, production UAE compliance claim, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, real email, or real ZATCA behavior was added.
- Remaining UAE blockers: actual provider responses, sandbox docs, provider payload samples, commercial terms, SaaS/ISV permission, security/data residency answers, legal/accountant review, hosted/customer-data proof, and broad coverage before any production claim.
- Recommended next prompt: `UAE ASP provider sandbox evidence review`.

## 2026-06-16 UAE PINT-AE official serializer rule pack

- Added a local-only official UAE PINT-AE serializer/rule-pack foundation using official `CustomizationID`, `ProfileID`, and UAE endpoint scheme `0235`.
- Kept LedgerByte readiness XML separate and preserved disabled/mock ASP boundaries.
- Compliance-core local validation now records official local serialization attempts and metadata-only archive hashes while clearly stating that ASP validation is not connected.
- Unknown official commercial-invoice type-code mapping, predefined endpoint values, and transaction flag mappings were intentionally guarded and then resolved in the follow-up official-code TODO review where source-backed.
- No provider has been selected. No real ASP adapter, credential, executable provider base URL, real ASP call, real ASP validation, real ASP submission, FTA reporting, real Peppol transmission, production Peppol claim, production UAE compliance claim, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, real email, or real ZATCA behavior was added.
- Remaining UAE blockers: actual provider responses, sandbox docs, provider payload samples, commercial terms, SaaS/ISV permission, security/data residency answers, legal/accountant review, hosted/customer-data proof, and broad coverage before any production claim.
- Follow-up completed by the UAE PINT-AE official-code TODO review.

## 2026-06-15 UAE ASP outreach execution pack

- Added provider-specific outreach drafts, a provider response tracker, and a response evaluation rubric for collecting real sandbox/API/commercial/security evidence before any provider-specific adapter work.
- Provider email drafts now exist for Complyance, ClearTax, Taxilla, EDICOM, and Comarch.
- Tracker rows are seeded for Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, Comarch, TronStride / Aigentrix, Storecove, Sovos, and OpenText.
- No provider has been selected. No real ASP adapter, credential, executable provider base URL, real ASP call, real ASP submission, FTA reporting, real Peppol transmission, production Peppol claim, production UAE compliance claim, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, real email, or real ZATCA behavior was added.
- Remaining UAE blockers: actual provider responses, sandbox docs, commercial terms, SaaS/ISV permission, security/data residency answers, sample payloads, legal/accountant review, hosted/customer-data proof, and broad coverage before any production claim.
- Recommended next prompt: `UAE ASP provider response evidence review`.

## 2026-06-15 UAE ASP provider selection and sandbox contract plan

- Added provider-selection research, weighted scoring, sandbox contract planning, and outreach template docs for a future UAE ASP integration.
- Reviewed official MoF/OpenPeppol sources plus provider-primary/provider-adjacent pages for Complyance, ClearTax, EDICOM, Comarch, Taxilla, Pagero / Thomson Reuters, Storecove, Sovos, OpenText, and TronStride / Aigentrix.
- Recommended first outreach order: Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, Comarch, TronStride / Aigentrix, Storecove, Sovos, OpenText.
- Recommendation is outreach guidance only: start with the most API-friendly MoF-listed providers first and do not implement a real provider until sandbox docs and commercial terms are reviewed.
- This is controlled beta/user-testing only and UAE Peppol/PINT-AE readiness only. No real ASP call, real ASP submission, FTA reporting, real Peppol transmission, production Peppol claim, production UAE compliance claim, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, E2E, real email, or real ZATCA behavior was added.
- Remaining UAE blockers: actual provider outreach responses, sandbox docs, commercial terms, legal/accountant review, hosted/customer-data proof, and broad coverage before any production claim.
- Recommended next prompt: `UAE ASP first-provider outreach evidence and sandbox docs review`.

## 2026-06-15 UAE disabled ASP connector contracts

- Added provider-neutral ASP adapter contracts, normalized provider keys/statuses/capability flags, disabled/default behavior, explicit mock-only behavior, redaction helpers, and future-provider placeholders.
- Added compliance-core API/service surface for provider readiness summary, redacted config testing, local/mock transmission preview, explicit mock submission, and provider status timeline.
- Missing config and disabled config fall back to disabled behavior. Mock requires explicit mock mode. Future provider keys return safe not-implemented results. Arbitrary external provider URLs are rejected.
- Disabled behavior blocks submission and never emits sent, FTA-reported, or buyer-delivered states. Mock accepted/rejected submissions are local/test-only and do not change accounting finalization or compliance document status.
- This is controlled beta/user-testing only and UAE Peppol/PINT-AE readiness only. No real ASP call, real ASP submission, FTA reporting, production Peppol claim, production UAE compliance claim, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, E2E, or real email was added.
- ZATCA remains parked and blocked by default; no ZATCA production behavior, real network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- Remaining UAE blockers: commercial provider selection, provider-specific sandbox contract tests, legal/accountant review, final retention policy, hosted/customer-data proof, and broad coverage before any production claim.
- Follow-up completed by the UAE ASP provider selection and sandbox contract plan.

## 2026-06-15 UAE Peppol/PINT-AE data-entry UX and validation panels

- Added editable UAE organization readiness fields and a settings readiness checklist for TIN/TRN, Peppol participant ID, UAE address, VAT status, ASP selection, and ASP onboarding status.
- Added optional UAE fields to contact/customer/supplier workflows without blocking normal bookkeeping contact creation.
- Added local-only finalized sales invoice and finalized sales credit-note readiness panels with explicit validation actions.
- Reused compliance-core documents, validation results, events, and metadata-only archive records. Validation stores status, hashes, warnings/errors, and metadata where applicable, not sensitive full payloads by default.
- Accounting finalization remains separate from compliance delivery state. Posting, settlement, allocation, VAT math, report math, and PDF behavior were not changed.
- This is controlled beta/user-testing only and UAE Peppol/PINT-AE readiness only. No real ASP call, ASP submission, FTA reporting, production Peppol claim, production UAE compliance claim, hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, E2E, or real email was added.
- ZATCA remains parked and blocked by default; no ZATCA production behavior, real network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- Remaining UAE blockers: disabled/mock ASP connector contract tests, selected provider sandbox contract, legal/accountant review, final retention policy, hosted/customer-data proof, and broad coverage before any production claim.
- Recommended next prompt: `UAE Peppol/PINT-AE disabled ASP connector contract tests`.

## 2026-06-13 Wafeq manual banking reconciliation reports and audit trail polish

- PR `#40` was reverified green/safe and merged into `main` at `9ca5bfe2` before Prompt 9 work began.
- Added read-only reconciliation report summaries for statement-row counts, exception counts, bank-rule counts, linked treasury counts, and accounting status counts where safely derivable.
- Added audit timeline evidence from existing statement imports, review events, rule applications, linked treasury records, journal-posted metadata, operational-only records, and sanitized audit logs.
- Improved CSV export with manual-only wording, account/profile context, exceptions, linked treasury summary, accounting status summary, audit/review event summary, and generated timestamp.
- Added reconciliation detail UI panels for accountant review, exceptions, linked treasury activity, accounting status, missing clearing-account configuration, operational-only records, and audit timeline preview.
- This remains manual banking only. No live bank feed, bank API, credentials, payment initiation, provider abstraction, provider callback, new banking module, VAT/ZATCA/report math change, hosted/customer-data behavior, automatic posting, automatic reconciliation, automatic matching, reconciliation workflow-state change, or production-readiness claim was added.
- Remaining manual Wafeq banking route: banking beta QA/accountant review.
- Recommended next prompt: `Wafeq manual banking beta QA and accountant review readiness`.

## 2026-06-14 Compliance Core + UAE Peppol/PINT-AE readiness foundation

- Added neutral compliance-core lifecycle and archive metadata groundwork without changing accounting finalization or delivery state.
- Added UAE organization/contact readiness data fields and a read-only compliance settings dashboard.
- Added local UAE Peppol/PINT-AE helper package and fixture tests.
- UAE branch can now continue from local data-entry/readiness panels toward disabled/mock ASP connector contract tests.
- Remaining UAE blockers: provider-specific ASP contract, EmaraTax/ASP onboarding evidence, legal retention re-verification, real non-production provider credentials, accountant/legal review, broad tests, and explicit approval before any real network call.
- KSA/ZATCA remains parked as future lifecycle wrapper work and must preserve all no-production/no-network/OTP/CSID/signing/clearance/reporting/PDF-A3 blocks.
- Recommended next prompt at that point: `UAE Peppol/PINT-AE data-entry UX and invoice validation panels`.

## 2026-06-13 Wafeq manual banking clearing-account accounting

- PR `#39` was reverified green/safe and merged into `main` at `4fb018b8` before Prompt 8 work began.
- Added clearing-account configuration for existing organization-owned chart accounts.
- Added preflight and explicit journal posting for safe configured deposit/card settlement cases.
- Deposit posting can move safe configured sources into the bank account without duplicating revenue or mutating AR/AP allocation.
- Credit-card paydowns can post Dr credit-card liability / Cr funding bank; prepaid-card top-ups can post Dr prepaid asset / Cr funding bank.
- Direct received/issued cheque posting remains operational-only until source receivable/payable/payment policy is explicit.
- Card credits/refunds remain operational-only until an offset account policy is explicit.
- Added banking accounting settings UI and accounting status panels on deposit, card settlement, and cheque detail pages.
- Existing operational records are not silently converted, and posting remains explicit after preflight.
- This remains manual banking only. No live bank feed, bank API, credentials, payment initiation, provider abstraction, provider callback, VAT/ZATCA/report change, hosted/customer-data behavior, automatic posting, automatic reconciliation, automatic matching, or production-readiness claim was added.
- Remaining manual Wafeq banking route at that point: reconciliation reports/audit polish, then banking beta QA/accountant review.
- Prompt 8 next prompt at the time: `Wafeq manual banking polish: reconciliation reports and audit trail`.

## 2026-06-13 Wafeq manual banking cheque lifecycle

- PR `#38` was reverified green/safe and merged into `main` at `3b14ed8a` before Prompt 7 work began.
- Added operational cheque instruments for received and issued manual cheques.
- Added draft, received, issued, deposited, cleared, bounced, and voided cheque statuses with explicit API and UI actions.
- Received cheques can be explicitly linked into draft bank deposit batches through cheque source lines.
- Open received cheques can be explicitly matched to same-account, same-currency, same-amount credit statement rows; open issued cheques can be explicitly matched to debit rows.
- Closed reconciliation periods block cheque match, unmatch, and linked void changes.
- Added `/bank-accounts/[id]/cheques` list/detail workspaces and on-demand statement transaction review links for candidate cheques.
- Journal-backed cheque clearing remains open because cheque-in-hand, outstanding-cheque, and clearing-account classifications need explicit accounting design before posting can be safely implemented.
- This remains manual banking only. No live bank feed, bank API, credentials, payment initiation, provider abstraction, cheque printing, cheque book inventory, VAT/ZATCA/report change, hosted/customer-data behavior, or production-readiness claim was added.
- Remaining manual Wafeq banking route: clearing-account accounting design for deposits/cards/cheques, reconciliation reports/audit polish, and banking beta QA/accountant review.
- Recommended next prompt: `Wafeq manual banking accounting: clearing-account design for deposits cards and cheques`.

## 2026-06-13 Wafeq banking credit/prepaid card settlement flows

- PR `#37` was reverified green/safe and merged into `main` at `d86c9394` before Prompt 6 work began.
- Added operational card settlements for credit-card paydowns, credit-card credits/refunds, and prepaid-card top-ups.
- Added draft, posted, matched, and voided card-settlement statuses with explicit API and UI actions.
- Posted card settlements can be explicitly matched to one same-account, same-currency, same-amount imported statement row.
- Matching is direction-aware: paydowns/top-ups match funding-account debit rows, while card credits/refunds match card-account credit rows.
- Closed reconciliation periods block card-settlement match, unmatch, and linked void changes.
- Added `/bank-accounts/[id]/card-settlements` list/detail workspaces and on-demand statement transaction review links for candidate card settlements.
- Journal-backed card settlement posting remains open because credit-card liability, prepaid-card asset, and clearing-account classifications need explicit accounting design before posting can be safely implemented.
- This remains manual banking only. No live bank feed, bank API, credentials, payment initiation, cheque printing, cheque book inventory, provider abstraction, card expense management, statement-cycle billing, VAT/ZATCA/report change, hosted/customer-data behavior, or production-readiness claim was added.
- Remaining manual Wafeq banking route: cheque lifecycle, clearing-account accounting design for deposits/cards/cheques, reconciliation reports/audit polish, and banking beta QA/accountant review.
- Recommended next prompt: `Wafeq manual banking accounting: clearing-account design for deposits cards and cheques`.

## 2026-06-13 Wafeq banking bank deposit batches

- PR `#36` was reverified green/safe and merged into `main` at `dcf8a3d1` before Prompt 5 work began.
- Added operational bank deposit batches for grouping receipt-like items into a bank account deposit total.
- Added draft, posted, matched, and voided deposit-batch statuses with explicit API and UI actions.
- Posted deposit batches can be explicitly matched to one same-account, same-currency, same-amount imported statement credit row.
- Closed reconciliation periods block deposit-batch match, unmatch, and linked void changes.
- Added `/bank-accounts/[id]/deposits` list/detail workspaces and on-demand statement transaction review links for candidate deposit batches.
- This is LedgerByte treasury workflow functionality, not a public Wafeq dedicated-module parity claim.
- Journal-backed clearing movement remains open because the repo does not yet have a confirmed undeposited-funds/clearing-account model for customer receipts.
- This remains manual banking only. No live bank feed, bank API, credentials, payment initiation, card settlement, cheque printing, cheque book inventory, provider abstraction, VAT/ZATCA/report change, hosted/customer-data behavior, or production-readiness claim was added.
- Remaining manual Wafeq banking route at that point: card settlement flows, cheque lifecycle, clearing-account accounting design, reconciliation reports/audit polish, and banking beta QA/accountant review.
- Recommended next prompt: `Wafeq banking treasury: credit and prepaid card settlement flows`.

## 2026-06-13 Wafeq banking bank rules engine

- PR `#35` was reverified green/safe and merged into `main` at `44ff1d7a` before Prompt 4 work began.
- Added deterministic bank rules for imported manual statement transactions with organization scope, optional bank account profile scope, priority, enabled/disabled state, safe condition fields, explicit `autoApply: false`, and rule-application audit records.
- Dry-run returns suggestions without mutating statement transactions.
- Explicit apply reuses existing categorize, ignore, and match service behavior; no silent posting, silent ignore, silent reconciliation, or reconciliation workflow-state change was added.
- Added a bank account rules workspace and row-level rule suggestions in the statement transaction review workspace.
- This remains manual banking only. No live bank feed, bank API, credentials, payment initiation, deposits, card settlement, cheque lifecycle, provider abstraction, VAT/ZATCA/report change, hosted/customer-data behavior, or production-readiness claim was added.
- Remaining manual Wafeq banking route at that point: bank deposit batches, card settlement flows, cheque lifecycle, clearing-account accounting design, reconciliation reports/audit polish, and banking beta QA/accountant review.
- Recommended next prompt: `Wafeq banking treasury: bank deposit batches`.

## 2026-06-13 Wafeq banking import duplicate/idempotency/reconciliation safety hardening

- PR `#34` was reverified green/safe and merged into `main` at `43c428f6` before Prompt 3 work began.
- Manual statement imports now have service-level duplicate/idempotency hardening using deterministic row identity and bank-reference-preferred high-confidence matching.
- Preview and import results expose duplicate-in-file, existing duplicate, closed reconciliation overlap, open reconciliation overlap, currency mismatch, importable, skipped, and blocked counts.
- Full import blocks invalid, duplicate, and closed-period rows. Partial import imports safe rows and reports skipped rows explicitly.
- This remains manual banking only. No live bank feed, bank API, credentials, payment initiation, bank rules, deposits, card settlement, cheque lifecycle, provider abstraction, schema migration, reconciliation-state change, or production-readiness claim was added.
- Remaining manual Wafeq banking route at that point: bank rules engine, bank deposit batches, card settlement flows, cheque lifecycle, clearing-account accounting design, reconciliation reports/audit polish, and banking beta QA/accountant review.
- Recommended next prompt: `Wafeq banking automation: bank rules engine`.

## 2026-06-13 Wafeq banking inline statement transaction review workspace

- PR `#33` was reverified green/safe and merged into `main` at `342120a9` before Prompt 2 work began.
- Added the inline statement transaction review workspace on `/bank-accounts/[id]/statement-transactions`.
- Operators can filter all/unmatched/matched/categorized/ignored/needs-review/debit/credit rows, search imported row text, sort by date/amount/status, preview match candidates, match a selected candidate, categorize a row, ignore a row, and keep detail-page review available for exceptions.
- Bulk ignore and bulk categorize are explicit actions that reuse existing single-row APIs and surface partial failures.
- This remains manual banking only. No live bank feed, bank API, credentials, payment initiation, bank rules, deposits, card settlement, cheque lifecycle, provider abstraction, schema migration, reconciliation-state change, or production-readiness claim was added.
- Remaining manual Wafeq banking route at that point: import duplicate/idempotency/reconciliation safety hardening, bank rules, bank deposit batches, card settlement flows, cheque lifecycle, clearing-account accounting design, reconciliation reports/audit polish, and banking beta QA/accountant review.
- Recommended next prompt: `Wafeq banking foundation: import duplicate idempotency and reconciliation safety hardening`.

## 2026-06-12 Wafeq banking XLSX statement import and template UX

- PR `#32` was reverified green/safe and merged into `main` at `0bb4e721` before this lane started.
- Added a downloadable canonical CSV bank statement template and API-side XLSX statement preview/import support.
- XLSX uses the first worksheet, warns for ignored extra worksheets, ignores empty rows, normalizes Excel dates/numeric values, and returns safe malformed-workbook warnings.
- This closes the first Wafeq-style manual banking gap for template-led import, but it does not close production banking readiness.
- No live bank feed, bank API, WIO/Lean/Tarabut integration, payment initiation, bank rules, deposits, cheques, card settlement, schema migration, posting change, reconciliation state change, hosted/customer-data proof, or production readiness claim was added.
- Remaining manual Wafeq banking route after Prompt 1 was inline statement transaction review workspace, import duplicate/idempotency/reconciliation safety hardening, bank rules, bank deposit batches, card settlement flows, cheque lifecycle, clearing-account accounting design, reconciliation reports/audit polish, and banking beta QA/accountant review.
- Prompt 1 next prompt at the time: `Wafeq banking foundation: inline statement transaction review workspace`.

## 2026-06-12 Production trust foundation audit and readiness gate

- PR `#29` was merged into `main` at `4e00557f` before this lane started.
- Added `docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md` plus the static gate at `corepack pnpm production:trust-foundation-gate -- --json --strict`.
- The gate is non-mutating and repo-only. It proves documentation honesty, not implementation completeness.
- Current remaining production-trust blockers are hosted backup/PITR proof, hosted restore drill proof, object-storage restore proof, monitoring/alerting, runtime DB role and RLS/Data API hardening, MFA/session hardening, immutable audit export strategy, and billing/legal/support ownership.
- Recommended next prompt at the time: `Production trust implementation ticket 1: object storage proof plan and safe non-production validation`.

## 2026-06-12 Object storage proof validation

- PR `#30` was merged into `main` at `4411634c` before this lane started.
- Added `scripts/object-storage-proof-validate.cjs`, `scripts/object-storage-proof-validate.test.cjs`, and package scripts `storage:proof-validate` plus `test:storage-proof-validate`.
- Added `docs/production/OBJECT_STORAGE_PROOF_PLAN.md`.
- The new proof is intentionally safe and non-production:
  - dry-run status is `OBJECT_STORAGE_PROOF_DRY_RUN_READY`,
  - local mock-cycle status is `OBJECT_STORAGE_MOCK_CYCLE_PASSED`,
  - no network calls, real bucket mutations, secret-value output, or customer-file handling occur.
- The proof does not make LedgerByte production-ready or object-storage production-proven. Real non-production bucket validation, object-storage backup proof, object-storage restore proof, generated-document runtime object-storage writes, signed URLs, lifecycle/retention/legal-hold enforcement, malware scanning, and migration/rollback proof remain open.
- Recommended next prompt: `Production trust implementation ticket 2: backup and restore proof harness`.

## 2026-06-12 Backup and restore proof harness

- PR `#31` was reverified green/safe and merged into `main` at `a5b506d9` before this lane started.
- Added `scripts/backup-restore-proof-harness.cjs`, `scripts/backup-restore-proof-harness.test.cjs`, and package scripts `backup:restore-proof` plus `test:backup-restore-proof`.
- Added `docs/production/BACKUP_RESTORE_PROOF_HARNESS.md`.
- The new proof is intentionally safe and non-production:
  - dry-run status is `BACKUP_RESTORE_PROOF_DRY_RUN_READY`,
  - local mock-cycle status is `BACKUP_RESTORE_MOCK_CYCLE_PASSED`,
  - no network calls, database calls, env-secret reads, real backup/restore commands, or customer-data handling occur.
- The proof does not make LedgerByte production-ready, paid SaaS ready, backup-ready, restore-ready, or disaster-recovery ready. Hosted Supabase/Postgres backup/PITR proof, hosted restore-drill proof, object-storage backup proof, object-storage restore proof, RPO/RTO review, monitoring, and incident ownership remain open.
- Recommended next prompt: `Production trust implementation ticket 3: monitoring and runtime health proof`.

## 2026-06-12 Banking 2.0 Parser QA And Match Suggestion Foundation

- Added parser QA and deterministic match-suggestion foundation on branch `codex/banking-parser-qa-match-suggestion-foundation`.
- Parser QA now covers more common sanitized CSV/JSON/OFX/CAMT/MT940 edge cases and safe error behavior, but this does not certify any target bank.
- Match suggestions remain non-mutating suggestions only. No automatic matching, posting, categorization, reconciliation, or journal creation was added.
- Remaining banking roadmap items are live feeds, certified target-bank parser coverage, raw-file archive execution, transfer-fee handling, FX handling, hosted/customer-data proof, broad E2E/smoke/full-test coverage, and accountant sign-off.
- Recommended next prompt from that lane: `VAT return truthfulness and filing-export foundation`.

## 2026-06-11 ZATCA PDF-A3 Approval Gate

- PR `#16` `ZATCA clearance reporting approval gate` was verified live and merged into `main` at `edc306e6` before this new branch was cut.
- Added `docs/zatca/PDF_A3_APPROVAL_GATE.md`, `docs/zatca/PDF_A3_APPROVAL_RESULTS.md`, `scripts/zatca-pdf-a3-approval-gate.cjs`, and `scripts/zatca-pdf-a3-approval-gate.test.cjs`.
- Current status is `PDF_A3_APPROVAL_BLOCKED` by default.
- The exact approval phrase with `--metadata-only` is recognized only for metadata confirmation and returns `PDF_A3_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No PDF-A3 was generated, no XML was embedded, no signed XML was embedded, no file was persisted, no object-storage/database/document-store write was executed, no invoice/customer data was read, and no signing/QR/ZATCA/clearance/reporting/production-compliance behavior was enabled.
- Remaining ZATCA gaps now explicitly include actual PDF-A3 generation, actual XML embedding, archive persistence, PDF/XML body handling, object-storage/database/document-store writes, and production compliance launch.
- Recommended next prompt: `ZATCA production compliance launch gate`.

## 2026-06-11 ZATCA Clearance Reporting Approval Gate

- PR `#15` `ZATCA signing and Phase 2 QR approval gate` was verified live and merged into `main` at `154bbf82` before this new branch was cut.
- Added `docs/zatca/CLEARANCE_REPORTING_APPROVAL_GATE.md`, `docs/zatca/CLEARANCE_REPORTING_APPROVAL_RESULTS.md`, `scripts/zatca-clearance-reporting-approval-gate.cjs`, and `scripts/zatca-clearance-reporting-approval-gate.test.cjs`.
- Current status is `CLEARANCE_REPORTING_APPROVAL_BLOCKED` by default.
- The exact approval phrase with `--metadata-only` is recognized only for metadata confirmation and returns `CLEARANCE_REPORTING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No clearance was executed, no reporting was executed, no invoice or note was submitted, no ZATCA network call was made, no request body was created, no response body was processed, no CSID/token/secret/certificate/private-key was used, and no signing/QR/PDF-A3/production-compliance behavior was enabled.
- Remaining ZATCA gaps now explicitly include actual clearance execution, actual reporting execution, actual invoice/note submission, request/response handling, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA PDF-A3 approval gate`.

## 2026-06-11 ZATCA Signing And Phase 2 QR Approval Gate

- PR `#14` `ZATCA sandbox CSID storage approval gate` was verified live and merged into `main` at `ce2489a5` before this new branch was cut.
- Added `docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_GATE.md`, `docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_RESULTS.md`, `scripts/zatca-signing-phase2-qr-approval-gate.cjs`, and `scripts/zatca-signing-phase2-qr-approval-gate.test.cjs`.
- Current status is `SIGNING_PHASE2_QR_APPROVAL_BLOCKED` by default.
- The exact approval phrase with `--metadata-only` is recognized only for metadata confirmation and returns `SIGNING_PHASE2_QR_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No signing was executed, no QR was generated, no signed XML was generated, no private key/certificate/CSID was used, no SDK signing command was executed, and no ZATCA network/clearance/reporting/PDF-A3/production-compliance behavior was enabled.
- Remaining ZATCA gaps now explicitly include actual signing execution, actual Phase 2 QR generation, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA clearance reporting approval gate`.

## 2026-06-11 ZATCA Sandbox CSID Storage Approval Gate

- PR `#13` `ZATCA sandbox response custody approval gate` was verified live and merged into `main` at `db8f058c` before this new branch was cut.
- Added `docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-csid-storage-approval-gate.cjs`, and `scripts/zatca-sandbox-csid-storage-approval-gate.test.cjs`.
- Current status is `SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED` by default.
- The exact approval phrase with `--metadata-only` is recognized only for metadata confirmation and returns `SANDBOX_CSID_STORAGE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No custody provider was executed, no CSID/token/secret/certificate/private-key/CSR was stored, no database/secret-manager/KMS/HSM/object-storage write was executed, and no request/response/network/adapter/signing/clearance/PDF-A3/production-compliance behavior was enabled.
- Remaining ZATCA gaps now explicitly include approved custody-provider execution, signing, Phase 2 QR, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA signing and Phase 2 QR approval gate`.

## 2026-06-11 ZATCA Sandbox Response Custody Approval Gate

- PR `#12` `ZATCA sandbox response processing approval gate` was verified live and merged into `main` at `d15884f8` before this new branch was cut.
- Added `docs/zatca/SANDBOX_RESPONSE_CUSTODY_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_RESPONSE_CUSTODY_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-response-custody-approval-gate.cjs`, and `scripts/zatca-sandbox-response-custody-approval-gate.test.cjs`.
- Current status is `SANDBOX_RESPONSE_CUSTODY_APPROVAL_BLOCKED` by default.
- The exact approval phrase with `--metadata-only` is recognized only for metadata confirmation and returns `SANDBOX_RESPONSE_CUSTODY_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No network request was executed, no adapter was executed, no request body was created, no response body was received, no response body was processed, no response custody was stored, no custody provider was executed, no secret-manager write was executed, no database write was executed, no object-storage write was executed, no real OTP was included, no CSID was requested, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Remaining ZATCA gaps now explicitly include sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox CSID storage approval gate`.

## 2026-06-11 ZATCA Sandbox Response Processing Approval Gate

- PR `#11` `ZATCA sandbox network request approval gate` was verified live and merged into `main` at `13bf16a5` before this new branch was cut.
- Added `docs/zatca/SANDBOX_RESPONSE_PROCESSING_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_RESPONSE_PROCESSING_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-response-processing-approval-gate.cjs`, and `scripts/zatca-sandbox-response-processing-approval-gate.test.cjs`.
- Current status is `SANDBOX_RESPONSE_PROCESSING_APPROVAL_BLOCKED` by default.
- The exact approval phrase with `--metadata-only` is recognized only for metadata confirmation and returns `SANDBOX_RESPONSE_PROCESSING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No network request was executed, no adapter was executed, no request body was created, no response body was received, no response body was processed, no response custody was stored, no real OTP was included, no CSID was requested, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Remaining ZATCA gaps now explicitly include response custody approval, sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox response custody approval gate`.

## 2026-06-11 ZATCA Sandbox Network Request Approval Gate

- PR `#9` `ZATCA manual OTP capture approval gate` merged into `main` at `a4190941`, and PR `#10` `ZATCA request body creation approval gate` merged into `main` at `feb32ccc`, before this new branch was cut.
- Added `docs/zatca/SANDBOX_NETWORK_REQUEST_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_NETWORK_REQUEST_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-network-request-approval-gate.cjs`, and `scripts/zatca-sandbox-network-request-approval-gate.test.cjs`.
- Current status is `SANDBOX_NETWORK_REQUEST_APPROVAL_BLOCKED` by default.
- The exact approval phrase with `--metadata-only` is recognized only for metadata confirmation and returns `SANDBOX_NETWORK_REQUEST_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No network request was executed, no adapter was executed, no request body was created, no response body was processed, no real OTP was included, no CSID was requested, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Remaining ZATCA gaps now explicitly include response processing approval, response custody approval, sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox response processing approval gate`.

## 2026-06-11 ZATCA Sandbox Request Body Creation Approval Gate

- PR `#9` and PR `#10` are now merged into `main`; the request-body gate is no longer a stacked/unmerged base blocker for later ZATCA governance lanes.
- Added `docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_GATE.md`, `docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_RESULTS.md`, `scripts/zatca-sandbox-request-body-creation-approval-gate.cjs`, and `scripts/zatca-sandbox-request-body-creation-approval-gate.test.cjs`.
- Current status is `REQUEST_BODY_CREATION_APPROVAL_BLOCKED` by default.
- The exact approval phrase with `--metadata-only` is recognized only for metadata confirmation and returns `REQUEST_BODY_CREATION_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No request body was created, no real OTP was included, no CSID was requested, no ZATCA network call was made, no response body was processed, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Remaining ZATCA gaps now explicitly include real sandbox network request approval, response processing approval, response custody approval, sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox network request approval gate`.

## 2026-06-11 ZATCA Manual OTP Capture Approval Gate

- Added `docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_GATE.md`, `docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_RESULTS.md`, `scripts/zatca-manual-otp-capture-approval-gate.cjs`, and `scripts/zatca-manual-otp-capture-approval-gate.test.cjs`.
- Current status is `MANUAL_OTP_CAPTURE_APPROVAL_BLOCKED` by default.
- The exact approval phrase with `--metadata-only` is recognized only for metadata confirmation and returns `MANUAL_OTP_CAPTURE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- No OTP was captured, no OTP value was stored, no OTP value was shared with Codex, no CSID was requested, no ZATCA network call was made, no request body was created, no response body was processed, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Remaining ZATCA gaps now explicitly include request body creation approval, real sandbox network request approval, response processing approval, response custody approval, sandbox CSID storage by an approved custody provider, signing, clearance/reporting, PDF-A3, and production compliance.
- Recommended next prompt: `ZATCA sandbox request body creation approval gate`.

## 2026-06-06 ZATCA Sandbox CSID Preflight Guard

- Added `scripts/zatca-sandbox-csid-preflight.cjs`, `scripts/zatca-sandbox-csid-preflight.test.cjs`, `docs/zatca/SANDBOX_CSID_PREFLIGHT_GUARD.md`, and `docs/zatca/SANDBOX_CSID_PREFLIGHT_RESULTS.md`.
- Current status is `PREFLIGHT_BLOCKED`; safe planning prerequisites are present, but key custody, CSID response custody, sandbox adapter execution, OTP approval, compliance CSID request approval, and production signing remain blocked.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no private-key/certificate/CSID/token/header/request/response body was exposed, and production signing remains disabled.
- Remaining ZATCA gaps include sandbox OTP/CSID approval planning, compliance CSID lifecycle, production CSID lifecycle, production key custody, production Phase 2 QR proof, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official reviews, and repeatable SDK CI.
- Completed follow-up: `ZATCA sandbox OTP and compliance CSID approval plan`.
- Recommended next prompt: `ZATCA sandbox CSID request execution guard`.

## 2026-06-06 ZATCA Sandbox OTP And Compliance CSID Approval Plan

- Added `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_PLAN.md`, `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`, and `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RESULTS.md`.
- Extended the sandbox CSID preflight guard with planning-only approval phrase recognition.
- Observed status is `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`; approval is recognized only for planning metadata.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no secret/body material was exposed, and no production signing/compliance was enabled.
- Remaining ZATCA gaps include key custody implementation, CSID response custody approval, sandbox CSID request execution guard, real sandbox adapter execution, compliance invoice checks, production CSID lifecycle, production Phase 2 QR proof, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official reviews, and repeatable SDK CI.
- Recommended next prompt: `ZATCA sandbox CSID request execution guard`.

## 2026-06-07 ZATCA CSID Response Custody Implementation Plan

- Added `docs/zatca/CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md`, `docs/zatca/CSID_RESPONSE_CUSTODY_GUARD.md`, `docs/zatca/CSID_RESPONSE_CUSTODY_RESULTS.md`, and the standalone guard at `scripts/zatca-csid-response-custody-guard.cjs`.
- Current custody guard status is `CUSTODY_METADATA_SIMULATION_BLOCKED`; the provider boundary and metadata-only model are visible, but provider storage is disabled and legacy raw PEM-capable fields remain blockers.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no real response body was processed, no DB connection or write was attempted, no token/secret/certificate body was persisted, no env values were printed, and no secrets/bodies were exposed.
- Remaining ZATCA gaps include approved custody provider implementation, sandbox adapter execution approval, OTP capture approval, CSID request approval, compliance invoice checks, production CSID lifecycle, production Phase 2 QR proof, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official reviews, and repeatable SDK CI.
- Completed follow-up: `ZATCA sandbox adapter execution approval plan`.

## 2026-06-07 ZATCA Sandbox Adapter Execution Approval Plan

- Added `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`, `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`, `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md`, and the standalone guard at `scripts/zatca-sandbox-adapter-execution-approval.cjs`.
- Current adapter approval status is `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`; `--execute-adapter` remains `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no request body was created, no response body was processed, no DB connection or write was attempted, no env values were printed, and no secrets/bodies were exposed.
- Remaining ZATCA gaps include mock-to-real adapter boundary tests, approved custody provider implementation, OTP capture approval, CSID request approval, compliance invoice checks, production CSID lifecycle, production Phase 2 QR proof, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official reviews, and repeatable SDK CI.
- Completed follow-up: `ZATCA sandbox adapter mock-to-real boundary test plan`.

## 2026-06-07 ZATCA Sandbox Adapter Mock-to-Real Boundary Test Plan

- Added `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md`, `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md`, `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md`, and the standalone static guard at `scripts/zatca-sandbox-adapter-boundary-check.cjs`.
- Current boundary status is `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`; mock, disabled, and sandbox adapter boundaries are detected by static inspection only.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no mock adapter was executed, no request body was created, no response body was processed, no DB connection or write was attempted, no env values were printed, and no secrets/bodies were exposed.
- Remaining ZATCA gaps include no-network adapter contract tests, approved custody provider implementation, OTP capture approval, CSID request approval, compliance invoice checks, production CSID lifecycle, production Phase 2 QR proof, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official reviews, and repeatable SDK CI.
- Completed follow-up: `ZATCA sandbox adapter no-network contract tests`.

## 2026-06-07 ZATCA Sandbox Adapter No-Network Contract Tests

- Added `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_TESTS.md`, `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md`, and the standalone contract guard at `scripts/zatca-sandbox-adapter-no-network-contract.cjs`.
- Current contract status is `NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS`; mock, disabled, and sandbox adapter contracts are detected by static inspection with a local no-network trap.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no mock or disabled adapter was executed, no request body was created, no response body was processed, no DB connection or write was attempted, no env values were printed, and no secrets/bodies were exposed.
- Remaining ZATCA gaps include sandbox CSID dry-run request body schema planning, approved custody provider implementation, OTP capture approval, CSID request approval, compliance invoice checks, production CSID lifecycle, production Phase 2 QR proof, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official reviews, and repeatable SDK CI.
- Recommended next prompt: `ZATCA sandbox CSID dry-run request body schema plan`.

## 2026-06-06 ZATCA Key Custody and CSID Lifecycle Design

- Added `docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`, `docs/zatca/CSID_LIFECYCLE_CHECKLIST.md`, and `docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md`.
- The design reconciles the current local dummy signing evidence, official repo-local ZATCA references, legacy EGS PEM-capable fields, metadata-only CSID custody records, disabled custody provider, and blocked sandbox/production adapters.
- Recommended custody model: KMS/HSM/external signing or equivalent custody for production private keys; secrets manager may be a controlled interim only for non-production/sandbox CSID token/secret/certificate custody after explicit approval.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no private-key/certificate body was exposed, no production credentials were generated, and production signing remains disabled.
- Completed follow-up: `ZATCA sandbox CSID preflight guard`.
- Remaining ZATCA gaps include sandbox OTP/CSID approval planning, compliance CSID lifecycle, production CSID lifecycle, production key custody, production Phase 2 QR proof, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official reviews, and repeatable SDK CI.
- Completed follow-up: `ZATCA sandbox OTP and compliance CSID approval plan`.
- Recommended next prompt: `ZATCA sandbox CSID request execution guard`.

## 2026-06-06 ZATCA Preparation and Key Custody Sprint

- Added ZATCA preparation documents for environment separation, key custody decision drafting, invoice eligibility, audit evidence, sandbox onboarding, and official SDK validation readiness.
- The existing ZATCA readiness endpoint/settings page now exposes read-only preparation gates and still reports production compliance, real network calls, signing, clearance/reporting, and PDF/A-3 as disabled/not implemented.
- Remaining ZATCA gaps include final key custody decision, real KMS/HSM or equivalent implementation, sandbox OTP access, sandbox CSID onboarding, signed XML, Phase 2 QR, clearance, reporting, PDF/A-3, error/retry queue, official tax/accountant/ZATCA specialist review, repeatable SDK CI, and production operations gates.
- This roadmap update does not change production posture, Vercel/Supabase settings, production hosting, production ZATCA, real network calls, OTP handling, CSID requests, key generation/storage, signing, clearance/reporting, PDF/A-3, official VAT filing, email/payment behavior, backup/restore, object storage, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-06 Official ZATCA SDK Validation Pipeline Sprint

- Added a repeatable local/no-network SDK validation wrapper at `corepack pnpm zatca:sdk-validate-local`.
- Added `docs/zatca/ZATCA_SDK_FIXTURE_REGISTRY.md`, `docs/zatca/ZATCA_SDK_VALIDATION_EVIDENCE_FORMAT.md`, and `docs/zatca/evidence/` for metadata-only validation evidence.
- The existing ZATCA readiness endpoint/settings page now exposes read-only SDK validation pipeline gates while keeping production compliance, real network calls, signing, clearance/reporting, and PDF/A-3 disabled.
- Current local wrapper run finds SDK `238-R3.4.8` but blocks on default Java `17.0.16`; validation needs Java 11-14 or `ZATCA_SDK_JAVA_BIN` pointing to a compatible runtime.
- Remaining ZATCA gaps include Java 11-14 runtime pinning, generated credit-note fixture coverage, generated invoice fixture execution, CI/Docker SDK validation, final key custody decision, sandbox OTP access, sandbox CSID onboarding, signed XML, Phase 2 QR, clearance, reporting, PDF/A-3, error/retry queue, official tax/accountant/ZATCA specialist review, and production operations gates.
- This roadmap update does not change production posture, Vercel/Supabase settings, production hosting, production ZATCA, real network calls, OTP handling, CSID requests, key generation/storage, signing, clearance/reporting, PDF/A-3, official VAT filing, email/payment behavior, backup/restore, object storage, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-06 ZATCA SDK CI Readiness Guard Sprint

- Added the no-network CI readiness guard at `corepack pnpm zatca:sdk-ci-readiness -- --plan --no-network --json` plus targeted Node tests.
- Added `docs/zatca/ZATCA_SDK_CI_RUNNER_PLAN.md` with the runner options, blocker status, documentation-only workflow sketch, and artifact policy.
- Current status is `CI_BLOCKED_MISSING_SDK_REFERENCE`: the official SDK bundle exists locally but is ignored under `reference/` and cannot be assumed available in a fresh GitHub Actions checkout. Default Java 17 is also unsupported.
- PR CI remains non-ZATCA; SDK validation is not enabled in `.github/workflows/pr-verification.yml`.
- Remaining ZATCA gaps include approved SDK acquisition/reference policy, Java 11-14 CI runtime, metadata-only artifact retention approval, final key custody decision, sandbox OTP/CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, error/retry queue, official reviews, and production operations gates.
- This roadmap update does not change production posture, Vercel/Supabase settings, production hosting, production ZATCA, real network calls, OTP handling, CSID requests, signing, clearance/reporting, PDF/A-3, official VAT filing, email/payment behavior, backup/restore, object storage, or customer-data handling.

## 2026-06-06 ZATCA Local Signed XML Validation Plan Sprint

- Added `docs/zatca/LOCAL_SIGNED_XML_VALIDATION_PLAN.md` and the metadata-only guard at `corepack pnpm zatca:local-signed-xml-plan -- --plan --no-network --json`.
- The guard remains blocked by default and does not execute SDK signing, QR, hash, signed XML validation, CSID/OTP, network, clearance/reporting, PDF/A-3, deploy, migration, seed, reset, delete, or email behavior.
- Remaining ZATCA gaps are unchanged: explicit future approval for any dummy signing dry-run, Java 11-14 runtime, SDK reference policy, key custody, sandbox OTP/CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, secure signed artifact storage, official reviews, and production operations gates.

## 2026-06-03 Sales Quote / Proforma Workflow Sprint

- Added the base non-posting sales quote/proforma workflow: quote numbering, customer selection, account-coded lines, tax exclusive/inclusive/no-tax totals, lifecycle actions, customer non-posting activity visibility, and accepted-quote conversion into a draft sales invoice.
- Base quotes/proformas are no longer a missing Sales/AR workflow. Remaining Sales/AR gaps include quote/proforma PDF/archive, recurring invoices, delivery notes, real customer email sending, online acceptance/payment, collections automation, broad browser E2E, hosted/customer-data proof, and accountant sign-off.
- The sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, official VAT filing, payment gateways, email providers, backup/restore, object storage migration, or customer-data handling.

## 2026-06-04 Quote PDF / Archive Sprint

- Added safe Sales Quote PDF output and generated-document archive support for non-posting sales quotes/proformas.
- Base quote/proforma PDF/archive is no longer a missing Sales/AR workflow. Remaining Sales/AR gaps include recurring invoices, delivery notes, real customer email sending, online quote acceptance/payment, collections automation, broad browser E2E, hosted/customer-data proof, and accountant sign-off.
- The PDF/archive sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object storage migration, or customer-data handling.

## 2026-06-04 Focused Quote Workflow Browser Sprint

- Added focused mocked Playwright browser coverage for sales quote list, create, detail, edit, lifecycle, PDF download, generated-document archive metadata/download, conversion to draft invoice, and customer non-posting quote activity.
- Quote-specific browser workflow coverage for the base create/edit/lifecycle/PDF/archive/convert/customer-activity path is no longer open. Remaining Sales/AR gaps include recurring invoices, delivery notes, real customer email sending, online quote acceptance/payment, collections automation, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off.
- The browser sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object storage migration, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 Recurring Invoices Sprint

- Added non-posting recurring invoice templates with `REC-` numbering, account-coded lines, tax exclusive/inclusive/no-tax totals, weekly/monthly/quarterly/yearly schedule preview, lifecycle actions, customer non-posting activity visibility, and manual generation into draft sales invoices.
- Base recurring invoice templates are no longer a missing Sales/AR workflow. Remaining Sales/AR gaps include delivery notes, automatic recurring scheduler, real customer email sending, online quote acceptance/payment, collections automation, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off.
- The sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object storage migration, background workers, automatic scheduling, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 Focused Recurring Invoice Browser Workflow Sprint

- Added focused mocked Playwright browser coverage for recurring invoice list, create, detail, edit, schedule preview, tax modes, account-coded lines, lifecycle actions, restricted-role behavior, duplicate generation blocking, manual draft-invoice generation, generated invoice link, global create/search behavior, and customer non-posting activity.
- Recurring invoice browser workflow coverage for the base list/new/detail/edit/preview/generate/customer-activity path is no longer open. Remaining Sales/AR gaps include delivery notes, automatic recurring scheduler, real customer email sending, online quote acceptance/payment, collections automation, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off.
- The browser sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object storage migration, background workers, automatic scheduling, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 Delivery Notes Sprint

- Added non-posting delivery notes with `DN-` numbering, draft/edit, issue, mark delivered, cancel, void, customer/source invoice/accepted quote links, optional backend sales-stock-issue reference support, safe Delivery Note PDF/archive output, customer non-posting fulfillment activity, navigation, global create/search exposure, and targeted API/frontend tests.
- Base delivery notes are no longer a missing Sales/AR workflow. Remaining Sales/AR gaps include focused delivery-note browser workflow coverage, optional stock-issue source UI, automatic recurring scheduler, real customer email sending, online quote acceptance/payment, collections automation, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off.
- The sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, automatic inventory movement, logistics/carrier integration, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 Focused Delivery Note Browser Workflow Sprint

- Added focused mocked Playwright browser coverage for delivery-note list, create, detail, edit, issue, mark delivered, PDF/archive metadata/download, customer non-posting activity, source invoice/accepted quote copy paths, restricted permissions, global create, and global search.
- Delivery-note browser workflow coverage for the base list/new/detail/edit/lifecycle/PDF/archive/source/customer-activity path is no longer open. Remaining Sales/AR gaps before the source-visibility follow-up include optional stock-issue source UI, reverse source-document delivery-note panels, automatic recurring scheduler, real customer email sending, online quote acceptance/payment, collections automation, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off.
- The browser sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, automatic inventory movement, logistics/carrier integration, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 Delivery Note Source Visibility and Wording Sprint

- Added related delivery-note panels to source sales invoice and accepted quote detail pages, plus clearer source invoice/source quote/reference-only stock issue cards on delivery-note detail.
- Reverse source-document delivery-note panels are no longer open for the base invoice/quote detail workflow. Remaining Sales/AR gaps include optional stock-issue source UI, automatic recurring scheduler, real customer email sending, online quote acceptance/payment, collections automation, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off.
- The wording sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, automatic inventory movement, logistics/carrier integration, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 Collections Workflow Sprint

- Added a controlled non-payment-gateway Sales/AR collections workflow with `COL-` case numbering, customer and outstanding-invoice links, lifecycle actions, activities, promises to pay, disputes, holds, workspace summary cards, invoice/customer detail visibility, global create/search exposure, and audit logging.
- The base collections workspace is no longer a missing Sales/AR workflow. Remaining Sales/AR gaps include optional stock-issue source UI, automatic recurring scheduler, real customer email sending, scheduled collection reminders, payment links/payment gateway, online quote acceptance/payment, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off.
- The collections sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, invoice accounting, AR balances, VAT/report math, automatic inventory movement, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 Focused Collections Browser Workflow Sprint

- Added focused mocked Playwright browser coverage for collections list/new/detail/edit, lifecycle actions, activity timeline, promise/dispute/hold/start/close states, invoice detail collection visibility, customer collections visibility, restricted permissions, global create, and global search.
- Collections browser workflow coverage for the base list/new/detail/edit/lifecycle/activity/customer/invoice/global-create/global-search path is no longer open. Remaining Sales/AR gaps include optional stock-issue source UI, automatic recurring scheduler, real customer email sending, scheduled collection reminders, payment links/payment gateway, online quote acceptance/payment, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off.
- The browser sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, invoice accounting, AR balances, VAT/report math, automatic inventory movement, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-04 Focused Dashboard / Accountant Threshold Review Sprint

- Added a documented Sales/AR dashboard attention threshold policy covering overdue invoices, collection follow-ups, quotes awaiting action, recurring templates due for manual generation, generated draft invoices, delivery notes, top AR customers, empty states, permissions, and read-only safety boundaries.
- Dashboard threshold definitions and top-row ordering are no longer implicit magic numbers. Remaining dashboard/Sales/AR gaps include accountant/product sign-off on the documented policy, customizable dashboard widgets, broader deployed E2E with safe seeded data, hosted/customer-data proof, and production hardening.
- The threshold review sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, invoice accounting, AR balances, VAT/report math, automatic recurring generation, collection reminder sending, or inventory movement.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-05 Supplier/AP Dashboard Improvements Sprint

- Added a read-only Supplier/AP dashboard API and `/purchases/ap-dashboard` workspace that summarize supplier payables, due bills, open purchase orders, purchase matching exceptions, matching reviews, purchase returns, valuation variance previews, and recent supplier activity.
- Enhanced supplier detail with a Supplier AP Summary panel and split supplier activity into financial posting and operational/non-posting sections.
- AP attention definitions and row caps are documented in `docs/development/SUPPLIER_AP_DASHBOARD_ATTENTION_POLICY.md`. Remaining AP dashboard gaps include accountant/product sign-off on the attention thresholds, broader browser workflow QA, hosted/customer-data proof, and production hardening.
- The sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, AP posting behavior, bill balances, purchase return posting, inventory quantities/valuation, variance posting, landed cost, FIFO, or supplier email.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-05 Inventory Returns Integration Sprint

- Added explicit operational purchase return stock-out movement preview and posting for safe receipt-linked inventory-tracked lines.
- Purchase-return inventory movement is no longer completely missing for the safe purchase-return stock-out case; it is user-triggered, duplicate-protected, permission-gated, audited, and linked back to purchase return lines.
- Sales-side return stock-in remains deferred because existing credit notes do not safely identify returned-stock warehouse/source movement. Remaining inventory-return gaps include a dedicated returned-goods/sales-return source document, movement reversal, accountant review before accounting automation, landed cost, FIFO/cost layers, broad browser workflow QA, hosted/customer-data proof, and production hardening.
- The sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, AP/AR posting behavior, bill/invoice balances, debit note/refund automation, variance posting, landed cost, FIFO, or supplier/customer email.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-06 Sales Inventory Returns Sprint

- Added a dedicated operational sales inventory return document with `SRN-` numbering, customer/source links, draft/submit/approve/receive/cancel/void lifecycle, read-only stock-in preview, and explicit `SALES_RETURN_IN` posting for validated tracked lines.
- The prior sales-side return stock-in deferral is now addressed for the safe dedicated-document path. Credit notes and customer refunds remain separate accounting/cash documents and are not used to infer warehouse movement by themselves.
- Remaining inventory-return gaps include return movement reversal, source visibility panels on delivery note/invoice/stock issue detail pages, focused browser workflow QA, accountant-approved COGS reversal policy, landed cost, FIFO/cost layers, hosted/customer-data proof, and production hardening.
- The sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, AR posting behavior, invoice balances, credit note/refund automation, COGS reversal, landed cost, FIFO, or customer email.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-06 Landed Cost Preview Sprint

- Added read-only landed cost preview at `/inventory/landed-cost` and API endpoints under `/inventory/landed-cost` for purchase receipt and purchase bill source lines.
- Users can model freight, customs/duty, insurance, handling, brokerage, storage, and other estimated landed costs with by-value, by-quantity, equal, or manual allocation.
- Purchase order source preview is intentionally blocked in this sprint pending accountant-approved policy for unreceived/unbilled source modeling.
- Source detail links were added from purchase receipt detail, purchase bill detail, Inventory Valuation Variance Preview, and Supplier/AP Dashboard. Supplier/AP Dashboard now exposes a simple read-only landed cost preview availability signal.
- This sprint is preview-only. It does not persist landed cost previews, create landed cost documents, post journals, change inventory valuation, update moving average, create FIFO/cost layers, change AP or bill balances, affect VAT/financial reports, create supplier payments, create debit notes/refunds, send email, call ZATCA, run hosted/customer-data workflows, or change production posture.
- Remaining landed-cost gaps include saved document lifecycle, accountant-approved posting policy, inventory valuation update design, FIFO/cost-layer treatment, reversal/void behavior, multi-currency handling, weight/volume allocation, focused browser QA, hosted/customer-data proof, and production hardening.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-06 FIFO Cost-Layer Groundwork Sprint

- Added read-only FIFO cost-layer preview at `/inventory/fifo-preview` and API endpoints under `/inventory/fifo-preview`.
- FIFO preview reconstructs possible layers from existing inventory movements by item, warehouse, and as-of date; outbound movements consume oldest available preview layers first.
- Missing or imperfect movement data is surfaced through preview warnings/blockers instead of invented precision.
- Source links were added from inventory valuation, balances, stock movements, warehouse detail guidance, landed cost preview, and valuation variance preview where existing permissions allow them.
- This sprint is preview-only. It does not persist active FIFO layers, switch valuation method, update moving average, update stock valuation, create journals, create or reverse COGS, affect AP/AR, affect VAT, call ZATCA, change financial statements, mutate stock movements, mutate purchase/sales documents, post landed cost, post variances, run hosted/customer-data workflows, or change production posture.
- Remaining FIFO gaps include active FIFO policy, persistent cost-layer ledger design, historical movement backfill/migration design, accountant review, landed-cost-to-layer capitalization, return reversal policy, FIFO COGS posting/reversal design, focused browser QA, hosted/customer-data proof, and production hardening.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## 2026-06-06 Serial Batch Bin Location Groundwork Sprint

- Added additive operational traceability groundwork for item tracking settings, bin/location setup, batch/lot setup, serial-number setup, expiry tracking, and read-only item traceability visibility.
- Existing items default to `NONE`, and existing non-tracked movement flows remain compatible.
- Tracking setting changes are blocked for items with existing stock movements until a migration/backfill policy exists.
- Bin/location records are optional, unique per warehouse, and include an `IN_TRANSIT` type for future location-aware transfer workflows.
- Legacy movement flows that do not capture serial, batch, expiry, or bin metadata now block advanced-tracked items instead of accepting incomplete traceability. Direct opening balance movement can carry optional tracking references where validation passes.
- This sprint does not change stock quantities unexpectedly, force tracking on existing items, mutate historical movements, run backfill, update inventory valuation, activate FIFO, create active cost layers, post journals, post or reverse COGS, change AP/AR, affect VAT, call ZATCA, change financial statements, post landed cost, run hosted/customer-data workflows, or change production posture.
- Remaining traceability gaps include full tracked metadata capture for purchase receipts, sales stock issues, adjustments, transfers, purchase returns, and sales inventory returns; serial status automation; batch expiry/quarantine workflows; bin-to-bin and in-transit transfer workflow; historical migration/reconciliation tooling; focused browser QA; hosted/customer-data proof; and accountant review.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

## Phase 0: Production Foundation For Paid Saudi-First SaaS v1

Objective: convert the controlled-beta product into a paid production candidate by proving the platform, operations, legal, billing, security, storage, backup, support, and compliance foundations before public launch.

Tasks:

- Decide final production hosting separately from the current Vercel beta/user-testing deployment.
- Implement and validate a least-privilege runtime database role with migration/direct/admin credential separation.
- Decide the Supabase Data API/RLS strategy and verify tenant isolation.
- Prove hosted database backup/PITR, hosted restore drills, and object-storage backup/restore.
- Wire production monitoring for web/API, background workers, email delivery, backups, and future ZATCA jobs.
- Add support and incident-response operations for paid customers.
- Define paid plans, trial policy, tenant provisioning, cancellation/refund policy, and billing provider/manual billing path.
- Prepare Terms of Service, Privacy Policy, data processing notes, and retention/deletion policy for legal review.
- Complete accountant review and ZATCA specialist review before any production accounting or ZATCA claims.
- Run full smoke and full E2E only when the non-production target and credentials are approved.

Manual dependencies:

- Hosting, security, legal, accountant, ZATCA specialist, payment provider, and support ownership decisions.

Risk level: Critical.

Recommended next prompt:

> Draft `PROD-A1 Final hosting ADR`, comparing Vercel plus managed workers, container hosting, and managed PaaS options for LedgerByte production without changing deployment settings or infrastructure.

## Phase 1: Stabilize Current MVP

Objective: make the current AR/AP MVP reliable enough for structured user QA.

Tasks:

- Run guided QA through every implemented frontend route, starting with the new first-workflow path from setup to first report.
- Review the documented dashboard KPI and Sales/AR attention threshold policy with an accountant/product owner.
- Continue fixing visible UX inconsistencies in high-traffic accounting workflows without changing posting behavior.
- Wire the new Playwright browser E2E smoke into CI and expand it where user-facing regressions are found.
- Validate the opt-in SMTP provider with a non-production relay using the safe diagnostics gate, then add live domain authentication checks, provider-specific signed webhooks, production retry scheduler, external monitoring/alert delivery, and audit alerting for role/member administration.
- Harden fiscal period UX with period templates, optional reversal-date selection, and admin unlock approval design.
- Harden number sequence administration with reviewed reset/skip workflow, collision preview, and branch/device numbering policy before production.
- Add accountant review pass for report layouts and exported report formats.
- Add customizable dashboard widgets and saved preferences after KPI definitions are approved.
- Move Prisma seed config to `prisma.config.ts` before Prisma 7.

Manual dependencies:

- Accountant review of chart of accounts and posting rules.
- Product review of current UX flows.

Risk level: Medium.

Recommended next prompt:

> Run a full route QA polish pass across implemented LedgerByte screens, fixing only real loading, empty, error, permission, and responsive UI defects without changing accounting behavior.

## 2026-05-21 Guided first-workflow UX

- Setup and dashboard now guide a new business user through profile, VAT/tax details, first customer, first sales invoice, first customer payment, and first report.
- The checklist uses real onboarding data from `GET /dashboard/onboarding-checklist`; no step is faked as complete.
- Contacts, new sales invoice, new customer payment, and reports pages now include clearer first-use guidance and links back to guided setup.
- ZATCA copy remains safe and says production ZATCA is not connected yet.
- Remaining UX work: manual route QA, responsive review, visual regression coverage, richer empty/error states, and accountant review of report/dashboard definitions.

## 2026-05-21 Customer ledger and report drill-down UX

- Customer ledger and aged receivables/payables now explain what each surface shows, how payments/credits change balances, and how to navigate back to invoices, payments, reports, customers, and dashboard.
- Ledger rows now use readable activity/status labels and keep source document links visible in the row.
- Aged receivables/payables report rows now link to the relevant customer and invoice/bill while retaining the existing report calculations.
- Browser QA covered the ledger/report drill-down path at desktop, tablet, and mobile widths without document overflow or console warning/error entries.
- Remaining UX work: continue route QA on the next high-traffic workflow, add visual regression coverage, and schedule accountant review of report terminology.

## 2026-05-21 Supplier AP drill-down UX

- Supplier ledger, purchase bill detail, supplier payment detail, purchase debit note detail, aged payables, and reports now provide AP-specific guidance for what changed, how payments/debit notes affect payable balances, and where to inspect the source documents.
- Purchase bill, supplier payment, and debit-note detail pages now have visible status/next-action panels with links to supplier ledger, AP report, dashboard, PDF/receipt actions, and related bill/payment/debit-note records.
- Supplier payment creation now returns to the supplier payment detail page with recorded-payment success context.
- Browser QA covered the supplier/AP drill-down path at desktop, tablet, and mobile widths without document overflow or console warning/error entries.
- Remaining UX work: inventory workflow QA, visual regression coverage, and accountant review of AP wording.

## 2026-05-21 Banking and reconciliation UX

- Bank account, bank transfer, statement import, statement transaction, reconciliation summary, reconciliation history, and reconciliation detail pages now explain balances, matched/unmatched rows, statement import scope, period locks, and next actions without changing posting or matching behavior.
- Bank account and transfer pages now guide users to import statements, create transfers, review unmatched transactions, inspect the bank ledger, open reconciliation history, and return to dashboard.
- Statement import and matching screens now clearly say the current flow is manual/import-based and does not use live bank feeds or external banking APIs.
- Browser QA covered the banking/reconciliation path at desktop, tablet, and mobile widths with no document overflow or console/page/request error entries.
- Remaining banking work: no live feeds, external bank APIs, automatic matching, certified bank-specific OFX/CAMT/MT940 coverage, transfer fees, or FX transfer handling. Next functional banking work should validate parser groundwork with real sanitized bank-format variants and storage design, not live bank integration.
- Remaining UX work: inventory workflow QA, visual regression coverage, expanded bank statement samples, parser/import storage design, and accountant review of reconciliation terminology.

## 2026-05-21 Inventory drill-down UX

- Inventory item, warehouse, stock movement, balance, purchase receipt, sales stock issue, adjustment, transfer, movement report, valuation report, low-stock report, and reports landing surfaces now include visible workflow guidance.
- Purchase receipt and sales stock issue details now explain stock increases/decreases, linked movements, void/reversal behavior, and the explicit manual-only boundaries for receipt asset and COGS journal posting.
- Adjustment and transfer details now explain draft/approval, source/destination movement, reversal rows, and where to inspect the stock ledger.
- Inventory reports now explain opening/inbound/outbound/closing quantity, moving-average operational valuation, low-stock planning alerts, and next actions without changing report calculations.
- Browser QA covered inventory routes at desktop, tablet, and mobile widths with mocked API responses and no document overflow, console/page errors, request failures, or unknown mocked API calls.
- Remaining inventory work: landed-cost policy, FIFO/cost-layer design, serial/batch tracking, returns workflow, accountant review of operational valuation wording, and any automatic posting design only after explicit accounting policy review.
- Remaining UX work: add visual regression coverage and continue route QA only where specific user-facing defects are found.

## 2026-05-21 Manual bank statement import groundwork

- Statement import now supports manual CSV/JSON/text file upload or paste with local parser preview, detected columns, row counts, validation errors, row warnings, duplicate-candidate counts, and success guidance.
- Supported beta formats include debit/credit columns, signed amount columns, transaction/posted dates, memo/details, balance, counterparty, currency, and bank reference aliases.
- Storage remains on the existing import/transaction tables: raw file bodies are not stored, while import metadata and parsed statement rows are saved through the existing preview/import API.
- This pass did not add live bank feeds, external aggregation, OFX/CAMT/MT940 parsers, automatic matching, reconciliation logic changes, posting changes, migrations, seed/reset, full smoke, or full E2E; the parser-format gap is superseded by the 2026-05-22 groundwork below.
- Remaining banking work after that follow-up: real sanitized target-bank variants, optional raw-file archive implementation under the approved policy, approval queue polish, transfer fees, and FX transfer handling.

## 2026-05-22 Bank statement format parser groundwork

- Added sanitized OFX, OFX XML-style, CAMT.053-style XML, CAMT.054-style XML, MT940, and MT940 multiline fixtures with clearly fake account/reference values and no real bank account numbers, customer/vendor names, or live bank credentials.
- The manual import parser now detects CSV, JSON, OFX, CAMT XML, MT940, and unknown text, and it returns explicit safe validation errors for unsupported text without echoing raw file bodies.
- Limited OFX/CAMT/MT940 parsing now normalizes transaction date, signed amount or debit/credit direction, description/memo/remittance text, currency when available, and bank reference into the existing preview/import row shape. The parser now warns on missing OFX `FITID`, handles CAMT `DtTm`/reference fallback, avoids inferring CAMT direction when `CdtDbtInd` is missing, and reads MT940 multiline `:86:` narratives.
- Storage remains unchanged: only existing `BankStatementImport` metadata and parsed `BankStatementTransaction` rows are persisted; raw statement files are not archived in this pass.
- Added `docs/banking/RAW_STATEMENT_FILE_ARCHIVE_POLICY.md` as a design-only policy. The beta recommendation remains no raw bank file body storage until retention, encryption, access, audit, deletion, and object-storage controls are approved.
- This pass did not add live bank feeds, external aggregation, automatic matching, reconciliation logic changes, bank ledger math changes, posting changes, migrations, seed/reset, full smoke, or full E2E.
- Remaining banking work: expand parser fixtures with real sanitized bank variants, implement optional raw-file archive only after policy approval, add broader bank-specific OFX/CAMT/MT940 edge-case coverage, approval queue polish, transfer fees, and FX transfer handling.

## 2026-05-22 Bank parser compatibility matrix and sample kit

- Added a target-bank compatibility matrix with explicit support levels from `not collected` through `parser validated on sanitized sample`; all target-bank rows remain not collected until real sanitized exports are reviewed.
- Added a sanitized sample collection guide covering what to remove, what structure to preserve, acceptable fake replacement patterns, before/after examples, and the no-raw-file-commit rule.
- Added a parser validation checklist for detection, row count, dates, amounts, direction, references, descriptions, currency, balances, duplicate keys, warnings, persistence, UI preview, and out-of-scope confirmations.
- Added fixture README rules for fake data, naming conventions, fixture categories, and targeted parser test commands.
- This pass did not add parser behavior changes, live bank feeds, external aggregation, automatic matching, reconciliation logic changes, migrations, seed/reset, full smoke, or full E2E.
- Remaining banking work: collect sanitized target-bank samples through the guide, update the compatibility matrix honestly, add parser fixtures/tests only after sanitized samples are approved, and keep raw-file archive implementation separate until policy approval.

## 2026-05-21 Document and PDF UX polish

- Invoice, customer payment receipt, credit note, purchase bill, supplier payment receipt, debit note, customer statement, supplier statement, generated archive, document settings, and number sequence surfaces now have clearer generated-document guidance.
- Source-record document actions now use specific PDF labels and explain that generated downloads are archived for later review.
- The generated archive now explains status, source labels, non-posting archived downloads, empty states, and links back to document settings and number sequences.
- Document settings now describe what future PDFs are affected, that template choices are presentation-only, and that totals, VAT, posting data, and compliance status are unchanged.
- Supplier statement PDF export/archive parity is now available from the supplier statement tab, using the existing supplier ledger rows and presentation settings.
- The archive enum now includes `SUPPLIER_STATEMENT` through a reviewed non-destructive migration. Existing generated-document rows and existing document types are unaffected.
- PDF/A-3, real ZATCA network submission, CSID execution, clearance/reporting, and production compliance remain unimplemented and clearly described as disabled.

## 2026-05-21 Document download beta QA follow-up

- Restored DPAPI-backed beta credentials from the local user-testing secret store and ran authenticated API-level document download/archive QA against deployed API/web commit `ff01b2b` without printing passwords, tokens, auth headers, request/response bodies, PDF bodies, document numbers, or customer/vendor names.
- Real beta records existed for sales invoices, customer payments, credit notes, purchase bills, supplier payments, purchase debit notes, customer statement rows, supplier statement rows, and generated-document archive entries.
- Verified HTTP `200`, `application/pdf`, attachment filename presence, `.pdf` filename extension, nonzero byte length, and `%PDF` magic bytes for sales invoice PDFs, customer payment receipt PDFs, credit note PDFs, purchase bill PDFs, supplier payment receipt PDFs, purchase debit note PDFs, customer statement PDFs, supplier statement PDFs, and archived generated-document downloads.
- Archive rows were created for invoice, customer payment receipt, credit note, purchase bill, supplier payment receipt, purchase debit note, and customer statement downloads. A follow-up non-destructive enum migration now adds `SUPPLIER_STATEMENT` so supplier statement PDF downloads can archive too.
- Authenticated browser UI width checks remain pending: the deployed browser session was unauthenticated, login automation could not safely fill the email/password controls in this browser surface, and JavaScript URL token injection was rejected by browser security policy. Temporary credential/token files used during the blocked attempt were deleted.
- User-testing deployment `da45544` applied the `SUPPLIER_STATEMENT` enum migration and targeted supplier statement archive QA passed: `GET /contacts/:id/supplier-statement.pdf` returned `200` `application/pdf`, created exactly one `SUPPLIER_STATEMENT` archive row, and `GET /generated-documents/:id/download` returned the archived PDF.
- Remaining document work: accountant review of customer/supplier statement layout and broader visual regression coverage.

## 2026-05-21 Visual regression coverage

- Added a focused mocked Playwright visual regression suite for polished beta UX routes with no live beta credentials, no Supabase/Vercel dependency, and no real API access.
- Critical setup, dashboard, reports, AR/customer, AP/supplier, banking, inventory valuation, and documents/archive routes now have desktop (`1366`), tablet (`820`), and mobile (`390`) screenshots.
- Additional polished customer payment, aged reports, supplier payment, debit note, bank transfer, statement import, reconciliation, items, warehouse, receipt, adjustment, transfer, document settings, and number sequence routes now assert visible guidance, primary headings, no document-level horizontal overflow, and safe wording.
- Snapshot updates should be intentional and run with `corepack pnpm exec playwright test -c playwright.visual.config.ts --update-snapshots`; normal verification uses `corepack pnpm test:visual`.
- Remaining validation work: full smoke and full E2E are still pending and should be run only when explicitly requested; accountant wording review remains recommended.

## 2026-05-22 Beta feedback triage intake

- Added `docs/beta-testing/BETA_FEEDBACK_TRIAGE_SUMMARY.md` for the first sanitized beta/accountant feedback intake check.
- No completed sanitized beta reports, UX reports, accounting review findings, redacted screenshots, or redacted videos were found in the repository.
- The public GitHub issues query returned zero issue records for `Noone9029/Accounting-App`.
- No blocker/high feedback was available, so no product code or accounting behavior changed in this pass.
- Next product-development step is to collect sanitized beta/accountant findings through the feedback templates, then rerun triage and fix only concrete blocker/high UX, wording, route, document, mobile, security/privacy, or compliance-wording issues.

## Phase 2: Finish Wafeq Core Accounting Modules

Objective: complete core accounting modules expected in a serious SME accounting SaaS.

Tasks:

- Supplier debit notes accounting hardening and accountant review of AP statement layout.
- Purchase matching review workflow is now present for exception classification; remaining work is accountant-approved tolerance policy, purchase receiving QA, partial bill matching hardening, variance handoff, and purchase-return accounting/inventory handoff.
- Convert the DEV-08Z AP production-gap register into scoped tickets for linked PO-to-bill receipt reconciliation, valuation variance booking, landed cost, purchase return accounting/inventory effects, real provider AP email delivery, and broad AP E2E/smoke coverage.
- Cash expense import/OCR groundwork and production hardening for uploaded receipt attachments after the S3 adapter is validated against a real non-production bucket.
- Convert the DEV-09 banking/reconciliation production gaps into scoped tickets for real sanitized target-bank parser fixtures, optional raw-file archive implementation using the approved policy, approval queue polish, transfer-fee/FX handling, hosted/beta/customer-data proof, and broad banking E2E/smoke coverage.
- Transfer fees and multi-currency FX transfer handling.
- Inventory adjustment/transfer UX polish and approval queue hardening.
- Official VAT return report.
- Scheduled/email report delivery.
- Customer/supplier statement layout review.
- Convert the DEV-10 reports/financial statements production gaps into scoped accountant-review, official VAT, scheduled/email delivery, report-pack, advanced reporting, generated-document storage, restricted-role matrix, E2E, and load/concurrency tickets.
- Convert the DEV-12 generated-document production gaps into scoped object-storage, DB/base64 migration, signed URL, lifecycle, legal-hold, retention approval, malware scanning, backup/restore, purge executor, versioning/supersede, PDF/A-3/ZATCA boundary, hosted proof, E2E, and load/concurrency tickets.

Manual dependencies:

- Accountant validation of report formats and VAT return requirements.
- Bank statement file format samples.

Risk level: High.

Recommended next prompt:

> Collect sanitized target-bank statement exports using the bank sample collection guide, update the compatibility matrix, and add parser fixtures/tests only for approved sanitized samples without live feeds or automatic matching.

## 2026-05-30 DEV-08Z AP Readiness Update

- DEV-08 through DEV-08M are closed as local-only AP evidence, not production evidence.
- The local evidence covers AP state machines, AP-adjacent receipt/inventory paths, AP output/archive/download, AP output permissions, generated-document mock email outbox behavior, fiscal/permission blockers, and cleanup/retention posture.
- Remaining AP roadmap work is now tracked through `docs/development/DEV_08Z_AP_PRODUCTION_GAP_REGISTER.md`.
- Do not claim production AP readiness until purchase matching tolerance policy, valuation variance, landed cost, purchase return accounting/inventory effects, real provider AP email, broad E2E/smoke/full-test coverage, hosted/beta behavior, and customer-data behavior are separately proven.

## 2026-06-05 Purchase Matching Visibility Sprint

- Added read-only purchase matching visibility for purchase order, purchase bill, and purchase receipt detail routes.
- The matching view compares ordered, billed, and received quantities; remaining to bill; remaining to receive; over-billed and over-received quantities; linked source documents; and review warnings.
- This is visibility-only. It does not post journals, book variances, change AP balances, change inventory quantities, create purchase returns, create landed cost, or mutate source documents.
- Remaining purchase matching work is accountant-reviewed tolerance/status policy, exception acknowledgement/approval workflow, multi-PO matching policy, variance posting policy, landed cost, purchase return accounting/inventory effects, hosted/beta/customer-data proof, and broad AP/inventory E2E coverage.

## 2026-06-05 Purchase Matching Exception Center

- Added a central read-only purchase matching exception workspace at `/purchases/matching`.
- Added `GET /purchase-matching/exceptions` with supplier grouping, severity grouping, summary counts, and filters for supplier, severity, exception type, source type, and search.
- Exception rows link to purchase orders, purchase bills, purchase receipts, and suppliers where the user has permission.
- This pass did not post journals, book variances, change AP balances, change inventory quantities, mutate purchase orders/bills/receipts, create purchase returns, create landed cost, send email, call ZATCA, run hosted/customer-data workflows, or run OS power commands.
- Remaining purchase matching work is accountant-reviewed tolerance/status policy, exception acknowledgement/approval workflow, variance posting policy, multi-PO matching policy, landed cost, purchase return accounting/inventory effects, hosted/beta/customer-data proof, and broad AP/inventory E2E coverage.

## 2026-06-05 Purchase Matching Review Workflow

- Added schema-backed purchase matching review tracking and policy documentation for PO/bill/receipt matching exceptions.
- Added review lifecycle endpoints under `purchase-matching`, review status/reason filters in the exception center, review-only actions on `/purchases/matching`, source-panel review status visibility, and audit logging.
- Review actions classify follow-up only. They do not post journals, book variances, change AP balances, change inventory quantities, mutate purchase orders/bills/receipts, create purchase returns, create landed cost, send email, call ZATCA, run hosted/customer-data workflows, or run OS power commands.
- Remaining purchase matching work is accountant-reviewed tolerance/status policy, review detail timeline, variance posting policy, multi-PO matching policy, landed cost, purchase return accounting/inventory effects, hosted/beta/customer-data proof, and broad AP/inventory E2E coverage.

## 2026-06-05 Purchase Returns Workflow

- Added operational purchase returns with `PRN-` numbering, draft/submit/approve/complete/cancel/void lifecycle, source links to supplier, purchase bill, purchase order, purchase receipt, and `NEEDS_RETURN_REVIEW` matching reviews.
- Purchase returns are non-posting operational documents. They do not post journals, change AP balances, change purchase bill balances, create debit notes/refunds automatically, move inventory automatically, book variances, affect VAT/financial reports, send email, call ZATCA, or run production/hosted/customer-data workflows. The later Inventory Returns Integration Sprint added explicit operational stock-out only for safe receipt-linked tracked lines.
- Matching exceptions can link to an existing purchase return or offer an explicit create-return link for permitted users. Supplier activity and ledger surfaces show purchase returns as zero-effect rows.
- Remaining purchase return work is PDF/archive, dedicated source-options and browser QA polish, accountant-approved return reason/tolerance policy, explicit debit-note/refund handoff, stock movement reversal, sales returned-goods stock-in, valuation treatment, hosted/beta/customer-data proof, and broad AP/inventory E2E coverage.

## 2026-06-05 Inventory Valuation Variance Preview

- Added read-only valuation variance preview at `/inventory/valuation-variances` and `GET /inventory/valuation-variances`, with supplier grouping, source links, summary totals, filters, purchase receipt/bill source panels, return links, and matching-review links for `NEEDS_VARIANCE_REVIEW`.
- Preview rows compare receipt value, bill value, purchase order expected value, returned value, quantity mismatch, unit cost mismatch, receipt-without-bill, bill-without-receipt, return-pending-credit, and review-required context.
- This pass did not post journals, book variances, change AP balances, change purchase bill balances, change inventory quantities, change moving average, create FIFO layers, create purchase returns, create debit notes/refunds, change landed cost, send email, call ZATCA, affect VAT/financial reports, run hosted/customer-data workflows, or run OS power commands.
- Remaining valuation work is accountant-reviewed variance thresholds/tolerance policy, explicit review decision recording if needed, variance posting policy, inventory adjustment policy, landed cost, FIFO/cost-layer treatment, hosted/beta/customer-data proof, and broad AP/inventory E2E coverage.

## 2026-05-30 DEV-09 Banking/Reconciliation Readiness Update

- DEV-09 is closed as local-only banking/reconciliation evidence, not production evidence.
- The local evidence covers marker-scoped synthetic banking fixtures, parser/preview checks, match/categorize/ignore actions, and reconciliation create/submit/approve/close/void.
- Remaining banking roadmap work is tracked through `docs/development/DEV_09_BANKING_RECONCILIATION_CLOSURE.md`.
- Do not claim production banking readiness until live bank/feed policy, real sanitized target-bank parser coverage, raw-file archive operations, approval queue policy, transfer fees, FX handling, broad E2E/smoke/full-test coverage, hosted/beta behavior, customer-data behavior, and accountant review are separately proven.

## 2026-05-30 DEV-10 Reports/Financial Statements Readiness Update

- DEV-10 is closed as local-only reports and financial statements evidence, not production evidence.
- The local evidence covers marker-scoped synthetic report fixtures, core financial report JSON checks, aging and VAT Return JSON checks, Trial Balance CSV/PDF/archive/download metadata, no-body output handling, and selected permission gates.
- Remaining reporting roadmap work is tracked through `docs/development/DEV_10_REPORTS_FINANCIAL_STATEMENTS_CLOSURE.md`.
- Do not claim production reporting readiness until accountant-reviewed definitions/layouts, official VAT filing scope, scheduled/email delivery, report packs, advanced branch/multi-period/consolidation behavior, inventory valuation/FIFO/landed-cost reporting, generated-document storage/retention policy, restricted-role matrix coverage, broad E2E/smoke/full-test coverage, hosted/beta behavior, customer-data behavior, and load/concurrency proof are separately proven.

## 2026-05-30 DEV-11 Inventory Valuation And COGS Readiness Update

- DEV-11 is closed as local-only inventory valuation and COGS evidence, not production evidence.
- The local evidence covers marker-scoped inventory fixture math, manual sales stock issue COGS post/reverse, compatible purchase receipt asset post/reverse, clearing variance proposal create/submit/approve/post/reverse, inventory valuation reports, clearing reports, GL, Trial Balance, P&L, Balance Sheet, dashboard totals, and no-body/no-secret checks.
- Remaining inventory roadmap work is tracked through `docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md`.
- Do not claim production inventory accounting readiness until FIFO/cost layers, landed cost, automatic posting, negative-stock production policy, serial/batch/bin/location, purchase returns, sales returns inventory impact, historical direct-mode migration, multi-currency inventory, transfer-fee/landed allocation, accountant review, hosted/beta/customer-data behavior, broad E2E/smoke/full-test coverage, generated-document retention, and load/concurrency proof are separately proven.

## 2026-05-30 DEV-12 Generated Documents Storage Retention Readiness Update

- DEV-12 is closed as local-only generated documents storage retention evidence, not production evidence.
- The local evidence covers marker `DEV12-DOC-20260530T000000`, one synthetic DB-backed generated document, safe metadata list/detail/filter checks, one approved local download metadata/hash check, storage readiness and migration dry-run counts, and retention/legal-hold cleanup policy preflight.
- Remaining generated-document roadmap work is tracked through `docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_CLOSURE.md`.
- DEV-12 does not prove production readiness, beta readiness, customer-data behavior, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.
- Do not claim generated-document storage production readiness until object storage, database/base64 migration, signed URLs, lifecycle policy, legal hold, tax/accounting retention approval, customer-data deletion/retention conflict handling, malware scanning, backup proof, restore proof, generated-document purge execution, versioning/supersede policy, PDF/A-3/ZATCA artifact boundaries, hosted/beta/customer-data behavior, broad E2E/smoke/full-test coverage, load/concurrency for large PDFs, and accountant/legal review are separately proven.
- Recommended next prompt: `DEV-13 Part 1: role permission matrix production-gap and E2E readiness preflight`.

## Phase 3: Inventory And Payroll Basics

Objective: add operational modules that affect accounting but require careful scope control.

Tasks:

- Purchase receiving and sales stock issue UX polish, delivery document groundwork, and operational status hardening.
- Inventory adjustment approval inbox and reason-code catalog.
- Warehouse in-transit transfer, shipping document, and bin/location support.
- Accountant review of the current moving-average operational valuation estimate and FIFO placeholder policy.
- Review inventory accounting settings, purchase receipt clearing previews/posting, purchase bill direct-vs-clearing finalization behavior, bill/receipt matching visibility, manual sales issue COGS posting, clearing account balances, and variance proposal journals with an accountant.
- Use `docs/inventory/PURCHASE_RECEIPT_POSTING_READINESS_AUDIT.md` as the go/no-go gate before automatic receipt GL posting or direct-mode migration.
- Harden manual COGS and receipt asset review/audit UX after first QA pass.
- Inventory accounting integrity audit is complete for the current manual posting chain, and accountant-reviewed variance proposals now exist. Next inventory accounting work should harden review outputs and define landed-cost, historical direct-mode migration/exclusion, and FIFO cost-layer policy before any automatic posting.
- Accounting-grade inventory valuation reports after GL posting design.
- Employee master data.
- Payroll shell with draft runs, pay items, and accounting posting plan.

Manual dependencies:

- Inventory valuation accounting policy, inventory clearing account treatment, bill/receipt matching/variance policy, receipt asset and variance proposal review policy, and COGS cost-flow approval.
- Payroll jurisdiction requirements.
- Accountant review of COGS/payroll postings.

Risk level: High.

Recommended next prompt:

> DEV-12 Part 1: generated documents storage retention production-gap and E2E readiness preflight.

## Phase 4: ZATCA Production Path

Objective: move from local-only ZATCA groundwork to official validated Phase 2 implementation.

Tasks:

- Verify official XML requirements against local `reference/` docs and SDK samples.
- Keep Java 11-14 configured for repeatable local/CI SDK validation; official sample fixtures now pass under Java 11.
- Complete the remaining official XML gaps: generated invoice address/identifier warnings, broader invoice scenarios, signing/certificate, and Phase 2 QR.
- Use the no-mutation hash comparison, dry-run reset plan, and explicit fresh-EGS SDK hash mode as the verified baseline. The first two generated SDK-mode invoices now persist hashes that match SDK `-generateHash`, and repeated generation is idempotent.
- The invoice 2 `KSA-13` PIH validation failure is resolved for local fresh-EGS validation by passing metadata `previousInvoiceHash` through an invoice-specific temporary SDK `pihPath`.
- Resolve remaining generated XML buyer-address warning `BR-KSA-63` by adding real buyer building-number data later; do not hardcode fake address values.
- Implement signing and Phase 2 QR only after canonicalization and key custody are designed.
- Implement compliance CSID onboarding with real FATOORA sandbox OTP.
- Implement compliance invoice API tests.
- Implement production CSID request after sandbox success.
- Implement standard invoice clearance and simplified invoice reporting.
- Implement PDF/A-3 XML embedding.
- Move private keys and certificates to KMS/secrets manager.
- Add robust error/retry/status handling.

Manual dependencies:

- ZATCA/FATOORA sandbox access.
- FATOORA OTP.
- Official endpoint/auth verification.
- Repeatable Java 11-14 runtime verification for local and CI environments.
- KMS/secrets manager selection.

Risk level: Critical.

Recommended next prompt:

> Add official buyer address field support for ZATCA generated XML, including customer building number/district validation and UI/API data capture, without signing or network calls.

## Phase 5: Production/SaaS Readiness

Objective: harden LedgerByte for real users, operations, billing, and scale.

Tasks:

- Production deployment target and infrastructure-as-code.
- Hosted Supabase/Postgres backup/PITR validation, object-storage restore drills, evidence review, and monitoring.
- Validate the uploaded-attachment S3 adapter with a real non-production bucket, then implement generated-document object storage and a resumable DB-to-S3 migration executor.
- Email provider validation using allowlisted diagnostics, provider-specific signed webhooks, production retry scheduler, external monitoring/alert delivery, and transactional template polish.
- WhatsApp provider integration if product requires it.
- Subscription billing and plan enforcement.
- Domain, DNS, SSL, and environment management.
- Security hardening: Supabase Data API disablement or strict grants, least-privilege Prisma runtime DB role, phased RLS policies, CORS, password policy, scheduled audit export/alerting plus immutable storage, secrets rotation, MFA, and session invalidation.
- Approval workflows and dual-control policies for high-risk accounting actions.
- Observability: logs, metrics, tracing, alerts.
- Multi-language polish, Arabic/English layout review, and regional formatting.
- Data import/export and admin support tooling.

Manual dependencies:

- Cloud provider account.
- Domain/DNS access.
- Email/WhatsApp/payment provider credentials.
- Legal/tax company details.
- Security review.

Risk level: High.

Recommended next prompt:

> Create and validate a least-privilege Prisma runtime DB role in the user-testing Supabase project, keeping migration credentials separate and running only health plus narrow smoke validation.

## 2026-05-21 Supabase Data API/RLS hardening

- User-testing audit confirmed the web app uses the Nest API path and does not require direct Supabase REST, GraphQL, Realtime, or Storage access.
- The user-testing Supabase project still has 76 public tables with RLS disabled, so broad RLS remains a production blocker.
- Immediate mitigation applied: revoked `anon` and `authenticated` public table, sequence, and function grants, including `postgres`-owned future default grants for those roles.
- Validation after the mitigation kept API/web health at HTTP `200`; readiness stayed `ok`; `smoke:accounting:reports` passed with secret-store credentials.
- Remaining roadmap item: disable the Supabase Data API Dashboard setting if available and no hidden dependency exists, then create a least-privilege Prisma runtime DB role before designing full RLS policies.
- 2026-05-21 runtime-role follow-up: `ledgerbyte_app_runtime_user_testing` was designed, but not created, because Vercel API `DATABASE_URL` mutation was unavailable in the session. Next step is to enable a safe Vercel env mutation path and validate the role cutover with health, reports, and ZATCA-safe smoke phases.
- Recommended next prompt: create and validate a least-privilege Prisma runtime DB role in the user-testing Supabase project, with rollback SQL/env plan and no broad RLS enablement.

## 2026-05-18 Email readiness diagnostics

- `GET /email/readiness` now reports production SMTP readiness fields without sending email or exposing SMTP/password/API-key/token/URL/authorization/provider secret values.
- `POST /email/diagnostics` is disabled by default, returns skipped/no-send/no-mutation status, and requires an explicit allowlisted test recipient when execution is enabled.
- `/settings/email-outbox` shows email readiness, invite/password-reset reliability warnings, diagnostics disabled-by-default status, and no-customer-email messaging.
- Remaining roadmap item: execute SMTP diagnostics against an allowlisted non-production relay and add retries, bounces/webhooks, monitoring, and live DNS/provider validation before real customer email use.
- Recommended next prompt: run an allowlisted non-production SMTP relay diagnostic and record provider result evidence without sending customer emails.

## 2026-05-19 Email sender-domain readiness

- Added `EmailSenderDomainEvidence` for metadata-only SPF/DKIM/DMARC/MX/return-path/provider evidence.
- Added `/email/sender-domain-evidence` list/create/verify/revoke endpoints and `/settings/email-outbox` controls. They send no email, create no outbox record, and reject SMTP/API/provider secrets and private DKIM keys.
- `GET /email/readiness` now reports sender-domain status, missing/verified SPF/DKIM/DMARC, relay diagnostics status, and false bounce/retry/monitoring states.
- `GET /email/diagnostics-plan` documents the non-production relay plan while diagnostics remain disabled by default.
- Remaining roadmap item: run a non-production relay diagnostic with an allowlisted sandbox recipient, then implement signed provider webhooks, suppression handling, monitoring, scheduled retry execution, and live DNS/provider validation.
- Recommended next prompt: add signed provider webhook verification, suppression-list handling, and monitoring-safe bounce/complaint alerts without enabling real customer email by default.

## 2026-05-19 Non-production restore drill evidence

- Executed a local Docker Postgres restore drill using seeded non-production data only. The temporary restored database and temporary dump were removed after verification.
- Captured verified metadata-only evidence for `DATABASE_BACKUP`, `MIGRATION_HISTORY`, `RESTORE_DRILL`, `RESTORE_VERIFICATION`, `GENERATED_DOCUMENT_BACKUP`, and `ATTACHMENT_BACKUP`.
- The drill verified counts only: 76 tables, 55 migrations, 11 organizations, 77 users, 186 attachments, 820 generated documents, and 3121 journal entries.
- Captured draft blocked `OBJECT_STORAGE_BACKUP` evidence because no S3-compatible object-storage backup/provider export was configured for this local environment.
- Remaining roadmap item: verify hosted Supabase backup/PITR and real object-storage backup/restore in a non-production project; RPO/RTO business review is still required.
- Recommended next prompt: verify hosted Supabase backup/PITR and S3-compatible object-storage backup/restore in a real non-production project, then capture sanitized evidence without exposing secrets or customer content.

## 2026-05-19 Email retry and bounce readiness

- Added durable `EmailOutbox` retry metadata, read-only `/email/retry-plan`, and disabled-by-default `/email/retry-process`.
- Added `EmailProviderEvent`, `/email/provider-events/plan`, and unsigned `/email/provider-events/mock` for metadata-only mock delivery/bounce/complaint capture.
- `/settings/email-outbox` now shows retry pending/blocked counts, retry processor state, provider event readiness, bounce signature status, monitoring blockers, and no-customer-email safety messaging.
- Remaining roadmap item: add provider-specific production webhook adapters, monitoring/alerts, a scheduled retry worker, real relay execution, and live DNS/provider validation.
- Recommended next prompt: add a scheduled transactional email retry worker and monitoring dashboard evidence for retry throughput, bounce/complaint thresholds, and suppression trends while real customer sends remain disabled by default.

## 2026-05-19 Email webhook suppression readiness

- Added provider-agnostic signed webhook readiness with `GET /email/provider-events/webhook-plan` and disabled-by-default `POST /email/provider-events/webhook`.
- Added `EmailSuppression` plus `/email/suppressions` list/create/revoke endpoints. Suppressions store masked/hash email metadata only and active entries block matched send/retry attempts.
- `/settings/email-outbox` now shows webhook verification, webhook secret configured/missing, suppression counts/controls, suppressed retry counts, and alerting/monitoring blockers.
- Remaining roadmap item: replace the generic HMAC test verifier with provider-specific webhook adapters, add scheduled retry execution, prove non-production relay diagnostics, and build monitoring/alert threshold evidence.
- Recommended next prompt: add a scheduled transactional email retry worker and monitoring dashboard evidence for retry throughput, bounce/complaint thresholds, and suppression trends while real customer sends remain disabled by default.

## 2026-05-19 Email worker monitoring readiness

- Added read-only `GET /email/retry-worker/plan` and disabled-by-default `POST /email/retry-worker/run`; worker execution sends no email and mutates nothing while `LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED=false`.
- Added `EmailDeliveryMonitoringEvidence` plus `/email/monitoring-plan` and monitoring evidence list/create/verify/revoke endpoints for retry throughput, bounce/complaint alert thresholds, suppression trends, delivery dashboard evidence, and provider webhook health.
- `/settings/email-outbox` now shows retry worker state, monitoring evidence status, bounce/complaint threshold blockers, suppression trend monitoring, webhook health monitoring, and metadata-only monitoring evidence controls.
- Remaining roadmap item: add provider-specific production webhook adapters, external monitoring/alert delivery, real relay execution evidence, production retry scheduler, and live DNS/provider validation.
- Recommended next prompt: add provider-specific production webhook adapters and an external monitoring integration runbook for email delivery alerts while keeping real customer sends disabled by default.

## 2026-05-19 Backup restore readiness

- Added `BackupRestoreEvidence` for metadata-only database backup, point-in-time recovery, migration history, object-storage backup, generated-document backup, attachment backup, restore-drill, restore-verification, RPO/RTO review, and other evidence.
- Added `GET /system/backup-readiness`, `GET /system/restore-drill-plan`, and backup evidence list/create/verify/revoke endpoints. They execute no backup, run no restore, export no customer data, and expose no database URLs, Supabase service role keys, storage credentials, connection strings, signed XML/QR bodies, customer document contents, attachment bodies, API keys, tokens, auth headers, private keys, or provider secrets.
- `/settings/storage` now shows backup readiness, restore-drill planning, evidence completeness, missing evidence, and metadata-only evidence controls without any run-backup or restore button.
- Remaining roadmap item: verify real Supabase/Postgres backups and PITR, validate object-storage backup policy, execute an isolated non-production restore drill, complete RPO/RTO review, and connect production monitoring/incident runbooks.
- Recommended next prompt: execute a non-production Supabase/Postgres restore drill and object-storage backup verification with sanitized evidence, without exposing secrets or customer content.

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

## Roadmap update: ZATCA signed artifact policy approvals

Completed: metadata-only immutable storage policy approval records and settings visibility.

Next required phases before signed XML body persistence:
- Legal/accounting retention-duration decision.
- Technical immutable storage controls and restore testing.
- Real certificate/key custody and CSID onboarding design.
- Production signing, promotion, and clearance/reporting workflows.
- PDF-A3 design if required by product scope.

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

# Sellable-v1 roadmap update - 2026-05-18

- New completed item: read-only dashboard onboarding checklist plus `/setup` guided first-run wizard for sellable-v1 setup visibility.
- Next non-ZATCA priorities: signed email webhook/suppression/monitoring, SMTP readiness validation, Vercel/Supabase deployment runbook checks, browser E2E coverage including `/setup`, object-storage migration executor, support diagnostics, accountant-reviewed KPI definitions, contact/item import-export, and backup/restore evidence.
- Keep ZATCA real CSID requests, real network calls, clearance/reporting, PDF-A3, signed XML/QR body persistence, production credentials, and production compliance claims blocked until official OTP/sandbox access and later approvals are available.

# Statement PDF readability roadmap update - 2026-05-21

- Completed visible customer/supplier statement PDF readability polish: role-specific titles, period/opening/closing labels, activity headings, empty-state wording, and AR/AP explanatory copy.
- Completed contact statement tab copy polish for customer balances, supplier payables, archived PDF guidance, and safer download labels.
- Remaining roadmap item: accountant review of final statement/report wording and print presentation before production use.
- Full smoke, full E2E, security hardening runtime-role work, real ZATCA, real email, backups, and restores remain separate pending work.

# Accountant review packet roadmap update - 2026-05-22

# shadcn payment workflow migration roadmap update - 2026-06-16

- Completed current payment UI migration scope for customer/supplier payment list, create, and detail routes.
- Remaining UI migration scope: customer/supplier refunds, generated-document archive/detail surfaces, bank/reconciliation review routes, reports/settings tables, and any remaining legacy AP/AR guidance panels that still use hand-built cards or tables.
- Remaining product/compliance blockers are unchanged: provider evidence is unavailable, production compliance claims remain prohibited, real provider integrations remain blocked, and UAE PINT-AE/ZATCA behavior remains out of scope for this frontend-only branch.
- Future payment workflow work should stay behavior-preserving unless a separate accounting/product prompt explicitly authorizes backend or posting/allocation changes.

- Added a text-only accountant review packet under `docs/accountant-review/` for document, statement, report, inventory, banking, and VAT/ZATCA wording review.
- The packet includes an area-by-area checklist, a findings template, and a sample-output index that points to safe visual snapshots, local renderer tests, UI routes, and authenticated beta endpoint patterns without committing real PDFs.
- This does not mean accountant approval has happened. A qualified accountant still needs to review terminology, layout, statement readability, report labels, and any accounting correctness concerns.
- Remaining review work: collect sanitized samples, run the checklist with an accountant, record findings, and prioritize must-fix issues before broader beta or production use.

# Beta testing feedback kit roadmap update - 2026-05-22

- Added `docs/beta-testing/` with a beta testing guide, step-by-step testing script, feedback form template, and triage guide for selected user-testing participants.
- Added beta access management guidance for a 3-5 tester cohort, least-privilege role assignment, beta organization labels, password reset handling, and membership suspension after testing.
- Completed a deployed beta access dry run using a dummy `.example.test` tester: mock email readiness was confirmed, the invite created a `SENT_MOCK` outbox entry, role changes were reversible, and suspend/reactivate/suspend revocation worked with final role `Viewer`.
- The tester script covers login/access, setup wizard, dashboard checklist, first customer, first invoice, invoice finalization, customer payment, customer ledger, AR report, supplier, purchase bill, supplier payment, supplier ledger/AP report, manual bank statement import preview, reconciliation review, inventory review, document PDF/archive review, and reports/dashboard review.
- Added GitHub issue templates for beta bug reports, accounting review findings, and UX feedback with safety checks for secrets, real customer-sensitive data, production document data, PDF/document bodies, signed XML, and QR payloads.
- Remaining beta-readiness work: invite the first selected real testers, run the script, triage findings, complete accountant review, keep full smoke/full E2E as explicit validation tasks, and resume security runtime-role hardening when safe Vercel environment mutation is available.

# Sales/AR accountant wording review prep - 2026-06-04

- Completed a focused Sales/AR wording and review-readiness pass for invoice ZATCA readiness labels, quote non-posting wording, recurring/delivery/collections safety wording, customer activity boundaries, AR Aging outstanding-invoice wording, and operational/draft VAT wording.
- Added `docs/accountant-review/SALES_AR_ACCOUNTANT_REVIEW_CHECKLIST.md` and `docs/accountant-review/SALES_AR_SAMPLE_REVIEW_INDEX.md` for a safe accountant walkthrough.
- This closes review-preparation documentation for the current Sales/AR module only. Actual accountant approval, document-title policy decisions, full smoke/full E2E, hosted/customer-data proof, real email, payment links, automatic reminders, scheduler, production ZATCA, PDF/A-3, official VAT filing, and production hardening remain separate roadmap items.

# Sales/AR accountant findings intake - 2026-06-04

- Added `docs/accountant-review/SALES_AR_ACCOUNTANT_REVIEW_FINDINGS_TRIAGE.md` after searching review docs, development closures, GitHub issue templates, and `BUG_AUDIT.md` for completed Sales/AR accountant findings.
- No completed accountant findings were found, so no app code, PDF wording, calculations, posting behavior, payment behavior, VAT behavior, ZATCA behavior, email behavior, inventory behavior, or production infrastructure behavior changed.
- Added `docs/accountant-review/SALES_INVOICE_DOCUMENT_TITLE_POLICY.md` to record Sales Invoice vs Tax Invoice options and keep the current conservative beta recommendation until accountant/tax/product review approves a more specific policy.
- Remaining review work: run the Sales/AR accountant walkthrough with safe sample data, record concrete findings in the template, then implement only bounded approved fixes.

# Dashboard Sales/AR attention links - 2026-06-04

- Added read-only dashboard Sales/AR attention data and UI panels for overdue invoices, collection follow-ups, quotes awaiting action, recurring templates due for manual generation, generated recurring draft invoices, delivery notes awaiting fulfillment action, and top customers by outstanding AR.
- Dashboard attention-item integration is no longer open for the current Sales/AR scope. Remaining Sales/AR gaps include optional stock-issue source UI, automatic recurring scheduler, real customer email sending, scheduled collection reminders, payment links/payment gateway, online quote acceptance/payment, broader deployed E2E with safe seeded data, hosted/customer-data proof, and accountant sign-off.
- The dashboard sprint does not change production posture, Vercel/Supabase settings, production hosting, real ZATCA, PDF/A-3, official VAT filing, payment gateways, email providers, backup/restore, object-storage migration, invoice accounting, AR balances, VAT/report math, automatic inventory movement, scheduler behavior, or customer-data handling.
- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked web typecheck blocker and was not modified.

# Sales/AR sample data and accountant walkthrough pack - 2026-06-04

- Added a docs-only Sales/AR accountant walkthrough pack, synthetic sample-data plan, expected-results checklist, empty findings log, route review checklist, and external sample-output naming guide.
- This closes the missing reviewer-walkthrough-pack gap for the current Sales/AR module, but it does not close actual accountant review or approval.
- No sample data was created. No seed/reset/delete, smoke, E2E, PDF generation, hosted/customer-data workflow, real email, payment link, payment gateway, VAT filing, ZATCA call, accounting calculation, posting behavior, dashboard behavior, app code, API code, or backend behavior changed.
- Remaining review work: run the walkthrough with safe synthetic/local or mocked data, collect real accountant findings, decide the Sales Invoice vs Tax Invoice title policy, and implement only bounded reviewed findings.

# Controlled local Sales/AR accountant walkthrough execution preflight - 2026-06-04

- Added a local walkthrough execution preflight, marker-based data plan, evidence status, route status, expected-results status, and sprint closure for the Sales/AR accountant walkthrough.
- Planned marker: `SALES-AR-WALKTHROUGH-20260604`.
- Local execution was blocked before data creation because local database/API/web services were not running, Docker was unavailable, safe local login was not verified, and no explicit write-capable execute approval existed.
- No sample data, seed/reset/delete, smoke, E2E, PDF generation, hosted/customer-data workflow, real email, payment link, payment gateway, VAT filing, ZATCA call, accounting calculation, posting behavior, dashboard behavior, app code, API code, or backend behavior changed.
- Remaining walkthrough work: start local services in a separate approved local-only run, verify local target and safe login, dry-run a marker fixture helper, execute only after explicit approval, then run the browser walkthrough and record actual findings.

# Local services bring-up and Sales/AR walkthrough dry-run preflight - 2026-06-04

- Added `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_PREFLIGHT.md`, `docs/development/SALES_AR_WALKTHROUGH_FIXTURE_DRY_RUN_PLAN.md`, and `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_DRY_RUN_SPRINT_CLOSURE.md`.
- Local target configuration is verified as local, but runtime bring-up remains blocked because Docker Desktop Linux engine is unavailable and local Postgres, Redis, API, and web listeners are not running.
- The marker remains `SALES-AR-WALKTHROUGH-20260604`.
- Fixture dry-run planning is documented, but no fixture script was added, no dry-run was executed, and no sample data was created.
- Remaining walkthrough work: make Docker/local dependencies available, start local Postgres and Redis only, start local API/web only, verify safe local login without printing secrets, then add or run a guarded fixture dry-run before any execute-mode data creation.

# Local-only Sales/AR fixture payment-account hardening - 2026-06-05

- Closure doc: `docs/development/SALES_AR_LOCAL_FIXTURE_PAYMENT_ACCOUNT_HARDENING_CLOSURE.md`.
- Local runtime and schema readiness are now sufficient for guarded fixture dry-runs and execute attempts against the local-only marker.
- The fixture payment-account mapping blocker is fixed: customer payment and refund requests now use the linked active posting `ASSET` chart-of-account id rather than the bank account profile id.
- One guarded execute retry passed customer payment creation and stopped safely at credit-note application because the fixture sent an unsupported `note` field.
- Partial marker-scoped local synthetic data is preserved by default: one customer, two items, three sales invoices, one customer payment, and one credit note.
- Remaining walkthrough work: harden the fixture credit-note application request shape, rerun local gates and dry-run, attempt exactly one guarded execute retry only if dry-run passes, then proceed to browser route walkthrough and accountant review evidence after the full local sample data set exists.
- Still not done: accountant review, route walkthrough, expected-results checkpoint review, PDF metadata checks, hosted/customer-data proof, seed/reset/delete, cleanup/delete, real email, payment gateway, VAT filing, ZATCA, backup/restore, and deployed E2E.

# Local Sales/AR fixture idempotency execute and route metadata - 2026-06-05

- Closure doc: `docs/development/SALES_AR_LOCAL_FIXTURE_IDEMPOTENCY_EXECUTE_ROUTE_METADATA_CLOSURE.md`.
- The marker-scoped local fixture `SALES-AR-WALKTHROUGH-20260604` now completes through invoices, payments, credit note/allocation, refund, quotes, recurring invoice template, generated draft invoice, delivery notes, collections, and metadata-only route checks.
- The prior tax-rate, schema, payment-account, credit-note apply payload, source-line detail, and partial allocation idempotency blockers are resolved for the local fixture scope.
- Remaining walkthrough work: perform a controlled local browser walkthrough with the completed marker data, run optional PDF metadata checks only if approved, collect real accountant findings, and implement only bounded reviewed fixes.
- Still not done: accountant approval, Tax Invoice title decision, official VAT filing, production ZATCA, real email, payment links/payment gateway, automatic reminders/scheduler, hosted/customer-data proof, broad E2E/smoke/full-test coverage, cleanup/delete, and production readiness.

# ZATCA local generated XML fixture validation - 2026-06-06

- Completed local/no-network generated XML fixture validation for a sanitized standard invoice and sanitized standard credit note.
- Evidence: `docs/zatca/evidence/generated-xml-fixture-validation-20260606.json`, metadata-only with XML/QR/secret/body redaction flags and `productionCompliance=false`.
- Java runner decision: default Java 17 remains unsupported; local validation uses explicit Java 11-14 through `ZATCA_SDK_JAVA_BIN` and an isolated temporary no-space SDK launcher workspace. Docker is not required for the current local path.
- Remaining ZATCA roadmap items: key custody decision, sandbox OTP/CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, retry/error queue, production secure signed artifact storage, official reviews, and repeatable SDK CI.

# ZATCA local dummy signing dry-run guard - 2026-06-06

- Added a root guard command for the next signing-adjacent step: `corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json`.
- The command only plans future temp-file `fatoora -sign`, `-qr`, and `-validate` steps. It keeps signing, QR, signed XML validation, CSID/OTP, ZATCA network calls, PDF/A-3, persistence, and production compliance disabled.
- Remaining next step: design an approved local dummy signing execution plan that still uses temp-only sanitized fixtures and metadata-only evidence.

# ZATCA approved local dummy signing execution plan - 2026-06-06

- Added the approved execution runbook and approval-phrase gate for a future local dummy-material signing run.
- The roadmap remains blocked on actual execution: the guard can recognize the phrase for planning, but `--execute-approved-plan` still refuses to run signing in this sprint.
- Remaining next step: `ZATCA approved local dummy signing execution`, with Java 11-14, local SDK reference, sanitized fixtures, temp-only outputs, no network, and metadata-only evidence.

# ZATCA approved local dummy signing execution - 2026-06-06

- Completed one approved local dummy-material SDK run against `ledgerbyte-generated-standard-invoice` and `ledgerbyte-generated-credit-note`.
- Both fixtures passed SDK sign, QR, and signed XML validation stages under explicit Java `11.0.26`; evidence is metadata-only at `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`.
- Remaining roadmap items are unchanged for production: key custody, sandbox OTP/CSID, production signing, Phase 2 QR production proof, clearance/reporting, PDF/A-3, retry/error queue, signed artifact storage, official reviews, and repeatable SDK CI.
- Recommended next step: `ZATCA dummy signing result review and Phase 2 QR gap analysis`.

# ZATCA dummy signing result review and Phase 2 QR gap analysis - 2026-06-06

- Added the metadata-only result review and Phase 2 QR gap analysis docs.
- Confirmed the local dummy run proves only repo-local SDK sign/QR/validate processing for sanitized generated fixtures under Java 11.0.26.
- Confirmed it does not prove production signing, production Phase 2 QR, CSID lifecycle, clearance/reporting, PDF/A-3, signed artifact storage, or compliance.
- Completed follow-up: `ZATCA key custody and CSID lifecycle design`.
- Completed follow-up: `ZATCA sandbox CSID preflight guard`.
- Completed follow-up: `ZATCA sandbox OTP and compliance CSID approval plan`.
- Completed follow-up: `ZATCA sandbox CSID request execution guard`.
- Remaining next step: `ZATCA CSID response custody implementation plan`.

# ZATCA sandbox CSID request execution guard - 2026-06-07

- Added the no-network execution guard docs and results.
- Extended the existing preflight guard with `--execution-guard` and `--execute-csid-request`.
- Exact execution-guard phrase recognition returns `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`.
- The execute flag remains blocked as `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- No OTP, CSID request, network call, sandbox adapter execution, request body, response body, secret persistence, signing, clearance/reporting, PDF-A3, or production compliance behavior occurred.
- Remaining roadmap items: key custody, CSID response custody, real sandbox adapter execution, actual OTP capture approval, compliance CSID request execution approval, compliance invoice checks, production CSID lifecycle, production signing/Phase 2 QR proof, clearance/reporting, PDF-A3, retry queue, signed-artifact storage, official/legal/accounting review, repeatable SDK CI, and production compliance.
