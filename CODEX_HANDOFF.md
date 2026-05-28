# LedgerByte Codex Handoff

## Latest Commit Inspected

- `ce9e202d Create DEV-08G purchase order receipt source fixture`

## Current Development Objective

- Production hosting research is paused.
- AWS remains the known future production direction from proposed ADR-001/ADR-013.
- Vercel remains beta/user-testing/staging only, not final production hosting.
- Next work is product development completion before more production-hosting research.
- Development completion plan: [docs/development/DEVELOPMENT_COMPLETION_PLAN.md](docs/development/DEVELOPMENT_COMPLETION_PLAN.md).
- `DEV-01 Full route QA and blocker triage` is completed through final placeholder triage.
- DEV-01 Part 1 route inventory is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 2 auth, dashboard, setup, and navigation QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 3 sales and AR route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 3.5 local QA runtime blocker triage is completed and refreshed in [docs/development/DEV_01_LOCAL_QA_RUNBOOK.md](docs/development/DEV_01_LOCAL_QA_RUNBOOK.md).
- DEV-01 Part 4 purchases and AP route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 5 banking and reconciliation route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 6 inventory route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 7 reports, documents, settings, admin, and audit route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 8 placeholder unimplemented route QA and final triage is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 final triage is created in [docs/development/DEV_01_FINAL_TRIAGE.md](docs/development/DEV_01_FINAL_TRIAGE.md).
- DEV-02 Part 1 verification gate inventory is completed in [docs/development/DEV_02_VERIFICATION_GATE_INVENTORY.md](docs/development/DEV_02_VERIFICATION_GATE_INVENTORY.md).
- DEV-02 Part 2 verification gate design is completed in [docs/development/DEV_02_VERIFICATION_GATE_DESIGN.md](docs/development/DEV_02_VERIFICATION_GATE_DESIGN.md).
- DEV-02 Part 3 verification gate scripts are implemented in `scripts/verify-gate.cjs`, tested by `scripts/verify-gate.test.cjs`, and documented in [docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md](docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md).
- DEV-02 Part 4 documentation wiring is completed: README points to the verification runbook, and [docs/development/DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md](docs/development/DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md) captures the CI proposal without workflow implementation.
- DEV-02 Part 5 PR CI workflow is implemented at `.github/workflows/pr-verification.yml`; it is separate from `.github/workflows/deployed-e2e.yml`.
- DEV-02 is completed. Final handoff: [docs/development/DEV_02_FINAL_HANDOFF.md](docs/development/DEV_02_FINAL_HANDOFF.md).
- DEV-02 Part 6 verified the PR workflow locally as far as safe: runner tests passed, `verify:diff` passed, `verify:ci:local -- --plan` passed, package JSON parsed, and lightweight workflow inspection confirmed PR CI has no secrets, URLs, services, migrations, seed/reset/delete, E2E, smoke, ZATCA, email, backup/restore, deploys, or login/audit-writing steps.
- Routes browser-QA'd or code-reviewed in Part 2: `/`, `/login`, `/register`, `/password-reset`, `/password-reset/confirm`, `/invite/accept`, `/dashboard`, `/setup`, `/organization/setup`, `/sales/quotes`, and `/fixed-assets`.
- Routes fixed in Part 2: `/setup`, `/organization/setup`, and unmatched app-shell placeholder routes such as `/sales/quotes` and `/fixed-assets`.
- Main blocker from Part 2: local API health was not reachable at `http://localhost:4000/health`, so authenticated dashboard/setup/organization and auth-submit success flows remain deferred.
- Routes code-reviewed in Part 3: `/contacts`, `/contacts/[id]`, `/sales/invoices`, `/sales/invoices/new`, `/sales/invoices/[id]`, `/sales/invoices/[id]/edit`, `/sales/customer-payments`, `/sales/customer-payments/new`, `/sales/customer-payments/[id]`, `/sales/customer-refunds`, `/sales/customer-refunds/new`, `/sales/customer-refunds/[id]`, `/sales/credit-notes`, `/sales/credit-notes/new`, `/sales/credit-notes/[id]`, and `/sales/credit-notes/[id]/edit`.
- Routes fixed in Part 3: `/sales/invoices/new` now honors `?customerId=...` from contact-ledger invoice links.
- Main blockers from Part 3: in-app browser route visits were blocked by the browser URL policy, and local API health was not reachable at `http://localhost:4000/health`; authenticated Sales/AR runtime QA remains deferred.
- Part 3.5 refresh: local Docker Postgres and Redis are healthy on `localhost:5432` and `localhost:6379`; `@ledgerbyte/api` starts on `localhost:4000`; `/health` and `/readiness` return `200`; `@ledgerbyte/web` serves `/login` and `/dashboard` on `localhost:3000`.
- Part 3.5 remaining blocker: the in-app Browser local route visits are blocked by Browser Use URL policy in this Codex session. Future DEV-01 route QA should use mixed code review, shell HTTP, and API readiness checks unless an allowed local browser/runtime path is available. Login-dependent QA was not run because login writes an audit log.
- Part 4 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, and all 21 Purchases/AP routes using synthetic ids for dynamic routes.
- Graphify in Part 4: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `cfbddc0`) and was not treated as runtime proof or staged.
- Routes code-reviewed in Part 4: `/purchases/purchase-orders`, `/purchases/purchase-orders/new`, `/purchases/purchase-orders/[id]`, `/purchases/purchase-orders/[id]/edit`, `/purchases/bills`, `/purchases/bills/new`, `/purchases/bills/[id]`, `/purchases/bills/[id]/edit`, `/purchases/supplier-payments`, `/purchases/supplier-payments/new`, `/purchases/supplier-payments/[id]`, `/purchases/supplier-refunds`, `/purchases/supplier-refunds/new`, `/purchases/supplier-refunds/[id]`, `/purchases/cash-expenses`, `/purchases/cash-expenses/new`, `/purchases/cash-expenses/[id]`, `/purchases/debit-notes`, `/purchases/debit-notes/new`, `/purchases/debit-notes/[id]`, and `/purchases/debit-notes/[id]/edit`.
- Routes fixed in Part 4: `/purchases/bills/new` now honors `?supplierId=...`; `/purchases/supplier-payments/new` now honors `?supplierId=...&billId=...` and preselects the target open-bill amount.
- Part 4 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, AP state-changing actions, PDF/archive generation, and attachment workflows remain deferred. Debit-note edit/update/delete permission naming should be confirmed because it uses `purchaseDebitNotes.create` rather than a dedicated update permission.
- Part 5 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, and all 14 Banking/Reconciliation routes using synthetic ids for dynamic routes.
- Graphify in Part 5: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `58227ed`) and was not treated as runtime proof or staged.
- Routes code-reviewed in Part 5: `/bank-accounts`, `/bank-accounts/new`, `/bank-accounts/[id]`, `/bank-accounts/[id]/edit`, `/bank-accounts/[id]/reconciliation`, `/bank-accounts/[id]/reconciliations`, `/bank-accounts/[id]/reconciliations/new`, `/bank-accounts/[id]/statement-imports`, `/bank-accounts/[id]/statement-transactions`, `/bank-reconciliations/[id]`, `/bank-statement-transactions/[id]`, `/bank-transfers`, `/bank-transfers/new`, and `/bank-transfers/[id]`.
- Routes fixed in Part 5: `/bank-accounts/[id]` now hides transfer creation links unless `bankTransfers.create` is present; `/bank-accounts/[id]/reconciliation` now hides import/create/account links unless matching permissions are present; `/bank-accounts/[id]/reconciliations/new` now requires `bankReconciliations.create`; `/bank-reconciliations/[id]` now hides CSV/PDF report downloads unless `reports.export` or `generatedDocuments.download` is present.
- Part 5 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, bank profile mutations, statement imports, matching/categorization, reconciliation lifecycle mutations, bank transfer posting/voiding, report download/archive generation, and attachment workflows remain deferred.
- Part 6 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, and all 28 Inventory routes using synthetic ids for dynamic routes.
- Graphify in Part 6: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `0f1a112`) and was not treated as runtime proof or staged.
- Routes code-reviewed in Part 6: `/items`, `/inventory/warehouses`, `/inventory/warehouses/[id]`, `/inventory/stock-movements`, `/inventory/stock-movements/new`, `/inventory/adjustments`, `/inventory/adjustments/new`, `/inventory/adjustments/[id]`, `/inventory/adjustments/[id]/edit`, `/inventory/transfers`, `/inventory/transfers/new`, `/inventory/transfers/[id]`, `/inventory/purchase-receipts`, `/inventory/purchase-receipts/new`, `/inventory/purchase-receipts/[id]`, `/inventory/sales-stock-issues`, `/inventory/sales-stock-issues/new`, `/inventory/sales-stock-issues/[id]`, `/inventory/balances`, `/inventory/settings`, `/inventory/reports/stock-valuation`, `/inventory/reports/movement-summary`, `/inventory/reports/low-stock`, `/inventory/reports/clearing-reconciliation`, `/inventory/reports/clearing-variance`, `/inventory/variance-proposals`, `/inventory/variance-proposals/new`, and `/inventory/variance-proposals/[id]`.
- Routes fixed in Part 6: `/items` now avoids management-only account/tax-rate fetches for viewers; `/inventory/stock-movements` now honors query filters and hides adjustment/transfer links unless matching create permissions exist; `/inventory/reports/clearing-reconciliation` and `/inventory/reports/clearing-variance` now hide CSV download buttons unless report export or generated-document download permission exists.
- Part 6 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, inventory create/approve/void/transfer/adjust/receive/issue/post/reverse/propose-variance workflows, report downloads, attachment workflows, inventory clearing CSV API permission policy, variance proposal account dependency, and inventory update/void permission naming remain deferred.
- Part 7 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, and all 24 Reports/Documents/Settings/Admin/Audit routes using a synthetic role id for `/settings/roles/[id]`.
- Graphify in Part 7: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `58a846a`) and was not treated as runtime proof or staged.
- Routes code-reviewed in Part 7: `/reports`, `/reports/general-ledger`, `/reports/trial-balance`, `/reports/profit-and-loss`, `/reports/balance-sheet`, `/reports/vat-summary`, `/reports/aged-receivables`, `/reports/aged-payables`, `/documents`, `/accounts`, `/journal-entries`, `/journal-entries/new`, `/tax-rates`, `/fiscal-periods`, `/branches`, `/settings/team`, `/settings/roles`, `/settings/roles/[id]`, `/settings/documents`, `/settings/storage`, `/settings/email-outbox`, `/settings/audit-logs`, `/settings/number-sequences`, and `/settings/zatca`.
- Routes fixed in Part 7: shared core report CSV/PDF buttons now require `reports.export` or `generatedDocuments.download`; `/documents` archived PDF download buttons now require `generatedDocuments.download`.
- Part 7 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, report/document/audit exports and downloads, journal/account/tax/fiscal/branch/team/role/storage/email/ZATCA mutations, `/settings/team` role-list permission dependency, `/settings/storage` backup-evidence permission policy, and `/settings/email-outbox` email-admin permission policy remain deferred.
- Part 8 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, all 31 known placeholder/titleMap paths, and 5 real-route shadow checks.
- Graphify in Part 8: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `996a2ca`) and was not treated as runtime proof or staged.
- Placeholder/unimplemented routes code-reviewed in Part 8: `/get-started`, `/inbox`, `/sales`, `/sales/quotes`, `/sales/recurring-invoices`, `/sales/cash-invoices`, `/sales/delivery-notes`, `/sales/api-invoices`, `/purchases`, `/beneficiaries`, `/payroll`, `/products`, `/accounting`, `/fixed-assets`, `/cost-centers`, `/projects`, `/developer`, `/developer/api-keys`, `/integrations`, and `/document-templates`.
- Routes fixed in Part 8: known future-module placeholders now map to nearest existing route permissions instead of falling through to generic `dashboard.view`; placeholder wording now states no live integration, payroll, bank-feed, billing, ZATCA, email, posting, or production workflow runs from placeholders.
- Part 8 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, dedicated future-module permissions, and future-module implementation remain deferred. Placeholder roots/synonyms such as `/products`, `/accounting`, `/sales`, and `/purchases` need a later UX decision to redirect, become real index pages, or remain direct-only placeholders.
- DEV-02 Part 1 safest current commands found: `git diff --check`, `git diff --cached --check`, targeted workspace typecheck, targeted Jest suites, full non-mutating `corepack pnpm typecheck`, full `corepack pnpm test`, `corepack pnpm build`, `corepack pnpm test:visual`, `node scripts/check-deployed-e2e-env.cjs`, and local API/web health/readiness shell checks when services are already approved and running.
- DEV-02 Part 1 riskiest or blocked verification areas: migrations, seed/reset/delete, API smoke phases, Playwright E2E with login/seeded workflows, deployed beta E2E, output/export/download/PDF checks, ZATCA SDK/CSR/signing commands, user-testing cleanup-plan login, and any browser-runtime authenticated QA without an approved audit-log/fixture policy.
- DEV-02 Part 2 recommended default local gate: `git diff --check`, targeted changed-workspace `typecheck`, targeted changed-area Jest/package tests, and `git diff --cached --check` after staging.
- DEV-02 Part 2 recommended PR/CI gate: install with `corepack pnpm install --frozen-lockfile`, then run `git diff --check`, `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build`, `node --test scripts/test-credential-env.test.cjs`, and `corepack pnpm test:user-testing-cleanup-plan`.
- DEV-02 Part 2 manual/nightly gate summary: `corepack pnpm test:visual` plus local API/web health/readiness shell checks first; E2E and smoke slices remain manual only with explicit disposable-data, credential, login/audit, and cleanup approval.
- DEV-02 Part 2 commands still forbidden or manual-only: migrations, seed/reset/delete, demo seeding, smoke, full E2E, deployed beta E2E, login/audit-writing browser QA, visual snapshot updates, real ZATCA, real email, backup/restore, deploys, provider setting changes, environment changes, and production targets.
- DEV-02 Part 3 safe scripts now available: `verify:diff`, `verify:local:web`, `verify:local:api`, `verify:local:guards`, `verify:repo`, and `verify:ci:local`. The runner prints command plans, supports `--plan`/`--dry-run`, supports targeted web/API test args, and fails fast on command failure.
- DEV-02 Part 3 commands still forbidden or manual-only: migrations, seed/reset/delete, demo seeding, smoke, full E2E, deployed beta E2E, login/audit-writing browser QA, visual snapshot updates, real ZATCA, real email, backup/restore, deploys, provider setting changes, environment changes, and production targets.
- DEV-02 Part 4 CI proposal status: proposed PR workflow would run checkout, setup Node/Corepack, install with frozen lockfile, `verify:diff`, and `verify:ci:local`; `.github/workflows/*` was not edited.
- DEV-02 Part 4 README verification section status: README now links to the runbook and lists `verify:diff`, `verify:local:web`, `verify:local:api`, `verify:local:guards`, `verify:repo`, and `verify:ci:local`.
- DEV-02 Part 4 commands still forbidden or manual-only: migrations, seed/reset/delete, demo seeding, smoke, full E2E, deployed beta E2E, login/audit-writing browser QA, visual snapshot updates, real ZATCA, real email, backup/restore, deploys, provider setting changes, environment changes, production targets, and customer-data mutation.
- DEV-02 Part 5 CI commands: checkout, setup Node 22, enable Corepack, `corepack pnpm install --frozen-lockfile`, `corepack pnpm verify:diff`, and `corepack pnpm verify:ci:local`.
- DEV-02 Part 5 CI exclusions: no secrets, no production URLs, no deployed beta checks, no Vercel/Supabase setting changes, no databases/services, no migrations, no seed/reset/delete, no login/audit-writing flows, no E2E, no smoke, no real ZATCA, no real email, no backup/restore, and no customer-data mutation.
- DEV-02 Part 6 commands run: `node --test scripts/verify-gate.test.cjs`, `corepack pnpm verify:diff`, `corepack pnpm verify:ci:local -- --plan`, package JSON parse, lightweight workflow YAML inspection, `git diff --check`, and `git diff --cached --check` after staging.
- DEV-02 Part 6 commands skipped: actual `corepack pnpm verify:ci:local`, actual `corepack pnpm verify:repo`, full tests, full build, full E2E, full smoke, migrations, seed/reset/delete, deploys, env changes, ZATCA, email, backup/restore, production-hosting research, and login/audit-writing flows.
- DEV-02 remaining blockers: authenticated browser/runtime route QA, actual login/audit-writing approval for disposable QA, mutation/state-machine QA, output-producing export/PDF/download/archive checks, real ZATCA/email/storage/backup checks, service-container E2E/smoke design, docs/link checking, and observing the workflow in an actual GitHub-hosted PR run.
- DEV-03 Part 1 state-machine QA inventory is completed in [docs/development/DEV_03_STATE_MACHINE_QA_INVENTORY.md](docs/development/DEV_03_STATE_MACHINE_QA_INVENTORY.md).
- Highest-risk workflows found: invoice/bill finalization and voiding, AR/AP payment allocation and reversal, credit/debit note allocation and voiding, bank transfer posting/voiding, statement transaction match/categorize/ignore, reconciliation submit/approve/close/void, inventory adjustment/transfer/receipt/issue/variance proposal post/reverse/void flows, manual journal post/reverse, fiscal period posting locks, and report/document/audit export or PDF/archive gates.
- DEV-03 Part 1 performed no runtime mutations: no login, create, finalize, approve, close, void, reverse, allocate, match, categorize, ignore, transfer, receive, issue, post, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 2 safe fixture/login/audit policy is completed in [docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md](docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md).
- DEV-03 Part 2 key policy decisions: future mutation QA is local-disposable only by default; production is forbidden; beta/user-testing requires separate approval; login is allowed only in future explicitly approved batches; audit writes become expected evidence; fixture records require `DEV03-...` markers; seed/reset/delete, real customer data, exports/downloads/PDF, ZATCA, email, backup/restore, deploys, env changes, and provider changes remain forbidden by default.
- DEV-03 Part 2 performed no login and no runtime mutation: no create, finalize, approve, close, void, reverse, allocate, match, categorize, ignore, transfer, receive, issue, post, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 3 AR state-machine QA dry-run plan is completed in [docs/development/DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md](docs/development/DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md).
- Highest-risk AR transitions: sales invoice finalize/void with payment and credit allocation blockers; customer payment allocation, unapplied allocation reversal, refund blocker, and void behavior; customer refund source-claim and void restoration; credit note finalize/apply/reverse/void with allocation and refund blockers; AR PDF/archive endpoints that create generated-document records.
- DEV-03 Part 3 performed no login, fixture creation, or runtime mutation: no create, edit, finalize, void, reverse, allocate, refund, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 4 AP state-machine QA dry-run plan is completed in [docs/development/DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md](docs/development/DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md).
- Highest-risk AP transitions: purchase order approve/mark-sent/close/void/convert-to-bill; purchase bill finalize/void with inventory-clearing readiness and supplier payment/debit-note/unapplied allocation blockers; supplier payment direct allocation, unapplied allocation, allocation reversal, refund blocker, and void behavior; supplier refund source claim and void restoration; purchase debit note finalize/apply/reverse/void with allocation and refund blockers; cash expense immediate posting/void; AP PDF/archive endpoints that create generated-document records.
- DEV-03 Part 4 performed no login, fixture creation, or runtime mutation: no create, edit, approve, close, finalize, void, reverse, allocate, refund, receive, post, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 5 banking/reconciliation state-machine QA dry-run plan is completed in [docs/development/DEV_03_BANKING_RECONCILIATION_STATE_MACHINE_DRY_RUN_PLAN.md](docs/development/DEV_03_BANKING_RECONCILIATION_STATE_MACHINE_DRY_RUN_PLAN.md).
- Highest-risk banking/reconciliation transitions: bank opening-balance posting; bank transfer create/void reversal; statement import persistence and import void blockers; statement transaction match/categorize/ignore, especially categorization journal posting; closed reconciliation period locks; reconciliation submit/approve/reopen/close/void lifecycle; and reconciliation CSV/PDF/archive output gates.
- DEV-03 Part 5 performed no login, fixture creation, or runtime mutation: no create, edit, import, preview-import, reconcile, submit, approve, close, void, reverse, match, categorize, ignore, transfer, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 6 inventory state-machine QA dry-run plan is completed in [docs/development/DEV_03_INVENTORY_STATE_MACHINE_DRY_RUN_PLAN.md](docs/development/DEV_03_INVENTORY_STATE_MACHINE_DRY_RUN_PLAN.md).
- Highest-risk inventory transitions: item inventory-tracking and warehouse archive gates; direct opening-balance stock movement boundary; inventory adjustment approve/void with no-negative-stock checks; warehouse transfer create/void with paired movement reversals; purchase receipt create/void and explicit receipt asset post/reverse; sales stock issue create/void and explicit COGS post/reverse; inventory settings/accounting readiness changes; clearing report output gates; and variance proposal create/submit/approve/post/reverse/void.
- DEV-03 Part 6 performed no login, fixture creation, or runtime mutation: no create, edit, approve, void, transfer, receive, issue, post, reverse, propose variance, approve variance, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 7 journals/reports/documents/output-gate dry-run plan is completed in [docs/development/DEV_03_JOURNALS_REPORTS_DOCUMENTS_OUTPUT_GATE_DRY_RUN_PLAN.md](docs/development/DEV_03_JOURNALS_REPORTS_DOCUMENTS_OUTPUT_GATE_DRY_RUN_PLAN.md).
- Highest-risk journals/reports/documents/output transitions: manual journal post/reverse with fiscal-period lock enforcement, fiscal period close/reopen/lock behavior, account/tax/number-sequence admin changes affecting future postings and outputs, report CSV/PDF permission and generated-document archive gates, generated-document download exposure, audit CSV export and retention settings, document settings output changes, and backup/storage metadata evidence gates.
- DEV-03 Part 7 performed no login, fixture creation, runtime mutation, export, download, PDF generation, generated-document archive creation, audit CSV export, backup/storage evidence mutation, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- DEV-03 Part 8 final state-machine QA triage is completed in [docs/development/DEV_03_FINAL_STATE_MACHINE_QA_TRIAGE.md](docs/development/DEV_03_FINAL_STATE_MACHINE_QA_TRIAGE.md).
- DEV-03 is completed as planning/triage only. No login, fixture creation, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, ZATCA, email, backup/restore, deploy, env change, production-hosting research, production check, beta check, or customer-data check was performed.
- Highest-risk consolidated areas: AR/AP lifecycle posting and allocation, bank transfer/statement/reconciliation state, inventory quantity/cost and posting lifecycles, manual journals/fiscal-period locks, report/document/audit output gates, and admin/audit side effects.
- DEV-04 Part 1 local disposable fixture implementation plan is completed in [docs/development/DEV_04_LOCAL_DISPOSABLE_FIXTURE_PLAN.md](docs/development/DEV_04_LOCAL_DISPOSABLE_FIXTURE_PLAN.md).
- DEV-04 Part 1 performed no fixture script creation, login, fixture data creation, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- Recommended fixture implementation approach: a dedicated local-only dry-run-first fixture runner that uses guarded direct Prisma only for base org/user/role/bootstrap setup after approval, then service/API-layer fixture creation for business records so validations and audit behavior are preserved. Demo/smoke helpers should be mined for target guards and idempotent patterns, not reused as default commands.
- DEV-04 Part 2 fixture script design is completed in [docs/development/DEV_04_FIXTURE_SCRIPT_DESIGN.md](docs/development/DEV_04_FIXTURE_SCRIPT_DESIGN.md).
- DEV-04 Part 2 performed no fixture script creation, login, fixture data creation, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- Proposed runner path and commands: `apps/api/scripts/dev04-fixture-runner.ts`; future API script `fixture:dev04`; future root helpers `fixture:dev04:plan`, `fixture:dev04:dry-run`, `fixture:dev04:cleanup-plan`, and manual-only `fixture:dev04:execute`.
- DEV-04 Part 3 dry-run skeleton is implemented in `apps/api/scripts/dev04-fixture-runner.ts` with tests in `apps/api/scripts/dev04-fixture-runner.spec.ts`.
- DEV-04 Part 3 package scripts added: API `fixture:dev04`; root `fixture:dev04:plan`, `fixture:dev04:dry-run`, and `fixture:dev04:cleanup-plan`. A root execute script was intentionally not added.
- DEV-04 Part 3 runner behavior: supports `--plan`, `--dry-run`, `--cleanup-plan`, `--family ar|ap|bank|inv|jrd|all`, `--marker DEV03-...|DEV04-...`, `--database-url`, `--api-url`, and `--json-summary`; refuses `--execute`, `--allow-local-mutation`, `--allow-login`, invalid markers, destructive operation terms, and production/beta/user-testing/hosted targets.
- DEV-04 Part 3 performed no login, fixture data creation, database connection, Prisma write, service-layer write, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- DEV-04 Part 4 fixture runner guard hardening is completed in `apps/api/scripts/dev04-fixture-runner.ts` with expanded tests in `apps/api/scripts/dev04-fixture-runner.spec.ts`.
- DEV-04 Part 4 guard behavior: generic `DATABASE_URL` is ignored by the dry-run runner; explicit `--database-url` or `LEDGERBYTE_DEV04_DATABASE_URL` can be validated only as local plan targets. Hosted/deployed target denylist coverage now includes Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, production, prod, and live target patterns.
- DEV-04 Part 4 output behavior: plan/dry-run/cleanup-plan output now states `NO DATA CREATED`, `NO DATABASE WRITES`, selected mode/family/marker, disabled execute/fixture/mutation/login status, cleanup-plan-only status, and the next manual approval needed before write behavior can be implemented. JSON summaries include explicit non-mutating flags.
- DEV-04 Part 4 tests added/updated: hosted URL variants, local URL variants, missing/generic database target behavior, marker edge cases, execute refusal, cleanup-plan no-delete wording, JSON non-mutating flags, and secret redaction coverage.
- DEV-04 Part 4 performed no execute run, login, fixture data creation, database connection, Prisma write, service-layer write, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- DEV-04 fixture runner is finalized in [docs/development/DEV_04_FINAL_FIXTURE_RUNNER_HANDOFF.md](docs/development/DEV_04_FINAL_FIXTURE_RUNNER_HANDOFF.md).
- DEV-04 safe commands available: root `fixture:dev04:plan`, `fixture:dev04:dry-run`, and `fixture:dev04:cleanup-plan`; API `fixture:dev04`. A root execute script still does not exist.
- DEV-04 Part 5 finalization status: execute mode is not enabled; fixture creation was not performed; database writes were not performed; login/audit-writing flows were not performed; runtime mutations were not performed.
- DEV-05 Part 1 approved local fixture creation plan is completed in [docs/development/DEV_05_LOCAL_FIXTURE_CREATION_APPROVAL_PLAN.md](docs/development/DEV_05_LOCAL_FIXTURE_CREATION_APPROVAL_PLAN.md).
- DEV-05 Part 1 approval checklist summary: future fixture creation requires explicit local disposable DB approval, fixture creation method/family/marker approval, login/audit-write approval if needed, cleanup/retention approval, and explicit no-production/no-beta/no-customer-data boundary approval.
- DEV-05 Part 1 proposed first target: Sales/AR local disposable fixtures with `DEV03-AR-...` markers, fake local data only, and bootstrap/base AR records only unless a later prompt expands scope.
- DEV-05 Part 1 status: execute mode was not enabled; no execute package script was added; no fixture data was created; no database connection or write was performed; no login/audit-writing flow was run; no runtime mutation was performed.
- DEV-05 Part 2 execute-gated fixture skeleton is completed in [docs/development/DEV_05_EXECUTE_GATED_FIXTURE_SKELETON.md](docs/development/DEV_05_EXECUTE_GATED_FIXTURE_SKELETON.md).
- DEV-05 Part 2 runner behavior: `--execute` now models future local-only approval gates and Sales/AR proposed records, but still exits refused with `executeEnabled=false`, `writesPerformed=false`, `NO DATA CREATED`, and `NO DATABASE WRITES`.
- DEV-05 Part 2 first future fixture family: Sales/AR with `DEV03-AR-...` markers.
- DEV-05 Part 2 status: execute mode did not actually run, no fixture data was created, no database connection/write occurred, no login/audit-writing flow ran, and no runtime mutation happened. A root execute package script still does not exist.
- DEV-05 Part 3A AR fixture creation preflight is completed in [docs/development/DEV_05_AR_FIXTURE_CREATION_PREFLIGHT.md](docs/development/DEV_05_AR_FIXTURE_CREATION_PREFLIGHT.md).
- DEV-05 Part 3A status: no execute mode actually ran, no login/audit-writing flow ran, no fixture data was created, no database connection/write occurred, and no runtime mutation happened.
- DEV-05 Part 3A exact future approval phrase before any local fixture write: `I approve DEV-05 Part 3B local-only AR fixture creation against a disposable local database. No production, no beta, no customer data.`
- DEV-05 Part 3B approved local AR fixture creation run is documented in [docs/development/DEV_05_AR_FIXTURE_CREATION_RUN.md](docs/development/DEV_05_AR_FIXTURE_CREATION_RUN.md).
- DEV-05 Part 3B approval was confirmed for local disposable Sales/AR base fixtures only, family `ar`, marker `DEV03-AR-20260524T130000`, fake local data only, and no production/beta/customer data.
- DEV-05 Part 3B runner update: the API runner now has a guarded approved local Sales/AR base-fixture execute path; no root execute package script was added.
- DEV-05 Part 3B result: fixture creation was blocked because the explicit local PostgreSQL target on `localhost:5432` was not reachable. Fixtures created: no. Database writes occurred: no. Successful database connection opened: no. Login/audit-writing occurred: no. AR lifecycle mutation occurred: no.
- DEV-05 Part 3C approved local AR fixture creation retry is documented in [docs/development/DEV_05_AR_FIXTURE_CREATION_RETRY.md](docs/development/DEV_05_AR_FIXTURE_CREATION_RETRY.md).
- DEV-05 Part 3C readiness result: local Docker Postgres `infra-postgres-1` was running and healthy; `localhost:5432` was listening and reachable. No Docker service was started, and no migration, seed, reset, delete, or environment change was run.
- DEV-05 Part 3C result: fixture creation completed for family `ar` with marker `DEV03-AR-20260524T130000`. Fixtures created: 12 base records. Database writes occurred: yes, only against the approved local target and only for marker-scoped Sales/AR base records. Login/audit-writing occurred: no. AR lifecycle mutation occurred: no. Output actions occurred: no.
- DEV-05 Part 3C created local fixture labels: `DEV03-AR-ORG-20260524T130000`, `DEV03-AR-USER-20260524T130000`, `DEV03-AR-ROLE-20260524T130000`, `DEV03-AR-USER-ROLE-20260524T130000`, `DEV03-AR-ACCT-AR-20260524T130000`, `DEV03-AR-ACCT-REV-20260524T130000`, `DEV03-AR-ACCT-VAT-20260524T130000`, `DEV03-AR-ACCT-CASH-20260524T130000`, `DEV03-AR-TAX-20260524T130000`, `DEV03-AR-CASH-20260524T130000`, `DEV03-AR-CUSTOMER-20260524T130000`, and `DEV03-AR-SERVICE-20260524T130000`.
- DEV-05 Part 4 local AR fixture evidence verification is completed in [docs/development/DEV_05_AR_FIXTURE_EVIDENCE.md](docs/development/DEV_05_AR_FIXTURE_EVIDENCE.md).
- DEV-05 Part 4 evidence result: read-only verification succeeded for family `ar` and marker `DEV03-AR-20260524T130000`; expected fixture count was 12 and actual fixture count was 12; all discovered labels matched the marker prefix; zero AR lifecycle, journal, generated-document, or audit-log side-effect records were found in the fixture organization.
- DEV-05 Part 4 status: no new fixture data was created, no database writes occurred in Part 4, no login/audit-writing flow ran, and no AR lifecycle mutation, export, download, PDF generation, archive generation, email, ZATCA, backup/restore, migration, seed/reset/delete, smoke, E2E, deploy, env change, production check, beta check, or customer-data check was run.
- DEV-05 Part 5 local AR fixture cleanup-plan validation is completed in [docs/development/DEV_05_AR_FIXTURE_CLEANUP_PLAN_VALIDATION.md](docs/development/DEV_05_AR_FIXTURE_CLEANUP_PLAN_VALIDATION.md).
- DEV-05 Part 5 cleanup-plan result: the cleanup-plan command remained plan-only, stated deletion is not implemented, printed `NO DATA CREATED` and `NO DATABASE WRITES`, and identified the Sales/AR cleanup inventory for family `ar` with marker `DEV03-AR-20260524T130000`. A read-only local inventory query found all 12 expected marker-scoped records and no non-marker records in the cleanup validation summary.
- DEV-05 Part 5 status: deletion occurred: no; database writes occurred in Part 5: no; login/audit-writing occurred: no; AR lifecycle mutation occurred: no; fixture creation, export, download, PDF generation, archive generation, email, ZATCA, backup/restore, migration, seed/reset/delete, smoke, E2E, deploy, env change, production check, beta check, and customer-data check were not run.
- DEV-06 Part 1 AR state-machine QA plan is completed in [docs/development/DEV_06_AR_STATE_MACHINE_QA_PLAN.md](docs/development/DEV_06_AR_STATE_MACHINE_QA_PLAN.md).
- DEV-06 Part 1 status: AR mutations were performed: no; fixture creation occurred: no; cleanup deletion occurred: no; DB writes occurred: no; login/audit-writing flows, exports/downloads/PDF/archive generation, ZATCA, email, backup/restore, smoke, E2E, migrations, seed/reset/delete, deploys, env changes, production checks, beta checks, and customer-data checks were not run.
- DEV-06 Part 1 recommended first AR mutation slice: local-only creation and edit of one draft sales invoice against marker `DEV03-AR-20260524T130000`, with no finalize, void, payment allocation, refund, credit note, export, download, PDF, archive, email, ZATCA, cleanup deletion, production, beta, or customer data.
- DEV-06 Part 1 exact approval phrase before mutation: `I approve DEV-06 Part 2 local-only AR draft invoice create/edit mutation against disposable local fixtures. No production, no beta, no customer data.`
- DEV-06 Part 2 approved local AR draft invoice create/edit mutation is completed in [docs/development/DEV_06_AR_DRAFT_INVOICE_MUTATION_RUN.md](docs/development/DEV_06_AR_DRAFT_INVOICE_MUTATION_RUN.md).
- DEV-06 Part 2 local readiness result: local Docker Postgres was running and healthy, `localhost:5432` was reachable, and the target was accepted only as an explicit local disposable database target.
- DEV-06 Part 2 mutation result: one draft sales invoice was created and edited against family `ar`, marker `DEV03-AR-20260524T130000`, with invoice number `INVOICE-000001`; status remained `DRAFT` after edit.
- DEV-06 Part 2 side effects: journal entries `0`; generated documents `0`; customer payments/refunds/credit notes/allocations `0`; finalized invoices `0`; voided invoices `0`; SalesInvoice audit logs `2` with actions `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`; invoice number sequence advanced as expected for local draft invoice creation.
- DEV-06 Part 2 status: finalize/void/allocation/refund/credit-note mutation/PDF/archive/email/ZATCA did not occur; login/audit-writing browser flows did not run; cleanup deletion, fixture creation, migrations, seed/reset/delete, deploys, env changes, production checks, beta checks, and customer-data checks were not run.
- DEV-06 Part 3 read-only AR draft invoice evidence verification is completed in [docs/development/DEV_06_AR_DRAFT_INVOICE_EVIDENCE_VERIFICATION.md](docs/development/DEV_06_AR_DRAFT_INVOICE_EVIDENCE_VERIFICATION.md).
- DEV-06 Part 3 evidence result: local Docker Postgres was running and healthy, `localhost:5432` was reachable, marker `DEV03-AR-20260524T130000` and family `ar` were verified, the base fixture count remained `12`, `INVOICE-000001` matched safe id prefix `6ebb2d71`, and invoice status remained `DRAFT`.
- DEV-06 Part 3 side-effect result: finalized invoices `0`; voided invoices `0`; journal entries `0`; generated documents `0`; customer payments/refunds/credit notes/allocations `0`; ZATCA metadata/artifacts/submission logs `0`; email outbox/provider events `0`; SalesInvoice audit logs `2` with actions `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`; auth/login audit logs `0`; invoice sequence next number remained `2`.
- DEV-06 Part 3 status: no mutation was performed, no new fixture data was created, no database write occurred, no cleanup deletion ran, no login/browser audit-writing flow ran, and no finalize/void/allocation/refund/credit-note mutation/export/download/PDF/archive/email/ZATCA action occurred.
- DEV-06 Part 4 local AR invoice finalize mutation plan is completed in [docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_PLAN.md](docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_PLAN.md).
- DEV-06 Part 4 expected finalization side effects from inspected code: `INVOICE-000001` should transition `DRAFT -> FINALIZED`, one posted journal entry should be created, balance due should remain equal to the invoice total until payment/credit allocation, one `SALES_INVOICE_FINALIZED` audit log should be written, and local `ZatcaInvoiceMetadata` should be upserted for `STANDARD_TAX_INVOICE`.
- DEV-06 Part 4 expected non-effects from inspected code: finalization does not call generated-document archive/PDF routes, does not send email, does not run ZATCA XML/signing/submission, does not create payments/refunds/credit notes/allocations, does not create reversal journals, and does not delete fixtures.
- DEV-06 Part 4 status: mutation performed: no; invoice finalization did not run; database writes occurred: no; fixture creation, cleanup deletion, login/browser audit-writing flows, export/download/PDF/archive, email, ZATCA XML/signing/submission, migrations, seed/reset/delete, deploys, env changes, production checks, beta checks, and customer-data checks were not run.
- DEV-06 Part 4 exact approval phrase before Part 5: `I approve DEV-06 Part 5 local-only AR invoice finalize mutation for fixture invoice INVOICE-000001 under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-06 Part 5: approved local AR invoice finalize mutation`.

## Current PROD-A1 Objective

- `PROD-A1 Final hosting ADR` is complete through final verification/handoff.
- The ADR is drafted/proposed only, not accepted or implemented.
- Keep follow-up work docs-only unless a future ticket explicitly approves production-affecting provider, credential, data, DNS, deployment, backup, email, or ZATCA actions.

## Current Vercel Posture

- Vercel is the current beta/user-testing and staging path only.
- Do not treat Vercel as accepted final production hosting.
- [ADR-001](docs/production/adrs/ADR-001-final-production-hosting.md) recommends an AWS production stack for paid SaaS v1, but Vercel remains beta/user-testing/staging only until separately approved.
- Current user-testing targets are `ledgerbyte-api-test` and `ledgerbyte-web-test`, backed by Supabase Postgres for testing.
- Any final production hosting decision must account for API runtime fit, background workers, queues, logs, rollback, secrets, storage, database connectivity, cost, support, and operational load.

## PROD-A1 Part 1 - Hosting Requirements Inventory

- Web app hosting needs: host `apps/web` as a Next.js 16/React 19 pnpm workspace app with `experimental.externalDir`, per-environment `NEXT_PUBLIC_API_URL`, domain/cert planning, caching/asset delivery, error monitoring, and a strict beta-to-production boundary.
- API hosting needs: host the NestJS/Express/Prisma API on a predictable Node runtime with connection pooling budget, request/memory/timeouts, cold-start posture, CORS/JWT config, health/readiness checks, logs, rollback, and handoff for long-running work.
- Worker/queue needs: production workers are not wired yet; final hosting needs a separate worker runtime for email retries, reports/exports, cleanup, future ZATCA jobs, graceful shutdown, retries, dead-letter handling, heartbeats, and no serverless request coupling.
- Redis/BullMQ needs: repo has `REDIS_URL` and a Redis/BullMQ target posture only; choose managed Redis or equivalent with queue naming, lock timeouts, retry/dead-letter policy, dashboards, alerts, data retention, and worker connectivity.
- PostgreSQL needs: Prisma uses PostgreSQL with `DATABASE_URL` runtime access and `DIRECT_URL` migration access; production needs pooling, PITR/restore, migration/admin credential split, least-privilege runtime role, tenant isolation/RLS/Data API decision, auditability, support, region, and cost review.
- Object storage/document needs: attachments default to DB/base64 and S3 is feature-flagged for new uploads; generated documents remain DB-backed, so production needs private object storage, signed access, lifecycle/retention, backup/restore, scanning, migration executor, and metadata-only evidence.
- PDF/document generation needs: `@ledgerbyte/pdf-core` renders operational PDFs in process with PDFKit and archives generated PDFs in DB today; production needs CPU/memory sizing, archival storage policy, accountant/PDF review, and a separate PDF/A-3 path only after ZATCA signing is stable.
- Backups/PITR needs: current backup readiness is metadata/planning plus local drill only; production needs hosted DB backup/PITR proof, hosted restore drill, object-storage restore proof, generated-doc/attachment backup evidence, RPO/RTO approval, and no customer-content exposure in evidence.
- Monitoring/logging needs: health/readiness exist but the production monitoring stack is undecided; needs uptime, API error, worker/queue, email, backup, storage, and ZATCA job monitoring with alert routing, redaction, and no request/response body logging.
- Secrets needs: production must manage DB URLs, JWT, SMTP/provider secrets, S3 credentials, queue credentials, hosting tokens, and future ZATCA key/CSID material in secrets manager/KMS with access control, rotation, audit, and emergency revoke.
- Rollback/deployment safety needs: final hosting must document deploy rollback, migration rollback decision tree, env rollback, queue pause/drain, worker shutdown, status/support communication, promotion gates, and approved non-production smoke/E2E target policy.
- Region/data residency considerations: hosting comparison must include Saudi-first customer expectations, provider region choices, database/object-storage data location, support/data-processing notes, backups/replicas, subprocessors, and separation for local, user-testing, paid private beta, production, and ZATCA environments.
- ZATCA integration needs: production compliance remains blocked; future hosting must support no-network mock defaults, optional local SDK Java 11-14 validation/CI wrapper, sandbox OTP/CSID, signing, clearance/reporting, PDF/A-3, retry queue, audit evidence, specialist signoff, and KMS/secrets custody before any claim.
- Email provider needs: default remains mock/SMTP-disabled; production needs provider decision, domain/SPF/DKIM/DMARC evidence, allowlisted non-production relay proof, signed provider webhooks, suppression/bounce handling, retry scheduler/worker, monitoring/alerts, and invoice/statement send policy.
- Billing integration needs: no billing integration exists; hosting plan must leave room for manual billing or a payment provider, subscription/tenant limits, billing webhooks/jobs, receipts/invoices for LedgerByte itself, cancellation/refund policy, and legal/privacy review before paid launch.

## PROD-A1 Part 2 - Official Provider Research

### Option A - AWS Production Stack

- Official docs consulted: [Amplify Next.js support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html), [App Runner](https://docs.aws.amazon.com/en_us/apprunner/), [RDS automated backups/PITR](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html), [ElastiCache snapshot/restore](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups.html), [Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/), [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html), [SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html), and [CloudWatch alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Alarms.html).
- Facts: App Runner is a managed source/container path for scalable web/API services; Amplify Hosting compute officially supports Next.js 12-15 SSR while this repo currently uses Next.js 16; RDS automated backups support PITR within the configured retention period and manual snapshots; ElastiCache Valkey/Redis OSS supports snapshot/restore; S3 supports private object storage patterns with versioning/lifecycle controls; Secrets Manager supports managed secret storage/rotation and CloudWatch supports metric/composite alarms.
- Pros for LedgerByte: most complete first-party fit for API, workers, PostgreSQL, Redis, object storage, secrets, monitoring, and backup proof; strongest path for least-privilege IAM, VPC isolation, PITR evidence, restore drills, S3 document storage, and future ZATCA secret custody.
- Cons/risks for LedgerByte: highest operational complexity and cost surface; needs explicit web choice because Amplify's documented Next.js support trails the repo's Next.js 16; requires careful IAM/VPC/egress/log-retention design and an owner for AWS operations.
- Suitability for paid SaaS v1: strong candidate if LedgerByte accepts AWS operational overhead and uses a container/API-worker architecture rather than assuming Amplify can host the current Next.js app unchanged.

### Option B - DigitalOcean Production Stack

- Official docs consulted: [App Platform monorepos](https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-monorepo/), [App Platform workers](https://docs.digitalocean.com/products/app-platform/how-to/manage-workers/), [App Platform logs](https://docs.digitalocean.com/products/app-platform/how-to/view-logs/index.html), [Managed Databases](https://docs.digitalocean.com/products/databases/), [Valkey limits](https://docs.digitalocean.com/products/databases/valkey/details/limits/), and [Spaces features](https://docs.digitalocean.com/products/spaces/details/features/).
- Facts: App Platform supports monorepo deployment and non-routable workers; App Platform exposes activity/build/deploy/runtime/crash logs and log forwarding; Managed Databases include PostgreSQL with daily backups, PITR, standby nodes, SSL, VPC, logs, and metrics; DigitalOcean Valkey is Redis-compatible but its limits page says no backups/PITR, connection pooling, read-only nodes, or query statistics; Spaces is S3-compatible object storage with HTTPS and CDN options.
- Pros for LedgerByte: simpler than AWS while covering web/API workers, managed Postgres, S3-compatible storage, logs, and a Redis-compatible queue endpoint; likely faster to operate for paid SaaS v1 if the team wants a smaller cloud surface.
- Cons/risks for LedgerByte: Valkey backup/PITR gap is material for queue durability evidence; secrets/KMS, audit, alerting, and rollback maturity need explicit proof; Droplets/Kubernetes fallback would increase ops burden and should not be selected without a named operator.
- Suitability for paid SaaS v1: plausible candidate if the ADR accepts App Platform workers and managed Postgres, and either treats Redis as rebuildable queue state or uses another Redis provider with stronger backup/monitoring evidence.

### Option C - Render/Fly/Railway-Style Managed App Hosting

- Official docs consulted: Render [service types](https://render.com/docs/service-types/), [background workers](https://render.com/docs/background-workers/), [Postgres recovery/backups](https://render.com/docs/postgresql-backups), [Key Value](https://render.com/docs/key-value), and [logs](https://render.com/docs/logging); Fly.io [process groups](https://fly.io/docs/launch/processes/), [Managed Postgres](https://fly.io/docs/mpg/), [Upstash Redis](https://fly.io/docs/upstash/redis/), [Tigris object storage](https://fly.io/docs/tigris/), and [monitoring](https://fly.io/docs/monitoring/); Railway [storage buckets](https://docs.railway.com/storage-buckets), [Redis](https://docs.railway.com/guides/redis), [volume backups](https://docs.railway.com/volumes/backups), and [data/storage overview](https://docs.railway.com/data-storage).
- Facts: Render supports web services, static sites, private services, background workers, cron jobs, Redis-compatible Key Value, and paid Postgres PITR, but general object storage appears to require MinIO-on-disk or an external/partner object store; Fly supports Dockerized apps with independently scalable process groups, Managed Postgres with HA/backups/pooling, Upstash Redis, Tigris S3-compatible storage, logs, and metrics, while some Managed Postgres features remain under development; Railway supports services, private networking, volumes/backups, Redis/Postgres templates, and private S3-compatible Buckets, but its Redis guide describes the template as unmanaged.
- Pros for LedgerByte: fastest app/worker path, low platform-management burden, straightforward private-beta ergonomics, and enough primitives to model web/API/worker/Postgres/Redis/storage if restore evidence is proven.
- Cons/risks for LedgerByte: provider maturity varies by data component; Render has an object-storage gap for LedgerByte documents; Fly relies on partner services for Redis/object storage and has Managed Postgres feature gaps; Railway database/Redis templates and volume backups need stronger production proof than a regulated accounting SaaS should assume.
- Suitability for paid SaaS v1: usable for controlled paid private beta only after restore drills, queue behavior, log retention, alerting, object storage, and region/data-residency evidence are proven; weaker default for final paid SaaS v1 than AWS unless simplicity is prioritized over platform depth.

### Option D - Hybrid Vercel Web Plus Production Backend

- Official docs consulted: Vercel [Next.js on Vercel](https://vercel.com/docs/concepts/next.js/overview), [Environments](https://vercel.com/docs/deployments/production-env), [Functions limits](https://vercel.com/docs/functions/limitations/), [Function duration](https://vercel.com/docs/functions/configuring-functions/duration), [Logs](https://vercel.com/docs/observability/logs), and [rollback CLI](https://vercel.com/docs/cli/rollback), plus the production-provider docs listed above for API/workers/DB/Redis/storage.
- Facts: Vercel provides first-class Next.js hosting, preview URLs, environment separation, function limits/duration controls, logs, and rollback tooling; the current LedgerByte posture keeps Vercel beta/user-testing/staging only; a hybrid could put only the web/static frontend on Vercel and move API/workers/Postgres/Redis/object storage to AWS, DigitalOcean, or another approved production provider; this requires strict `NEXT_PUBLIC_API_URL`, CORS, secrets, observability, and rollback coordination across providers.
- Pros for LedgerByte: minimizes frontend migration, preserves current user-testing workflow, and can pair Vercel's web/deploy preview strengths with a backend provider better suited to long-running workers, Prisma pooling, Redis queues, backups, and object storage.
- Cons/risks for LedgerByte: cross-provider incident response, logs, secrets, deploy ordering, CORS, latency, domains, and rollback are harder; Vercel must remain non-production unless separately approved, and Vercel Functions should not become the final API/worker runtime by accident.
- Suitability for paid SaaS v1: transitional candidate for web-only hosting after explicit approval; not the default final production posture for LedgerByte until the ADR proves the backend provider, split-ops model, and Vercel production approval gates.

## Known Blockers

- `ADR-001 Final production hosting provider` is drafted/proposed, but not accepted or implemented.
- AWS is recommended for paid SaaS v1, but no provider has been provisioned and no production deployment has occurred.
- Production database provider and least-privilege Prisma runtime role decisions remain unresolved.
- Supabase RLS/Data API strategy remains unresolved; current user-testing mitigation is not a production launch posture.
- Backup/PITR proof, restore drill, object storage policy, monitoring stack, secrets management, incident/support process, billing/legal ownership, and ZATCA production strategy remain open production-foundation work.
- Full deployed smoke and full deployed E2E are not current production launch gates until a safe approved non-production target and credential/data policy are defined.
- Real ZATCA production compliance is not enabled; CSID, signing, clearance/reporting, PDF/A-3, real ZATCA network calls, production credentials, and production compliance claims remain blocked.

## PROD-A1 Part 5 - Final Verification And Handoff

### PROD-A1 Result

- Hosting requirements were inventoried from the repo.
- Official provider research notes were captured for AWS, DigitalOcean, Render/Fly/Railway-style managed hosting, and a hybrid Vercel-web/backend-provider option.
- [ADR-001 final production hosting](docs/production/adrs/ADR-001-final-production-hosting.md) was created with status `proposed`.
- Production docs now reference ADR-001 and state that implementation has not started, the provider is not provisioned, and no production deploy was performed.

### Files Changed Across PROD-A1

- `CODEX_HANDOFF.md`
- `docs/production/adrs/ADR-001-final-production-hosting.md`
- `docs/production/ARCHITECTURE_DECISION_RECORDS.md`
- `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md`
- `docs/production/NEXT_10_PRODUCTION_TICKETS.md`
- `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md`
- `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`
- `README.md`
- `BUG_AUDIT.md`

### Checks Run

- `git status --short`
- `git log -1 --oneline`
- `git diff --check`
- `git diff --cached --check` was conditionally checked; it was skipped before this handoff update because no files were staged.
- Safety wording search with `rg` for beta/user-testing, proposed/not implemented, no provider provisioning, no production deploy, no Supabase/Vercel env changes, migrations, backups, ZATCA, email, and app-test guard wording.
- Existing package-script search for link/markdown checks found no dedicated link-check script.
- Lightweight `Test-Path` check passed for the PROD-A1 handoff, ADR, production planning docs, README, and audit paths.

### Skipped Commands And Why

- Full smoke: skipped because no app code changed and no approved safe runtime target was requested.
- Full E2E: skipped because no app code changed and deployed/runtime verification was out of scope.
- Migrations: skipped because schema/data mutation was forbidden.
- Seed/reset/delete: skipped because data mutation/destructive operations were forbidden.
- RLS/runtime-role work: skipped because Supabase RLS and runtime DB role changes were forbidden.
- Vercel/Supabase env changes: skipped because env mutations and provider settings changes were forbidden.
- Real ZATCA: skipped because ZATCA behavior, credentials, network calls, and production cutover were forbidden.
- Real email: skipped because email behavior and real sends were forbidden.
- Backups/restores: skipped because backup/restore execution was forbidden.
- App tests: skipped because no app code changed.

### Remaining Blockers

- ADR-001 still needs owner review and acceptance before any implementation ticket mutates production-intended providers or credentials.
- Exact AWS region, account structure, IAM/VPC topology, service tiers, support plan, cost guardrails, and day-two owner are undecided.
- Next.js 16 production web hosting path needs validation.
- Database runtime role, migration credential separation, RLS/Data API strategy, backup/PITR proof, restore drills, object storage backup/restore, monitoring, secrets/KMS, incident/support, legal/accountant, billing, and ZATCA gates remain unresolved.

### Recommended Next Implementation Ticket

- `PROD-A2 API hosting decision`: define the production NestJS/Prisma API runtime, connection pooling, timeouts, logs, rollback, and worker handoff against the proposed AWS direction without deploying or mutating infrastructure.

## PROD-A2 Part 1 - API Hosting Inventory

- API framework/runtime: `apps/api` is a NestJS 11 API on Express 5, TypeScript/CommonJS, Node-oriented runtime, with `ConfigModule.forRoot({ isGlobal: true })`, global validation pipes, CORS from config, and Prisma in the main module.
- API start/build commands: root `build` runs workspace builds; API scripts are `dev` (`nest start --watch --entryFile apps/api/src/main`), `build` (`nest build`), `start` (`node dist/apps/api/src/main.js`), `db:generate`, `db:migrate`, and smoke commands; Vercel beta API uses root `vercel.json`, `api/index.js`, `apps/api/api/index.ts`, and `scripts/vercel-postinstall.cjs`.
- Required environment categories: runtime DB and migration DB URLs, Prisma connection/transaction tuning, JWT auth, CORS/web URL, API port, email provider/SMTP/webhook/retry-worker gates, ZATCA adapter/SDK/custody gates, attachment/generated-document storage provider, S3-compatible object storage settings, and deployment target flags; do not expose values.
- Database dependency: Prisma PostgreSQL datasource uses `DATABASE_URL` plus `DIRECT_URL`; `PrismaService` connects on module init, disconnects on shutdown, normalizes Supabase pooler URLs for Vercel, applies `connection_limit`, and `/readiness` depends on a safe `SELECT 1`.
- Redis/queue dependency: `REDIS_URL` exists in env examples and local Docker Compose, but no BullMQ dependency or active Redis queue integration was found in `apps/api`; current docs say Redis/BullMQ is infrastructure groundwork and not required by current workflows.
- Worker separation needs: long-running background workers are not implemented; email retry worker paths are API/admin-controlled and disabled by default, so production hosting needs a separate worker process for retries, exports/reports, cleanup, and future ZATCA work instead of tying jobs to request handling or Vercel functions.
- Storage/document dependency: attachments default to database/base64 storage with optional S3-compatible provider selected by env and requiring bucket/endpoint/credential config; generated documents currently archive PDF buffers as database-backed base64, so production needs object-storage policy and migration planning before scale.
- PDF generation/runtime needs: invoices, purchase bills, and reports render PDFs in-process through `@ledgerbyte/pdf-core`, return `application/pdf`, and archive generated PDFs; API hosting must budget CPU/memory/timeouts for synchronous PDF generation and avoid assuming PDF/A-3/ZATCA artifact storage is complete.
- ZATCA/network dependency: default posture is mock/no real network; sandbox HTTP paths are gated and production CSID/signing/clearance/reporting/PDF/A-3 remain blocked; API hosting must support future outbound network, Java/SDK paths, temp files, and secrets custody only after separate ZATCA approval.
- Email dependency: default provider is mock or SMTP-disabled; SMTP sends, diagnostics, retry processor, retry worker, and provider webhooks are guarded by env gates, so production needs provider secrets, webhook verification, scheduling/worker separation, monitoring evidence, and no real sending until explicitly approved.
- Health check readiness: API root returns safe service metadata, `/health` is lightweight and DB-free, and `/readiness` checks database connectivity and returns safe `503` JSON on DB failure; production hosting should wire health, readiness, logging, and alerting separately.
- Containerization readiness: no production Dockerfile was found; local `infra/docker-compose.yml` uses `node:22-alpine` with Postgres and Redis for development, while current beta deployment is Vercel serverless wrapper only; PROD-A2 must decide an AWS container/app runtime and produce a production image/run command plan later.
- Known blockers/risks for API production hosting: Vercel remains beta/user-testing/staging only; current Vercel max duration/memory wrapper is not final production API hosting; exact AWS API runtime is undecided; Next.js 16 web hosting remains separate; least-privilege DB role, RLS/Data API strategy, backup/PITR proof, object storage, secrets/KMS, worker/queue operations, monitoring, rollback, email provider, and ZATCA gates remain unresolved.

## PROD-A2 Part 2 - Official API Hosting Research

### Option A - AWS App Runner

- Official docs consulted: [App Runner availability change](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html), [App Runner architecture and concepts](https://docs.aws.amazon.com/apprunner/latest/dg/architecture.html), [source image services](https://docs.aws.amazon.com/apprunner/latest/dg/service-source-image.html), [environment variables and secrets](https://docs.aws.amazon.com/apprunner/latest/dg/env-variable-manage.html), [health checks](https://docs.aws.amazon.com/apprunner/latest/dg/manage-configure-healthcheck.html), [VPC access](https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html), and [CloudWatch logs](https://docs.aws.amazon.com/apprunner/latest/dg/monitor-cwl.html).
- Facts:
  - AWS says App Runner is closed to new customers starting April 30, 2026; existing customers can continue, but AWS does not plan new features.
  - App Runner can run source-code or ECR/ECR Public image services and manages service startup, scaling, and load balancing.
  - It supports plain environment variables plus references to AWS Secrets Manager and SSM Parameter Store.
  - Health checks can be TCP or HTTP with configurable path, interval, timeout, and thresholds.
  - VPC connectors allow outbound access to private VPC resources such as RDS and ElastiCache, with documented one-time connector startup latency.
  - Deployment and application logs stream to CloudWatch Logs.
- Pros for LedgerByte API:
  - Operationally simple managed container path for a NestJS/Express API if the AWS account is already eligible.
  - Direct HTTP health-check fit for `/health`; VPC connector could reach private RDS/ElastiCache.
  - Secrets Manager/SSM references fit the future secrets-management direction.
- Cons/risks for LedgerByte API:
  - Closure to new customers makes it unsafe as a fresh paid SaaS v1 target.
  - No-new-features posture is a strategic risk for a production foundation.
  - Less clean than ECS for explicit API/worker service topology, day-two control, and rollback runbooks; the consulted docs did not identify an ECS-style automatic failed-deploy rollback primitive.
  - Production Dockerfile, image pipeline, VPC, secrets, logs, and rollback still need separate implementation tickets.
- Suitability rating for paid SaaS v1: Not recommended for now.

### Option B - AWS ECS Fargate

- Official docs consulted: [ECS Linux task for Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-fargate.html), [Fargate task networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html), [load balancer health checks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-healthcheck.html), [Secrets Manager environment variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html), [CloudWatch logs](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html), [service auto scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html), and [deployment circuit breaker rollback](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html).
- Facts:
  - ECS runs containers as tasks and services; Fargate provides serverless infrastructure for those tasks.
  - Fargate tasks use `awsvpc` networking with task ENIs, security groups, and VPC placement suitable for private RDS/ElastiCache access.
  - Fargate services support Application Load Balancer or Network Load Balancer; target groups perform health checks and ECS monitors the target health.
  - Task definitions can inject Secrets Manager secrets into container environment variables, with platform-version requirements and redeploy needed after secret rotation.
  - Fargate tasks can send container stdout/stderr to CloudWatch Logs through the `awslogs` driver.
  - ECS Service Auto Scaling uses CloudWatch metrics; the deployment circuit breaker can mark failed deployments and roll back to the last completed deployment.
- Pros for LedgerByte API:
  - Strongest API fit under the proposed AWS direction: predictable container runtime, explicit CPU/memory, VPC isolation, RDS/ElastiCache/S3/secrets alignment, and CloudWatch/EventBridge hooks.
  - Cleanly supports separate API and worker services, either sharing one image with different commands or using separate task definitions.
  - Best fit for future worker queues, PDF CPU/memory sizing, graceful shutdown, rolling deploys, and rollback controls.
- Cons/risks for LedgerByte API:
  - Highest implementation workload among the API-hosting options.
  - Requires production Dockerfile, image registry, CI/CD, IAM roles, VPC/subnet/security-group design, ALB target groups, log retention, and cost guardrails.
  - Prisma connection budget, task concurrency, RDS pooling, worker scaling, and migration/admin credential separation remain undecided.
- Suitability rating for paid SaaS v1: Strong candidate.

### Option C - AWS Elastic Beanstalk

- Official docs consulted: [Node.js applications on Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_nodejs.html), [Docker containers on Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_docker.html), [environment secrets](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/AWSHowTo.secrets.env-vars.html), [health monitoring](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-health.html), [deployment policies](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html), and [deployment logs](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-deployment-logs.html).
- Facts:
  - Elastic Beanstalk supports Node.js web applications and Docker container deployment.
  - It can fetch Secrets Manager and SSM Parameter Store values into environment variables on supported platform versions, but rotated secrets require a manual refresh/restart path.
  - Health monitoring can track environment status and drive alarms.
  - Deployment policies include all-at-once, rolling, rolling with additional batch, immutable, and traffic splitting; traffic splitting can shift back if new instances fail health checks or deployment is aborted.
  - Deployment logs are available for recent platform versions and are uploaded to S3 for console viewing when permissions and VPC access allow it.
- Pros for LedgerByte API:
  - Lower AWS learning curve than ECS while still keeping API hosting inside AWS.
  - Native Node.js or Docker support can run a NestJS/Express API with conventional environment variables.
  - Built-in health, deployment policy, and deployment log surfaces are useful for a small team.
- Cons/risks for LedgerByte API:
  - Less explicit control than ECS over API and worker services, task-level networking, and queue-worker operations.
  - Still creates AWS resources that need ownership: EC2/Auto Scaling, load balancer, instance profiles, security groups, logs, platform updates, and S3 log permissions.
  - Secret rotation, platform lifecycle, worker topology, and rollback runbooks need more proof before paid SaaS use.
- Suitability rating for paid SaaS v1: Backup option.

### Option D - DigitalOcean App Platform

- Official docs consulted: [App Platform app spec](https://docs.digitalocean.com/products/app-platform/reference/app-spec/), [App Platform workers](https://docs.digitalocean.com/products/app-platform/how-to/manage-workers/), [App Platform deployments and rollback](https://docs.digitalocean.com/products/app-platform/how-to/manage-deployments/), and [DigitalOcean Managed Databases](https://docs.digitalocean.com/products/databases).
- Facts:
  - App Platform is a managed PaaS that deploys from Git repositories or container images and automatically builds, deploys, scales, and handles underlying infrastructure.
  - App specs support public services, workers, jobs, app-level environment variables, encrypted secret variables, alerts, instance counts, autoscaling, VPC, health checks, liveness health checks, and log destinations.
  - Workers are not externally routable; they are intended for background application code separate from web services.
  - App Platform rollback can restore one of the ten most recent successful deployments and restores code, configuration, and app spec, not database data.
  - DigitalOcean Managed Databases include PostgreSQL with daily backups/PITR, standby nodes, SSL, VPC, logs, and metrics; the same feature table shows Valkey is Redis-compatible but lacks daily point-in-time backups.
- Pros for LedgerByte API:
  - Faster operational path than AWS if AWS ownership, cost, or setup timing delays PROD-A2.
  - Supports separate web/API service and worker components with encrypted env vars and rollback ergonomics.
  - Managed PostgreSQL and Valkey can cover the current API dependency and future Redis-like queue endpoint, subject to queue durability policy.
- Cons/risks for LedgerByte API:
  - Weaker first-party depth than AWS for IAM/KMS-style custody, VPC design, observability, and regulated accounting SaaS evidence.
  - Valkey backup/PITR gap is material if queue state must be recoverable rather than rebuildable.
  - Need proof for private networking, log retention/export, alerting, object storage, restore drills, support tier, and production region/data-processing expectations.
- Suitability rating for paid SaaS v1: Possible candidate.

### Option E - Render/Fly/Railway-Style Managed API Hosting

- Official docs consulted: Render [service types](https://render.com/docs/service-types/), [web services](https://render.com/docs/web-services), [background workers](https://render.com/docs/background-workers), [Postgres recovery/backups](https://render.com/docs/postgresql-backups), [Key Value](https://render.com/docs/key-value), and [rollbacks](https://render.com/docs/rollbacks); Fly.io [process groups](https://fly.io/docs/launch/processes/), [secrets](https://fly.io/docs/apps/secrets/), [databases and storage](https://fly.io/docs/database-storage-guides/), and [Tigris object storage](https://fly.io/docs/tigris/); Railway [services](https://docs.railway.com/services), [deployments](https://docs.railway.com/deployments/reference), [variables](https://docs.railway.com/variables/reference), [logs](https://docs.railway.com/observability/logs), [data/storage](https://docs.railway.com/data-storage), and [storage buckets](https://docs.railway.com/guides/storage-buckets).
- Facts:
  - Render supports web services, private services, background workers, cron jobs, Postgres, Redis-compatible Key Value, service env vars, private networking, logs, and service rollbacks.
  - Render paid Postgres supports PITR with plan-dependent recovery windows; Render Key Value is Redis-compatible and paid instances have disk-backed persistence.
  - Fly apps ship as Docker images and can define multiple process groups for separate web/worker commands; secrets are encrypted and injected into Machines at boot.
  - Fly positions Managed Postgres as production-ready and lists Upstash Redis plus Tigris S3-compatible object storage as storage options.
  - Railway services deploy from GitHub, local source, or Docker images; it supports persistent services, scheduled jobs, private networking, variables, deployment logs, rollback, Postgres/Redis templates, volumes/backups, and S3-compatible storage buckets.
- Pros for LedgerByte API:
  - Fastest developer experience for a controlled private-beta API and worker deployment.
  - Render and Fly both map naturally to separate API/worker processes; Railway can host persistent API services and scheduled jobs.
  - Useful fallback family if AWS is delayed and the team prioritizes speed over platform depth for a limited paid private beta.
- Cons/risks for LedgerByte API:
  - Provider maturity varies across database, Redis/queue, object storage, backup, log retention, alerting, and rollback semantics.
  - Railway database/Redis templates, Render object-storage strategy, and Fly partner-service dependencies need stronger paid-SaaS evidence than the current repo has.
  - Region/data-residency, support plans, incident response, restore drills, secret custody, and queue failure handling need explicit proof before production launch.
- Suitability rating for paid SaaS v1: Backup option.

### Preliminary API Hosting Shortlist

- Recommended shortlist for PROD-A2 Part 3:
  - Primary: AWS ECS Fargate for separate API and worker services.
  - Secondary fallback: DigitalOcean App Platform if AWS day-two ownership, cost, or implementation time blocks the first production API path.
  - AWS fallback: Elastic Beanstalk only if the team wants an AWS-managed app platform and accepts less explicit worker/queue control than ECS.
  - Exclude for now: AWS App Runner as a fresh target because it is closed to new customers; Render/Fly/Railway remain backup/private-beta options until production evidence is stronger.
- Key decision criteria still needed:
  - Production Dockerfile/image strategy, build pipeline, deploy promotion, and rollback owner.
  - API CPU/memory/timeout budget for synchronous PDF generation and Prisma request patterns.
  - VPC/private-network path to PostgreSQL, Redis/queue, object storage, and secrets manager.
  - Prisma connection pooling budget, runtime DB role, migration/admin credential separation, and RLS/Data API decision.
  - Log retention/redaction, health/readiness routing, alerting, support plan, cost guardrails, and region/data-processing posture.
- API and workers should be hosted as separate services, not one combined runtime. They may share a container image later, but API request handling, retries, reports/exports, cleanup, future email work, and future ZATCA jobs need separate scaling, health, shutdown, logs, queue credentials, and deploy controls.
- Production blockers that must stay unresolved until actual provisioning tickets: provider accounts/resources, production Docker image, RDS/PostgreSQL, ElastiCache/Valkey/Redis, object storage buckets, Secrets Manager/KMS/SSM values, ALB/DNS/certificates, live monitors, production env vars, migrations, backups/restores, RLS/runtime DB roles, email sending, ZATCA credentials/network calls, and customer-data movement.

## PROD-A2 Part 5 - Final Verification And Handoff

### Latest Commit Inspected

- `bf7a6dc Update production docs for API hosting decision`
- `HEAD` and `origin/main` both resolved to `bf7a6dcdc1422339edf1649e9343923dc83f9261` before this handoff update.

### PROD-A2 Result

- PROD-A2 is complete as planning/decision documentation only.
- Current API runtime inventory was captured from the repo.
- Official API hosting research was captured in this handoff using official provider docs only.
- [ADR-013 API hosting decision](docs/production/adrs/ADR-013-api-hosting-decision.md) is drafted/proposed; ADR-013 was used because ADR-002 is reserved for the production database provider.
- Production docs were updated to reference ADR-013 and to state that API hosting is proposed, not implemented.
- Implementation has not started: no API provider/service is provisioned, ECS/Fargate is not configured, worker hosting is not configured, no production API deploy was performed, no env vars changed, and no database, Redis, storage, ZATCA, email, accounting logic, or customer data changed.

### ADR-013 Recommendation Summary

- Primary paid SaaS v1 API recommendation: AWS ECS Fargate.
- Host the API and worker as separate ECS Fargate services, even if they share one container image.
- Align with ADR-001: use RDS PostgreSQL, managed Redis/ElastiCache, centralized secrets, and CloudWatch-compatible logging/monitoring.
- Keep DigitalOcean App Platform as secondary fallback if AWS is delayed.
- Keep Elastic Beanstalk as AWS fallback only.
- Do not recommend AWS App Runner for a fresh target because official AWS docs say it is closed to new customers as of April 30, 2026.
- Keep Render/Fly/Railway-style hosting as backup/private-beta only.
- Keep Vercel beta/user-testing/staging only, not final API production hosting.

### Files Changed Across PROD-A2

- `CODEX_HANDOFF.md`
- `docs/production/adrs/ADR-013-api-hosting-decision.md`
- `docs/production/ARCHITECTURE_DECISION_RECORDS.md`
- `docs/production/NEXT_10_PRODUCTION_TICKETS.md`
- `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md`
- `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md`
- `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`
- `README.md`
- `BUG_AUDIT.md`
- No app code changed for PROD-A2. Unrelated web/marketing worktree changes were left untouched and unstaged.

### Checks Run

- `git status --short`
- `git log -1 --oneline`
- `git show --stat --oneline --name-only HEAD`
- `git diff --check`
- `git diff --cached --check` when staged changes existed for this handoff commit.
- Safety wording search with `rg` for accidental claims that production API hosting is implemented, ECS/Fargate is provisioned, production API deploy was performed, Vercel is final production hosting, ZATCA production is enabled, customer data migration happened, or paid SaaS v1 is production-ready.
- Package-script search for link/markdown/docs checks; no dedicated lightweight link-check script was found.
- Lightweight `Test-Path` check passed for the handoff, ADR-013, production planning docs, README, and audit paths.

### Safety Wording Result

- No accidental affirmative claim was found that LedgerByte production API hosting is implemented, ECS/Fargate is provisioned, a production API deploy was performed, Vercel is final production hosting, ZATCA production is enabled, customer data migration happened, or paid SaaS v1 is production-ready.
- Matches found during the safety search were expected negative/proposed wording, plus one provider-summary statement saying Fly positions Managed Postgres as production-ready; that line describes Fly's official service posture, not LedgerByte production readiness.

### Skipped Commands And Why

- Full smoke: skipped because no app code changed and no approved runtime target was requested.
- Full E2E: skipped because no app code changed and deployed/runtime verification was out of scope.
- Migrations: skipped because schema/data mutation was forbidden.
- Seed/reset/delete: skipped because data mutation and destructive operations were forbidden.
- RLS/runtime-role work: skipped because Supabase RLS and runtime DB role changes were forbidden.
- Vercel/Supabase env changes: skipped because env/provider settings changes were forbidden.
- Real ZATCA: skipped because ZATCA behavior, credentials, network calls, and production cutover were forbidden.
- Real email: skipped because email behavior and real sends were forbidden.
- Backups/restores: skipped because backup/restore execution was forbidden.
- App tests: skipped because no app code changed.
- Cloud provisioning/deployment: skipped because provider provisioning and deployment were forbidden.
- Web research: skipped because this thread explicitly forbade new web research.

### Remaining Blockers

- ADR-013 remains proposed only; it is not accepted or implemented.
- API provider/service is not provisioned.
- ECS/Fargate is not configured.
- Worker hosting is not configured.
- No production Dockerfile/image pipeline, task definitions, ALB, VPC, IAM, log groups, cost guardrails, or runbooks exist yet for the production API path.
- Database provider/runtime role, `DIRECT_URL` separation, Supabase RLS/Data API posture, Prisma connection budget, and migration/admin credential split remain unresolved.
- Redis/queue production plan, worker/queue monitoring, retry/dead-letter policy, and queue durability posture remain unresolved.
- Object storage/generated document storage policy, hosted backup/PITR proof, restore drills, monitoring/alerting, incident/support process, email provider gates, and ZATCA production gates remain unresolved.
- No customer data migration or production deploy is approved until a separate future ticket explicitly allows it.

### Recommended Next Implementation Ticket

- `NEXT_10_PRODUCTION_TICKETS.md` currently states that `PROD-A2 API hosting decision` is drafted/proposed at ADR-013, not implemented, and that separate implementation tickets must be opened with explicit approval before any ECS/Fargate configuration, API/worker provisioning, env change, production deploy, database/Redis/storage mutation, migration, backup, ZATCA action, email send, customer-data movement, or app test against production.
- Next numbered planning ticket in `PRODUCTION_IMPLEMENTATION_TICKETS.md`: `PROD-A3 Web hosting decision`.

## PROD-A3 Part 1 - Web Hosting Inventory

- Web framework/runtime: `apps/web` is a Next.js 16.0.0 / React 19.2.4 App Router app in a pnpm workspace; `next.config.ts` enables `reactStrictMode` and `experimental.externalDir` for monorepo workspace access.
- Build/start/export commands: root `build` runs recursive workspace builds; web scripts are `dev` (`next dev --port 3000`), `build` (`next build`), `start` (`next start --port 3000`), `typecheck`/`lint` (`tsc --noEmit`), and Jest tests. No `next export` or static `output: "export"` setting is configured.
- Static vs SSR/server runtime needs: the app uses App Router layouts/pages with no committed `route.ts` handlers under `apps/web`; the root page redirects to `/dashboard`, while authenticated app pages are mostly `"use client"` and fetch data in the browser. Final hosting should assume a normal Next runtime unless PROD-A3 proves static export is safe.
- Required environment variable categories: public API base URL (`NEXT_PUBLIC_API_URL`) for browser/API calls; deployment/e2e URL variables are test-runner inputs, not web runtime secrets. Web should not receive database URLs, SMTP secrets, ZATCA secrets, Supabase service keys, or provider credentials.
- API connectivity assumptions: browser requests call `${NEXT_PUBLIC_API_URL}` and send bearer auth plus `x-organization-id`; API CORS must include every allowed web origin. PDF/document downloads also call the API directly and create browser object URLs.
- Auth/session/browser storage assumptions: access token and active organization id are stored in `localStorage` under `ledgerbyte.*` keys with legacy key fallback; org changes are coordinated through a custom browser event plus `storage` events. There is no committed cookie/session middleware path in the web app.
- Routing behavior: route groups split `(auth)` login/register/password/invite flows from `(app)` authenticated workflows; many dynamic App Router pages use client-side `useRouter`, `useParams`, and `<Link>` navigation. There is a committed catch-all placeholder page under `(app)/[...placeholder]`.
- Asset/static file needs: no committed `apps/web/public` static asset files were found; current frontend assets are primarily Next JS/CSS chunks, Tailwind-generated CSS, lucide icons, and runtime-downloaded PDFs/CSVs from the API.
- CDN/caching considerations: static Next chunks can use host/CDN immutable caching, but authenticated pages and API responses should not be treated as public-cacheable. The shared API client sets request `cache-control: no-store`, `pragma: no-cache`, and `fetch` cache `no-store` by default.
- Preview/staging needs: current Vercel user-testing web project is `ledgerbyte-web-test`, root directory `apps/web`, framework Next.js, source outside root enabled, build command `corepack pnpm --filter @ledgerbyte/web build`, and `NEXT_PUBLIC_API_URL=https://ledgerbyte-api-test.vercel.app`. It remains beta/user-testing/staging only.
- Rollback needs: current Vercel runbook rolls/promotes API first and web second; final web hosting needs independent web rollback, API compatibility checks, asset-cache invalidation expectations, and promotion gates tied to the chosen API target.
- Domain/DNS/TLS needs: production web domain, TLS certificate, DNS ownership, beta-vs-production domain separation, API production URL, and API `CORS_ORIGIN` must be planned together. No production domain binding or DNS/TLS change was performed.
- Current Vercel beta/staging posture: Vercel is useful for the existing beta/user-testing workflow and preview ergonomics, but ADR-001 keeps Vercel beta/user-testing/staging only until a separate production web decision is proposed, accepted, and implemented.
- Known blockers/risks for final web production hosting: Next.js 16 hosting support must be validated against official provider docs in Part 2; final web provider is undecided; static export safety is unproven; `NEXT_PUBLIC_API_URL` is build/runtime-provider sensitive; environment separation, error monitoring, cache policy, security headers, domain/TLS, rollback, support ownership, and deployed E2E/smoke gates remain unresolved; no app code, Vercel settings, env vars, DNS, production deploy, customer data, email, ZATCA, Supabase RLS, or runtime DB roles changed.

## Development Completion Pause - 2026-05-23

- Production hosting research is paused after the PROD-A3 Part 1 inventory.
- AWS remains the known future production direction, but no AWS implementation, provider setup, deployment, env change, database/Redis/storage mutation, migration, backup, email send, ZATCA action, or customer-data movement was performed.
- Vercel remains beta/user-testing/staging only and must not be treated as final production hosting.
- The next workstream is development completion, tracked in [docs/development/DEVELOPMENT_COMPLETION_PLAN.md](docs/development/DEVELOPMENT_COMPLETION_PLAN.md).
- The current product state is broad controlled-beta MVP, not paid production SaaS: core AR/AP, banking, inventory, reports, documents, audit, roles, storage readiness, email readiness, and ZATCA groundwork exist, but many production-facing and product-completion gaps remain.
- Top development gaps: full route QA and blocker triage, verification gate hardening, high-risk state-machine QA, auth/session hardening, accountant review, sales/purchase completion, banking parser/reconciliation hardening, inventory accounting policy work, admin/audit alerts, and SaaS business readiness.
- Mock/blocked areas remain intentional: real ZATCA, real customer email sending, live bank feeds, payment gateway capture, object-storage migration execution, backup/restore execution, and automatic inventory accounting expansion.
- DEV-06 Part 5 attempted the approved local-only AR invoice finalize preflight and stopped before mutation because the fixture organization was missing the finalize service's required active posting account codes `120` and `220`.
- DEV-06 Part 5B resolved the local fixture blocker by adding active posting account codes `120` and `220` to the DEV03-AR fixture organization and updating the fixture runner so future AR fixtures include those service-required dependencies.
- DEV-06 Part 5C retried the approved local-only AR invoice finalize mutation and finalized `INVOICE-000001` locally.
- DEV-06 Part 6 verified the finalized invoice evidence with read-only local checks and performed no mutation.
- DEV-06 Part 7 created the local-only void mutation plan and performed no mutation.
- DEV-06 Part 8 executed the approved local-only invoice void mutation and voided `INVOICE-000001` locally.
- DEV-06 Part 9 verified the void evidence with read-only local checks and performed no mutation.
- DEV-06 Part 10 completed the AR invoice lifecycle final triage as documentation/read-only work.
- DEV-07 Part 1 completed the AR customer payment allocation state-machine plan as documentation/read-only work.
- DEV-07 Part 2 completed the AR payment allocation fixture plan as documentation/read-only work.
- Exact next recommended development ticket: `DEV-07 Part 3E: approved local AR payment-allocation invoice fixture mutation`.

## DEV-06 Part 5 - Invoice Finalize Preflight Blocked

- Approval phrase was received for one local-only finalize mutation for `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and the target was the local Docker PostgreSQL database label `accounting`.
- Non-mutating checks passed before the blocker: targeted AR Jest suites (`4` suites, `84` tests), `fixture:dev04:cleanup-plan` in plan-only/no-write mode, and `corepack pnpm verify:diff`.
- A temporary script under `apps/api/scripts` guarded the exact marker, family, invoice number, safe id prefix, and local target, then stopped before service use because account code `120` was missing; code `220` was also absent.
- Existing fixture accounts are marker-scoped (`DEV03-AR-ACCT-AR`, `REV`, `VAT`, `CASH`) under `D3AR-...` codes, while `SalesInvoiceService.finalize(...)` currently requires posting account codes `120` and `220`.
- No finalize mutation was performed: `SalesInvoiceService.finalize(...)` was not called.
- `INVOICE-000001` remains `DRAFT`; `finalizedAt`, `journalEntryId`, and `reversalJournalEntryId` remain absent; total and balance due remain `287.5000`.
- Journal entries remain `0`; SalesInvoice audit actions remain `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`; auth/login audit logs remain `0`; ZATCA metadata remains `0`.
- Forbidden side effects stayed `0`: generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email outbox/provider events, ZATCA XML/signing/submission artifacts, and cleanup deletion.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_RUN.md](docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_RUN.md).
- The temporary script was removed and was not staged or tracked.
- Do not proceed to `DEV-06 Part 6: verify AR invoice finalize evidence` until a future approved run actually finalizes the invoice.

## DEV-06 Part 5B - Posting Account Blocker Resolved

- Root cause: `SalesInvoiceService.finalize(...)` resolves accounts receivable and VAT payable through active posting account codes `120` and `220`; the existing DEV03-AR fixture accounts used marker-scoped `D3AR-...` codes only.
- Decision: fixture repair plus fixture runner improvement. The service behavior was left unchanged because `120` and `220` are defined default chart accounts, and changing finalization account resolution would be broader production accounting behavior.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and only the local Docker PostgreSQL target was used.
- Local repair created or repaired exactly two accounts in the fixture organization: `DEV03-AR-ACCT-120-20260524T130000` (`120`, `ASSET`, active, posting allowed) and `DEV03-AR-ACCT-220-20260524T130000` (`220`, `LIABILITY`, active, posting allowed).
- Fixture runner improvement: future AR fixture creation now includes service-required posting account codes `120` and `220`; the runner test expects the posting-account dependency in the dry-run plan.
- Invoice finalization did not run: `SalesInvoiceService.finalize(...)` was not called.
- `INVOICE-000001` remains `DRAFT`; total and balance due remain `287.5000`; `finalizedAt`, `journalEntryId`, and `reversalJournalEntryId` remain absent.
- Journal entries, finalized invoices, generated documents, payments, refunds, credit notes, allocations, email outbox/provider events, ZATCA metadata/signed drafts/submission logs, and cleanup deletion remain `0`.
- SalesInvoice audit logs remain `2` with `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`; `SALES_INVOICE_FINALIZED` remains `0`; fixture org login audit logs remain `0`.
- Evidence doc: [docs/development/DEV_06_AR_FINALIZE_POSTING_ACCOUNT_BLOCKER_RESOLUTION.md](docs/development/DEV_06_AR_FINALIZE_POSTING_ACCOUNT_BLOCKER_RESOLUTION.md).
- The temporary repair script was removed and was not staged or tracked.
- Exact next prompt title: `DEV-06 Part 5C: approved local AR invoice finalize mutation retry`.

## DEV-06 Part 5C - Invoice Finalize Mutation Retry Completed

- Approval phrase was received for the local-only retry finalization of `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Preflight passed: targeted AR Jest suites (`4` suites, `84` tests), fixture-runner test (`1` suite, `41` tests), cleanup-plan in plan-only/no-write mode, `corepack pnpm verify:diff`, local Docker Postgres/Redis readiness, local target guard, and read-only invoice/account side-effect checks.
- Account dependencies were present: code `120` active/posting `ASSET`, and code `220` active/posting `LIABILITY`.
- Mutation performed: `SalesInvoiceService.finalize(...)` was called exactly once by a guarded temporary script.
- `INVOICE-000001` is now `FINALIZED`; `finalizedAt` and `journalEntryId` are present; `reversalJournalEntryId` remains absent; total and balance due remain `287.5000`.
- Journal result: one posted journal entry `JOURNAL_ENTRY-000001`, reference `INVOICE-000001`, total debit `287.5000`, total credit `287.5000`.
- Journal lines: debit account `120` for `287.5000`, credit fixture revenue account for `250.0000`, and credit account `220` for `37.5000`.
- Audit result: SalesInvoice audit actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, and `SALES_INVOICE_FINALIZED`; fixture org login audit logs remain `0`.
- ZATCA result: one local `ZatcaInvoiceMetadata` row exists with type `STANDARD_TAX_INVOICE`; ZATCA XML/signing/QR/submission/clearance/reporting did not run.
- Forbidden side effects stayed `0`: generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email outbox/provider events, ZATCA signed drafts/submission logs, and cleanup deletion.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md](docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md).
- The temporary retry script was removed and was not staged or tracked.
- Exact next prompt title: `DEV-06 Part 6: verify AR invoice finalize evidence`.

## DEV-06 Part 6 - Invoice Finalize Evidence Verified

- Part 6 performed read-only local verification for `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and the explicit database target parsed as local PostgreSQL on `localhost:5432`.
- Account dependencies remain present: account code `120` is active/posting `ASSET`, and account code `220` is active/posting `LIABILITY`; the original marker-coded fixture accounts also remain present.
- `INVOICE-000001` remains `FINALIZED`; `finalizedAt` and `journalEntryId` remain present; `reversalJournalEntryId` remains absent; total and balance due remain `287.5000`.
- Journal evidence remains valid: one posted journal entry `JOURNAL_ENTRY-000001`, reference `INVOICE-000001`, total debit `287.5000`, total credit `287.5000`, with lines debit account `120` `287.5000`, credit fixture revenue `250.0000`, and credit account `220` `37.5000`.
- Audit evidence remains valid: SalesInvoice audit actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, and `SALES_INVOICE_FINALIZED`; `SALES_INVOICE_FINALIZED` count is `1`; fixture org login/auth audit logs remain `0`.
- ZATCA evidence remains valid: one local `ZatcaInvoiceMetadata` row exists with type `STANDARD_TAX_INVOICE`; ZATCA signed drafts/submission logs remain `0`; ZATCA XML/signing/QR/submission/clearance/reporting did not run.
- Forbidden side effects remain `0`: generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email outbox/provider events, ZATCA signed drafts/submission logs, and cleanup deletion.
- No mutation was performed in Part 6.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md](docs/development/DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md).
- Exact next prompt title: `DEV-06 Part 7: plan local AR invoice void mutation`.

## DEV-06 Part 7 - Invoice Void Mutation Plan Completed

- Part 7 inspected the sales invoice void controller, service, reversal journal helper, accounting-core reversal helper, fiscal-period guard, audit mapping, permission constants, schema relations, README/BUG_AUDIT lifecycle notes, and targeted unit/smoke references.
- Mutation performed: no. `SalesInvoiceService.void(...)` was not called, no invoice was voided, and no journal/reversal journal was created.
- Planned route for normal API use: `POST /sales-invoices/:id/void`, guarded by JWT auth, organization context, permission guard, and `salesInvoices.void`.
- Planned Part 8 service call for the local-only script: `SalesInvoiceService.void(organizationId, actorUserId, invoiceId)` exactly once after local target, marker, invoice, status, journal, account, allocation, output, ZATCA, email, and fiscal-period preflight checks pass.
- Expected status transition: `FINALIZED -> VOIDED`.
- Expected invoice effects from inspected code: balance due becomes `0.0000`; `finalizedAt` remains present; `journalEntryId` remains linked to the original journal; `reversalJournalEntryId` becomes present; total remains `287.5000`; invoice sequence does not advance.
- Expected accounting effect from inspected code: one posted reversal journal is created or reused, reference `INVOICE-000001`, description `Reversal of JOURNAL_ENTRY-000001`, total debit and credit `287.5000`, with reversal lines debit fixture revenue `250.0000`, debit VAT account `220` `37.5000`, and credit AR account `120` `287.5000`. The original journal remains present and changes status from `POSTED` to `REVERSED`.
- Expected audit effect: one new `SALES_INVOICE_VOIDED` audit event, making the SalesInvoice audit action set `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, and `SALES_INVOICE_VOIDED`.
- Expected ZATCA/document/email behavior: existing local `ZatcaInvoiceMetadata` remains present; voiding does not call generated-document/PDF/archive, email, ZATCA XML/signing/QR/submission/clearance/reporting, payment, refund, credit-note, allocation, or cleanup deletion paths.
- Evidence/plan doc: [docs/development/DEV_06_AR_INVOICE_VOID_MUTATION_PLAN.md](docs/development/DEV_06_AR_INVOICE_VOID_MUTATION_PLAN.md).
- Required approval phrase before Part 8: `I approve DEV-06 Part 8 local-only AR invoice void mutation for fixture invoice INVOICE-000001 under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-06 Part 8: approved local AR invoice void mutation`.

## DEV-06 Part 8 - Invoice Void Mutation Completed

- Approval phrase was received for exactly one local-only void mutation for `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and the API database target parsed as local PostgreSQL on `localhost:5432` with no forbidden production/beta/shared-host pattern.
- Preflight passed: targeted AR Jest suites (`4` suites, `84` tests), fixture-runner test (`1` suite, `41` tests), cleanup-plan in plan-only/no-write mode, `corepack pnpm verify:diff`, local target guard, and read-only invoice/account/journal/side-effect checks.
- Mutation performed: a guarded temporary script called `SalesInvoiceService.void(organizationId, actorUserId, invoiceId)` exactly once.
- `INVOICE-000001` is now `VOIDED`; total remains `287.5000`; balance due is `0.0000`; `finalizedAt` and `journalEntryId` remain present; `reversalJournalEntryId` is present.
- Original journal `JOURNAL_ENTRY-000001` remains present and changed from `POSTED` to `REVERSED`.
- Reversal journal `JOURNAL_ENTRY-000002` is `POSTED`, reference `INVOICE-000001`, description `Reversal of JOURNAL_ENTRY-000001`, total debit `287.5000`, total credit `287.5000`, and reverses the original journal.
- Reversal lines: debit account `220` VAT `37.5000`, debit fixture revenue `250.0000`, and credit account `120` AR `287.5000`.
- Audit result: SalesInvoice audit actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, and `SALES_INVOICE_VOIDED`; `SALES_INVOICE_VOIDED` exists exactly once; fixture org login/auth audit logs remain `0`.
- ZATCA result: existing local `ZatcaInvoiceMetadata` remains present with type `STANDARD_TAX_INVOICE`; ZATCA XML/signing/QR/submission/clearance/reporting did not run.
- Forbidden side effects stayed `0`: generated documents, payments, refunds, credit notes, allocations, email outbox/provider events, ZATCA signed drafts/submission logs, and cleanup deletion.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_VOID_MUTATION_RUN.md](docs/development/DEV_06_AR_INVOICE_VOID_MUTATION_RUN.md).
- The temporary void script was removed and was not staged or tracked.
- Exact next prompt title: `DEV-06 Part 9: verify AR invoice void evidence`.

## DEV-06 Part 9 - Invoice Void Evidence Verified

- Part 9 performed read-only local verification for `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and the explicit database target parsed as local PostgreSQL on `localhost:5432`.
- Mutation performed: no. No invoice create, edit, finalize, void, repeated void, payment, refund, credit-note, allocation, output, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, or environment change ran.
- `INVOICE-000001` remains `VOIDED`; total remains `287.5000`; balance due remains `0.0000`; `finalizedAt`, `journalEntryId`, and `reversalJournalEntryId` remain present.
- Original journal `JOURNAL_ENTRY-000001` remains `REVERSED`, reference `INVOICE-000001`, debit `287.5000`, credit `287.5000`.
- Reversal journal `JOURNAL_ENTRY-000002` remains `POSTED`, reference `INVOICE-000001`, description `Reversal of JOURNAL_ENTRY-000001`, debit `287.5000`, credit `287.5000`, and points to the original journal.
- Reversal lines remain debit account `220` VAT `37.5000`, debit fixture revenue `250.0000`, and credit account `120` AR `287.5000`.
- Audit evidence remains valid: SalesInvoice audit actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, and `SALES_INVOICE_VOIDED`; `SALES_INVOICE_VOIDED` exists exactly once; fixture org login/auth audit logs remain `0`.
- ZATCA evidence remains valid: existing local `ZatcaInvoiceMetadata` remains present with type `STANDARD_TAX_INVOICE`; ZATCA signed drafts/submission logs remain `0`; ZATCA XML/signing/QR/submission/clearance/reporting did not run.
- Forbidden side effects remain `0`: generated documents, payments, refunds, credit notes, allocations, email outbox/provider events, ZATCA signed drafts/submission logs, and cleanup deletion.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md).
- Temporary void script remains absent, unstaged, and untracked.
- Exact next prompt title: `DEV-06 Part 10: AR state-machine final triage`.

## DEV-06 Part 10 - AR State-Machine Final Triage Completed

- DEV-06 completed the local-only Sales/AR invoice lifecycle slice for marker `DEV03-AR-20260524T130000`.
- Final triage was documentation/read-only only. No invoice create, edit, finalize, void, repeated void, payment, refund, credit-note, allocation, output, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, persisted environment configuration, schema, or provider-setting action was run.
- Final fixture state: `INVOICE-000001` remains `VOIDED`; safe id prefix `6ebb2d71`; total `287.5000`; balance due `0.0000`.
- Accounting evidence remains: original journal `JOURNAL_ENTRY-000001` is `REVERSED`; reversal journal `JOURNAL_ENTRY-000002` is `POSTED` and balanced.
- Audit evidence remains: SalesInvoice actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, and `SALES_INVOICE_VOIDED`; fixture login/auth audit logs remain `0`.
- ZATCA/output/email boundaries remain: one local `ZatcaInvoiceMetadata` row exists with type `STANDARD_TAX_INVOICE`; generated documents, payments, refunds, credit notes, allocations, email, ZATCA signed drafts/submission logs, and cleanup deletion remain `0`.
- Final triage doc: [docs/development/DEV_06_AR_STATE_MACHINE_FINAL_TRIAGE.md](docs/development/DEV_06_AR_STATE_MACHINE_FINAL_TRIAGE.md).
- Remaining AR gaps include payment allocation/void/reversal, refunds, credit notes, output/PDF/archive, email, ZATCA XML/signing/submission, authenticated UI/API QA, cleanup policy, idempotency/repeat paths, allocation blockers, and fiscal-period locks.
- Recommended next workstream: `DEV-07 Part 1: AR payment allocation state-machine plan`.

## DEV-07 Part 1 - AR Payment Allocation Plan Completed

- DEV-07 Part 1 created the local-only AR payment allocation state-machine plan in [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_STATE_MACHINE_PLAN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_STATE_MACHINE_PLAN.md).
- Part 1 was documentation/read-only only. No invoice create, edit, finalize, void, payment creation, payment allocation, refund, credit-note, output, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, schema, or provider-setting action was run.
- Inspected code paths include `CustomerPaymentController`, `CustomerPaymentService.create`, `applyUnapplied`, `reverseUnappliedAllocation`, `void`, payment accounting helpers, SalesInvoice invoice-void allocation blockers, CustomerRefund payment-source blockers, audit event mapping, Prisma payment/allocation models, and customer payment receipt/PDF output boundaries.
- Payment lifecycle finding: `CustomerPaymentService.create` posts immediately to `POSTED`, requires at least one allocation, creates one posted payment journal, debits the paid-through asset account, credits AR account code `120`, creates direct `CustomerPaymentAllocation` rows, decrements invoice `balanceDue`, and leaves `unappliedAmount` when `amountReceived` exceeds direct allocations.
- Allocation lifecycle finding: `applyUnapplied` creates `CustomerPaymentUnappliedAllocation`, decrements payment `unappliedAmount` and invoice `balanceDue`, and creates no journal entry; `reverseUnappliedAllocation` restores matching state and also creates no journal entry.
- Fixture strategy chosen: reuse the existing local DEV03-AR fixture organization and dependencies, but do not reuse `INVOICE-000001` because it is `VOIDED`; future approved parts should create a new DEV-07-specific finalized, non-voided invoice fixture under the same local marker/family unless Part 2 chooses a safer new marker.
- Expected output/ZATCA/email boundary: payment create/allocation/reversal/void paths do not call receipt PDF/archive, email, or ZATCA; receipt PDF/archive routes exist and must remain out of scope unless separately approved.
- Exact next prompt title: `DEV-07 Part 2: AR payment allocation fixture plan`.

## DEV-07 Part 2 - AR Payment Allocation Fixture Plan Completed

- DEV-07 Part 2 created the local-only fixture plan in [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_FIXTURE_PLAN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_FIXTURE_PLAN.md).
- Part 2 was planning/read-only only. No invoice create, edit, finalize, void, payment creation, payment allocation, unapplied allocation, refund, credit-note, fixture creation, output, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, schema, provider-setting, or login/audit-writing browser action was run.
- Local DB dependency inspection was blocked because Docker Desktop's Linux engine was unavailable and `127.0.0.1:5432` / `127.0.0.1:6379` were not reachable; the configured database target guard parsed as local `localhost:5432` without forbidden hosted patterns.
- Fixture strategy chosen: reuse marker `DEV03-AR-20260524T130000` and the existing local DEV03-AR fixture organization/dependencies, create exactly one new DEV-07-specific finalized invoice in a later approved part, and continue excluding voided `INVOICE-000001` from the happy path.
- Planned future invoice/payment/allocation shape: invoice total `1150.0000` from quantity `10.0000` at unit price `100.0000` with `15.0000` VAT; future payment amount `500.0000`; direct allocation `300.0000`; unapplied amount `200.0000`; later same-invoice unapplied allocation `200.0000`; final planned invoice balance `650.0000`.
- Expected accounting: invoice finalization posts Dr `120` AR `1150.0000`, Cr fixture revenue `1000.0000`, Cr `220` VAT `150.0000`; payment creation posts Dr fixture paid-through asset `500.0000`, Cr `120` AR `500.0000`; applying unapplied amount posts no journal.
- Expected audit/output/ZATCA boundary: invoice fixture creation/finalization should create SalesInvoice audit actions and local invoice ZATCA metadata only; payment create should create `CUSTOMER_PAYMENT_CREATED`; unapplied allocation should log raw `APPLY_UNAPPLIED`; receipt PDF/archive, email, ZATCA XML/signing/submission, and generated documents remain out of scope.
- Exact next prompt title: `DEV-07 Part 3: approved local AR payment-allocation invoice fixture mutation`.

## DEV-07 Part 3 - AR Payment Allocation Invoice Fixture Mutation Blocked

- DEV-07 Part 3 received the exact approval phrase for one local-only AR payment-allocation invoice fixture mutation under marker `DEV03-AR-20260524T130000`.
- The run stopped before mutation because Docker Desktop's Linux engine was unavailable, `127.0.0.1:5432` and `127.0.0.1:6379` were closed, and the required local read-only fixture dependency preflight could not query Postgres.
- The configured API database target guard still parsed as local `localhost:5432` and did not match forbidden production, beta, hosted, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, or user-testing patterns.
- Invoice fixture created/finalized: no. Customer payment/allocation performed: no. Temporary mutation script created: no.
- Checks run: targeted AR Jest suites passed (`4` suites, `84` tests), fixture-runner Jest passed (`1` suite, `41` tests), `fixture:dev04:cleanup-plan` stayed plan-only with no DB connection or writes, and `corepack pnpm verify:diff` passed with the existing unrelated `apps/web/src/app/page.tsx` CRLF warning.
- Evidence doc: [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 3B: retry AR payment allocation invoice fixture mutation preflight`.

## DEV-07 Part 3B - AR Payment Allocation Fixture Preflight Retry Blocked

- DEV-07 Part 3B retried only local Docker/Postgres readiness and read-only fixture dependency preflight; it did not carry mutation approval forward.
- Docker Desktop's Linux engine remained unavailable, `127.0.0.1:5432` and `127.0.0.1:6379` remained closed, and fixture dependency queries could not run.
- The configured API database target guard still parsed as local `localhost:5432` and did not match forbidden production, beta, hosted, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, or user-testing patterns.
- Fixture dependency preflight result: blocked before DB queries. Invoice fixture created/finalized: no. Customer payment/allocation performed: no. Temporary mutation script created: no.
- Checks run: targeted AR Jest suites passed (`4` suites, `84` tests), fixture-runner Jest passed (`1` suite, `41` tests), `fixture:dev04:cleanup-plan` stayed plan-only with no DB connection or writes, and `corepack pnpm verify:diff` passed with the existing unrelated `apps/web/src/app/page.tsx` CRLF warning.
- Evidence was appended to [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 3C: retry AR payment allocation invoice fixture mutation preflight`.

## DEV-07 Part 3C - AR Payment Allocation Fixture Preflight Retry Blocked

- DEV-07 Part 3C retried only local Docker/Postgres readiness and read-only fixture dependency preflight; it did not carry mutation approval forward.
- Docker Desktop's Linux engine remained unavailable, `127.0.0.1:5432` and `127.0.0.1:6379` remained closed, and fixture dependency queries could not run.
- The configured API database target guard still parsed as local `localhost:5432` and did not match forbidden production, beta, hosted, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, or user-testing patterns.
- Fixture dependency preflight result: blocked before DB queries. Invoice fixture created/finalized: no. Customer payment/allocation performed: no. Temporary mutation script created: no.
- Checks run: targeted AR Jest suites passed (`4` suites, `84` tests), fixture-runner Jest passed (`1` suite, `41` tests), `fixture:dev04:cleanup-plan` stayed plan-only with no DB connection or writes, and `corepack pnpm verify:diff` passed with the existing unrelated `apps/web/src/app/page.tsx` CRLF warning.
- Evidence was appended to [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 3D: retry AR payment allocation invoice fixture mutation preflight`.

## DEV-07 Part 3D - AR Payment Allocation Fixture Preflight Verified

- DEV-07 Part 3D retried only local Docker/Postgres readiness and read-only fixture dependency preflight; it did not carry mutation approval forward.
- Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy, and `127.0.0.1:5432` / `127.0.0.1:6379` were reachable.
- The configured API database target guard parsed as local `localhost:5432` and did not match forbidden production, beta, hosted, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, or user-testing patterns.
- Fixture dependency preflight result: passed. Verified marker `DEV03-AR-20260524T130000`, family `ar`, fixture organization, active actor membership, active customer, active service item, active/posting revenue account, active `15.0000` sales tax, active/posting account `120`, active/posting account `220`, active/posting paid-through cash account, and posting-date guard.
- Invoice preflight result: `INVOICE-000001` remained `VOIDED` and excluded from happy-path allocation; no `DEV07-AR-PAYALLOC` invoice fixture existed; the fixture organization had only `INVOICE-000001:VOIDED`.
- Forbidden side-effect counts stayed `0`: customer payments, customer payment allocations, customer payment unapplied allocations, customer refunds, credit notes, credit-note allocations, generated documents, email outbox, email provider events, ZATCA signed drafts, and ZATCA submission logs.
- Invoice fixture created/finalized: no. Customer payment/allocation performed: no. Temporary mutation script created: no.
- Checks run: targeted AR Jest suites passed (`4` suites, `84` tests), fixture-runner Jest passed (`1` suite, `41` tests), `fixture:dev04:cleanup-plan` stayed plan-only with no DB connection or writes, and `corepack pnpm verify:diff` passed with the existing unrelated `apps/web/src/app/page.tsx` CRLF warning.
- Evidence was appended to [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 3E: approved local AR payment-allocation invoice fixture mutation`.
- Required approval phrase before Part 3E mutation: `I approve DEV-07 Part 3E local-only AR payment-allocation invoice fixture mutation under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.`

## DEV-07 Part 3E - AR Payment Allocation Invoice Fixture Created

- DEV-07 Part 3E received the exact approval phrase for one local-only AR payment-allocation invoice fixture mutation under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy, `127.0.0.1:5432` / `127.0.0.1:6379` were reachable, and the API database target guard parsed as local `localhost:5432` without forbidden hosted, production, beta, shared, or customer-data target patterns.
- Preflight passed: marker/family, fixture organization, active actor membership, active customer, active service item, active/posting revenue account, active `15.0000` sales tax, active/posting account `120`, active/posting account `220`, active/posting paid-through cash account, `INVOICE-000001:VOIDED`, absent `INVOICE-000002`, absent `DEV07-AR-PAYALLOC` fixture, clean side-effect counts, and posting-date guard were verified before mutation.
- Mutation performed: a guarded temporary local script called `SalesInvoiceService.create(...)` exactly once and `SalesInvoiceService.finalize(...)` exactly once for the new DEV-07 invoice fixture.
- New invoice fixture: `INVOICE-000002`, safe id prefix `ddadfdd7`, status `FINALIZED`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, balance due `1150.0000`, line count `1`.
- Accounting result: one posted journal `JOURNAL_ENTRY-000003`, reference `INVOICE-000002`, debit account `120` AR `1150.0000`, credit fixture revenue `1000.0000`, credit account `220` VAT `150.0000`; invoice sequence advanced to next `3`, journal sequence advanced to next `4`.
- Audit/ZATCA result: SalesInvoice audit actions for `INVOICE-000002` are `SALES_INVOICE_CREATED` and `SALES_INVOICE_FINALIZED`; local `ZatcaInvoiceMetadata` count for the invoice is `1`, type `STANDARD_TAX_INVOICE`, status `NOT_SUBMITTED`.
- DEV-06 non-interference: `INVOICE-000001` remains `VOIDED`, safe id prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`, with reversal journal present.
- No customer payment, customer payment allocation, customer payment unapplied allocation, refund, credit note, generated document, email outbox/provider event, ZATCA signed draft/submission log, ZATCA XML/signing/QR/submission, invoice void, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data mutation occurred.
- Temporary Part 3E script was removed and is not staged or tracked.
- Evidence was appended to [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 4: verify AR payment allocation invoice fixture evidence`.

## DEV-07 Part 4 - AR Payment Allocation Invoice Fixture Evidence Verified

- DEV-07 Part 4 performed read-only local verification for the payment-allocation invoice fixture in [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No invoice create, edit, finalize, void, payment creation, payment allocation, unapplied allocation, refund, credit-note, output, email, ZATCA XML/signing/submission, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, or login/browser audit-writing action ran.
- Local target safety passed: Docker Desktop Linux engine was available, local Postgres/Redis were healthy and reachable, and the API database target guard accepted only local `localhost:5432`.
- Fixture dependency evidence remained valid for marker `DEV03-AR-20260524T130000`: fixture organization, active actor membership, active customer, service item, revenue account, `15.0000` sales tax, account `120`, account `220`, and paid-through cash account were verified.
- `INVOICE-000002` remains the single DEV-07 payment-allocation invoice fixture; safe id prefix `ddadfdd7`; status `FINALIZED`; subtotal `1000.0000`; tax `150.0000`; total `1150.0000`; balance due `1150.0000`; line count `1`.
- Journal evidence remains valid: `JOURNAL_ENTRY-000003` is `POSTED`, reference `INVOICE-000002`, balanced at debit `1150.0000` and credit `1150.0000`, with Dr account `120` AR `1150.0000`, Cr fixture revenue `1000.0000`, and Cr account `220` VAT `150.0000`.
- Audit/ZATCA evidence remains valid: SalesInvoice actions are `SALES_INVOICE_CREATED` and `SALES_INVOICE_FINALIZED`; local `ZatcaInvoiceMetadata` count is `1`, type `STANDARD_TAX_INVOICE`, status `NOT_SUBMITTED`; auth/login and payment-related audit counts remain `0`.
- DEV-06 non-interference remains valid: `INVOICE-000001` is still `VOIDED`, safe id prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`, with original/reversal journals intact.
- Forbidden side-effect counts remain `0`: customer payments, customer payment allocations, unapplied allocations, customer refunds, credit notes, credit-note allocations, generated documents, email outbox/provider events, ZATCA signed drafts, and ZATCA submission logs.
- The Part 3E temporary script remains absent, unstaged, and untracked.
- Exact next prompt title: `DEV-07 Part 5: customer payment creation mutation plan`.

## DEV-07 Part 5 - Customer Payment Creation Mutation Plan Completed

- DEV-07 Part 5 created the local-only customer payment creation mutation plan in [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_PLAN.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_PLAN.md).
- Mutation performed: no. No customer payment, payment allocation, unapplied allocation, refund, credit-note, invoice create/edit/finalize/void, output, email, ZATCA XML/signing/submission, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, or login/browser audit-writing action ran.
- Local target safety and read-only fixture checks passed: Docker Desktop Linux engine was available, local Postgres/Redis were healthy and reachable, and the API database target guard accepted only local `localhost:5432`.
- Current fixture evidence remains valid: `INVOICE-000002` is `FINALIZED`, safe id prefix `ddadfdd7`, total and balance due `1150.0000`, with posted invoice journal `JOURNAL_ENTRY-000003`.
- Planned Part 6 payment shape: create one customer payment for `500.0000`, direct allocation `300.0000` to `INVOICE-000002`, expected `unappliedAmount` `200.0000`.
- Expected invoice balance impact: `INVOICE-000002` balance due decreases from `1150.0000` to `850.0000`; the later unapplied allocation remains out of scope for Part 6.
- Expected accounting: one posted payment journal, expected `JOURNAL_ENTRY-000004`, Dr paid-through cash/asset `500.0000`, Cr account `120` AR `500.0000`; the currently absent `PAYMENT` sequence should upsert and issue `PAYMENT-000001`.
- Expected audit/output/ZATCA boundary: `CUSTOMER_PAYMENT_CREATED` only; no receipt PDF/archive, generated document, email, ZATCA XML/signing/submission, refund, credit note, invoice void, cleanup deletion, or login/browser audit flow.
- Exact next prompt title: `DEV-07 Part 6: approved local AR customer payment creation mutation`.
- Required approval phrase before Part 6 mutation: `I approve DEV-07 Part 6 local-only AR customer payment creation mutation under marker DEV03-AR-20260524T130000 for invoice INVOICE-000002. No production, no beta, no customer data.`

## DEV-07 Part 6 - AR Customer Payment Created

- DEV-07 Part 6 received the exact approval phrase for one local-only AR customer payment creation mutation under marker `DEV03-AR-20260524T130000` for `INVOICE-000002`.
- Evidence doc: [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md).
- Local target safety and preflight passed: Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy/reachable, the API database target guard accepted local `localhost:5432`, and read-only fixture checks matched the planned state.
- Mutation performed: a guarded temporary local script called `CustomerPaymentService.create(...)` exactly once.
- Payment result: `PAYMENT-000001`, safe id prefix `b39f4d38`, status `POSTED`, amount received `500.0000`, direct allocation `300.0000`, unapplied amount `200.0000`.
- Invoice balance result: `INVOICE-000002` remains `FINALIZED`; balance due decreased from `1150.0000` to `850.0000`; `reversalJournalEntryId` remains absent.
- Accounting result: one posted journal `JOURNAL_ENTRY-000004`, reference `PAYMENT-000001`, Dr paid-through cash/asset `500.0000`, Cr account `120` AR `500.0000`; `PAYMENT` sequence next `2`, `JOURNAL_ENTRY` sequence next `5`.
- Audit/output/ZATCA result: `CUSTOMER_PAYMENT_CREATED` exists exactly once; no `APPLY_UNAPPLIED`, `REVERSE_UNAPPLIED_ALLOCATION`, `CUSTOMER_PAYMENT_VOIDED`, receipt PDF/archive, generated document, email, ZATCA XML/signing/QR/submission, refund, credit note, invoice void, cleanup deletion, or login/browser audit-writing flow occurred.
- DEV-06 non-interference: `INVOICE-000001` remains `VOIDED`, safe prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`.
- Temporary Part 6 script was removed and is not staged or tracked.
- Exact next prompt title: `DEV-07 Part 7: verify AR customer payment creation evidence`.

## DEV-07 Part 7 - AR Customer Payment Evidence Verified

- DEV-07 Part 7 performed read-only local verification for the Part 6 customer payment creation evidence in [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_EVIDENCE_VERIFICATION.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No customer payment creation, payment allocation mutation, unapplied allocation, refund, credit-note, invoice mutation, output, email, ZATCA XML/signing/submission, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, or login/browser audit-writing action ran.
- Local target safety passed: Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy/reachable, and the API database target guard accepted only local `localhost:5432`.
- Fixture/invoice evidence remained valid: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `850.0000`, and no reversal journal.
- Payment evidence remained valid: `PAYMENT-000001`, safe id prefix `b39f4d38`, status `POSTED`, amount received `500.0000`, unapplied amount `200.0000`, posted journal present, and no void reversal journal.
- Direct allocation evidence remained valid: exactly one `CustomerPaymentAllocation` links `PAYMENT-000001` to `INVOICE-000002` for `300.0000`; no `CustomerPaymentUnappliedAllocation` exists yet.
- Accounting result remained valid: `JOURNAL_ENTRY-000004` is `POSTED`, reference `PAYMENT-000001`, balanced at debit `500.0000` and credit `500.0000`, with Dr paid-through cash/asset `500.0000` and Cr account `120` AR `500.0000`.
- Audit/output/ZATCA result remained valid: `CUSTOMER_PAYMENT_CREATED` exists exactly once; no `APPLY_UNAPPLIED`, `REVERSE_UNAPPLIED_ALLOCATION`, `CUSTOMER_PAYMENT_VOIDED`, receipt PDF/archive, generated document, email, ZATCA XML/signing/QR/submission, refund, credit note, cleanup deletion, or login/browser audit-writing flow occurred.
- DEV-06 non-interference remained valid: `INVOICE-000001` remains `VOIDED`, safe prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`.
- Temporary Part 6 script remains absent, unstaged, and untracked.
- Exact next prompt title: `DEV-07 Part 8: unapplied payment allocation mutation plan`.

## DEV-07 Part 8 - Unapplied Payment Allocation Mutation Plan Completed

- DEV-07 Part 8 created the local-only unapplied payment allocation mutation plan in [docs/development/DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_MUTATION_PLAN.md](docs/development/DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_MUTATION_PLAN.md).
- Mutation performed: no. No unapplied payment allocation, customer payment creation, direct allocation, allocation reversal, payment void, invoice mutation, refund, credit note, output, email, ZATCA XML/signing/submission, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, customer-data, or login/browser audit-writing action ran.
- Local target safety and read-only fixture checks passed: Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy/reachable, and the API database target guard accepted only local `localhost:5432`.
- Current evidence remains valid: `PAYMENT-000001` is `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, unapplied amount `200.0000`; `INVOICE-000002` is `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `850.0000`.
- Planned Part 9 mutation: apply exactly `200.0000` from `PAYMENT-000001` to `INVOICE-000002` through `CustomerPaymentService.applyUnapplied(...)`.
- Expected state impact: payment `unappliedAmount` changes `200.0000 -> 0.0000`; invoice balance due changes `850.0000 -> 650.0000`; one `CustomerPaymentUnappliedAllocation` is created; the existing direct allocation of `300.0000` remains unchanged.
- Expected accounting/audit/output boundary: no new journal entry; `JOURNAL_ENTRY-000004` and `JOURNAL_ENTRY` sequence next `5` remain unchanged; one raw `APPLY_UNAPPLIED` audit action is expected; no receipt PDF/archive, generated document, email, ZATCA XML/signing/submission, refund, credit note, invoice void, cleanup deletion, or login/browser audit-writing flow should occur.
- Exact next prompt title: `DEV-07 Part 9: approved local AR unapplied customer payment allocation mutation`.
- Required approval phrase before Part 9 mutation: `I approve DEV-07 Part 9 local-only AR unapplied customer payment allocation mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001 and invoice INVOICE-000002. No production, no beta, no customer data.`

## Forbidden Actions For Next Production Thread

- Do not change app code.
- Do not deploy, provision, migrate, seed, reset, delete, or change environment variables.
- Do not change Supabase RLS, runtime DB roles, Vercel settings, ZATCA behavior, emails, accounting logic, or customer data.
- Do not accept or implement ADR-001 or ADR-013 without explicit approval.
- Do not research the web unless the user explicitly starts a research thread.
- Do not touch unrelated web/marketing worktree changes.

## Next Thread Prompt

`DEV-07 Part 9: approved local AR unapplied customer payment allocation mutation`

## DEV-07 Part 9 - AR Unapplied Payment Allocation Evidence Completed

- DEV-07 Part 9 evidence is recorded in [docs/development/DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_EVIDENCE.md](docs/development/DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_EVIDENCE.md).
- Approval phrase was received for the local-only AR unapplied customer payment allocation mutation under marker `DEV03-AR-20260524T130000` for `PAYMENT-000001` and `INVOICE-000002`.
- Current local state shows the approved allocation outcome: `PAYMENT-000001` remains `POSTED`, amount received remains `500.0000`, and unapplied amount is `0.0000`.
- `INVOICE-000002` remains `FINALIZED`, total remains `1150.0000`, and balance due is `650.0000`.
- Direct allocation evidence remains one `CustomerPaymentAllocation` for `300.0000`; one active `CustomerPaymentUnappliedAllocation` exists for `200.0000`.
- Accounting result: no new journal entry exists; `JOURNAL_ENTRY-000004` remains `POSTED`, reference `PAYMENT-000001`, debit `500.0000`, and credit `500.0000`; `JOURNAL_ENTRY` sequence next remains `5`.
- Audit result follows the current standardized audit behavior: `CUSTOMER_PAYMENT_CREATED` exists exactly once, `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED` exists exactly once, and raw `APPLY_UNAPPLIED` remains `0`.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, payment void, invoice void, reverse allocation, and cleanup deletion remained absent.
- No second `CustomerPaymentService.applyUnapplied(...)` call was run in the evidence continuation because read-only preflight found the one approved allocation result already present; a second call would violate the exactly-once boundary.
- Exact next prompt title: `DEV-07 Part 10: AR unapplied allocation reversal preflight`.

## Next Thread Prompt

`DEV-07 Part 10: AR unapplied allocation reversal preflight`

## DEV-07 Part 10 - AR Unapplied Allocation Reversal Preflight Completed

- DEV-07 Part 10 read-only preflight is recorded in [docs/development/DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_PREFLIGHT.md](docs/development/DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_PREFLIGHT.md).
- Mutation performed: no. `CustomerPaymentService.reverseUnappliedAllocation(...)` was not called.
- Current payment state: `PAYMENT-000001` remains `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, unapplied amount `0.0000`, journal `JOURNAL_ENTRY-000004`, and no void reversal journal.
- Current invoice state: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `650.0000`, and no reversal journal.
- Current allocation state: direct allocation remains one `CustomerPaymentAllocation` for `300.0000`; active unapplied allocation safe prefix `8bc99925` remains unreversed for `200.0000` with no reversedAt, reversedById, or reversalReason.
- Expected future reversal effects: payment unapplied amount `0.0000 -> 200.0000`; invoice balance due `650.0000 -> 850.0000`; active unapplied allocation marked reversed with reason `DEV-07 local-only reversal QA for unapplied allocation`.
- Expected accounting/audit result: no new journal entry; `JOURNAL_ENTRY-000004` remains unchanged; `JOURNAL_ENTRY` sequence next remains `5`; future audit action should be standardized `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` on entity type `CustomerPaymentUnappliedAllocation`.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, payment void, invoice void, and cleanup deletion remain absent.
- Required approval phrase for Part 11: `I approve DEV-07 Part 11 local-only AR unapplied allocation reversal mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001, invoice INVOICE-000002, and the active 200.0000 unapplied allocation. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-07 Part 11: approved local AR unapplied allocation reversal mutation`.

## Next Thread Prompt

`DEV-07 Part 11: approved local AR unapplied allocation reversal mutation`

## DEV-07 Part 11 - AR Unapplied Allocation Reversal Mutation Completed

- DEV-07 Part 11 local-only mutation evidence is recorded in [docs/development/DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md](docs/development/DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only AR unapplied allocation reversal mutation under marker `DEV03-AR-20260524T130000` for `PAYMENT-000001`, `INVOICE-000002`, and the active `200.0000` unapplied allocation.
- Mutation performed: yes. `CustomerPaymentService.reverseUnappliedAllocation(...)` was called exactly once with reason `DEV-07 local-only reversal QA for unapplied allocation`.
- Payment evidence: `PAYMENT-000001` remains `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, and unapplied amount changed `0.0000 -> 200.0000`; journal remains `JOURNAL_ENTRY-000004`; no void reversal journal exists.
- Invoice evidence: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, and balance due changed `650.0000 -> 850.0000`; no reversal journal exists.
- Allocation evidence: the direct `CustomerPaymentAllocation` remains exactly one record for `300.0000`; the `8bc99925` `CustomerPaymentUnappliedAllocation` remains one record for `200.0000` and is now reversed with `reversedAt`, `reversedById`, and the approved reversal reason set.
- Accounting result: no new journal entry was created; fixture organization journal count remained `4`; `JOURNAL_ENTRY-000004` stayed `POSTED`, reference `PAYMENT-000001`, debit `500.0000`, credit `500.0000`, and unchanged `updatedAt`; `JOURNAL_ENTRY` sequence next remained `5`.
- Audit result: `CUSTOMER_PAYMENT_CREATED` remains exactly once, `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED` remains exactly once, and standardized `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` now exists exactly once for entity type `CustomerPaymentUnappliedAllocation`; raw reverse actions remain `0`.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive records, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, payment void, invoice void, cleanup deletion, migrations, seed/reset/delete, deploys, environment/provider/schema changes, production/beta/shared/customer-data actions, and login/browser audit-writing flows remained absent.
- Exact next prompt title: `DEV-07 Part 12: AR customer payment void/reversal preflight`.

## Next Thread Prompt

`DEV-07 Part 12: AR customer payment void/reversal preflight`

## DEV-07 Part 12 - AR Customer Payment Void/Reversal Preflight Completed

- DEV-07 Part 12 read-only preflight is recorded in [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_VOID_PREFLIGHT.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_VOID_PREFLIGHT.md).
- Mutation performed: no. `CustomerPaymentService.void(...)` was not called.
- Current payment state: `PAYMENT-000001` remains `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, unapplied amount `200.0000`, journal `JOURNAL_ENTRY-000004`, no void reversal journal, and no `voidedAt`.
- Current invoice state: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `850.0000`, and no reversal journal.
- Current allocation state: direct allocation remains one historical `CustomerPaymentAllocation` for `300.0000`; the `8bc99925` unapplied allocation remains reversed for `200.0000` with the Part 11 reversal reason; active unapplied allocation count is `0`.
- Void safety result: safe if the state still matches at mutation time. Current code blocks posted refunds and active unapplied allocations, but it does not block direct allocations; it uses direct allocations to restore finalized invoice balances. Current posted refund count is `0`, active unapplied allocation count is `0`, and fiscal period count is `0`.
- Expected future void effects: payment becomes `VOIDED`; amount received remains `500.0000`; unapplied amount remains `200.0000` by current service design; invoice balance due increases `850.0000 -> 1150.0000`; direct allocation row remains as historical data; reversed unapplied allocation remains reversed.
- Expected accounting/audit result: create reversal journal `JOURNAL_ENTRY-000005`, mark original `JOURNAL_ENTRY-000004` as `REVERSED`, set `voidReversalJournalEntryId`, journal count `4 -> 5`, journal sequence next `5 -> 6`, and create one `CUSTOMER_PAYMENT_VOIDED` audit action.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive records, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, invoice void, cleanup deletion, migrations, seed/reset/delete, deploys, environment/provider/schema changes, production/beta/shared/customer-data actions, and login/browser audit-writing flows remained absent.
- Required approval phrase for Part 13: `I approve DEV-07 Part 13 local-only AR customer payment void/reversal mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-07 Part 13: approved local AR customer payment void/reversal mutation`.

## Next Thread Prompt

`DEV-07 Part 13: approved local AR customer payment void/reversal mutation`

## DEV-07 Part 13 - AR Customer Payment Void/Reversal Mutation Completed

- DEV-07 Part 13 local-only mutation evidence is recorded in [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_VOID_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only AR customer payment void/reversal mutation under marker `DEV03-AR-20260524T130000` for `PAYMENT-000001`.
- Mutation performed: yes. `CustomerPaymentService.void(...)` was called once for `PAYMENT-000001`.
- Payment evidence: `PAYMENT-000001` changed from `POSTED` to `VOIDED`, safe id prefix `b39f4d38`, amount received remained `500.0000`, unapplied amount remained `200.0000`, and `voidedAt` is set.
- Invoice evidence: `INVOICE-000002` remained `FINALIZED`, safe id prefix `ddadfdd7`, total remained `1150.0000`, and balance due changed `850.0000 -> 1150.0000`; no invoice reversal journal exists.
- Allocation evidence: the direct `CustomerPaymentAllocation` remains exactly one historical record for `300.0000`; the `8bc99925` unapplied allocation remains reversed for `200.0000`; no new allocation or credit-note allocation was created.
- Accounting result: reversal journal `JOURNAL_ENTRY-000005` was created with status `POSTED`, reference `PAYMENT-000001`, and `reversalOf` `JOURNAL_ENTRY-000004`; original payment journal `JOURNAL_ENTRY-000004` is now `REVERSED`; journal count changed `4 -> 5`; `JOURNAL_ENTRY` sequence next changed `5 -> 6`.
- Audit result: `CUSTOMER_PAYMENT_CREATED`, `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`, and `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` remain exactly once; `CUSTOMER_PAYMENT_VOIDED` now exists exactly once.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive records, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, invoice void, cleanup deletion, migrations, seed/reset/delete, deploys, environment/provider/schema changes, production/beta/shared/customer-data actions, and login/browser audit-writing flows remained absent.
- Exact next prompt title: `DEV-07 Part 14: AR state-machine closure and evidence consolidation`.

## Next Thread Prompt

`DEV-07 Part 14: AR state-machine closure and evidence consolidation`

## DEV-07 Part 14 - AR State-Machine Closure Completed

- DEV-07 Part 14 closure is recorded in [docs/development/DEV_07_AR_STATE_MACHINE_CLOSURE.md](docs/development/DEV_07_AR_STATE_MACHINE_CLOSURE.md).
- Mutation performed: no. No database write, invoice/payment/allocation/refund/credit-note mutation, output/PDF/archive, email, ZATCA, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider change, production, beta, shared-target, customer-data, or login/browser flow ran.
- DEV-07 proved the local AR customer payment allocation chain: finalized invoice fixture `INVOICE-000002`, posted customer payment `PAYMENT-000001`, one direct allocation for `300.0000`, unapplied amount `200.0000`, apply-unapplied allocation for `200.0000`, reversal of that unapplied allocation, and customer payment void/reversal.
- Final payment state: `PAYMENT-000001` is `VOIDED`, safe id prefix `b39f4d38`, amount received `500.0000`, unapplied amount `200.0000`, original journal `JOURNAL_ENTRY-000004`, and void reversal journal `JOURNAL_ENTRY-000005`.
- Final invoice state: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `1150.0000`, and no invoice reversal journal.
- Final allocation state: one historical direct `CustomerPaymentAllocation` remains for `300.0000`; the `8bc99925` `CustomerPaymentUnappliedAllocation` remains reversed for `200.0000` with reason `DEV-07 local-only reversal QA for unapplied allocation`.
- Final accounting result: `JOURNAL_ENTRY-000004` is `REVERSED`; `JOURNAL_ENTRY-000005` is `POSTED`, references `PAYMENT-000001`, and reverses `JOURNAL_ENTRY-000004`; `JOURNAL_ENTRY` sequence next is `6`.
- Final audit result: `CUSTOMER_PAYMENT_CREATED`, `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`, `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`, and `CUSTOMER_PAYMENT_VOIDED` each exist exactly once; cleanup/delete audit actions remain `0`.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive records, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, invoice void, and cleanup deletion remained absent.
- Remaining AR gaps: customer refunds, credit notes, output/PDF/archive, email, ZATCA XML/signing/submission, authenticated UI/API QA, repeated/idempotency paths, allocation blockers beyond this chain, fiscal-period locks, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08 Part 1: AP state-machine fixture and mutation preflight`.

## Next Thread Prompt

`DEV-08 Part 1: AP state-machine fixture and mutation preflight`

## DEV-08 Part 1 - AP State-Machine Fixture And Mutation Preflight Completed

- DEV-08 Part 1 read-only AP preflight is recorded in [docs/development/DEV_08_AP_STATE_MACHINE_PREFLIGHT.md](docs/development/DEV_08_AP_STATE_MACHINE_PREFLIGHT.md).
- Mutation performed: no. No database write, AP fixture creation, supplier, purchase bill, supplier payment, refund, debit note, cash expense, purchase order, journal, inventory receipt, generated document, PDF/archive, email, ZATCA, migration, seed/reset/delete, deploy, environment change, production, beta, shared-target, hosted-database, customer-data, or login/browser flow ran.
- Recommended first AP fixture target: one fake local supplier and one direct-mode finalized purchase bill under marker `DEV08-AP-20260525T230000`, using an expense/asset line, AP account `210`, VAT receivable account `230` if a safe purchase tax dependency is available, and no purchase order conversion, inventory clearing, supplier payment, debit note, refund, or output route.
- Fixture runner finding: the existing DEV-04 runner can inspect AP family plans, but execute mode is explicitly restricted to the approved AR skeleton, AP proposed records are not defined, and marker validation does not currently accept `DEV08-AP-*`. Part 2 should use a tightly guarded temporary AP fixture script unless runner support is intentionally extended first.
- Proposed DEV-08 sequence: AP fixture creation and evidence verification; supplier payment creation with direct allocation and unapplied amount; supplier payment unapplied allocation; reversal; supplier payment void/reversal; purchase bill void/reversal; closure, with purchase debit notes, supplier refunds, purchase orders, cash expenses, and inventory clearing deferred to later AP branches.
- Expected accounting areas: purchase bill finalization posts expense/asset and VAT receivable debits against AP credit; supplier payment creation posts AP debit against cash/bank credit; supplier payment apply/reverse unapplied allocation creates no journal; supplier payment and purchase bill void paths create reversal journals after blockers are cleared.
- Expected audit areas: purchase bill, supplier payment, supplier refund, purchase debit note, purchase order, and cash expense create/finalize/void events have standardized mappings where listed in `audit-events.ts`; supplier payment apply/reverse and debit-note allocation apply/reverse currently appear to use raw allocation action strings unless a later hardening task adds mappings.
- Output/email/ZATCA boundary: AP state-machine mutations must not call purchase bill, supplier payment, supplier refund, debit note, purchase order, or cash expense PDF/output routes and must keep generated documents, email, and ZATCA artifacts absent.
- Blockers and unknowns: local disposable DB target and fixture org/account/tax dependencies must be reverified before mutation; fiscal period locks can block posting; inventory-clearing bill mode has extra prerequisites and should be deferred; AP allocation audit standardization and permission granularity need later review.
- Required approval phrase for Part 2: `I approve DEV-08 Part 2 local-only AP fixture creation mutation under marker DEV08-AP-20260525T230000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 2: approved local AP fixture creation mutation`.

## Next Thread Prompt

`DEV-08 Part 2: approved local AP fixture creation mutation`

## DEV-08 Part 2 - AP Fixture Creation Mutation Completed

- DEV-08 Part 2 local-only mutation evidence is recorded in [docs/development/DEV_08_AP_FIXTURE_CREATION_MUTATION_EVIDENCE.md](docs/development/DEV_08_AP_FIXTURE_CREATION_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only AP fixture creation mutation under marker `DEV08-AP-20260525T230000`.
- Mutation performed: yes. The successful guarded script execution called `ContactService.create(...)` once, `PurchaseBillService.create(...)` once, and `PurchaseBillService.finalize(...)` once.
- Supplier evidence: one active fake local `SUPPLIER` contact was created with display label `DEV08-AP-20260525T230000 Supplier`, safe id prefix `0e36df97`, in fake local organization safe prefix `db69e5a8`.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, status `FINALIZED`, `DIRECT_EXPENSE_OR_ASSET`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, balance due `1150.0000`, no purchase order link, no reversal journal, and no supplier payment/debit-note allocations.
- Tax path: VAT path was used with AP account `210`, VAT receivable account `230`, and purchase tax rate `VAT on Purchases 15%`; zero-tax fallback was not used.
- Journal/accounting evidence: posted journal `JE-000049`, safe id prefix `3dfa0a86`, total debit `1150.0000`, total credit `1150.0000`, with debit `1000.0000` to account `111`, debit `150.0000` to account `230`, and credit `1150.0000` to account `210`; organization journal count changed `48 -> 49`.
- Audit evidence: created `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, and `PurchaseBill:PURCHASE_BILL_FINALIZED`; no supplier payment, supplier refund, debit note, void, reverse, or login/browser audit-writing action was created by this mutation.
- Output/email/ZATCA/payment/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. The guarded script verified supplier payment, supplier refund, purchase debit note, purchase order, purchase receipt, stock movement, cash expense, generated document, email, ZATCA signed artifact/submission, auth token, and cleanup/delete audit counts were unchanged.
- Note: the exact DEV-07 AR fixture organization exists but lacks AP account `210`, so Part 2 used an existing fake local AP-ready SDK validation organization. Future DEV-08 evidence should keep comparing before/after side-effect counts because that organization has baseline local AP/ZATCA/output data.
- Exact next prompt title: `DEV-08 Part 3: AP fixture evidence verification`.

## Next Thread Prompt

`DEV-08 Part 3: AP fixture evidence verification`

## DEV-08 Part 3 - AP Fixture Evidence Verification Completed

- DEV-08 Part 3 read-only verification is recorded in [docs/development/DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No supplier, purchase bill, supplier payment, allocation, refund, debit note, purchase order, purchase receipt, cash expense, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment change, or browser/login flow was created or mutated.
- Supplier evidence: exactly one active fake local `SUPPLIER` contact exists with display label `DEV08-AP-20260525T230000 Supplier`, safe id prefix `0e36df97`, in fake local AP-ready organization safe prefix `db69e5a8`.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, `DIRECT_EXPENSE_OR_ASSET`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, balance due `1150.0000`, no purchase order link, no reversal journal, no supplier payment allocations, no supplier payment unapplied allocations, and no purchase debit note allocations.
- Tax path evidence: VAT path remains in use with purchase tax rate `VAT on Purchases 15%`, account `230 VAT Receivable`, and zero-tax fallback was not used.
- Journal/accounting evidence: posted journal `JE-000049`, safe id prefix `3dfa0a86`, remains balanced with debit `1000.0000` to account `111`, debit `150.0000` to account `230`, and credit `1150.0000` to account `210`; no supplier payment journal or reversal journal exists for this fixture.
- Audit evidence: `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, and `PurchaseBill:PURCHASE_BILL_FINALIZED` each exist once for the fixture entities; no supplier payment, refund, debit-note, void/reversal, or login/browser audit-writing action was linked to this fixture.
- Forbidden side effects checked: fixture-specific supplier payments, supplier payment allocations, supplier payment unapplied allocations, supplier refunds, purchase debit notes, debit-note allocations, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, email rows, and cleanup/delete audit actions are all `0`; organization-level baseline counts still match Part 2 after counts for existing local AP/ZATCA/output data.
- Exact next prompt title: `DEV-08 Part 4: supplier payment creation and allocation preflight`.

## Next Thread Prompt

`DEV-08 Part 4: supplier payment creation and allocation preflight`

## DEV-08 Part 4 - Supplier Payment Creation And Allocation Preflight Completed

- DEV-08 Part 4 read-only preflight is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_CREATION_PREFLIGHT.md](docs/development/DEV_08_SUPPLIER_PAYMENT_CREATION_PREFLIGHT.md).
- Mutation performed: no. `SupplierPaymentService.create(...)` was not called, and no supplier payment, allocation, refund, debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment change, or browser/login flow was created or mutated.
- Current fixture state: supplier `DEV08-AP-20260525T230000 Supplier` remains active `SUPPLIER`, safe prefix `0e36df97`; `BILL-000007` remains `FINALIZED`, safe prefix `d81ddd60`, total `1150.0000`, balance due `1150.0000`, no reversal journal, and no supplier payment/debit-note allocations.
- Planned payment: amount paid `500.0000`, direct allocation `300.0000` to `BILL-000007`, expected unapplied amount `200.0000`, payment date `2026-05-25`, currency `SAR`, marker-bearing description.
- Selected paid-through account: account `112 Bank Account`, safe prefix `32ab6f4d`, active posting `ASSET`, active bank profile, SAR, in the same fake local AP-ready organization; required AP account `210 Accounts Payable` safe prefix `883ea9a6` is active and posting.
- Sequence/precondition evidence: fiscal period covering `2026-05-25` is `OPEN`; `PAYMENT` sequence is `PAY-` next `6` so expected payment number is `PAY-000006` if unchanged; `JOURNAL_ENTRY` sequence is `JE-` next `50` so expected payment journal is `JE-000050` if unchanged.
- Expected bill/accounting result: `BILL-000007` balance due should change `1150.0000 -> 850.0000`; one direct `SupplierPaymentAllocation` for `300.0000` should exist; one posted supplier payment journal should debit AP `210` for `500.0000` and credit bank account `112` for `500.0000`; no bill reversal, payment void reversal, stock movement, or output journal should be created.
- Expected audit result: one standardized `SUPPLIER_PAYMENT_CREATED` audit action; no supplier payment void, supplier refund, debit note, purchase bill void, or login/browser audit-writing action.
- Blockers: none found. Part 5 must still stop if the supplier, bill, balance, paid-through account, fiscal period, sequence, or side-effect baseline differs at mutation time.
- Required approval phrase for Part 5: `I approve DEV-08 Part 5 local-only supplier payment creation mutation under marker DEV08-AP-20260525T230000 for BILL-000007 with payment amount 500.0000 and direct allocation 300.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 5: approved local supplier payment creation mutation`.

## Next Thread Prompt

`DEV-08 Part 5: approved local supplier payment creation mutation`

## DEV-08 Part 5 - Approved Local Supplier Payment Creation Mutation Completed

- DEV-08 Part 5 local-only mutation evidence is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_CREATION_MUTATION_EVIDENCE.md](docs/development/DEV_08_SUPPLIER_PAYMENT_CREATION_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier payment creation mutation under marker `DEV08-AP-20260525T230000`.
- Mutation performed: yes. The successful guarded script execution called `SupplierPaymentService.create(...)` exactly once.
- Supplier evidence: `DEV08-AP-20260525T230000 Supplier` remains active `SUPPLIER`, safe id prefix `0e36df97`, in fake local AP-ready organization safe prefix `db69e5a8`.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, status `POSTED`, amount paid `500.0000`, direct allocation `300.0000` to `BILL-000007`, unapplied amount `200.0000`, and no void reversal journal.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due changed `1150.0000 -> 850.0000`, reversal journal absent, and one direct supplier payment allocation exists for `300.0000`.
- Journal/accounting evidence: posted journal `JE-000050`, safe id prefix `b77bd6f7`, total debit `500.0000`, total credit `500.0000`, with debit `500.0000` to AP account `210` and credit `500.0000` to paid-through account `112`; no purchase bill reversal journal or supplier payment void reversal journal was created.
- Audit evidence: one `SUPPLIER_PAYMENT_CREATED` audit action exists for `PAY-000006`; no supplier payment void audit, supplier refund audit, purchase debit note audit, purchase bill void audit, or login/browser audit-writing flow occurred.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions remain `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-supplier-payment-create.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 6: supplier payment evidence verification`.

## Next Thread Prompt

`DEV-08 Part 6: supplier payment evidence verification`

## DEV-08 Part 6 - Supplier Payment Evidence Verification Completed

- DEV-08 Part 6 read-only verification is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_EVIDENCE_VERIFICATION.md](docs/development/DEV_08_SUPPLIER_PAYMENT_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No supplier payment creation, supplier payment unapplied allocation, allocation reversal, supplier payment void, purchase bill mutation, purchase bill void, supplier refund, debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Supplier evidence: `DEV08-AP-20260525T230000 Supplier` remains active `SUPPLIER`, safe id prefix `0e36df97`, in fake local AP-ready organization safe prefix `db69e5a8`.
- Supplier payment evidence: exactly one fixture payment exists, `PAY-000006`, safe id prefix `622ad0b6`, status `POSTED`, amount paid `500.0000`, unapplied amount `200.0000`, paid-through account `112` safe prefix `32ab6f4d`, journal present, void reversal journal absent, and supplier refund source claims `0`.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due `850.0000`, reversal journal absent, generated document links `0`, and purchase debit-note allocations `0`.
- Allocation evidence: exactly one direct `SupplierPaymentAllocation` links `PAY-000006` to `BILL-000007`, safe id prefix `6ec44d14`, amount `300.0000`; no `SupplierPaymentUnappliedAllocation` exists yet for this fixture.
- Journal/accounting evidence: purchase bill journal `JE-000049` remains `POSTED` and balanced with debit `111` `1000.0000`, debit `230` `150.0000`, credit `210` `1150.0000`; supplier payment journal `JE-000050` remains `POSTED` and balanced with debit `210` `500.0000`, credit `112` `500.0000`; no bill or supplier payment reversal journal exists.
- Audit evidence: `Contact` `CREATE`, `PURCHASE_BILL_CREATED`, `PURCHASE_BILL_FINALIZED`, and `SUPPLIER_PAYMENT_CREATED` each exist once for the fixture entities; supplier payment void, supplier payment apply/reverse, supplier refund, purchase debit note, purchase bill void, cleanup/delete, and login/browser audit-writing actions remain absent for this fixture.
- Forbidden side effects checked: fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions are all `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Exact next prompt title: `DEV-08 Part 7: supplier payment unapplied allocation preflight`.

## Next Thread Prompt

`DEV-08 Part 7: supplier payment unapplied allocation preflight`

## DEV-08 Part 7 - Supplier Payment Unapplied Allocation Preflight Completed

- DEV-08 Part 7 read-only preflight is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_PREFLIGHT.md](docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_PREFLIGHT.md).
- Mutation performed: no. `SupplierPaymentService.applyUnapplied(...)` was not called, and no supplier payment unapplied allocation, supplier payment creation, allocation reversal, supplier payment void, purchase bill mutation, purchase bill void, supplier refund, debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Current supplier payment state: `PAY-000006`, safe id prefix `622ad0b6`, remains `POSTED`, amount paid `500.0000`, unapplied amount `200.0000`, paid-through account `112` safe prefix `32ab6f4d`, journal `JE-000050`, and no void reversal journal.
- Current bill state: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due `850.0000`, no reversal journal, and no purchase debit-note allocation.
- Current allocation state: exactly one direct `SupplierPaymentAllocation` remains for `300.0000`, safe id prefix `6ec44d14`; no `SupplierPaymentUnappliedAllocation` exists yet for this fixture.
- Planned Part 8 allocation: apply exactly `200.0000` from `PAY-000006` to `BILL-000007` with DTO `{ billId, amountApplied: "200.0000" }`.
- Expected payment/bill/allocation effects: supplier payment remains `POSTED`, unapplied amount changes `200.0000 -> 0.0000`, bill remains `FINALIZED`, balance due changes `850.0000 -> 650.0000`, direct allocation remains unchanged, and one active `SupplierPaymentUnappliedAllocation` is created for `200.0000`.
- Expected accounting result: no new journal entry; `JE-000049` and `JE-000050` remain posted and unchanged; `JOURNAL_ENTRY` sequence should remain next `51` if safely checkable.
- Expected audit result: one raw `APPLY_UNAPPLIED` audit action for `SupplierPayment` because `audit-events.ts` does not currently standardize `SupplierPayment:APPLY_UNAPPLIED`; no supplier payment void, reverse-unapplied, supplier refund, purchase debit note, or purchase bill void audit is expected.
- Forbidden side effects checked: fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions are all `0`; organization-level ZATCA baselines remain non-zero and must be compared before/after in Part 8.
- Required approval phrase for Part 8: `I approve DEV-08 Part 8 local-only supplier payment unapplied allocation mutation under marker DEV08-AP-20260525T230000 for BILL-000007 and the active supplier payment unapplied amount 200.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 8: approved local supplier payment unapplied allocation mutation`.

## Next Thread Prompt

`DEV-08 Part 8: approved local supplier payment unapplied allocation mutation`

## DEV-08 Part 8 - Approved Local Supplier Payment Unapplied Allocation Mutation Completed

- DEV-08 Part 8 local-only mutation evidence is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_MUTATION_EVIDENCE.md](docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier payment unapplied allocation mutation under marker `DEV08-AP-20260525T230000` for `BILL-000007` and the active supplier payment unapplied amount `200.0000`.
- Mutation performed: yes. The successful guarded script execution called `SupplierPaymentService.applyUnapplied(...)` exactly once.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, remained `POSTED`, amount paid remained `500.0000`, unapplied amount changed `200.0000 -> 0.0000`, journal remained `JE-000050`, and void reversal journal remained absent.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remained `FINALIZED`, total remained `1150.0000`, balance due changed `850.0000 -> 650.0000`, and reversal journal remained absent.
- Allocation evidence: the direct `SupplierPaymentAllocation` remained exactly one historical record for `300.0000`; one `SupplierPaymentUnappliedAllocation` was created for `200.0000`, safe id prefix `a8ee4e23`, with `reversedAt`, `reversedById`, and `reversalReason` absent.
- Journal/accounting result: no new journal entry was created; organization journal count remained `50`, `JE-000049` and `JE-000050` remained posted and unchanged, `JOURNAL_ENTRY` sequence remained next `51`, and `PAYMENT` sequence remained next `7`.
- Audit result: `SUPPLIER_PAYMENT_CREATED` remains once for `PAY-000006`; raw `APPLY_UNAPPLIED` now exists once for `PAY-000006`; no supplier payment void, fixture unapplied reverse, supplier refund, purchase debit note, purchase bill void, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions remain `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-supplier-payment-apply-unapplied.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 9: supplier payment unapplied allocation reversal preflight`.

## Next Thread Prompt

`DEV-08 Part 9: supplier payment unapplied allocation reversal preflight`

## DEV-08 Part 9 - Supplier Payment Unapplied Allocation Reversal Preflight Completed

- DEV-08 Part 9 read-only preflight is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_PREFLIGHT.md](docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_PREFLIGHT.md).
- Mutation performed: no. `SupplierPaymentService.reverseUnappliedAllocation(...)` was not called, and no supplier payment creation, supplier payment apply-unapplied, supplier payment void, purchase bill mutation, purchase bill void, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Local-only safety result: Docker Linux engine was available, local Postgres/Redis containers were healthy, read-only SQL ran inside local `infra-postgres-1`, and no hosted/prod/beta/shared/customer-data target was used or printed.
- Current supplier payment state: `PAY-000006`, safe id prefix `622ad0b6`, remains `POSTED`, amount paid `500.0000`, unapplied amount `0.0000`, journal `JE-000050`, and no void reversal journal.
- Current purchase bill state: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due `650.0000`, inventory posting mode `DIRECT_EXPENSE_OR_ASSET`, and no reversal journal.
- Current allocation state: exactly one direct `SupplierPaymentAllocation` remains for `300.0000`, safe id prefix `6ec44d14`; exactly one active `SupplierPaymentUnappliedAllocation` exists for `200.0000`, safe id prefix `a8ee4e23`, with no `reversedAt`, `reversedById`, or `reversalReason`.
- Expected Part 10 reversal effects: payment unapplied amount changes `0.0000 -> 200.0000`; bill balance due changes `650.0000 -> 850.0000`; direct allocation remains unchanged; active unapplied allocation is marked reversed with reason `DEV-08 local-only reversal QA for supplier payment unapplied allocation`.
- Expected accounting result: no new journal entry; `JE-000049` and `JE-000050` remain posted and unchanged; organization journal count should remain `50`; `JOURNAL_ENTRY` sequence should remain next `51`.
- Expected audit result: one raw `REVERSE_UNAPPLIED_ALLOCATION` audit action for `SupplierPaymentUnappliedAllocation`, because `audit-events.ts` does not currently standardize the supplier payment unapplied reverse action; no supplier payment void, supplier refund, purchase debit note, purchase bill void, or login/browser audit-writing action is expected.
- Forbidden side effects checked: fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions are all `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Required approval phrase for Part 10: `I approve DEV-08 Part 10 local-only supplier payment unapplied allocation reversal mutation under marker DEV08-AP-20260525T230000 for BILL-000007 and the active 200.0000 supplier payment unapplied allocation. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 10: approved local supplier payment unapplied allocation reversal mutation`.

## Next Thread Prompt

`DEV-08 Part 10: approved local supplier payment unapplied allocation reversal mutation`

## DEV-08 Part 10 - Approved Local Supplier Payment Unapplied Allocation Reversal Mutation Completed

- DEV-08 Part 10 local-only mutation evidence is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_MUTATION_EVIDENCE.md](docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier payment unapplied allocation reversal mutation under marker `DEV08-AP-20260525T230000` for `BILL-000007` and active supplier payment unapplied allocation `a8ee4e23`.
- Mutation performed: yes. The successful guarded script execution called `SupplierPaymentService.reverseUnappliedAllocation(...)` exactly once.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, remained `POSTED`, amount paid remained `500.0000`, unapplied amount changed `0.0000 -> 200.0000`, journal remained `JE-000050`, and void reversal journal remained absent.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remained `FINALIZED`, total remained `1150.0000`, balance due changed `650.0000 -> 850.0000`, and reversal journal remained absent.
- Allocation evidence: the direct `SupplierPaymentAllocation` remained exactly one historical record for `300.0000`; the `SupplierPaymentUnappliedAllocation` safe id prefix `a8ee4e23` was marked reversed for `200.0000` with `reversedAt` set, `reversedById` safe prefix `09f892d4`, and reason `DEV-08 local-only reversal QA for supplier payment unapplied allocation`.
- Journal/accounting result: no new journal entry was created; organization journal count remained `50`, `JE-000049` and `JE-000050` remained posted and unchanged, `JOURNAL_ENTRY` sequence remained next `51`, and `PAYMENT` sequence remained next `7`.
- Audit result: `SUPPLIER_PAYMENT_CREATED` remains once for `PAY-000006`; raw `APPLY_UNAPPLIED` remains once for `PAY-000006`; raw `REVERSE_UNAPPLIED_ALLOCATION` now exists once for allocation `a8ee4e23`; no supplier payment void, supplier refund, purchase debit note, purchase bill void, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions remain `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 11: supplier payment void/reversal preflight`.

## Next Thread Prompt

`DEV-08 Part 11: supplier payment void/reversal preflight`

## DEV-08 Part 11 - Supplier Payment Void/Reversal Preflight Completed

- DEV-08 Part 11 read-only preflight is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_VOID_PREFLIGHT.md](docs/development/DEV_08_SUPPLIER_PAYMENT_VOID_PREFLIGHT.md).
- Mutation performed: no. `SupplierPaymentService.void(...)` was not called, and no supplier payment creation, supplier payment apply/reverse-unapplied, purchase bill mutation, purchase bill void, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Current supplier payment state: `PAY-000006`, safe id prefix `622ad0b6`, remains `POSTED`, amount paid `500.0000`, unapplied amount `200.0000`, paid-through account `112 Bank Account`, journal `JE-000050`, and no void reversal journal.
- Current purchase bill state: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due `850.0000`, inventory posting mode `DIRECT_EXPENSE_OR_ASSET`, and no reversal journal.
- Current allocation state: exactly one direct `SupplierPaymentAllocation` remains for `300.0000`, safe id prefix `6ec44d14`; the one `200.0000` `SupplierPaymentUnappliedAllocation` safe prefix `a8ee4e23` is reversed with reason `DEV-08 local-only reversal QA for supplier payment unapplied allocation`; active unapplied allocations are `0`.
- Void safety result: safe to plan for Part 12 if preflight remains unchanged. The service blocks active unapplied allocations and posted supplier refunds, both are absent, and the remaining direct allocation is handled by restoring `BILL-000007` balance due.
- Expected payment effect if approved: `PAY-000006` becomes `VOIDED`, amount paid remains `500.0000`, unapplied amount is expected to remain `200.0000` under current code, `voidedAt` is set, `journalEntryId` remains `JE-000050`, and `voidReversalJournalEntryId` is set to a new reversal journal.
- Expected bill/allocation effect if approved: `BILL-000007` balance due changes `850.0000 -> 1150.0000`; direct allocation `6ec44d14` remains a historical `300.0000` allocation; reversed unapplied allocation `a8ee4e23` remains reversed; no new allocations or debit-note allocations are expected.
- Expected journal/accounting effect if approved: original supplier payment journal `JE-000050` is marked `REVERSED`; expected reversal journal is `JE-000051` if the sequence remains unchanged, debiting account `112` for `500.0000` and crediting AP account `210` for `500.0000`; purchase bill journal `JE-000049` remains unchanged.
- Expected audit effect if approved: one standardized `SUPPLIER_PAYMENT_VOIDED` audit action for `PAY-000006`; no supplier refund, purchase debit note, purchase bill void, cleanup/delete, or login/browser audit-writing action.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and auth tokens since payment remain `0`; organization-level ZATCA baselines remain existing local data (`1` signed artifact draft and `7` submission logs).
- Required approval phrase for Part 12: `I approve DEV-08 Part 12 local-only supplier payment void/reversal mutation under marker DEV08-AP-20260525T230000 for the DEV-08 supplier payment linked to BILL-000007. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 12: approved local supplier payment void/reversal mutation`.

## Next Thread Prompt

`DEV-08 Part 12: approved local supplier payment void/reversal mutation`

## DEV-08 Part 12 - Approved Local Supplier Payment Void/Reversal Mutation Completed

- DEV-08 Part 12 local-only mutation evidence is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08_SUPPLIER_PAYMENT_VOID_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier payment void/reversal mutation under marker `DEV08-AP-20260525T230000` for the DEV-08 supplier payment linked to `BILL-000007`.
- Mutation performed: yes. The successful guarded script execution called `SupplierPaymentService.void(...)` exactly once for `PAY-000006`.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, changed from `POSTED` to `VOIDED`; amount paid remained `500.0000`; unapplied amount remained `200.0000`; `voidedAt` was set; original journal remained `JE-000050`; void reversal journal `JE-000051` was created.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remained `FINALIZED`; total remained `1150.0000`; balance due changed `850.0000 -> 1150.0000`; purchase bill journal `JE-000049` remained `POSTED`; purchase bill reversal journal remained absent.
- Allocation evidence: direct `SupplierPaymentAllocation` `6ec44d14` remained one historical allocation for `300.0000`; `SupplierPaymentUnappliedAllocation` `a8ee4e23` remained reversed for `200.0000`; no new supplier payment allocation, unapplied allocation, or purchase debit-note allocation was created.
- Journal/accounting evidence: original supplier payment journal `JE-000050` changed from `POSTED` to `REVERSED`; supplier payment reversal journal `JE-000051`, safe id prefix `ebc58c26`, posted with debit `112 Bank Account` for `500.0000` and credit `210 Accounts Payable` for `500.0000`; organization journal count changed `50 -> 51`; `JOURNAL_ENTRY` sequence changed next `51 -> 52`; `PAYMENT` sequence stayed next `7`.
- Audit evidence: `SUPPLIER_PAYMENT_CREATED` remains once, `APPLY_UNAPPLIED` remains once, raw `REVERSE_UNAPPLIED_ALLOCATION` remains once on allocation `a8ee4e23`, and standardized `SUPPLIER_PAYMENT_VOIDED` now exists once for `PAY-000006`; no supplier refund, purchase debit note, purchase bill void, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/purchase-bill-void/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, auth tokens since payment, and purchase bill void audit remained `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-supplier-payment-void.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 13: purchase bill void/reversal preflight after supplier payment void`.

## Next Thread Prompt

`DEV-08 Part 13: purchase bill void/reversal preflight after supplier payment void`

## DEV-08 Part 13 - Purchase Bill Void/Reversal Preflight Completed

- DEV-08 Part 13 read-only preflight is recorded in [docs/development/DEV_08_PURCHASE_BILL_VOID_PREFLIGHT.md](docs/development/DEV_08_PURCHASE_BILL_VOID_PREFLIGHT.md).
- Mutation performed: no. `PurchaseBillService.void(...)` was not called, and no purchase bill mutation, supplier payment void, supplier payment creation, supplier payment apply/reverse-unapplied, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Local-only safety result: Docker Linux engine was available, local Postgres/Redis containers were healthy, read-only SQL ran inside local `infra-postgres-1`, and no hosted/prod/beta/shared/customer-data target was used or printed.
- Current purchase bill state: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, inventory posting mode `DIRECT_EXPENSE_OR_ASSET`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, balance due `1150.0000`, purchase order link absent, and purchase bill reversal journal absent.
- Current supplier payment state: `PAY-000006`, safe id prefix `622ad0b6`, remains `VOIDED`, amount paid `500.0000`, unapplied amount `200.0000`, original journal `JE-000050` is `REVERSED`, and supplier payment void reversal journal `JE-000051` is `POSTED`.
- Current allocation state: direct `SupplierPaymentAllocation` `6ec44d14` remains one historical allocation for `300.0000`; `SupplierPaymentUnappliedAllocation` `a8ee4e23` remains reversed for `200.0000`; active direct allocation blocker count, active unapplied allocation blocker count, and active purchase debit note allocation blocker count are all `0`.
- Purchase bill void safety result: safe to plan for Part 14 if preflight remains unchanged. Current code blocks direct allocations only when the linked supplier payment is not `VOIDED`, so the historical direct allocation from `PAY-000006` does not block `BILL-000007`.
- Expected bill effect if approved: `BILL-000007` changes from `FINALIZED` to `VOIDED`, balance due changes `1150.0000 -> 0.0000`, total remains historically `1150.0000`, and `reversalJournalEntryId` is linked to a new purchase bill reversal journal. Current schema does not store purchase bill `voidedAt`, `voidedById`, or void reason.
- Expected allocation effect if approved: no new supplier payment allocation, supplier payment unapplied allocation, or purchase debit-note allocation is created; historical direct allocation `6ec44d14` and reversed unapplied allocation `a8ee4e23` remain as-is.
- Expected journal/accounting effect if approved: original purchase bill journal `JE-000049` is marked `REVERSED`; expected new reversal journal is `JE-000052` if sequence next `52` remains unchanged, debiting `210 Accounts Payable` for `1150.0000` and crediting `111 Cash` for `1000.0000` plus `230 VAT Receivable` for `150.0000`; supplier payment journals `JE-000050` and `JE-000051` are not changed.
- Expected audit effect if approved: one standardized `PURCHASE_BILL_VOIDED` audit action for `BILL-000007`; no additional `SUPPLIER_PAYMENT_VOIDED`, supplier refund, purchase debit note, cash expense, purchase order, cleanup/delete, or login/browser audit-writing action.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, email provider events, supplier refunds, purchase debit notes, purchase orders, purchase receipts, linked stock movements, cash expenses, inventory variance proposals, cleanup/delete audit actions, and purchase bill void audit remain `0`; organization-level ZATCA baselines remain unchanged local data (`1` signed artifact draft and `7` submission logs).
- Required approval phrase for Part 14: `I approve DEV-08 Part 14 local-only purchase bill void/reversal mutation under marker DEV08-AP-20260525T230000 for BILL-000007 after supplier payment void/reversal completed. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 14: approved local purchase bill void/reversal mutation`.

## Next Thread Prompt

`DEV-08 Part 14: approved local purchase bill void/reversal mutation`

## DEV-08 Part 14 - Approved Local Purchase Bill Void/Reversal Mutation Completed

- DEV-08 Part 14 local-only mutation evidence is recorded in [docs/development/DEV_08_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only purchase bill void/reversal mutation under marker `DEV08-AP-20260525T230000` for `BILL-000007` after supplier payment void/reversal completed.
- Mutation performed: yes. The guarded temporary script called `PurchaseBillService.void(...)` exactly once for `BILL-000007`; the script was not rerun after a post-mutation broad baseline assertion failed.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, changed from `FINALIZED` to `VOIDED`; subtotal remained `1000.0000`, tax remained `150.0000`, total remained `1150.0000`, balance due changed `1150.0000 -> 0.0000`, and reversal journal `JE-000052` was linked.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, remained `VOIDED`; amount paid remained `500.0000`; unapplied amount remained `200.0000`; original payment journal `JE-000050` remained `REVERSED`; payment void reversal journal `JE-000051` remained `POSTED`.
- Allocation evidence: direct `SupplierPaymentAllocation` safe prefix `6ec44d14` remained one historical allocation for `300.0000`; `SupplierPaymentUnappliedAllocation` safe prefix `a8ee4e23` remained reversed for `200.0000`; no new supplier payment allocation, supplier payment unapplied allocation, or purchase debit-note allocation was created.
- Journal/accounting evidence: original purchase bill journal `JE-000049`, safe id prefix `3dfa0a86`, changed from `POSTED` to `REVERSED`; purchase bill reversal journal `JE-000052`, safe id prefix `b243cab0`, posted with debit `210 Accounts Payable` for `1150.0000`, credit `230 VAT Receivable` for `150.0000`, and credit `111 Cash` for `1000.0000`; `JOURNAL_ENTRY` sequence changed next `52 -> 53`.
- Audit evidence: fixture-scoped `PURCHASE_BILL_VOIDED` now exists once for `BILL-000007`; `PURCHASE_BILL_CREATED` and `PURCHASE_BILL_FINALIZED` remain once; `SUPPLIER_PAYMENT_VOIDED` remains once; no duplicate purchase bill finalization, duplicate supplier payment void, supplier refund, purchase debit note, purchase order, cash expense, cleanup/delete, or login/browser audit-writing action occurred for this fixture.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, inventory variance proposals, marker email outbox rows, and cleanup/delete audit actions remain `0`; organization-level ZATCA baseline remains unchanged local AP-ready data (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-purchase-bill-void.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 15: AP state-machine closure and evidence consolidation`.

## Next Thread Prompt

`DEV-08 Part 15: AP state-machine closure and evidence consolidation`

## DEV-08 Part 15 - AP State-Machine Closure Completed

- DEV-08 Part 15 read-only closure is recorded in [docs/development/DEV_08_AP_STATE_MACHINE_CLOSURE.md](docs/development/DEV_08_AP_STATE_MACHINE_CLOSURE.md).
- Mutation performed: no. No database write, login/browser flow, AP mutation, output/PDF/archive/export/download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action was performed.
- Latest pushed commit inspected at the start of Part 15: `b99e068b Void DEV-08 purchase bill`; local `HEAD` matched `origin/main`.
- DEV-08 proved areas: fake local supplier fixture, finalized direct-mode purchase bill, AP/VAT/expense purchase bill journal, supplier payment creation/posting, direct bill allocation, unapplied supplier payment amount, apply-unapplied matching, reverse-unapplied matching, supplier payment void/reversal, purchase bill void/reversal after payment void, journal reversal behavior, audit behavior, and fixture-specific output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup non-effects.
- Final bill/payment state: supplier `DEV08-AP-20260525T230000 Supplier` safe prefix `0e36df97` remains active `SUPPLIER`; `BILL-000007` safe prefix `d81ddd60` is `VOIDED`, total `1150.0000`, balance due `0.0000`; `PAY-000006` safe prefix `622ad0b6` is `VOIDED`, amount paid `500.0000`, unapplied amount `200.0000`.
- Final journal state: purchase bill journal `JE-000049` is `REVERSED`; purchase bill reversal journal `JE-000052` is `POSTED`; supplier payment journal `JE-000050` is `REVERSED`; supplier payment reversal journal `JE-000051` is `POSTED`.
- Final allocation state: direct `SupplierPaymentAllocation` safe prefix `6ec44d14` remains one historical `300.0000` allocation; `SupplierPaymentUnappliedAllocation` safe prefix `a8ee4e23` remains reversed for `200.0000`; no active unapplied allocation or purchase debit-note allocation remains.
- Remaining AP gaps: purchase debit notes, supplier refunds, purchase orders, cash expenses, inventory-clearing bills, purchase receipts/inventory integration, AP output/PDF/archive routes, AP email delivery, browser-authenticated AP UI flow, repeated/idempotency paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08B Part 1: AP debit note and supplier refund branch preflight`.

## Next Thread Prompt

`DEV-08B Part 1: AP debit note and supplier refund branch preflight`

## DEV-08B Part 1 - AP Debit Note And Supplier Refund Branch Preflight Completed

- DEV-08B Part 1 read-only preflight is recorded in [docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_PREFLIGHT.md](docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_PREFLIGHT.md).
- Mutation performed: no. No database write, DB connection, login/browser flow, AP mutation, debit note creation, supplier refund creation, purchase bill creation, supplier payment creation, output/PDF/archive/export/download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action was performed.
- Recommended fixture target: reuse the fake local AP-ready organization from DEV-08 only after Part 2 rechecks it is local/disposable and has the required dependencies; create a new marker-scoped DEV-08B fake supplier, finalized direct-mode purchase bill, and finalized purchase debit note under marker `DEV08B-AP-20260526T060000`.
- Proposed economics: new purchase bill total `1150.0000`; new purchase debit note total candidate `400.0000`, preferably VAT path with taxable `347.8261` and VAT `52.1739`; apply `250.0000` to the bill; use remaining debit-note unapplied amount for supplier refund testing after an explicit Part 9 branch decision.
- Blockers/unknowns: do not reuse voided `BILL-000007`; exact number sequences, fiscal-period state, and account/tax dependencies must be read-only checked before mutation; debit-note apply/reverse allocation audit actions appear raw rather than standardized.
- Required approval phrase for Part 2: `I approve DEV-08B Part 2 local-only AP debit note fixture creation mutation under marker DEV08B-AP-20260526T060000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 2: approved local AP debit note fixture creation mutation`.

## Next Thread Prompt

`DEV-08B Part 2: approved local AP debit note fixture creation mutation`

## DEV-08B Part 2 - Approved Local AP Debit Note Fixture Creation Mutation Completed

- DEV-08B Part 2 local-only mutation evidence is recorded in [docs/development/DEV_08B_AP_DEBIT_NOTE_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08B_AP_DEBIT_NOTE_FIXTURE_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only AP debit note fixture creation mutation under marker `DEV08B-AP-20260526T060000`.
- Mutation performed: yes. The guarded temporary script called `ContactService.create(...)`, `PurchaseBillService.create(...)`, `PurchaseBillService.finalize(...)`, `PurchaseDebitNoteService.create(...)`, and `PurchaseDebitNoteService.finalize(...)` once each.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the guarded script accepted only `localhost:5432`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Supplier evidence: `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`, active `SUPPLIER`, under the fake local AP-ready organization safe prefix `db69e5a8`.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, `FINALIZED`, direct expense/asset mode, subtotal `1000.0000`, VAT `150.0000`, total and balance due `1150.0000`, no reversal journal, no supplier payment allocation, no debit note allocation, and no generated document.
- Purchase debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, `FINALIZED`, linked to `BILL-000008`, subtotal `400.0000`, VAT `60.0000`, total and unapplied amount `460.0000`, no allocation, no supplier refund, and no reversal journal.
- Tax path: VAT path was used; zero-tax fallback was not used.
- Journal evidence: bill journal `JE-000053`, safe id prefix `950b8a43`, posted and balanced with debits `111` `1000.0000` and `230` `150.0000`, credit `210` `1150.0000`; debit-note journal `JE-000054`, safe id prefix `670f7dc0`, posted and balanced with debit `210` `460.0000`, credits `111` `400.0000` and `230` `60.0000`.
- Audit evidence: `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, `PurchaseBill:PURCHASE_BILL_FINALIZED`, `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`, and `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED` were recorded; no debit-note apply/reverse/void, supplier refund, supplier payment, purchase order, cash expense, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/payment/refund/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific supplier payments, supplier refunds, debit note allocations, purchase orders, purchase receipts, stock movements, cash expenses, and generated documents are all `0`; organization-level generated document, email, ZATCA, and other baseline counts were unchanged in the read-only verification pass.
- Temporary script cleanup: `apps/api/scripts/dev08b-ap-debit-note-fixture.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Deviation: the first script run completed the mutation once and then failed during a post-mutation broad stock-movement read filter. The temporary script was patched to use a read-only `--verify-existing` path and current schema fields, then rerun only to verify the already-created marker fixture without creating additional records.
- Exact next prompt title: `DEV-08B Part 3: AP debit note fixture evidence verification`.

## Next Thread Prompt

`DEV-08B Part 3: AP debit note fixture evidence verification`

## DEV-08B Part 3 - AP Debit Note Fixture Evidence Verification Completed

- DEV-08B Part 3 read-only verification is recorded in [docs/development/DEV_08B_AP_DEBIT_NOTE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08B_AP_DEBIT_NOTE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No debit-note apply/reverse/void, supplier refund creation, supplier payment creation, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma script accepted only `localhost:5432`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Temporary script absence: `apps/api/scripts/dev08b-ap-debit-note-fixture.tmp.ts` is absent, unstaged, and untracked.
- Supplier evidence: exactly one marker supplier exists, `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`, active `SUPPLIER`, under fake local AP-ready organization safe prefix `db69e5a8`.
- Purchase bill evidence: exactly one marker bill exists, `BILL-000008`, safe id prefix `4b8886bb`, `FINALIZED`, `DIRECT_EXPENSE_OR_ASSET`, subtotal `1000.0000`, VAT `150.0000`, total and balance due `1150.0000`, no reversal journal, no supplier payment allocation, no debit-note allocation, and no generated document.
- Purchase debit note evidence: exactly one marker debit note exists, `PDN-000003`, safe id prefix `b93f96ee`, `FINALIZED`, linked to `BILL-000008`, subtotal `400.0000`, VAT `60.0000`, total and unapplied amount `460.0000`, no allocation, no supplier refund, no reversal journal, and no generated document.
- Journal evidence: bill journal `JE-000053`, safe id prefix `950b8a43`, remains `POSTED` and balanced with debits `111` `1000.0000` and `230` `150.0000`, credit `210` `1150.0000`; debit-note journal `JE-000054`, safe id prefix `670f7dc0`, remains `POSTED` and balanced with debit `210` `460.0000`, credits `111` `400.0000` and `230` `60.0000`.
- Audit evidence: fixture actions are exactly `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, `PurchaseBill:PURCHASE_BILL_FINALIZED`, `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`, and `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`; no debit-note apply/reverse/void, supplier refund, supplier payment, purchase bill void, or login/browser audit-writing action was found for this fixture.
- Forbidden side effects checked: fixture-specific supplier payments, supplier refunds, debit note allocations, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, and marker email provider events are all `0`; organization-level local ZATCA baselines still match `1` signed artifact draft and `7` submission logs.
- Deviation: one read-only verification query initially failed because an audit assertion was too broad and counted unrelated actor-level refund/payment audits; it was rerun with fixture-scoped audit checks and no write path was called.
- Exact next prompt title: `DEV-08B Part 4: debit note apply-to-bill preflight`.

## Next Thread Prompt

`DEV-08B Part 4: debit note apply-to-bill preflight`

## DEV-08B Part 4 - Debit Note Apply-To-Bill Preflight Completed

- DEV-08B Part 4 read-only preflight is recorded in [docs/development/DEV_08B_DEBIT_NOTE_APPLY_PREFLIGHT.md](docs/development/DEV_08B_DEBIT_NOTE_APPLY_PREFLIGHT.md).
- Mutation performed: no. `PurchaseDebitNoteService.apply(...)` was not called, and no debit-note apply/reverse/void, supplier refund, supplier payment, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma preflight accepted only `localhost:5432`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total `460.0000`, unapplied amount `460.0000`, linked to `BILL-000008`, no allocation, no supplier refund, and no reversal journal.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total `1150.0000`, balance due `1150.0000`, no debit-note allocation, no supplier payment allocation, and no reversal journal.
- Planned application amount: `250.0000`.
- Expected debit-note effect if approved: `PDN-000003` remains `FINALIZED`, total remains `460.0000`, unapplied amount changes `460.0000 -> 210.0000`, and reversal journal remains absent.
- Expected bill effect if approved: `BILL-000008` remains `FINALIZED`, total remains `1150.0000`, balance due changes `1150.0000 -> 900.0000`, and reversal journal remains absent.
- Expected allocation effect if approved: one `PurchaseDebitNoteAllocation` is created for `250.0000`, linked to `PDN-000003` and `BILL-000008`, with `reversedAt`, `reversedById`, and `reversalReason` absent; no supplier payment allocation or supplier refund is created.
- Expected journal/accounting effect if approved: no new journal entry because current code treats apply as matching-only; bill journal `JE-000053` and debit-note journal `JE-000054` remain posted and unchanged; current journal count `54` and `JOURNAL_ENTRY` sequence next `JE-000055` should remain unchanged.
- Expected audit effect if approved: one raw `PurchaseDebitNote:APPLY` audit action for `PDN-000003`; current audit mapping does not standardize `PurchaseDebitNote:APPLY`; no reverse-allocation, debit-note void, supplier refund, supplier payment, purchase bill void, or login/browser audit-writing action expected.
- Forbidden side effects checked: fixture-specific supplier payments, supplier refunds, debit note allocations, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows, and marker email provider events are all `0`; organization-level local ZATCA baselines remain `1` signed artifact draft and `7` submission logs.
- Required approval phrase for Part 5: `I approve DEV-08B Part 5 local-only purchase debit note apply-to-bill mutation under marker DEV08B-AP-20260526T060000 for the DEV-08B debit note and purchase bill with amount 250.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 5: approved local debit note apply-to-bill mutation`.

## Next Thread Prompt

`DEV-08B Part 5: approved local debit note apply-to-bill mutation`

## DEV-08B Part 5 - Approved Local Debit Note Apply-To-Bill Mutation Completed

- DEV-08B Part 5 local-only mutation evidence is recorded in [docs/development/DEV_08B_DEBIT_NOTE_APPLY_MUTATION_EVIDENCE.md](docs/development/DEV_08B_DEBIT_NOTE_APPLY_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only purchase debit note apply-to-bill mutation under marker `DEV08B-AP-20260526T060000` for the DEV-08B debit note and purchase bill with amount `250.0000`.
- Mutation performed: yes. The guarded temporary script called `PurchaseDebitNoteService.apply(...)` exactly once for `PDN-000003` with `{ billId: BILL-000008, amountApplied: "250.0000" }`.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the guarded script accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remained `FINALIZED`; total remained `460.0000`; unapplied amount changed `460.0000 -> 210.0000`; reversal journal remained absent.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; total remained `1150.0000`; balance due changed `1150.0000 -> 900.0000`; reversal journal remained absent.
- Allocation evidence: exactly one active `PurchaseDebitNoteAllocation` was created, safe id prefix `7ec0dfb3`, amount applied `250.0000`, linked to `PDN-000003` and `BILL-000008`; `reversedAt`, `reversedById`, and `reversalReason` remained absent.
- Journal/accounting evidence: no new journal entry was created; organization journal count stayed `54`; `JOURNAL_ENTRY` sequence stayed `JE-000055`; purchase bill journal `JE-000053` and purchase debit note journal `JE-000054` remained posted and unchanged.
- Audit evidence: raw `PurchaseDebitNote:APPLY` now exists once for `PDN-000003`; `PURCHASE_DEBIT_NOTE_CREATED` and `PURCHASE_DEBIT_NOTE_FINALIZED` remain; no debit-note reverse/void, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/payment/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific supplier payments, supplier refunds, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, and marker email provider events remain `0`; organization-level ZATCA baselines stayed unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08b-debit-note-apply.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 6: debit note apply evidence verification`.

## Next Thread Prompt

`DEV-08B Part 6: debit note apply evidence verification`

## DEV-08B Part 6 - Debit Note Apply Evidence Verification Completed

- DEV-08B Part 6 read-only verification is recorded in [docs/development/DEV_08B_DEBIT_NOTE_APPLY_EVIDENCE_VERIFICATION.md](docs/development/DEV_08B_DEBIT_NOTE_APPLY_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No debit-note apply, debit-note reversal, debit-note void, supplier refund workflow, supplier payment workflow, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma verification accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Temporary script absence: `apps/api/scripts/dev08b-debit-note-apply.tmp.ts` is absent, unstaged, and untracked; no `*dev08b*` script remains under `apps/api/scripts`.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`; total remains `460.0000`; unapplied amount remains `210.0000`; reversal journal remains absent; supplier refunds remain `0`.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`; total remains `1150.0000`; balance due remains `900.0000`; reversal journal remains absent; generated document links remain `0`.
- Allocation evidence: exactly one active `PurchaseDebitNoteAllocation` exists, safe id prefix `7ec0dfb3`, amount applied `250.0000`, linked to `PDN-000003` and `BILL-000008`; `reversedAt`, `reversedById`, and `reversalReason` remain absent.
- Journal/accounting evidence: bill journal `JE-000053` and debit-note journal `JE-000054` remain `POSTED` and unchanged; organization journal count remains `54`; `JOURNAL_ENTRY` sequence remains `JE-000055`; no reversal, supplier refund, or supplier payment journal exists for this fixture.
- Audit evidence: fixture actions are `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, `PurchaseBill:PURCHASE_BILL_FINALIZED`, `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`, `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`, and raw `PurchaseDebitNote:APPLY`; no debit-note reverse/void, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action was found.
- Forbidden side effects checked: fixture-specific supplier refunds, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, marker email provider events, marker auth tokens, and fixture cleanup/delete audits are all `0`; organization-level ZATCA baselines remain `1` signed artifact draft and `7` submission logs.
- Exact next prompt title: `DEV-08B Part 7: debit note allocation reversal preflight`.

## Next Thread Prompt

`DEV-08B Part 7: debit note allocation reversal preflight`

## DEV-08B Part 7 - Debit Note Allocation Reversal Preflight Completed

- DEV-08B Part 7 read-only preflight is recorded in [docs/development/DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_PREFLIGHT.md](docs/development/DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_PREFLIGHT.md).
- Mutation performed: no. `PurchaseDebitNoteService.reverseAllocation(...)` was not called, and no debit-note allocation reversal, debit-note apply, debit-note void, supplier refund workflow, supplier payment workflow, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma preflight accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total `460.0000`, unapplied amount `210.0000`, reversal journal absent, and supplier refunds `0`.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total `1150.0000`, balance due `900.0000`, reversal journal absent, supplier payment allocations `0`, and supplier payment unapplied allocations `0`.
- Current allocation state: exactly one active `PurchaseDebitNoteAllocation` exists, safe id prefix `7ec0dfb3`, amount applied `250.0000`, linked to `PDN-000003` and `BILL-000008`; `reversedAt`, `reversedById`, and `reversalReason` remain absent.
- Expected debit-note effect if approved: `PDN-000003` remains `FINALIZED`, total remains `460.0000`, unapplied amount changes `210.0000 -> 460.0000`, and reversal journal remains absent.
- Expected bill effect if approved: `BILL-000008` remains `FINALIZED`, total remains `1150.0000`, balance due changes `900.0000 -> 1150.0000`, and reversal journal remains absent.
- Expected allocation effect if approved: allocation `7ec0dfb3` is marked reversed with `reversedAt`, `reversedById`, and reversal reason `DEV-08B local-only debit note allocation reversal QA`; no new allocation, supplier payment allocation, or supplier refund is created.
- Expected journal/accounting effect if approved: no new journal entry because current code treats reverse allocation as matching-only; bill journal `JE-000053` and debit-note journal `JE-000054` remain posted and unchanged; current journal count `54` and `JOURNAL_ENTRY` sequence next `JE-000055` should remain unchanged.
- Expected audit effect if approved: one raw `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION` audit action; current audit mapping does not standardize `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`; no debit-note void, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action expected.
- Forbidden side effects checked: fixture-specific supplier refunds, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, marker email provider events, marker auth tokens, and fixture cleanup/delete audits are all `0`; organization-level ZATCA baselines remain `1` signed artifact draft and `7` submission logs.
- Required approval phrase for Part 8: `I approve DEV-08B Part 8 local-only purchase debit note allocation reversal mutation under marker DEV08B-AP-20260526T060000 for the active 250.0000 debit note allocation. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 8: approved local debit note allocation reversal mutation`.

## Next Thread Prompt

`DEV-08B Part 8: approved local debit note allocation reversal mutation`

## DEV-08B Part 8 - Approved Local Debit Note Allocation Reversal Mutation Completed

- DEV-08B Part 8 local-only mutation evidence is recorded in [docs/development/DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md](docs/development/DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only purchase debit note allocation reversal mutation under marker `DEV08B-AP-20260526T060000` for the active `250.0000` debit note allocation.
- Mutation performed: yes. The guarded temporary script called `PurchaseDebitNoteService.reverseAllocation(...)` exactly once for allocation safe id prefix `7ec0dfb3` with reason `DEV-08B local-only debit note allocation reversal QA`.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the guarded script accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remained `FINALIZED`; total remained `460.0000`; unapplied amount changed `210.0000 -> 460.0000`; reversal journal remained absent; supplier refunds remained `0`.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; total remained `1150.0000`; balance due changed `900.0000 -> 1150.0000`; reversal journal remained absent.
- Allocation evidence: exactly one `PurchaseDebitNoteAllocation` remains, safe id prefix `7ec0dfb3`, amount applied `250.0000`; it is now reversed with `reversedAt` set, `reversedById` set, and reversal reason `DEV-08B local-only debit note allocation reversal QA`; no new allocation or supplier payment allocation was created.
- Journal/accounting evidence: no new journal entry was created; organization journal count stayed `54`; `JOURNAL_ENTRY` sequence stayed `JE-000055`; purchase bill journal `JE-000053` and purchase debit note journal `JE-000054` remained posted and unchanged.
- Audit evidence: raw `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION` now exists once for allocation `7ec0dfb3`; `PurchaseDebitNote:APPLY`, `PURCHASE_DEBIT_NOTE_CREATED`, and `PURCHASE_DEBIT_NOTE_FINALIZED` remain; no debit-note void, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/payment/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific supplier refunds, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, marker email provider events, marker auth tokens, and cleanup/delete audits remain `0`; organization-level ZATCA baselines stayed unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08b-debit-note-allocation-reversal.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 9: supplier refund from debit note preflight`.

## Next Thread Prompt

`DEV-08B Part 9: supplier refund from debit note preflight`

## DEV-08B Part 9 - Supplier Refund From Debit Note Preflight Completed

- DEV-08B Part 9 read-only preflight is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_PREFLIGHT.md](docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_PREFLIGHT.md).
- Mutation performed: no. `SupplierRefundService.create(...)` was not called, and no supplier refund creation/void, debit-note apply/reverse/void, supplier payment workflow, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma preflight accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total `460.0000`, unapplied amount `460.0000`, supplier refund count `0`, and reversal journal absent.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total `1150.0000`, balance due `1150.0000`, no supplier payment allocations, no supplier payment unapplied allocations, and no reversal journal.
- Current allocation state: one historical `PurchaseDebitNoteAllocation` exists, safe id prefix `7ec0dfb3`, amount `250.0000`; it is reversed with `reversedAt` and `reversedById` set and reason `DEV-08B local-only debit note allocation reversal QA`; active allocation count is `0`.
- Selected refund amount: `150.0000`, which is below debit-note unapplied amount `460.0000`; expected debit-note unapplied amount after approved mutation is `310.0000`.
- Selected bank/asset account: account `112` `Bank Account`, safe id prefix `32ab6f4d`, active posting `ASSET`, same fake local AP-ready organization.
- Expected supplier refund effect if approved: exactly one posted supplier refund sourced from `PDN-000003`, amount `150.0000`, with no void reversal journal and no supplier payment.
- Expected journal/accounting effect if approved: one posted balanced supplier refund journal, expected next `JE-000055`, debiting account `112` for `150.0000` and crediting AP account `210` for `150.0000`; bill journal `JE-000053` and debit-note journal `JE-000054` remain unchanged.
- Expected audit effect if approved: standardized `SupplierRefund:SUPPLIER_REFUND_CREATED`; no supplier refund void, debit-note apply/reverse/void, purchase bill void, supplier payment, cleanup/delete, or login/browser audit-writing action.
- Forbidden side effects checked: fixture-specific supplier refunds, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note are all `0`; existing organization-level local ZATCA submission log baseline remains `7`.
- Required approval phrase for Part 10: `I approve DEV-08B Part 10 local-only supplier refund from debit note mutation under marker DEV08B-AP-20260526T060000 for the DEV-08B purchase debit note with refund amount 150.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 10: approved local supplier refund from debit note mutation`.

## Next Thread Prompt

`DEV-08B Part 10: approved local supplier refund from debit note mutation`

## DEV-08B Part 10 - Approved Local Supplier Refund From Debit Note Mutation Completed

- DEV-08B Part 10 local-only mutation evidence is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_MUTATION_EVIDENCE.md](docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier refund from debit note mutation under marker `DEV08B-AP-20260526T060000` for refund amount `150.0000`.
- Mutation performed: yes. The guarded temporary script called `SupplierRefundService.create(...)` exactly once for `PDN-000003` with source type `PURCHASE_DEBIT_NOTE` and amount `150.0000`.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the guarded script accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Supplier refund evidence: `SRF-000003`, safe id prefix `39873ae4`, `POSTED`, amount `150.0000`, sourced from `PDN-000003`, with journal entry present and void reversal journal absent.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remained `FINALIZED`; total remained `460.0000`; unapplied amount changed `460.0000 -> 310.0000`; reversal journal remained absent.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; total remained `1150.0000`; balance due stayed `1150.0000`; reversal journal remained absent.
- Allocation evidence: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count remains `0`; no new debit-note allocation or supplier payment allocation was created.
- Journal/accounting evidence: supplier refund journal `JE-000055`, safe id prefix `6cae838d`, posted and balanced with debit account `112` `150.0000` and credit AP account `210` `150.0000`; journal count changed `54 -> 55`; bill journal `JE-000053` and debit-note journal `JE-000054` remained unchanged.
- Audit evidence: standardized `SupplierRefund:SUPPLIER_REFUND_CREATED` was created; no supplier refund void, debit-note void, duplicate debit-note apply/reverse, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/payment/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note remain `0`; organization-level local ZATCA submission logs remain baseline `7`.
- Temporary script cleanup: `apps/api/scripts/dev08b-supplier-refund-from-debit-note.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 11: supplier refund evidence verification`.

## DEV-08B Part 11 - Supplier Refund Evidence Verification Completed

- DEV-08B Part 11 read-only verification is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no. `SupplierRefundService.create(...)`, supplier refund void, debit-note apply/reverse/void, purchase bill mutation, supplier payment mutation, output/PDF/archive/export/download, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, and login/browser flows were not run.
- Verification conclusion: verified with no evidence discrepancy.
- Local-only target proof: Docker Desktop and the local `postgres`/`redis` compose services were started because they were initially down; `infra-postgres-1` and `infra-redis-1` became healthy, `localhost:5432` and `localhost:6379` were reachable, and the read-only verifier accepted only local database `accounting`.
- Supplier refund evidence: `SRF-000003`, safe id prefix `39873ae4`, remains `POSTED`, amount `150.0000`, source type `PURCHASE_DEBIT_NOTE`, source debit note `PDN-000003`, source supplier payment absent, journal `JE-000055`, and void reversal journal absent.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`; total remains `460.0000`; unapplied amount remains `310.0000`; reversal journal remains absent.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`; total remains `1150.0000`; balance due remains `1150.0000`; reversal journal remains absent.
- Allocation evidence: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count remains `0`; no new debit-note allocation or supplier payment allocation was created.
- Journal/accounting evidence: supplier refund journal `JE-000055`, safe id prefix `6cae838d`, remains `POSTED` and balanced with debit account `112` Bank Account `150.0000` and credit AP account `210` Accounts Payable `150.0000`; bill journal `JE-000053` and debit-note journal `JE-000054` remain posted.
- Audit evidence: expected fixture audit trail is present through `SupplierRefund:SUPPLIER_REFUND_CREATED`; no supplier refund void, debit note void, duplicate debit note apply/reverse, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action was found.
- Forbidden side-effect result: fixture-specific supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note remain `0`; organization-level local ZATCA submission logs remain baseline `7`.
- Temporary script cleanup result: `apps/api/scripts/dev08b-supplier-refund-evidence-readonly.tmp.ts` was removed after its single read-only run, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 12: supplier refund void preflight`.

## DEV-08B Part 12 - Supplier Refund Void Preflight Completed

- DEV-08B Part 12 read-only preflight is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_VOID_PREFLIGHT.md](docs/development/DEV_08B_SUPPLIER_REFUND_VOID_PREFLIGHT.md).
- Mutation performed: no. `SupplierRefundService.void(...)`, supplier refund creation, debit-note apply/reverse/void, purchase bill mutation, supplier payment mutation, output/PDF/archive/export/download, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, and login/browser flows were not run.
- Current refund state: `SRF-000003`, safe id prefix `39873ae4`, remains `POSTED`, amount `150.0000`, source debit note `PDN-000003`, source payment absent, journal `JE-000055` posted, and void reversal journal absent.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total `460.0000`, unapplied `310.0000`, reversal journal absent.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total and balance due `1150.0000`, reversal journal absent.
- Expected void/reversal effect: supplier refund changes `POSTED -> VOIDED`, `PDN-000003` unapplied restores `310.0000 -> 460.0000`, `BILL-000008` balance stays `1150.0000`, historical allocation `7ec0dfb3` remains reversed, and no supplier payment allocation is created.
- Expected journal/accounting result: create one posted reversal journal for `JE-000055`, mark `JE-000055` `REVERSED`, debit AP account `210` `150.0000`, credit Bank account `112` `150.0000`, and leave bill/debit-note journals unchanged.
- Expected audit result: one standardized `SupplierRefund:SUPPLIER_REFUND_VOIDED`; no debit-note apply/reverse/void, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action.
- Part 13 approval phrase: `I approve DEV-08B Part 13 local-only supplier refund void mutation under marker DEV08B-AP-20260526T060000 for supplier refund SRF-000003 amount 150.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 13: approved local supplier refund void mutation`.

## DEV-08B Part 13 - Approved Local Supplier Refund Void Mutation Completed

- DEV-08B Part 13 local-only mutation evidence is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08B_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, exactly one supplier refund void/reversal. The guarded temporary script called `SupplierRefundService.void(...)` exactly once for `SRF-000003`.
- Approval phrase was received for the local-only supplier refund void mutation under marker `DEV08B-AP-20260526T060000` for refund `SRF-000003` amount `150.0000`.
- Refund evidence: `SRF-000003`, safe id prefix `39873ae4`, changed `POSTED -> VOIDED`; `voidedAt` is set; original refund journal `JE-000055` changed to `REVERSED`; void reversal journal `JE-000056`, safe id prefix `252c28f9`, is `POSTED`.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remained `FINALIZED`; total remained `460.0000`; unapplied amount restored `310.0000 -> 460.0000`; debit-note reversal journal remained absent.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; balance due stayed `1150.0000`; reversal journal remained absent.
- Allocation evidence: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count remained `0`; no new debit-note allocation or supplier payment allocation was created.
- Journal/accounting evidence: reversal journal `JE-000056` debits AP account `210` for `150.0000` and credits Bank account `112` for `150.0000`; journal count changed `55 -> 56`; bill journal `JE-000053` and debit-note journal `JE-000054` remained posted and unchanged.
- Audit evidence: standardized `SupplierRefund:SUPPLIER_REFUND_VOIDED` now exists; no debit-note apply/reverse/void, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action occurred.
- Forbidden side-effect result: fixture-specific supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note remained `0`.
- Temporary script cleanup: `apps/api/scripts/dev08b-supplier-refund-void.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 14: debit note void preflight`.

## DEV-08B Part 14 - Debit Note Void Preflight Completed

- DEV-08B Part 14 read-only preflight is recorded in [docs/development/DEV_08B_DEBIT_NOTE_VOID_PREFLIGHT.md](docs/development/DEV_08B_DEBIT_NOTE_VOID_PREFLIGHT.md).
- Mutation performed: no. `PurchaseDebitNoteService.void(...)`, supplier refund mutation, debit-note apply/reverse, purchase bill mutation, supplier payment mutation, output/PDF/archive/export/download, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, and login/browser flows were not run.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total and unapplied `460.0000`, journal `JE-000054` posted, no `reversedBy`, and no debit-note reversal journal.
- Current refund state: `SRF-000003`, safe id prefix `39873ae4`, remains `VOIDED`; void reversal journal `JE-000056` is posted; posted supplier refund blocker count for `PDN-000003` is `0`.
- Current allocation state: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count is `0`.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`; balance due remains `1150.0000`; reversal journal remains absent.
- Expected void/reversal effect: `PDN-000003` changes `FINALIZED -> VOIDED`, debit-note reversal journal is set, refund/allocation state remains voided/reversed, and bill balance remains `1150.0000`.
- Expected journal/accounting result: create one posted reversal journal for `JE-000054`, mark `JE-000054` `REVERSED`, debit account `111` `400.0000`, debit VAT receivable `230` `60.0000`, credit AP account `210` `460.0000`, and leave bill and supplier-refund journals unchanged.
- Expected audit result: one standardized `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_VOIDED`; no supplier refund, debit-note apply/reverse, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action.
- Part 15 approval phrase: `I approve DEV-08B Part 15 local-only purchase debit note void mutation under marker DEV08B-AP-20260526T060000 for purchase debit note PDN-000003 total 460.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 15: approved local debit note void mutation`.

## Next Thread Prompt

`DEV-08B Part 15: approved local debit note void mutation`

## DEV-08B Part 15 - Approved Local Debit Note Void Mutation Completed

- DEV-08B Part 15 local-only mutation evidence is recorded in [docs/development/DEV_08B_DEBIT_NOTE_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08B_DEBIT_NOTE_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, exactly one purchase debit note void/reversal. The guarded temporary script called `PurchaseDebitNoteService.void(...)` exactly once for `PDN-000003`.
- Approval phrase was received for the local-only debit note void mutation under marker `DEV08B-AP-20260526T060000` for debit note `PDN-000003` total `460.0000`.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, changed `FINALIZED -> VOIDED`; total remained `460.0000`; unapplied amount stayed `460.0000`; original debit-note journal `JE-000054` changed to `REVERSED`; void reversal journal `JE-000057`, safe id prefix `f1ab6c83`, is `POSTED`.
- Supplier refund evidence: `SRF-000003`, safe id prefix `39873ae4`, remained `VOIDED`; void reversal journal `JE-000056` remained present; original refund journal remained `REVERSED`; posted refund blocker count stayed `0`.
- Allocation evidence: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count stayed `0`; no new allocation or supplier payment allocation was created.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; balance due stayed `1150.0000`; reversal journal remained absent.
- Journal/accounting evidence: journal count changed `56 -> 57`; debit note void reversal journal `JE-000057` debits VAT receivable `230` for `60.0000`, debits account `111` for `400.0000`, and credits AP account `210` for `460.0000`; bill and supplier-refund journals remained otherwise unchanged.
- Audit evidence: standardized `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_VOIDED` now exists; no duplicate debit-note apply/reverse, supplier refund create/void, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action occurred.
- Forbidden side-effect result: fixture-specific supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note remained `0`.
- Temporary script cleanup: `apps/api/scripts/dev08b-debit-note-void.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 16: AP debit note refund closure`.

## Next Thread Prompt

`DEV-08B Part 16: AP debit note refund closure`

## DEV-08B Part 16 - AP Debit Note Refund Closure Completed

- DEV-08B Part 16 closure is recorded in [docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md](docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md).
- Mutation performed: no. No runtime DB write, mutation script, fixture creation, finalization, apply, reverse, refund, void, cleanup, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production, beta, shared-target, or customer-data action ran.
- Latest commit inspected: `64537439 Void DEV-08B debit note locally`; local `HEAD` matched GitHub remote `origin/main`.
- DEV-08B proved AP debit note fixture creation/finalization, debit-note apply-to-bill, debit-note allocation reversal, supplier refund from debit note, supplier refund void/reversal, debit note void/reversal, journal behavior, audit behavior, and forbidden output/email/ZATCA non-effects.
- Final bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total and balance due `1150.0000`, reversal journal absent.
- Final debit note state: `PDN-000003`, safe id prefix `b93f96ee`, is `VOIDED`; total and unapplied amount `460.0000`; original journal `JE-000054` is `REVERSED`; void reversal journal `JE-000057` is `POSTED`.
- Final supplier refund state: `SRF-000003`, safe id prefix `39873ae4`, is `VOIDED`; amount `150.0000`; original journal `JE-000055` is `REVERSED`; void reversal journal `JE-000056` is `POSTED`.
- Final allocation state: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active debit-note allocation count is `0`.
- Final accounting finding: debit-note apply/reversal were matching-only; supplier refund and debit-note void paths created balanced posted reversal journals; no supplier payment, purchase order, inventory, cash expense, output, email, or ZATCA journal was created.
- Final audit finding: expected fixture audit trail exists through `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_VOIDED`; debit-note apply and allocation reversal remain raw audit actions; no duplicate apply/reverse/refund/void, supplier payment, cleanup/delete, or login/browser audit-writing action was found.
- Remaining AP gaps: supplier refund from supplier payment source, purchase order conversion/lifecycle, cash expenses, inventory-clearing bills and purchase receipts, AP outputs/PDF/archive/email, browser-authenticated AP UI/API QA, repeated/idempotency paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08C Part 1: purchase order conversion preflight`.

## DEV-08C Part 1 - Purchase Order Conversion Preflight Completed

- DEV-08C Part 1 read-only purchase order conversion preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERSION_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERSION_PREFLIGHT.md).
- Mutation performed: no. No runtime DB write, fixture creation, purchase order create/approve/mark-sent/close/void/convert/delete, purchase bill finalization, purchase receipt, stock movement, generated document, PDF/download/archive, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production, beta, shared-target, or customer-data action ran.
- Latest commit inspected: `b5782526 Close DEV-08B debit note refund evidence`; local `HEAD` matched `origin/main` at `b5782526302fea2465a50dab220037fcc9e55cfc`.
- Purchase order lifecycle summary: create/update keep purchase orders operational and non-posting; approval moves `DRAFT -> APPROVED`; mark-sent moves `APPROVED -> SENT`; close allows `APPROVED|SENT|PARTIALLY_BILLED -> CLOSED`; void allows `DRAFT|APPROVED|SENT -> VOIDED`; delete is draft-only and remains out of the selected fixture arc; PDF/generate-PDF paths are output/archive-producing and deferred.
- Conversion summary: `PurchaseOrderService.convertToBill(...)` allows only `APPROVED` or `SENT`, blocks repeat conversion with `convertedBillId`, requires an active supplier contact and line account or item expense-account fallback, creates a `DRAFT` purchase bill without a journal, copies supplier/branch/currency/notes/terms/totals/line data, and updates the purchase order to `BILLED` with `convertedBillId`.
- Selected Part 2 mutation target: create or reuse one fake local supplier named `DEV08C-AP-20260526T000000 Supplier` and create one draft purchase order only under marker `DEV08C-AP-20260526T000000`, using one service/direct line, planned subtotal `1000.0000`, VAT `150.0000`, total `1150.0000`, and no approval, mark-sent, conversion, bill finalization, PDF/archive, email, ZATCA, receipt, inventory, supplier payment/refund/debit-note, cash expense, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data action.
- Required approval phrase for Part 2: `I approve DEV-08C Part 2 local-only purchase order fixture creation mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 2: approved local purchase order fixture creation mutation`.

## DEV-08C Part 2 - Purchase Order Fixture Creation Completed

- DEV-08C Part 2 local-only purchase order fixture mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_FIXTURE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only, under marker `DEV08C-AP-20260526T000000`.
- `PurchaseOrderService.create(...)` was called exactly once.
- Supplier safe id prefix: `5ef871cd`.
- Purchase order: `PO-000141`, safe id prefix `d6abea75`, status `DRAFT`, total `1150.0000`.
- Converted bill: absent.
- Journal: absent.
- Forbidden side effects absent: purchase bill conversion/finalization, purchase receipt, stock movement, generated document/PDF/archive, email, supplier payment, supplier refund, purchase debit note, cash expense, cleanup/delete, ZATCA, login/browser, production, beta, shared-target, and customer-data paths.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-fixture.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 3: purchase order fixture evidence verification`.

## DEV-08C Part 3 - Purchase Order Fixture Evidence Verification Completed

- DEV-08C Part 3 read-only purchase order fixture evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: Verified.
- Key entity/status/amount result: exactly one marker-scoped fixture exists, `PO-000141`, safe id prefix `d6abea75`, status `DRAFT`, total `1150.0000`, supplier safe id prefix `5ef871cd`, converted bill absent.
- Accounting/journal result: no purchase bill linked to the PO and no marker/PO journal entry.
- Audit result: expected `PURCHASE_ORDER_CREATED` audit count `1`; disallowed PO state/action audit count `0`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent for the fixture.
- Temporary script cleanup result: no `*dev08c*` script exists under `apps/api/scripts`; Part 3 used no temporary script file.
- Exact next prompt title: `DEV-08C Part 4: purchase order approval preflight`.

## DEV-08C Part 4 - Purchase Order Approval Preflight Completed

- DEV-08C Part 4 purchase order approval preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_PREFLIGHT.md).
- Mutation performed: no.
- Current PO state: `PO-000141`, safe id prefix `d6abea75`, status `DRAFT`, total `1150.0000`, one line, supplier safe id prefix `5ef871cd`, converted bill absent, approval audit absent.
- Approval eligibility: current status is `DRAFT`, total is positive, line/account/tax evidence is present, and `PurchaseOrderService.approve(...)` allows `DRAFT -> APPROVED`.
- Expected approval effect: status `APPROVED`, `approvedAt` set, total unchanged, converted bill absent, no purchase bill, no journal, no inventory, no output/email/ZATCA, and one `PURCHASE_ORDER_APPROVED` audit action.
- Required approval phrase: `I approve DEV-08C Part 5 local-only purchase order approval mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 5: approved local purchase order approval mutation`.

## DEV-08C Part 5 - Purchase Order Approval Mutation Completed

- DEV-08C Part 5 approved local purchase order approval mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `PurchaseOrderService.approve(...)` once.
- Before/after entity state: `PO-000141`, safe id prefix `d6abea75`, changed `DRAFT -> APPROVED`; `approvedAt` changed absent -> present; total stayed `1150.0000`; converted bill remained absent.
- Accounting/journal result: purchase bill count linked to PO stayed `0`; marker/PO journal count stayed `0`.
- Audit result: `PURCHASE_ORDER_APPROVED` audit count changed `0 -> 1`; `PURCHASE_ORDER_CREATED` audit count stayed `1`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-approval.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 6: purchase order approval evidence verification`.

## DEV-08C Part 6 - Purchase Order Approval Evidence Verification Completed

- DEV-08C Part 6 read-only purchase order approval evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: Verified.
- Key entity/status/amount result: exactly one marker-scoped fixture exists, `PO-000141`, safe id prefix `d6abea75`, status `APPROVED`, `approvedAt` present, total `1150.0000`, supplier safe id prefix `5ef871cd`, converted bill absent.
- Accounting/journal result: no purchase bill linked to the PO and no marker/PO journal entry.
- Audit result: expected `PURCHASE_ORDER_APPROVED` audit count `1`; `PURCHASE_ORDER_CREATED` audit count `1`; mark-sent/close/void/convert/delete audit count `0`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent for the fixture.
- Temporary script cleanup result: no `*dev08c*` script exists under `apps/api/scripts`; Part 6 used no temporary script file.
- Exact next prompt title: `DEV-08C Part 7: purchase order mark-sent preflight`.

## DEV-08C Part 7 - Purchase Order Mark-Sent Preflight Completed

- DEV-08C Part 7 purchase order mark-sent preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_PREFLIGHT.md).
- Mutation performed: no.
- Current PO state: `PO-000141`, safe id prefix `d6abea75`, status `APPROVED`, `approvedAt` present, `sentAt` absent, total `1150.0000`, one line, converted bill absent, purchase bill count `0`, marker/PO journal count `0`.
- Mark-sent eligibility: `PurchaseOrderService.markSent(...)` allows current `APPROVED` status, sets status `SENT` and `sentAt`, and logs `MARK_SENT`; audit mapping records `PURCHASE_ORDER_SENT`.
- Expected mark-sent effect: `APPROVED -> SENT`, `sentAt` set, totals and lines unchanged, no bill, no journal, no inventory, no output/email/ZATCA, and one `PURCHASE_ORDER_SENT` audit action.
- Required approval phrase: `I approve DEV-08C Part 8 local-only purchase order mark-sent mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 8: approved local purchase order mark-sent mutation`.

## DEV-08C Part 8 - Purchase Order Mark-Sent Mutation Completed

- DEV-08C Part 8 approved local purchase order mark-sent mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `PurchaseOrderService.markSent(...)` once.
- Before/after entity state: `PO-000141`, safe id prefix `d6abea75`, changed `APPROVED -> SENT`; `sentAt` changed absent -> present; `approvedAt` remained present; total stayed `1150.0000`; converted bill remained absent.
- Accounting/journal result: purchase bill count linked to PO stayed `0`; marker/PO journal count stayed `0`.
- Audit result: `PURCHASE_ORDER_SENT` audit count changed `0 -> 1`; `PURCHASE_ORDER_APPROVED` audit count stayed `1`; `PURCHASE_ORDER_CREATED` audit count stayed `1`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-mark-sent.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 9: purchase order mark-sent evidence verification`.

## DEV-08C Part 9 - Purchase Order Mark-Sent Evidence Verification Completed

- DEV-08C Part 9 read-only purchase order mark-sent evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: Verified.
- Key entity/status/amount result: exactly one marker-scoped fixture exists, `PO-000141`, safe id prefix `d6abea75`, status `SENT`, `sentAt` present, total `1150.0000`, supplier safe id prefix `5ef871cd`, converted bill absent.
- Accounting/journal result: no purchase bill linked to the PO and no marker/PO journal entry.
- Audit result: expected `PURCHASE_ORDER_SENT` audit count `1`; `PURCHASE_ORDER_APPROVED` audit count `1`; `PURCHASE_ORDER_CREATED` audit count `1`; close/void/convert/delete audit count `0`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent for the fixture.
- Temporary script cleanup result: no `*dev08c*` script exists under `apps/api/scripts`; Part 9 used no temporary script file.
- Exact next prompt title: `DEV-08C Part 10: purchase order convert-to-bill preflight`.

## DEV-08C Part 10 - Purchase Order Convert-To-Bill Preflight Completed

- DEV-08C Part 10 convert-to-bill preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_PREFLIGHT.md).
- Mutation performed: no.
- Current PO state: `PO-000141`, safe id prefix `d6abea75`, status `SENT`, `sentAt` present, total `1150.0000`, one direct-account line using account `111`, supplier active `SUPPLIER`, converted bill absent, purchase bill count `0`, marker/PO journal count `0`.
- Conversion eligibility: `PurchaseOrderService.convertToBill(...)` allows current `SENT` status, requires absent `convertedBillId`, active supplier-capable contact, and line account coverage; all preflight checks passed.
- Expected conversion result: purchase order `SENT -> BILLED`, `convertedBillId` set, one linked `DRAFT` purchase bill created with total and balance due `1150.0000`, no bill journal, no purchase order journal, no inventory/posting, no output/email/ZATCA, and one `PURCHASE_ORDER_CONVERTED_TO_BILL` audit action.
- Required approval phrase: `I approve DEV-08C Part 11 local-only purchase order convert-to-bill mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 11: approved local purchase order convert-to-bill mutation`.

## DEV-08C Part 11 - Purchase Order Convert-To-Bill Mutation Completed

- DEV-08C Part 11 approved local purchase order convert-to-bill mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `PurchaseOrderService.convertToBill(...)` once.
- Before/after entity state: `PO-000141`, safe id prefix `d6abea75`, changed `SENT -> BILLED`; `convertedBillId` changed absent -> present with bill safe prefix `f37c60b2`; total stayed `1150.0000`.
- Converted bill result: `BILL-000422`, safe id prefix `f37c60b2`, status `DRAFT`, total and balance due `1150.0000`, one line using account `111`, journal absent.
- Accounting/journal result: purchase bill count linked to PO changed `0 -> 1`; marker/PO/bill journal count stayed `0`.
- Audit result: `PURCHASE_ORDER_CONVERTED_TO_BILL` audit count changed `0 -> 1`; `PURCHASE_ORDER_SENT`, `PURCHASE_ORDER_APPROVED`, and `PURCHASE_ORDER_CREATED` audit counts stayed `1`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-convert-to-bill.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 12: purchase order conversion evidence verification`.

## DEV-08C Part 12 - Purchase Order Conversion Evidence Verification Completed

- DEV-08C Part 12 read-only purchase order conversion evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: Verified.
- Key entity/status/amount result: `PO-000141`, safe id prefix `d6abea75`, status `BILLED`, converted bill safe prefix `f37c60b2`; exactly one converted bill exists, `BILL-000422`, status `DRAFT`, total and balance due `1150.0000`, supplier/branch/currency/notes/terms/totals/line account/tax/order mappings verified.
- Accounting/journal result: converted bill journal absent, purchase order journal absent, and marker/PO/bill journal count `0`.
- Audit result: expected `PURCHASE_ORDER_CONVERTED_TO_BILL` audit count `1`; `PURCHASE_ORDER_SENT`, `PURCHASE_ORDER_APPROVED`, and `PURCHASE_ORDER_CREATED` audit counts each `1`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent for the fixture.
- Temporary script cleanup result: no `*dev08c*` script exists under `apps/api/scripts`; Part 12 used no temporary script file.
- Exact next prompt title: `DEV-08C Part 13: converted purchase bill finalization preflight`.

## DEV-08C Part 13 - Converted Purchase Bill Finalization Preflight Completed

- DEV-08C Part 13 converted bill finalization preflight is recorded in [docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_PREFLIGHT.md](docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_PREFLIGHT.md).
- Mutation performed: no.
- Current PO/bill state: `PO-000141` remains `BILLED`, converted bill `BILL-000422` safe prefix `f37c60b2` is `DRAFT`, total and balance due `1150.0000`, `journalEntryId` absent, bill date `2026-05-26`, inventory posting mode `DIRECT_EXPENSE_OR_ASSET`.
- Finalization eligibility: matching fiscal period is `OPEN`; line account `111`, AP account `210`, and VAT receivable account `230` are active posting accounts; marker/PO/bill journal count `0`; purchase bill finalized audit count `0`.
- Expected finalization result: bill `DRAFT -> FINALIZED`, one posted journal with debit `111` `1000.0000`, debit `230` `150.0000`, credit `210` `1150.0000`, balanced debit/credit totals `1150.0000`, balance due remains `1150.0000`, PO remains `BILLED`, no inventory movement, no output/email/ZATCA.
- Required approval phrase: `I approve DEV-08C Part 14 local-only converted purchase bill finalization mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 14: approved local converted purchase bill finalization mutation`.

## DEV-08C Part 14 - Converted Purchase Bill Finalization Mutation Completed

- DEV-08C Part 14 approved local converted purchase bill finalization mutation evidence is recorded in [docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md](docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `PurchaseBillService.finalize(...)` once.
- Before/after entity state: `BILL-000422`, safe id prefix `f37c60b2`, changed `DRAFT -> FINALIZED`; `finalizedAt` changed absent -> present; `journalEntryId` changed absent -> present with journal safe prefix `2e82f16b`; total and balance due stayed `1150.0000`; `PO-000141` remained `BILLED`.
- Accounting/journal result: posted journal `JE-003156`, safe prefix `2e82f16b`, reference `BILL-000422`, total debit/credit `1150.0000`; lines Dr `111` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Audit result: `PURCHASE_BILL_FINALIZED` audit count changed `0 -> 1`; purchase order audit trail remained unchanged through `PURCHASE_ORDER_CONVERTED_TO_BILL`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-converted-purchase-bill-finalize.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 15: converted purchase bill finalization evidence verification`.

## DEV-08C Part 15 - Converted Purchase Bill Finalization Evidence Verification Completed

- DEV-08C Part 15 converted purchase bill finalization evidence verification is recorded in [docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Key entity/status/amount result: `PO-000141` remains `BILLED`; converted bill `BILL-000422` safe prefix `f37c60b2` remains `FINALIZED`; total and balance due remain `1150.0000`; posted journal `JE-003156` safe prefix `2e82f16b` is balanced at debit/credit `1150.0000`.
- Forbidden side-effect result: generated document/PDF/archive, email, ZATCA, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup result: `apps/api/scripts/dev08c-converted-purchase-bill-finalize.tmp.ts` is absent; no `*dev08c*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 16: purchase order close branch preflight`.

## DEV-08C Part 16 - Purchase Order Close Branch Preflight Completed

- DEV-08C Part 16 close branch preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_PREFLIGHT.md).
- Mutation performed: no.
- Main conversion PO protected: `PO-000141` safe prefix `d6abea75` remains `BILLED`, linked to converted bill safe prefix `f37c60b2`, and must not be reused for close.
- Planned close-branch mutation: after exact approval, create one separate fake local purchase order under marker `DEV08C-AP-20260526T000000` with suffix `CLOSE`, approve it, mark it sent, and close it; do not convert it to a bill or generate accounting/output side effects.
- Required approval phrase: `I approve DEV-08C Part 17 local-only purchase order close branch mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 17: approved local purchase order close branch mutation`.

## DEV-08C Part 17 - Purchase Order Close Branch Mutation Completed

- DEV-08C Part 17 approved local purchase order close branch mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service calls made: `PurchaseOrderService.create(...)` once, `PurchaseOrderService.approve(...)` once, `PurchaseOrderService.markSent(...)` once, and `PurchaseOrderService.close(...)` once.
- Before/after entity state: separate close-branch order `PO-000142`, safe prefix `d40b6716`, progressed `DRAFT -> APPROVED -> SENT -> CLOSED`; `approvedAt`, `sentAt`, and `closedAt` are present; total `1150.0000`; converted bill absent.
- Main conversion PO state: `PO-000141` safe prefix `d6abea75` remained `BILLED`, linked to converted bill safe prefix `f37c60b2` with bill status `FINALIZED`.
- Accounting/journal result: close-branch purchase bill count `0`, close-branch journal count `0`, converted bill absent.
- Audit result: close-branch `PURCHASE_ORDER_CREATED`, `PURCHASE_ORDER_APPROVED`, `PURCHASE_ORDER_SENT`, and `PURCHASE_ORDER_CLOSED` counts are each `1`; no conversion audit was created for the close branch.
- Forbidden side-effect result: generated document/PDF/archive, email, ZATCA, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-close-branch.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 18: purchase order close branch evidence verification`.

## DEV-08C Part 18 - Purchase Order Close Branch Evidence Verification Completed

- DEV-08C Part 18 purchase order close branch evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Key entity/status/amount result: main `PO-000141` safe prefix `d6abea75` remains `BILLED`, converted bill `BILL-000422` safe prefix `f37c60b2` remains `FINALIZED`, and close-branch `PO-000142` safe prefix `d40b6716` remains `CLOSED` with total `1150.0000`.
- Forbidden side-effect result: close-branch purchase bill, journal, generated document/PDF/archive, email, ZATCA path, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup result: `apps/api/scripts/dev08c-purchase-order-close-branch.tmp.ts` is absent; no `*dev08c*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 19: purchase order void branch preflight`.

## DEV-08C Part 19 - Purchase Order Void Branch Preflight Completed

- DEV-08C Part 19 void branch preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_PREFLIGHT.md).
- Mutation performed: no.
- Main/close branch protected: main `PO-000141` safe prefix `d6abea75` remains `BILLED` with converted bill `BILL-000422` `FINALIZED`; close-branch `PO-000142` safe prefix `d40b6716` remains `CLOSED`; neither should be reused for void.
- Planned void-branch mutation: after exact approval, create one separate fake local purchase order under marker `DEV08C-AP-20260526T000000` with suffix `VOID`, then void it while still `DRAFT`; do not approve, mark sent, close, convert, or generate accounting/output side effects.
- Required approval phrase: `I approve DEV-08C Part 20 local-only purchase order void branch mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 20: approved local purchase order void branch mutation`.

## DEV-08C Part 20 - Purchase Order Void Branch Mutation Completed

- DEV-08C Part 20 approved local purchase order void branch mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service calls made: `PurchaseOrderService.create(...)` once and `PurchaseOrderService.void(...)` once.
- Before/after entity state: separate void-branch order `PO-000143`, safe prefix `ffd4e3d7`, progressed `DRAFT -> VOIDED`; `voidedAt` is present; `approvedAt`, `sentAt`, and `closedAt` are absent; total `1150.0000`; converted bill absent.
- Protected branch state: main `PO-000141` safe prefix `d6abea75` remained `BILLED` with converted bill `BILL-000422` `FINALIZED`; close-branch `PO-000142` safe prefix `d40b6716` remained `CLOSED`.
- Accounting/journal result: void-branch purchase bill count `0`, void-branch journal count `0`, converted bill absent.
- Audit result: void-branch `PURCHASE_ORDER_CREATED` and `PURCHASE_ORDER_VOIDED` counts are each `1`; approve, mark-sent, close, and conversion audit actions were absent for the void branch.
- Forbidden side-effect result: generated document/PDF/archive, email, ZATCA, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-void-branch.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 21: purchase order void branch evidence verification`.

## DEV-08C Part 21 - Purchase Order Void Branch Evidence Verification Completed

- DEV-08C Part 21 purchase order void branch evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Key entity/status/amount result: main `PO-000141` safe prefix `d6abea75` remains `BILLED`, converted bill `BILL-000422` safe prefix `f37c60b2` remains `FINALIZED`, close-branch `PO-000142` safe prefix `d40b6716` remains `CLOSED`, and void-branch `PO-000143` safe prefix `ffd4e3d7` remains `VOIDED` with total `1150.0000`.
- Forbidden side-effect result: void-branch purchase bill, journal, generated document/PDF/archive, email, ZATCA path, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup result: `apps/api/scripts/dev08c-purchase-order-void-branch.tmp.ts` is absent; no `*dev08c*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 22: purchase order conversion branch closure`.

## DEV-08C Part 22 - Purchase Order Conversion Branch Closure Completed

- DEV-08C Part 22 purchase order conversion branch closure is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md).
- Mutation performed: no.
- DEV-08C proved purchase order fixture creation, approval, mark-sent, convert-to-bill, converted bill finalization, close branch, void branch, journal behavior, audit behavior, and forbidden output/email/ZATCA non-effects.
- Final entity state: main `PO-000141` safe prefix `d6abea75` is `BILLED`; converted bill `BILL-000422` safe prefix `f37c60b2` is `FINALIZED` with posted journal `JE-003156`; close-branch `PO-000142` safe prefix `d40b6716` is `CLOSED`; void-branch `PO-000143` safe prefix `ffd4e3d7` is `VOIDED`; supplier safe prefix `5ef871cd` remained the fake local supplier.
- Remaining AP gaps: supplier refund from supplier payment source, cash expenses, inventory-clearing bills and purchase receipt integration, AP output/PDF/archive/email with explicit approvals, browser-authenticated AP UI/API QA, repeated/idempotency and blocker paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08D Part 1: supplier refund from supplier payment preflight`.

## DEV-08D Part 1 - Supplier Refund From Supplier Payment Preflight Completed

- DEV-08D Part 1 supplier refund from supplier payment preflight is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `10d93efb Close DEV-08C purchase order conversion evidence`; local `HEAD` matched `origin/main`.
- Local-only/read-only proof: `apps/api/.env` database target classified as local `localhost` database `accounting`; local Docker Postgres and Redis were healthy; read-only SQL printed only safe prefixes/counts/statuses/amounts.
- Current source availability: no DEV-08D-marked posted supplier payment with unapplied amount exists; existing local posted unapplied payments are not DEV-08D-safe disposable sources.
- DEV-08 payment reference: `PAY-000006` safe prefix `622ad0b6` is `VOIDED`, amount `500.0000`, unapplied `200.0000`, posted supplier refund count `0`; it must not be reused as an active supplier refund source.
- Selected Part 2 mutation option: Option A, create a fresh local supplier payment refund source fixture only.
- Proposed marker: `DEV08D-AP-20260526T000000`.
- Future Part 2 fixture target: one fake local supplier plus one `POSTED` supplier payment for `500.0000` SAR, fully unapplied, no allocations, no purchase bill required.
- Expected future refund target after source verification: `SupplierRefundService.create(...)` once with `sourceType = SUPPLIER_PAYMENT`, refund amount `150.0000`, source payment unapplied `500.0000 -> 350.0000`, posted balanced refund journal Dr asset `112` / Cr AP `210`.
- Forbidden side-effect baseline for the marker: generated documents, email outbox/provider events, ZATCA metadata/submission logs, purchase receipts, stock movements, and cleanup/delete audits all `0`.
- Required approval phrase: `I approve DEV-08D Part 2 local-only supplier payment refund source fixture mutation under marker DEV08D-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 2: approved local supplier payment refund source fixture mutation`.

## DEV-08D Part 2 - Supplier Payment Refund Source Fixture Mutation Completed

- DEV-08D Part 2 supplier payment refund source fixture mutation evidence is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_REFUND_SOURCE_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_REFUND_SOURCE_FIXTURE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service calls: `ContactService.create(...)` once and `SupplierPaymentService.create(...)` once.
- Supplier evidence: safe prefix `a5d3ece3`, active `SUPPLIER`, marker-bearing fake local supplier.
- Supplier payment source: `PAY-000007`, safe prefix `4b9c42b1`, status `POSTED`, amount paid `500.0000`, unapplied amount `500.0000`, void reversal journal absent.
- Journal/accounting result: `JE-000058`, safe prefix `da62af82`, `POSTED` and balanced, with Dr AP account `210` `500.0000` and Cr paid-through asset account `112` `500.0000`.
- Allocation/refund result: direct supplier payment allocations `0`, supplier payment unapplied allocations `0`, supplier refunds for source payment `0`.
- Audit result: `Contact:CREATE` count `1`; `SupplierPayment:SUPPLIER_PAYMENT_CREATED` count `1`; supplier payment void and supplier refund audit counts `0`.
- Forbidden side-effect result: marker-scoped supplier refunds, purchase bills, purchase orders, purchase debit notes, purchase receipts, stock movements, cash expenses, generated documents, email outbox rows, email provider events, and cleanup/delete audits all `0`.
- Temporary script cleanup result: `apps/api/scripts/dev08d-supplier-payment-source.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 3: supplier payment refund source fixture evidence verification`.

## DEV-08D Part 3 - Supplier Payment Refund Source Fixture Evidence Verification Completed

- DEV-08D Part 3 read-only evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_REFUND_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_REFUND_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Source payment status/amount result: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, amount paid `500.0000`, unapplied amount `500.0000`, void reversal journal absent.
- Journal/accounting result: `JE-000058`, safe prefix `da62af82`, remained `POSTED` and balanced at debit/credit `500.0000`, with Dr AP account `210` and Cr paid-through asset account `112`.
- Allocation/refund result: direct supplier payment allocations `0`, supplier payment unapplied allocations `0`, supplier refunds for the source payment `0`.
- Audit result: `Contact:CREATE` count `1`; `SupplierPayment:SUPPLIER_PAYMENT_CREATED` count `1`; supplier refund and supplier payment void audit counts `0`.
- Forbidden side-effect result: generated documents, email outbox rows, email provider events, purchase bills, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, and cleanup/delete audits all `0`.
- Temporary script cleanup result: no `*dev08d*` temporary script exists under `apps/api/scripts`; Part 3 used no temporary script file.
- Exact next prompt title: `DEV-08D Part 4: supplier refund from supplier payment preflight`.

## DEV-08D Part 4 - Supplier Refund From Supplier Payment Preflight Completed

- DEV-08D Part 4 read-only supplier refund creation preflight is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CREATION_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CREATION_PREFLIGHT.md).
- Runtime mutation performed: no.
- Source payment eligibility: `PAY-000007`, safe prefix `4b9c42b1`, is `POSTED`, `SAR`, amount paid `500.0000`, unapplied amount `500.0000`, same DEV-08D supplier safe prefix `a5d3ece3`, no void reversal journal, no allocations, and no existing supplier refunds.
- Planned supplier refund amount: `150.0000`; planned source payment unapplied after refund: `350.0000`.
- Planned received-into account: `112`, safe prefix `32ab6f4d`, active posting asset account; AP account `210`, safe prefix `883ea9a6`, active posting liability account.
- Expected accounting result: one posted supplier refund journal balanced at debit/credit `150.0000`, Dr asset `112`, Cr AP `210`; source payment journal `JE-000058` remains posted.
- Expected audit result: one `SupplierRefund:CREATE` audit only; no supplier refund void, supplier payment void, allocation/reversal, cleanup/delete, or login/browser audit path.
- Forbidden side-effect baseline: generated documents, email rows/events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, and cleanup/delete audits are all `0`.
- Required approval phrase: `I approve DEV-08D Part 5 local-only supplier refund from supplier payment mutation under marker DEV08D-AP-20260526T000000 for the DEV-08D supplier payment source with refund amount 150.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 5: approved local supplier refund from supplier payment mutation`.

## DEV-08D Part 5 - Supplier Refund From Supplier Payment Mutation Completed

- DEV-08D Part 5 local-only supplier refund mutation evidence is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_MUTATION_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `SupplierRefundService.create(...)` once; `SupplierRefundService.void(...)`, `SupplierPaymentService.void(...)`, and supplier payment creation were not called.
- Supplier refund result: `SRF-000004`, safe prefix `dc8c4c9a`, `POSTED`, amount `150.0000`, source type `SUPPLIER_PAYMENT`, source payment `PAY-000007`, source debit note absent.
- Source payment before/after: `PAY-000007` remained `POSTED`; amount paid stayed `500.0000`; unapplied amount decreased `500.0000 -> 350.0000`.
- Allocation result: direct supplier payment allocations `0`; active supplier payment unapplied allocations `0`.
- Journal/accounting result: refund journal `JE-000059`, safe prefix `4439a2ff`, `POSTED` and balanced at debit/credit `150.0000`, with Dr asset account `112` and Cr AP account `210`; source payment journal `JE-000058` remained posted and unreversed.
- Audit result: `SupplierRefund:SUPPLIER_REFUND_CREATED` count `1`; no supplier refund void, supplier payment void, or cleanup/delete audit for the source payment/refund.
- Forbidden side-effect result: generated documents, email outbox rows, email provider events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, and cleanup/delete audits all `0`; ZATCA was not invoked.
- Temporary script cleanup result: `apps/api/scripts/dev08d-supplier-refund-from-payment.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 6: supplier refund from supplier payment evidence verification`.

## DEV-08D Part 6 - Supplier Refund From Supplier Payment Evidence Verification Completed

- DEV-08D Part 6 read-only supplier refund evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Refund status/amount/source: `SRF-000004`, safe prefix `dc8c4c9a`, remained `POSTED`, amount `150.0000`, source type `SUPPLIER_PAYMENT`, source payment safe prefix `4b9c42b1`, source debit note absent, void reversal journal absent.
- Source payment result: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, amount paid `500.0000`, unapplied amount `350.0000`, void reversal journal absent.
- Journal/accounting result: refund journal `JE-000059`, safe prefix `4439a2ff`, remained `POSTED` and balanced at debit/credit `150.0000`, with Dr asset account `112` and Cr AP account `210`; source payment journal `JE-000058` remained posted and unreversed.
- Audit result: `SupplierRefund:SUPPLIER_REFUND_CREATED` count `1`; no supplier refund void, supplier payment void, duplicate supplier refund create, allocation/reversal, cleanup/delete, or login/browser audit path.
- Forbidden side-effect result: generated documents, email rows/events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and temporary DEV-08D scripts all absent.
- Exact next prompt title: `DEV-08D Part 7: supplier payment void blocker preflight`.

## DEV-08D Part 7 - Supplier Payment Void Blocker Preflight Completed

- DEV-08D Part 7 read-only supplier payment void blocker preflight is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no.
- Blocker condition confirmed: `PAY-000007`, safe prefix `4b9c42b1`, remains `POSTED` with amount paid `500.0000`, unapplied amount `350.0000`, and no void reversal journal; posted supplier refund count for the payment is `1`.
- Posted refund blocker: `SRF-000004`, safe prefix `dc8c4c9a`, remains `POSTED` for `150.0000`, source payment safe prefix `4b9c42b1`, and no refund void reversal journal.
- Code behavior confirmed: `SupplierPaymentService.void(...)` counts posted supplier refunds for the payment and throws `Cannot void supplier payment with posted supplier refunds. Void refunds first.` before payment status update or payment reversal journal creation.
- Expected Part 8 negative check: call `SupplierPaymentService.void(...)` once, expect the posted-refund blocker, and verify no payment/refund status, unapplied amount, journal, allocation, audit void, or forbidden side-effect change.
- Required approval phrase: `I approve DEV-08D Part 8 local-only supplier payment void blocker negative check under marker DEV08D-AP-20260526T000000 while supplier refund remains posted. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 8: approved local supplier payment void blocker negative check`.

## DEV-08D Part 8 - Supplier Payment Void Blocker Negative Check Completed

- DEV-08D Part 8 local-only supplier payment void blocker negative check evidence is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Runtime mutation result: expected blocked call; no state mutation.
- Exact service call made: `SupplierPaymentService.void(...)` once; the call threw the expected posted-refund blocker and was not retried.
- Blocker error observed: `Cannot void supplier payment with posted supplier refunds. Void refunds first.`
- Source payment after check: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, unapplied amount `350.0000`, `voidedAt` absent, and void reversal journal absent.
- Supplier refund after check: `SRF-000004`, safe prefix `dc8c4c9a`, remained `POSTED`, and void reversal journal absent.
- Journal/accounting non-effect: payment journal `JE-000058` and refund journal `JE-000059` remained `POSTED`; organization journal count remained `59`; no reversal journal was created.
- Audit/side-effect non-effect: supplier payment void audit `0`, supplier refund void audit `0`, generated documents `0`, email rows/events `0`, purchase orders/receipts `0`, stock movements `0`, cash expenses `0`, purchase debit notes `0`, cleanup/delete audits `0`, and ZATCA was not invoked.
- Temporary script cleanup result: `apps/api/scripts/dev08d-payment-void-blocker.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 9: supplier payment void blocker evidence verification`.

## DEV-08D Part 9 - Supplier Payment Void Blocker Evidence Verification Completed

- DEV-08D Part 9 read-only supplier payment void blocker evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Payment/refund remain posted: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, unapplied amount `350.0000`, void reversal journal absent; `SRF-000004`, safe prefix `dc8c4c9a`, remained `POSTED`, source payment safe prefix `4b9c42b1`, void reversal journal absent.
- No side effects: journal count remained `59`; no payment reversal journal, supplier payment void audit, supplier refund void audit, allocation mutation, generated documents, email rows/events, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, or temporary DEV-08D scripts were found.
- Exact next prompt title: `DEV-08D Part 10: supplier refund void preflight`.

## DEV-08D Part 10 - Supplier Refund Void Preflight Completed

- DEV-08D Part 10 read-only supplier refund void preflight is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_VOID_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_REFUND_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current refund state: `SRF-000004`, safe prefix `dc8c4c9a`, remains `POSTED`, amount `150.0000`, source type `SUPPLIER_PAYMENT`, source payment safe prefix `4b9c42b1`, refund journal `JE-000059` `POSTED`, and void reversal journal absent.
- Current source payment state: `PAY-000007`, safe prefix `4b9c42b1`, remains `POSTED`, amount paid `500.0000`, unapplied amount `350.0000`, and void reversal journal absent.
- Expected refund void effect: `SupplierRefundService.void(...)` once should set refund `VOIDED`, create a posted reversal journal, mark original refund journal `REVERSED`, restore source payment unapplied amount `350.0000 -> 500.0000`, and leave source payment `POSTED`.
- Expected accounting result: reversal journal balanced at debit/credit `150.0000`, reversing Dr asset `112` / Cr AP `210` into Dr AP `210` / Cr asset `112`; journal count should increase by `1`.
- Expected audit/side-effect result: one `SupplierRefund:SUPPLIER_REFUND_VOIDED` audit; no supplier payment void, allocations, generated documents, email, ZATCA, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete, or temporary script side effects.
- Required approval phrase: `I approve DEV-08D Part 11 local-only supplier refund void mutation under marker DEV08D-AP-20260526T000000 for the DEV-08D supplier refund from payment amount 150.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 11: approved local supplier refund void mutation`.

## DEV-08D Part 11 - Supplier Refund Void Mutation Completed

- DEV-08D Part 11 local-only supplier refund void mutation evidence is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `SupplierRefundService.void(...)` once; supplier refund creation and supplier payment void were not called.
- Refund before/after: `SRF-000004`, safe prefix `dc8c4c9a`, changed `POSTED -> VOIDED`; `voidedAt` present; original refund journal `JE-000059` changed `POSTED -> REVERSED`.
- Source payment restored: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`; amount paid stayed `500.0000`; unapplied amount restored `350.0000 -> 500.0000`; source payment void reversal journal absent.
- Reversal journal result: `JE-000060`, safe prefix `6360eb40`, `POSTED` and balanced at debit/credit `150.0000`, with Dr AP account `210` and Cr asset account `112`; journal count `59 -> 60`.
- Audit result: `SupplierRefund:SUPPLIER_REFUND_VOIDED` count `1`; supplier payment void audit `0`.
- Forbidden side-effect result: generated documents, email rows/events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and ZATCA all absent.
- Temporary script cleanup result: `apps/api/scripts/dev08d-supplier-refund-void.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 12: supplier refund void evidence verification`.

## DEV-08D Part 12 - Supplier Refund Void Evidence Verification Completed

- DEV-08D Part 12 read-only supplier refund void evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_REFUND_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Refund void result: `SRF-000004`, safe prefix `dc8c4c9a`, remained `VOIDED`; `voidedAt` present; original refund journal `JE-000059` remained `REVERSED`; refund void reversal journal `JE-000060`, safe prefix `6360eb40`, remained `POSTED` and balanced at debit/credit `150.0000`.
- Source payment restoration result: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, amount paid `500.0000`, unapplied amount `500.0000`, source payment journal `JE-000058` `POSTED`, and source payment void reversal journal absent.
- Journal/audit/side-effect result: reversal journal lines are Dr AP `210` / Cr asset `112`; supplier refund create audit `1`, supplier refund void audit `1`, supplier payment void audit `0`; generated documents, email rows/events, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and temporary DEV-08D scripts absent.
- Exact next prompt title: `DEV-08D Part 13: supplier payment void after refund void preflight`.

## DEV-08D Part 13 - Supplier Payment Void After Refund Void Preflight Completed

- DEV-08D Part 13 read-only supplier payment void after refund void preflight is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Payment voidability: `PAY-000007`, safe prefix `4b9c42b1`, remains `POSTED`, amount paid `500.0000`, unapplied amount `500.0000`, payment journal `JE-000058` `POSTED`, and void reversal journal absent.
- Blocker clearance: posted supplier refunds for source payment `0`; direct allocations `0`; active unapplied allocations `0`; allocated non-finalized bills `0`.
- Historical refund state: `SRF-000004`, safe prefix `dc8c4c9a`, remains `VOIDED`; refund void reversal journal `JE-000060` remains `POSTED`.
- Expected payment void effect: `SupplierPaymentService.void(...)` once should set payment `VOIDED`, create a posted reversal journal, mark original payment journal `REVERSED`, leave refund `VOIDED`, and create no bill/allocation changes.
- Expected accounting result: payment void reversal journal balanced at debit/credit `500.0000`, with Dr asset `112` and Cr AP `210`; journal count should increase `60 -> 61`.
- Required approval phrase: `I approve DEV-08D Part 14 local-only supplier payment void mutation after refund void under marker DEV08D-AP-20260526T000000 for the DEV-08D supplier payment source amount 500.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 14: approved local supplier payment void after refund void mutation`.

## DEV-08D Part 14 - Supplier Payment Void After Refund Void Mutation Completed

- DEV-08D Part 14 local-only supplier payment void after refund void mutation evidence is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `SupplierPaymentService.void(...)` once; supplier refund create/void was not called.
- Payment before/after: `PAY-000007`, safe prefix `4b9c42b1`, changed `POSTED -> VOIDED`; `voidedAt` present; amount paid and unapplied amount remained `500.0000`; original payment journal `JE-000058` changed `POSTED -> REVERSED`.
- Historical refund remains voided: `SRF-000004`, safe prefix `dc8c4c9a`, remained `VOIDED`; refund void reversal journal `JE-000060` remained `POSTED`; posted supplier refund count for payment remained `0`.
- Reversal journal result: payment void reversal journal `JE-000061`, safe prefix `389e8daf`, `POSTED` and balanced at debit/credit `500.0000`, with Dr asset account `112` and Cr AP account `210`; journal count `60 -> 61`.
- Audit result: `SupplierPayment:SUPPLIER_PAYMENT_VOIDED` count `1`; no new supplier refund audit.
- Forbidden side-effect result: generated documents, email rows/events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and ZATCA all absent.
- Temporary script cleanup result: `apps/api/scripts/dev08d-supplier-payment-void-after-refund.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 15: supplier payment void after refund void evidence verification`.

## DEV-08D Part 15 - Supplier Payment Void After Refund Void Evidence Verification Completed

- DEV-08D Part 15 read-only supplier payment void evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Payment final state: `PAY-000007`, safe prefix `4b9c42b1`, remained `VOIDED`; `voidedAt` present; amount paid and unapplied amount remained `500.0000`; original payment journal `JE-000058` remained `REVERSED`.
- Refund final state: `SRF-000004`, safe prefix `dc8c4c9a`, remained `VOIDED`; original refund journal `JE-000059` remained `REVERSED`; refund void reversal journal `JE-000060` remained `POSTED`; posted supplier refund count for payment remained `0`.
- Journal/audit/side-effect result: payment void reversal journal `JE-000061`, safe prefix `389e8daf`, remained `POSTED` and balanced at debit/credit `500.0000`, with Dr asset account `112` and Cr AP account `210`; supplier payment created/voided and supplier refund created/voided audits each remained exactly `1`; DEV-08D source/marker-scoped generated documents, email rows/events, ZATCA artifacts, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and temporary DEV-08D scripts remained absent.
- Exact next prompt title: `DEV-08D Part 16: supplier refund from supplier payment closure`.

## DEV-08D Part 16 - Supplier Refund From Supplier Payment Closure Completed

- DEV-08D Part 16 supplier refund from supplier payment closure is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CLOSURE.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CLOSURE.md).
- Mutation performed: no.
- DEV-08D proved the local supplier refund from supplier payment branch: source payment fixture creation, supplier refund creation, payment unapplied decrement/restoration, supplier payment void blocker while refund was posted, supplier refund void/reversal, and supplier payment void/reversal after the blocker cleared.
- Final source payment state: `PAY-000007`, safe prefix `4b9c42b1`, `VOIDED`; `voidedAt` present; amount paid and unapplied amount `500.0000`; original payment journal `JE-000058` `REVERSED`; payment void reversal journal `JE-000061` `POSTED`.
- Final supplier refund state: `SRF-000004`, safe prefix `dc8c4c9a`, `VOIDED`; amount `150.0000`; original refund journal `JE-000059` `REVERSED`; refund void reversal journal `JE-000060` `POSTED`; posted supplier refunds for payment `0`.
- Final accounting/audit/side-effect findings: payment void reversal `JE-000061` balanced at debit/credit `500.0000`; refund void reversal `JE-000060` balanced at debit/credit `150.0000`; supplier payment created/voided and supplier refund created/voided audits each `1`; source/marker-scoped generated documents, email rows/events, ZATCA artifacts, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and DEV-08D temporary scripts absent.
- Remaining AP gaps: cash expense lifecycle, inventory-clearing purchase bills, purchase receipt/inventory integration, AP output/PDF/archive, AP email, browser-authenticated AP UI/API QA, repeated/idempotency and blocker paths beyond DEV-08D, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title, recommended: `DEV-08E Part 1: cash expense lifecycle preflight`.

## Next Thread Prompt

`DEV-08E Part 1: cash expense lifecycle preflight`

## DEV-08E Part 1 - Cash Expense Lifecycle Preflight Completed

- DEV-08E Part 1 cash expense lifecycle preflight is recorded in [docs/development/DEV_08E_CASH_EXPENSE_LIFECYCLE_PREFLIGHT.md](docs/development/DEV_08E_CASH_EXPENSE_LIFECYCLE_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `50df109c Close DEV-08D supplier refund payment evidence`; local `HEAD` matched `origin/main`.
- Cash expense lifecycle summary: create immediately posts one `POSTED` cash expense, creates a posted journal, and writes `CashExpense:CREATE`; the schema has `DRAFT`, but the current create/UI path does not reach it; void changes `POSTED -> VOIDED`, creates/reuses one posted reversal journal, marks the original journal `REVERSED`, and writes `CashExpense:VOID`.
- Accounting summary: VAT cash expenses debit the line expense/cost/asset account, debit VAT receivable account `230` when tax applies, and credit the paid-through asset account; void reversal swaps the original debit/credit lines.
- Output/PDF/archive summary: `pdf` and `generate-pdf` can render and archive generated documents; DEV-08E Part 1 did not call PDF-data, PDF, generate-PDF, archive, export, or download paths.
- Selected Part 2 mutation option: Option A, create one posted local cash expense fixture only, no void.
- Proposed marker: `DEV08E-AP-20260526T000000`.
- Proposed local fixture: fake local AP-ready organization safe prefix `db69e5a8`, no contact, no branch, paid-through `112 Bank Account`, expense account `511 General Expenses`, purchase VAT `15%`, planned total `1150.0000`.
- Required approval phrase: `I approve DEV-08E Part 2 local-only cash expense fixture creation mutation under marker DEV08E-AP-20260526T000000. No production, no beta, no customer data.`
- Expected audit result: exactly one `CashExpense:CREATE` / `CASH_EXPENSE_CREATED` audit for the fixture, no void/delete/login audit.
- Expected forbidden side effects: marker-scoped generated documents, email rows/events, ZATCA artifacts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements/inventory entries, cleanup/delete audits, and temporary scripts remain `0` or absent.
- Exact next prompt title: `DEV-08E Part 2: approved local cash expense fixture creation mutation`.

## Next Thread Prompt

`DEV-08E Part 2: approved local cash expense fixture creation mutation`

## DEV-08E Part 2 - Cash Expense Fixture Creation Completed

- DEV-08E Part 2 local-only cash expense fixture creation evidence is recorded in [docs/development/DEV_08E_CASH_EXPENSE_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08E_CASH_EXPENSE_FIXTURE_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Option A phrase received and checked before mutation.
- Cash expense result: `EXP-000002`, safe prefix `74886497`, `POSTED`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, contact absent, branch absent, paid-through account `112`.
- Journal result: `JE-000062`, safe prefix `a2aa8290`, `POSTED`, balanced debit/credit `1150.0000`; lines were Dr `511` `1000.0000`, Dr `230` `150.0000`, Cr `112` `1150.0000`.
- Audit result: one `CashExpense:CASH_EXPENSE_CREATED` audit; no cash expense void/delete audit and no login/browser audit-writing flow.
- Forbidden side-effect result: generated documents, email rows/events, ZATCA metadata/signed drafts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, and cleanup/delete audits all remained `0`.
- Temporary script cleanup result: `apps/api/scripts/dev08e-cash-expense-fixture.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08e*`/`*cash-expense*` temp script remained under `apps/api/scripts`; script was not staged.
- Exact next prompt title: `DEV-08E Part 3: cash expense fixture evidence verification`.

## Next Thread Prompt

`DEV-08E Part 3: cash expense fixture evidence verification`

## DEV-08E Part 3 - Cash Expense Fixture Evidence Verification Completed

- DEV-08E Part 3 read-only cash expense fixture evidence verification is recorded in [docs/development/DEV_08E_CASH_EXPENSE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08E_CASH_EXPENSE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: `Verified`.
- Cash expense result: `EXP-000002`, safe prefix `74886497`, remained `POSTED`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, paid-through account `112`, contact absent, branch absent, void reversal journal absent.
- Journal/accounting result: `JE-000062`, safe prefix `a2aa8290`, remained `POSTED` and balanced debit/credit `1150.0000`; lines remained Dr `511` `1000.0000`, Dr `230` `150.0000`, Cr `112` `1150.0000`; no reversal journal exists.
- Audit result: cash expense create audit `1`; cash expense void audit `0`; cash expense delete audit `0`; no login/browser audit-writing flow.
- Forbidden side-effect result: generated documents, email rows/events, ZATCA metadata/submission logs/signed drafts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, and cleanup/delete audits remained `0`.
- Temporary script cleanup result: Part 2 mutation script absent; no Part 3 read-only script was created; no `*dev08e*`/`*cash-expense*` temp script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08E Part 4: cash expense void preflight`.

## Next Thread Prompt

`DEV-08E Part 4: cash expense void preflight`

## DEV-08E Part 4 - Cash Expense Void Preflight Completed

- DEV-08E Part 4 read-only cash expense void preflight is recorded in [docs/development/DEV_08E_CASH_EXPENSE_VOID_PREFLIGHT.md](docs/development/DEV_08E_CASH_EXPENSE_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current cash expense state: `EXP-000002`, safe prefix `74886497`, remains `POSTED`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, paid-through account `112`, void reversal journal absent, and `voidedAt` absent.
- Current journal state: `JE-000062`, safe prefix `a2aa8290`, remains `POSTED` and balanced at debit/credit `1150.0000`; no reversed-by journal exists.
- Current fiscal/sequence baseline: fiscal period `2026` is `OPEN` for `2026-05-27`; the `JOURNAL_ENTRY` sequence next number is `63`, so the expected reversal journal is `JE-000063` if no sequence changes before Part 5.
- Expected void effect: one future `CashExpenseService.void(...)` call should change the cash expense `POSTED -> VOIDED`, set `voidedAt`, create a posted reversal journal, and mark original journal `JE-000062` as `REVERSED`.
- Expected reversal accounting: Dr paid-through asset account `112` `1150.0000`, Cr expense account `511` `1000.0000`, and Cr VAT receivable account `230` `150.0000`.
- Expected audit/side-effect result: one `CashExpense:CASH_EXPENSE_VOIDED` audit; no duplicate create, no delete, no login/browser audit path, and no generated-document, email, ZATCA, supplier payment/refund, purchase bill/debit note/order/receipt, stock movement, or cleanup/delete side effect.
- Required exact Part 5 approval phrase: `I approve DEV-08E Part 5 local-only cash expense void mutation under marker DEV08E-AP-20260526T000000 for cash expense EXP-000002 total 1150.0000. No production, no beta, no customer data.`
- Placeholder approval with `<EXPENSE_NUMBER>` and `<TOTAL>` is not sufficient.
- Exact next prompt title: `DEV-08E Part 5: approved local cash expense void mutation`.

## Next Thread Prompt

`DEV-08E Part 5: approved local cash expense void mutation`

## DEV-08E Part 5 - Cash Expense Void Mutation Completed

- DEV-08E Part 5 local-only cash expense void mutation evidence is recorded in [docs/development/DEV_08E_CASH_EXPENSE_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08E_CASH_EXPENSE_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 5 phrase received and checked before mutation.
- Exact service call made: `CashExpenseService.void(...)` once; cash expense create/delete, PDF/archive/export/download, email, ZATCA, supplier payment/refund, purchase bill/debit note/order/receipt, inventory/stock, cleanup, login/browser, production, beta, and customer-data paths were not run.
- Cash expense before/after: `EXP-000002`, safe prefix `74886497`, changed `POSTED -> VOIDED`; `voidedAt` is present; subtotal `1000.0000`, tax `150.0000`, total `1150.0000` remained unchanged.
- Journal/accounting result: original journal `JE-000062`, safe prefix `a2aa8290`, changed `POSTED -> REVERSED`; void reversal journal `JE-000063`, safe prefix `391169e6`, is `POSTED` and balanced at debit/credit `1150.0000`; reversal lines are Cr `511` `1000.0000`, Cr `230` `150.0000`, and Dr `112` `1150.0000`.
- Audit result: cash expense create audit remained `1`; cash expense void audit became `1`; cash expense delete audit remained `0`; no login/browser audit-writing flow ran.
- Forbidden side-effect result: generated documents, email rows/events, ZATCA metadata/submission logs/signed drafts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, and cleanup/delete audits remained `0`.
- Temporary script cleanup result: `apps/api/scripts/dev08e-cash-expense-void.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08e*`/`*cash-expense*` temp script remained under `apps/api/scripts`; script was not staged.
- Exact next prompt title: `DEV-08E Part 6: cash expense void evidence verification`.

## Next Thread Prompt

`DEV-08E Part 6: cash expense void evidence verification`

## DEV-08E Part 6 - Cash Expense Void Evidence Verification Completed

- DEV-08E Part 6 read-only cash expense void evidence verification is recorded in [docs/development/DEV_08E_CASH_EXPENSE_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08E_CASH_EXPENSE_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: `Verified`.
- Cash expense final state: `EXP-000002`, safe prefix `74886497`, remained `VOIDED`; `voidedAt` is present; subtotal `1000.0000`, tax `150.0000`, total `1150.0000` remained unchanged.
- Journal/accounting result: original journal `JE-000062`, safe prefix `a2aa8290`, remained `REVERSED`; void reversal journal `JE-000063`, safe prefix `391169e6`, remained `POSTED` and balanced at debit/credit `1150.0000`; reversal lines exactly reverse the original journal lines.
- Audit result: cash expense create audit `1`, cash expense void audit `1`, cash expense delete audit `0`; no login/browser audit-writing flow ran.
- Forbidden side-effect result: generated documents, email rows/events, ZATCA metadata/submission logs/signed drafts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, and cleanup/delete audits remained `0`.
- Temporary script cleanup result: Part 5 mutation script absent; no Part 6 read-only script was created; no `*dev08e*`/`*cash-expense*` temp script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08E Part 7: cash expense lifecycle closure`.

## Next Thread Prompt

`DEV-08E Part 7: cash expense lifecycle closure`

## DEV-08E Part 7 - Cash Expense Lifecycle Closure Completed

- DEV-08E Part 7 cash expense lifecycle closure is recorded in [docs/development/DEV_08E_CASH_EXPENSE_LIFECYCLE_CLOSURE.md](docs/development/DEV_08E_CASH_EXPENSE_LIFECYCLE_CLOSURE.md).
- Mutation performed: no.
- DEV-08E proved local cash expense creation/posting, original journal behavior, cash expense void/reversal, reversal journal behavior, audit behavior, and forbidden output/email/ZATCA non-effects.
- Final cash expense state: `EXP-000002`, safe prefix `74886497`, `VOIDED`, `voidedAt` present, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`.
- Final journal/accounting state: original journal `JE-000062`, safe prefix `a2aa8290`, `REVERSED`; void reversal journal `JE-000063`, safe prefix `391169e6`, `POSTED`, balanced at debit/credit `1150.0000`; reversal lines exactly reverse original lines.
- Final audit/side-effect state: cash expense create audit `1`, void audit `1`, delete audit `0`; generated documents, PDF/archive/export/download, email, ZATCA, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, cleanup/delete audits, and DEV-08E temp scripts absent.
- Remaining AP gaps: inventory-clearing purchase bills, purchase receipt/inventory integration, AP output/PDF/archive, AP email, browser-authenticated AP UI/API QA, repeated/idempotency and blocker paths beyond DEV-08E, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08F Part 1: inventory-clearing purchase bill preflight`.

## Next Thread Prompt

`DEV-08F Part 1: inventory-clearing purchase bill preflight`

## DEV-08F Part 1 - Inventory-Clearing Purchase Bill Preflight Completed

- DEV-08F Part 1 read-only inventory-clearing purchase bill preflight is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_PREFLIGHT.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_PREFLIGHT.md).
- Mutation performed: no.
- Latest commit inspected: `9bae1e3a Close DEV-08E cash expense evidence`; local `HEAD` matched `origin/main`.
- Local-only proof: root `.env` and `apps/api/.env` database targets were classified without printing secrets as local PostgreSQL on port `5432`; read-only Prisma checks used a local-target guard and sanitized output only.
- Repo state: pre-existing untracked marketing/graphify paths remain untouched and unstaged; no DEV-08E/DEV-08F temporary scripts exist under `apps/api/scripts`.
- Purchase bill behavior summary: `INVENTORY_CLEARING` mode is draft-save capable only when inventory accounting is enabled, valuation is `MOVING_AVERAGE`, receipt posting mode is `PREVIEW_ONLY`, at least one tracked item line exists, inventory clearing account is mapped/active/posting, and clearing is separate from AP `210` and inventory asset. Finalization posts Dr clearing for tracked lines, Dr VAT `230` when taxed, and Cr AP `210`; void reverses the bill journal without stock movement mutation.
- Purchase receipt integration summary: receipts can be bill/order/standalone sourced, create `POSTED` operational receipt rows and inbound stock movements, and do not post GL on creation. Asset posting is an explicit manual journal action for posted receipts linked to finalized `INVENTORY_CLEARING` bills; active asset posting blocks receipt void until reversed.
- Selected Part 2 mutation option: Option A, reuse selected fake local AP/inventory-ready org safe prefix `db69e5a8`; create one future draft `INVENTORY_CLEARING` purchase bill only, with no inventory settings mutation.
- Proposed marker: `DEV08F-AP-20260527T000000`.
- Expected future accounting: bill finalization Dr inventory clearing `240` `1000.0000`, Dr VAT receivable `230` `150.0000`, Cr AP `210` `1150.0000`; later receipt asset posting Dr inventory asset `130` `1000.0000`, Cr inventory clearing `240` `1000.0000`.
- Forbidden side-effect baseline: DEV-08F marker purchase bills, receipts, stock movements, contacts, items, warehouses, generated documents, email rows/events, and cleanup/delete audit counts are `0`; no ZATCA command was run.
- Required exact Part 2 approval phrase: `I approve DEV-08F Part 2 local-only inventory-clearing purchase bill fixture creation mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 2: approved local inventory-clearing purchase bill fixture creation mutation`.

## Next Thread Prompt

`DEV-08F Part 2: approved local inventory-clearing purchase bill fixture creation mutation`

## DEV-08F Part 2 - Inventory-Clearing Purchase Bill Fixture Creation Completed

- DEV-08F Part 2 local-only inventory-clearing purchase bill fixture mutation evidence is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 2 phrase received and checked before mutation.
- Purchase bill result: `BILL-000009`, safe prefix `04b3f131`, `DRAFT`, `INVENTORY_CLEARING`, bill date `2026-05-28`, due date `2026-06-27`, subtotal `1000.0000`, VAT `150.0000`, total and balance due `1150.0000`.
- Source result: selected org safe prefix `db69e5a8`, supplier safe prefix `287aec77`, tracked item safe prefix `175a7c7f`, line account `511`, tax rate safe prefix `172417be`.
- Accounting result: no purchase bill journal, reversal journal, purchase receipt, stock movement, or generated document exists for the bill.
- Audit result: one `PURCHASE_BILL_CREATED` audit for the bill.
- Forbidden side-effect result: purchase receipts, stock movements, source-scoped journals, generated documents, purchase orders, purchase debit notes, supplier payment allocations, supplier unapplied allocations, supplier refunds from bill payments, and marker cash expenses are all absent.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 3: inventory-clearing purchase bill fixture evidence verification`.

## Next Thread Prompt

`DEV-08F Part 3: inventory-clearing purchase bill fixture evidence verification`

## DEV-08F Part 3 - Inventory-Clearing Purchase Bill Fixture Evidence Verification Completed

- DEV-08F Part 3 read-only fixture verification is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Purchase bill state: `BILL-000009`, safe prefix `04b3f131`, remained `DRAFT`, `INVENTORY_CLEARING`, total and balance due `1150.0000`, with no journal or reversal journal.
- Line state: line safe prefix `cb3d385a`, tracked item safe prefix `175a7c7f`, account `511`, tax rate safe prefix `172417be`, quantity `10.0000`, unit price `100.0000`, VAT `150.0000`.
- Read-only preview result: `canFinalize: true`, no blocking reasons, balanced preview Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Audit/side-effect result: one `PURCHASE_BILL_CREATED` audit; purchase receipts, stock movements, source-scoped journals, generated documents, purchase debit notes, supplier payment allocations, and supplier unapplied allocations remained absent.
- Temporary script cleanup result: no Part 3 temporary script was created; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 4: inventory-clearing purchase bill finalization preflight`.

## Next Thread Prompt

`DEV-08F Part 4: inventory-clearing purchase bill finalization preflight`

## DEV-08F Part 4 - Inventory-Clearing Purchase Bill Finalization Preflight Completed

- DEV-08F Part 4 finalization preflight is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_PREFLIGHT.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current bill state: `BILL-000009`, safe prefix `04b3f131`, remains `DRAFT`, `INVENTORY_CLEARING`, bill date `2026-05-28`, total `1150.0000`, no journal, no receipt.
- Read-only finalization readiness: `canFinalize: true`, no blocking reasons, balanced preview Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Fiscal/sequence baseline: fiscal period `2026` is `OPEN`; expected next journal number is `JE-000064` if no intervening sequence write occurs before Part 5.
- Current side-effect baseline: purchase receipts, stock movements, source-scoped journals, and generated documents for the bill are absent.
- Required exact Part 5 approval phrase: `I approve DEV-08F Part 5 local-only inventory-clearing purchase bill finalization mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 5: approved local inventory-clearing purchase bill finalization mutation`.

## Next Thread Prompt

`DEV-08F Part 5: approved local inventory-clearing purchase bill finalization mutation`

## DEV-08F Part 5 - Inventory-Clearing Purchase Bill Finalization Completed

- DEV-08F Part 5 local-only finalization mutation evidence is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 5 phrase received and checked before mutation.
- Exact service call made: `PurchaseBillService.finalize(...)` once.
- Purchase bill result: `BILL-000009`, safe prefix `04b3f131`, changed `DRAFT -> FINALIZED`; `finalizedAt` present; balance due `1150.0000`; reversal journal absent.
- Journal result: `JE-000064`, safe prefix `3fff12bc`, `POSTED`, balanced debit/credit `1150.0000`; lines are Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Audit result: `PURCHASE_BILL_CREATED` and `PURCHASE_BILL_FINALIZED` are present for the bill.
- Forbidden side-effect result: purchase receipts, stock movements, generated documents, purchase debit notes, supplier payment allocations, and supplier unapplied allocations for the bill remain absent.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 6: inventory-clearing purchase bill finalization evidence verification`.

## Next Thread Prompt

`DEV-08F Part 6: inventory-clearing purchase bill finalization evidence verification`

## DEV-08F Part 6 - Inventory-Clearing Purchase Bill Finalization Evidence Verification Completed

- DEV-08F Part 6 read-only finalization verification is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Purchase bill state: `BILL-000009`, safe prefix `04b3f131`, remained `FINALIZED`, `INVENTORY_CLEARING`, total and balance due `1150.0000`; reversal journal absent; linked receipts `0`.
- Journal state: `JE-000064`, safe prefix `3fff12bc`, remained `POSTED`, unreversed, balanced debit/credit `1150.0000`; lines are Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Audit/side-effect result: `PURCHASE_BILL_CREATED` and `PURCHASE_BILL_FINALIZED` remain present; purchase receipts, stock movements, generated documents, purchase debit notes, supplier payment allocations, and supplier unapplied allocations remain absent.
- Temporary script cleanup result: no Part 6 temporary script was created; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 7: purchase receipt from inventory-clearing bill preflight`.

## Next Thread Prompt

`DEV-08F Part 7: purchase receipt from inventory-clearing bill preflight`

## DEV-08F Part 7 - Purchase Receipt From Inventory-Clearing Bill Preflight Completed

- DEV-08F Part 7 receipt preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_PREFLIGHT.md).
- Runtime mutation performed: no.
- Source bill state: `BILL-000009`, safe prefix `04b3f131`, remained `FINALIZED`, `INVENTORY_CLEARING`; source line safe prefix `cb3d385a`, item safe prefix `175a7c7f`, quantity `10.0000`, unit price `100.0000`.
- Receiving readiness: `NOT_STARTED`; source line received quantity `0.0000`, remaining quantity `10.0000`, inventory tracking `true`.
- Matching readiness: `NOT_RECEIVED`; receipt count `0`, receipt value `0.0000`.
- Warehouse/sequence baseline: default warehouse safe prefix `197fac56`; expected next receipt number `PRC-000004` if no intervening sequence write occurs before Part 8.
- Required exact Part 8 approval phrase: `I approve DEV-08F Part 8 local-only purchase receipt from inventory-clearing bill mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 8: approved local purchase receipt from inventory-clearing bill mutation`.

## Next Thread Prompt

`DEV-08F Part 8: approved local purchase receipt from inventory-clearing bill mutation`

## DEV-08F Part 8 - Purchase Receipt From Inventory-Clearing Bill Completed

- DEV-08F Part 8 local-only purchase receipt mutation evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_MUTATION_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 8 phrase received and checked before mutation.
- Exact service call made: `PurchaseReceiptService.create(...)` once.
- Purchase receipt result: `PRC-000004`, safe prefix `993adc10`, `POSTED`, linked to purchase bill safe prefix `04b3f131`, supplier safe prefix `287aec77`, warehouse safe prefix `197fac56`, receipt date `2026-05-28`.
- Receipt line result: safe prefix `61b842a9`, item safe prefix `175a7c7f`, purchase bill line safe prefix `cb3d385a`, quantity `10.0000`, unit cost `100.0000`.
- Stock movement result: safe prefix `a7708ad8`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `10.0000`, unit cost `100.0000`, total cost `1000.0000`, reference type `PurchaseReceipt`.
- Accounting/side-effect result: purchase receipt asset journal absent; purchase bill journal count remained `1`; generated documents for the receipt remained `0`.
- Audit result: one `PURCHASE_RECEIPT_CREATED` audit for the receipt.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 9: purchase receipt evidence verification`.

## Next Thread Prompt

`DEV-08F Part 9: purchase receipt evidence verification`

## DEV-08F Part 9 - Purchase Receipt Evidence Verification Completed

- DEV-08F Part 9 read-only receipt verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`, linked to purchase bill safe prefix `04b3f131`, with no inventory asset journal or reversal journal.
- Receipt line/stock state: line safe prefix `61b842a9`, item safe prefix `175a7c7f`, quantity `10.0000`, unit cost `100.0000`; stock movement safe prefix `a7708ad8`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `10.0000`, total cost `1000.0000`; void stock movement absent.
- Receiving/matching state: receiving status `COMPLETE`; matching status `FULLY_RECEIVED`; receipt value and matched bill value `1000.0000`; value difference `0.0000`.
- Read-only asset posting preview: `canPost: true`, no blocking reasons, balanced preview Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Audit/side-effect result: one `PURCHASE_RECEIPT_CREATED` audit; asset journals, asset reversal journals, void stock movements, and generated documents remained absent.
- Exact next prompt title: `DEV-08F Part 10: purchase receipt inventory asset posting preflight`.

## Next Thread Prompt

`DEV-08F Part 10: purchase receipt inventory asset posting preflight`

## DEV-08F Part 10 - Purchase Receipt Inventory Asset Posting Preflight Completed

- DEV-08F Part 10 asset posting preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`, with no inventory asset journal or reversal journal.
- Read-only asset posting readiness: `canPost: true`, no blocking reasons, balanced preview Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Fiscal/sequence baseline: fiscal period `2026` is `OPEN`; expected next journal number `JE-000065` if no intervening sequence write occurs before Part 11.
- Current side-effect baseline: asset journals `0`, asset reversal journals `0`, stock movements for receipt `1`, void stock movements `0`.
- Required exact Part 11 approval phrase: `I approve DEV-08F Part 11 local-only purchase receipt inventory asset posting mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 11: approved local purchase receipt inventory asset posting mutation`.

## Next Thread Prompt

`DEV-08F Part 11: approved local purchase receipt inventory asset posting mutation`

## DEV-08F Part 11 - Purchase Receipt Inventory Asset Posting Completed

- DEV-08F Part 11 local-only asset posting mutation evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_MUTATION_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 11 phrase received and checked before mutation.
- Exact service call made: `PurchaseReceiptService.postInventoryAsset(...)` once.
- Receipt result: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal absent; `inventoryAssetPostedAt` present.
- Journal result: `JE-000065`, safe prefix `75a6c7c3`, `POSTED`, balanced debit/credit `1000.0000`; lines are Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Audit result: `PURCHASE_RECEIPT_CREATED` and `PURCHASE_RECEIPT_ASSET_POSTED` are present for the receipt.
- Side-effect result: stock movements for the receipt remained `1`; void stock movements `0`; generated documents `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 12: purchase receipt inventory asset posting evidence verification`.

## Next Thread Prompt

`DEV-08F Part 12: purchase receipt inventory asset posting evidence verification`

## DEV-08F Part 12 - Purchase Receipt Inventory Asset Posting Evidence Verification Completed

- DEV-08F Part 12 read-only asset posting verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`, with inventory asset journal safe prefix `75a6c7c3`; reversal journal absent; `inventoryAssetPostedAt` present; `inventoryAssetReversedAt` absent.
- Journal state: `JE-000065`, safe prefix `75a6c7c3`, remained `POSTED`, unreversed, balanced debit/credit `1000.0000`; lines are Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Audit/side-effect result: `PURCHASE_RECEIPT_CREATED` and `PURCHASE_RECEIPT_ASSET_POSTED` remain present; asset reversal journals, void stock movements, and generated documents remain absent.
- Exact next prompt title: `DEV-08F Part 13: purchase receipt void blocker preflight`.

## Next Thread Prompt

`DEV-08F Part 13: purchase receipt void blocker preflight`

## DEV-08F Part 13 - Purchase Receipt Void Blocker Preflight Completed

- DEV-08F Part 13 receipt void blocker preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current receipt state: `PRC-000004`, safe prefix `993adc10`, remains `POSTED`, with active inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal absent.
- Asset journal state: `JE-000065`, safe prefix `75a6c7c3`, remains `POSTED`, unreversed.
- Expected Part 14 blocker: `Reverse inventory asset posting before voiding this purchase receipt.`
- Current side-effect baseline: asset journals `1`, asset reversal journals `0`, void stock movements `0`, receipt void audits `0`.
- Required exact Part 14 approval phrase: `I approve DEV-08F Part 14 local-only purchase receipt void blocker negative check under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 14: approved local purchase receipt void blocker negative check`.

## Next Thread Prompt

`DEV-08F Part 14: approved local purchase receipt void blocker negative check`

## DEV-08F Part 14 - Purchase Receipt Void Blocker Negative Check Completed

- DEV-08F Part 14 void blocker negative check evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Mutation attempted: yes, local-only negative check.
- Approval phrase status: exact Part 14 phrase received and checked before the negative check.
- Exact service call made: `PurchaseReceiptService.void(...)` once.
- Expected blocker observed: `Reverse inventory asset posting before voiding this purchase receipt.`
- State after blocked call: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; inventory asset journal `JE-000065`, safe prefix `75a6c7c3`, remained `POSTED` and unreversed; reversal journal absent; `voidedAt` absent.
- Side-effect result: void stock movements `0`, receipt void audits `0`, asset reversal journals `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 15: purchase receipt void blocker evidence verification`.

## Next Thread Prompt

`DEV-08F Part 15: purchase receipt void blocker evidence verification`

## DEV-08F Part 15 - Purchase Receipt Void Blocker Evidence Verification Completed

- DEV-08F Part 15 read-only void blocker verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; `voidedAt` absent; inventory asset journal safe prefix `75a6c7c3`; reversal journal absent.
- Asset journal state: `JE-000065`, safe prefix `75a6c7c3`, remained `POSTED`, unreversed.
- Audit/side-effect result: receipt audits remain `PURCHASE_RECEIPT_CREATED` and `PURCHASE_RECEIPT_ASSET_POSTED`; void stock movements, receipt void audits, asset reversal journals, and generated documents remain absent.
- Exact next prompt title: `DEV-08F Part 16: purchase receipt inventory asset reversal preflight`.

## Next Thread Prompt

`DEV-08F Part 16: purchase receipt inventory asset reversal preflight`

## DEV-08F Part 16 - Purchase Receipt Inventory Asset Reversal Preflight Completed

- DEV-08F Part 16 asset reversal preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current receipt state: `PRC-000004`, safe prefix `993adc10`, remains `POSTED`, with active inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal absent.
- Asset journal state: `JE-000065`, safe prefix `75a6c7c3`, remains `POSTED`, unreversed; lines are Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Expected reversal: `JE-000066` if no intervening sequence write occurs; expected lines Cr `130` `1000.0000`, Dr `240` `1000.0000`.
- Fiscal/side-effect baseline: fiscal period `2026` is `OPEN`; asset reversal journals `0`, void stock movements `0`, receipt void audits `0`.
- Required exact Part 17 approval phrase: `I approve DEV-08F Part 17 local-only purchase receipt inventory asset reversal mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 17: approved local purchase receipt inventory asset reversal mutation`.

## Next Thread Prompt

`DEV-08F Part 17: approved local purchase receipt inventory asset reversal mutation`

## DEV-08F Part 17 - Purchase Receipt Inventory Asset Reversal Completed

- DEV-08F Part 17 local-only asset reversal mutation evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_MUTATION_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 17 phrase received and checked before mutation.
- Exact service call made: `PurchaseReceiptService.reverseInventoryAsset(...)` once.
- Receipt result: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal safe prefix `71495866`; `inventoryAssetReversedAt` present.
- Journal result: original asset journal `JE-000065`, safe prefix `75a6c7c3`, changed `POSTED -> REVERSED`; reversal journal `JE-000066`, safe prefix `71495866`, is `POSTED`, reverses `JE-000065`, and is balanced debit/credit `1000.0000` with Cr `130` `1000.0000`, Dr `240` `1000.0000`.
- Audit result: `PURCHASE_RECEIPT_CREATED`, `PURCHASE_RECEIPT_ASSET_POSTED`, and `PURCHASE_RECEIPT_ASSET_REVERSED` are present for the receipt.
- Side-effect result: void stock movements `0`; generated documents `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 18: purchase receipt inventory asset reversal evidence verification`.

## Next Thread Prompt

`DEV-08F Part 18: purchase receipt inventory asset reversal evidence verification`

## DEV-08F Part 18 - Purchase Receipt Inventory Asset Reversal Evidence Verification Completed

- DEV-08F Part 18 read-only asset reversal verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal safe prefix `71495866`; `inventoryAssetReversedAt` present; `voidedAt` absent.
- Journal state: original `JE-000065`, safe prefix `75a6c7c3`, remained `REVERSED`; reversal `JE-000066`, safe prefix `71495866`, remained `POSTED`, balanced debit/credit `1000.0000`.
- Audit/side-effect result: receipt created/asset-posted/asset-reversed audits remain present; void stock movements and generated documents remain absent.
- Exact next prompt title: `DEV-08F Part 19: purchase receipt void preflight`.

## Next Thread Prompt

`DEV-08F Part 19: purchase receipt void preflight`

## DEV-08F Part 19 - Purchase Receipt Void Preflight Completed

- DEV-08F Part 19 receipt void preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current receipt state: `PRC-000004`, safe prefix `993adc10`, remains `POSTED`; asset journal `JE-000065` is `REVERSED`; asset reversal journal `JE-000066` is `POSTED`; `voidedAt` absent.
- Stock sufficiency: item safe prefix `175a7c7f`, warehouse safe prefix `197fac56`, current quantity `23.0000`, required void quantity `10.0000`, sufficient `true`; expected void stock movement type `ADJUSTMENT_OUT`.
- Current side-effect baseline: void stock movements `0`, receipt void audits `0`, generated documents `0`.
- Required exact Part 20 approval phrase: `I approve DEV-08F Part 20 local-only purchase receipt void mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 20: approved local purchase receipt void mutation`.

## Next Thread Prompt

`DEV-08F Part 20: approved local purchase receipt void mutation`

## DEV-08F Part 20 - Purchase Receipt Void Completed

- DEV-08F Part 20 local-only purchase receipt void mutation evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 20 phrase received and checked before mutation.
- Exact service call made: `PurchaseReceiptService.void(...)` once.
- Receipt result: `PRC-000004`, safe prefix `993adc10`, changed `POSTED -> VOIDED`; `voidedAt` present; asset journal `JE-000065` remained `REVERSED`; asset reversal journal `JE-000066` remained `POSTED`.
- Void stock movement result: safe prefix `426c6ba0`, type `ADJUSTMENT_OUT`, quantity `10.0000`, unit cost `100.0000`, total cost `1000.0000`, reference type `PurchaseReceiptVoid`.
- Audit result: `PURCHASE_RECEIPT_CREATED`, `PURCHASE_RECEIPT_ASSET_POSTED`, `PURCHASE_RECEIPT_ASSET_REVERSED`, and `PURCHASE_RECEIPT_VOIDED` are present for the receipt.
- Side-effect result: generated documents `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 21: purchase receipt void evidence verification`.

## Next Thread Prompt

`DEV-08F Part 21: purchase receipt void evidence verification`

## DEV-08F Part 21 - Purchase Receipt Void Evidence Verification Completed

- DEV-08F Part 21 read-only receipt void verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `VOIDED`; `voidedAt` present; asset journal `JE-000065` remained `REVERSED`; asset reversal journal `JE-000066` remained `POSTED`.
- Void stock movement state: safe prefix `426c6ba0`, type `ADJUSTMENT_OUT`, quantity `10.0000`, total cost `1000.0000`, linked to receipt line safe prefix `61b842a9`.
- Audit/side-effect result: receipt created/asset-posted/asset-reversed/voided audits remain present; non-voided receipts for bill `0`; generated documents `0`.
- Exact next prompt title: `DEV-08F Part 22: inventory-clearing purchase bill void preflight`.

## Next Thread Prompt

`DEV-08F Part 22: inventory-clearing purchase bill void preflight`

## DEV-08F Part 22 - Inventory-Clearing Purchase Bill Void Preflight Completed

- DEV-08F Part 22 bill void preflight is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_PREFLIGHT.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current bill state: `BILL-000009`, safe prefix `04b3f131`, remains `FINALIZED`, `INVENTORY_CLEARING`, balance due `1150.0000`; original journal `JE-000064`, safe prefix `3fff12bc`, remains `POSTED`; bill reversal journal absent.
- Receipt state: linked receipt `PRC-000004`, safe prefix `993adc10`, is `VOIDED`; non-voided receipts for bill `0`.
- Void readiness: active supplier payment allocations `0`, active purchase debit note allocations `0`, active supplier unapplied allocations `0`, generated documents for bill `0`.
- Fiscal/sequence baseline: fiscal period `2026` is `OPEN`; expected bill reversal journal `JE-000067` if no intervening sequence write occurs before Part 23.
- Required exact Part 23 approval phrase: `I approve DEV-08F Part 23 local-only inventory-clearing purchase bill void mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 23: approved local inventory-clearing purchase bill void mutation`.

## Next Thread Prompt

`DEV-08F Part 23: approved local inventory-clearing purchase bill void mutation`

## DEV-08F Part 23 - Inventory-Clearing Purchase Bill Void Completed

- DEV-08F Part 23 local-only purchase bill void mutation evidence is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 23 phrase received and checked before mutation.
- Exact service call made: `PurchaseBillService.void(...)` once.
- Bill result: `BILL-000009`, safe prefix `04b3f131`, changed `FINALIZED -> VOIDED`; balance due `0.0000`; linked receipt `PRC-000004` remained `VOIDED`.
- Journal result: original bill journal `JE-000064`, safe prefix `3fff12bc`, changed `POSTED -> REVERSED`; bill reversal journal `JE-000067`, safe prefix `30f40b4c`, is `POSTED`, reverses `JE-000064`, and is balanced debit/credit `1150.0000` with Dr `210` `1150.0000`, Cr `230` `150.0000`, Cr `240` `1000.0000`.
- Audit result: `PURCHASE_BILL_CREATED`, `PURCHASE_BILL_FINALIZED`, and `PURCHASE_BILL_VOIDED` are present for the bill.
- Side-effect result: non-voided receipts `0`; generated documents `0`; direct bill stock movements `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 24: inventory-clearing purchase bill void evidence verification`.

## Next Thread Prompt

`DEV-08F Part 24: inventory-clearing purchase bill void evidence verification`

## DEV-08F Part 24 - Inventory-Clearing Purchase Bill Void Evidence Verification Completed

- DEV-08F Part 24 read-only bill void verification is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Bill state: `BILL-000009`, safe prefix `04b3f131`, remained `VOIDED`, balance due `0.0000`; linked receipt `PRC-000004`, safe prefix `993adc10`, remained `VOIDED`.
- Journal state: original bill journal `JE-000064`, safe prefix `3fff12bc`, remained `REVERSED`; bill reversal journal `JE-000067`, safe prefix `30f40b4c`, remained `POSTED`, balanced debit/credit `1150.0000`.
- Audit/side-effect result: bill create/finalize/void audits and receipt create/asset-post/asset-reverse/void audits remain present; non-voided receipts, generated documents, and direct bill stock movements remain absent.
- Exact next prompt title: `DEV-08F Part 25: inventory-clearing purchase bill and receipt closure`.

## Next Thread Prompt

`DEV-08F Part 25: inventory-clearing purchase bill and receipt closure`

## DEV-08F Part 25 - Inventory-Clearing Purchase Bill And Receipt Closure Completed

- DEV-08F Part 25 closure is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_RECEIPT_CLOSURE.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_RECEIPT_CLOSURE.md).
- Mutation performed in Part 25: no.
- Closure conclusion: DEV-08F is closed for the local-only inventory-clearing purchase bill plus linked purchase receipt manual asset posting/reversal/void branch.
- Final bill state: `BILL-000009`, safe prefix `04b3f131`, `VOIDED`, `INVENTORY_CLEARING`, balance due `0.0000`; original bill journal `JE-000064`, safe prefix `3fff12bc`, is `REVERSED`; bill reversal journal `JE-000067`, safe prefix `30f40b4c`, is `POSTED`.
- Final receipt state: `PRC-000004`, safe prefix `993adc10`, `VOIDED`; original receipt asset journal `JE-000065`, safe prefix `75a6c7c3`, is `REVERSED`; asset reversal journal `JE-000066`, safe prefix `71495866`, is `POSTED`.
- Final stock movement result: original receipt movement safe prefix `a7708ad8`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `10.0000`, total cost `1000.0000`; void movement safe prefix `426c6ba0`, type `ADJUSTMENT_OUT`, quantity `10.0000`, total cost `1000.0000`.
- Final accounting findings: bill finalization posted Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`; bill void reversed that with Dr `210` `1150.0000`, Cr `230` `150.0000`, Cr `240` `1000.0000`; receipt asset posting posted Dr `130` `1000.0000`, Cr `240` `1000.0000`; asset reversal posted Dr `240` `1000.0000`, Cr `130` `1000.0000`.
- Final audit findings: bill audits include `PURCHASE_BILL_CREATED`, `PURCHASE_BILL_FINALIZED`, and `PURCHASE_BILL_VOIDED`; receipt audits include `PURCHASE_RECEIPT_CREATED`, `PURCHASE_RECEIPT_ASSET_POSTED`, `PURCHASE_RECEIPT_ASSET_REVERSED`, and `PURCHASE_RECEIPT_VOIDED`.
- Forbidden side-effect findings: generated documents, direct bill stock movements, non-voided receipts, source-scoped email, ZATCA, PDF/archive/export/download, login/browser, production, beta, hosted/shared-target, and customer-data side effects remained absent in the DEV-08F evidence.
- Remaining AP gaps: purchase-order receipt matching, standalone receipt accounting, over/under receipt and variance handling, AP PDF/archive/output routes, AP email, authenticated UI/API QA, repeated/idempotency paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08G Part 1: purchase receipt and inventory integration hardening preflight`.

## Next Thread Prompt

`DEV-08G Part 1: purchase receipt and inventory integration hardening preflight`

## DEV-08G Part 1 - Purchase Receipt Inventory Hardening Preflight Completed

- DEV-08G Part 1 preflight is recorded in [docs/development/DEV_08G_PURCHASE_RECEIPT_INVENTORY_HARDENING_PREFLIGHT.md](docs/development/DEV_08G_PURCHASE_RECEIPT_INVENTORY_HARDENING_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `218e445c Close DEV-08F inventory clearing purchase bill evidence`; local `HEAD` matched `origin/main` at `218e445c1daec564d88a3a509710d13a31288c9f`.
- Local-only/no-mutation proof: no database connection, service import, Prisma execution, login/browser flow, fixture creation, purchase order/receipt/stock/journal mutation, output, email, ZATCA, deploy, migration, seed/reset/delete, environment/provider/schema change, production, beta, hosted/shared-target, or customer-data action ran.
- Code paths inspected: purchase receipt create/prepare-lines/remaining-quantity/receiving-status/receipt-matching/accounting-preview/post-asset/reverse-asset/void, purchase receiving status controller, receipt DTOs, purchase order create/approve/mark-sent/convert behavior, stock movement rules, Prisma receipt/order schema, and relevant web purchase receipt/order surfaces.
- Selected DEV-08G sequence: PO source fixture, partial receipt `4.0000`, full receipt `6.0000`, over-receipt blocker, PO-only asset-posting blocker, void `6.0000`, void `4.0000`, standalone receipt `3.0000`, standalone asset-posting blocker, standalone void, closure.
- Selected marker: `DEV08G-AP-20260527T000000`.
- Required exact Part 2 approval phrase: `I approve DEV-08G Part 2 local-only purchase order receipt source fixture mutation under marker DEV08G-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 2: approved local purchase order receipt source fixture mutation`.

## Next Thread Prompt

`DEV-08G Part 2: approved local purchase order receipt source fixture mutation`

## DEV-08G Part 2 - Purchase Order Receipt Source Fixture Completed

- DEV-08G Part 2 local-only mutation evidence is recorded in [docs/development/DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 2 phrase received and checked before mutation.
- Local target proof: Docker Postgres/Redis were local and healthy; `apps/api/.env` classified as `localhost:5432/accounting`; no production, beta, hosted/shared-target, provider, or customer-data target was used.
- Service calls made: `ContactService.create(...)` once, `ItemService.create(...)` once, `PurchaseOrderService.create(...)` once, and `PurchaseOrderService.approve(...)` once. `WarehouseService.create(...)` and `PurchaseOrderService.markSent(...)` were not called.
- Fixture result: supplier safe prefix `f5deec9a`, item safe prefix `3b8d7650`, reused active warehouse safe prefix `197fac56`, and purchase order `PO-000003` safe prefix `a3efc2e4` with final status `APPROVED`.
- PO line result: safe prefix `22f17076`, quantity `10.0000`, unit price `100.0000`, tax rate `15.0000`, total PO amount `1150.0000`.
- Audit result: `Contact:CREATE`, `Item:CREATE`, `PurchaseOrder:PURCHASE_ORDER_CREATED`, and `PurchaseOrder:PURCHASE_ORDER_APPROVED` each occurred once for the fixture.
- Forbidden side-effect result: purchase receipts, purchase bills, stock movements, journal entries, generated documents, email outbox/provider rows, supplier payments, supplier refunds, purchase debit notes, and cash expenses remained `0` for the marker/source.
- Temporary script cleanup result: `apps/api/scripts/dev08g-part2-runner.ts` was removed after execution; no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 3: purchase order receipt source fixture evidence verification`.

## Next Thread Prompt

`DEV-08G Part 3: purchase order receipt source fixture evidence verification`

## DEV-08G Part 3 - Purchase Order Receipt Source Fixture Verification Completed

- DEV-08G Part 3 read-only verification is recorded in [docs/development/DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `ce9e202d Create DEV-08G purchase order receipt source fixture`; local `HEAD` matched `origin/main` at `ce9e202decde601db32e73a2738439c0f1161956`.
- Local target proof: Docker Postgres/Redis were local and healthy; `apps/api/.env` classified as `localhost:5432/accounting`; no production, beta, hosted/shared-target, provider, or customer-data target was used.
- Purchase order state: marker-scoped `PO-000003` safe prefix `a3efc2e4`, status `APPROVED`, converted bill absent, subtotal `1000.0000`, tax total `150.0000`, total `1150.0000`.
- Fixture state: supplier safe prefix `f5deec9a` active `SUPPLIER`; item safe prefix `3b8d7650` `ACTIVE` with inventory tracking; warehouse safe prefix `197fac56` `ACTIVE`; PO line safe prefix `22f17076` quantity `10.0000`, unit price `100.0000`, purchase tax `15.0000`, asset account code `111`.
- Receiving and matching result: receiving `NOT_STARTED`, received quantity `0.0000`, remaining quantity `10.0000`; receipt matching `NOT_RECEIVED` with the expected no-linked-bill warning.
- Forbidden side-effect result: purchase receipts, purchase receipt lines, stock movements, directly tied journals, generated documents, email outbox/provider rows, purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, and ZATCA fixture audit actions all remained `0`.
- Audit result: fixture-scoped audit actions remain limited to `Contact:CREATE`, `Item:CREATE`, `PurchaseOrder:PURCHASE_ORDER_CREATED`, and `PurchaseOrder:PURCHASE_ORDER_APPROVED`.
- Temporary script cleanup result: no `*dev08g*` temporary script remains under `apps/api/scripts`; Part 3 used inline read-only Prisma verification and did not create a script file.
- Exact next prompt title: `DEV-08G Part 4: partial purchase receipt from purchase order preflight`.

## Next Thread Prompt

`DEV-08G Part 4: partial purchase receipt from purchase order preflight`
