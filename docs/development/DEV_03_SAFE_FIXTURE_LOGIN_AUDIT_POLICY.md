# DEV-03 Safe Fixture Login Audit Policy

## 1. Purpose And Scope

This policy defines how future DEV-03 state-machine QA may use local-only login, fixture records, audit logs, and disposable mutations without touching production, beta/user-testing, shared data, schema, provider settings, or destructive cleanup commands.

This document is planning-only. No login, fixture creation, seed, reset, delete, state-machine mutation, export, download, PDF generation, ZATCA, email, backup/restore, migration, deployment, or environment change was executed for DEV-03 Part 2.

Inputs reviewed:

- [DEV-03 state-machine QA inventory](DEV_03_STATE_MACHINE_QA_INVENTORY.md)
- [DEV-02 final handoff](DEV_02_FINAL_HANDOFF.md)
- [DEV-02 verification gate runbook](DEV_02_VERIFICATION_GATE_RUNBOOK.md)
- [DEV-01 final triage](DEV_01_FINAL_TRIAGE.md)
- [DEV-01 local QA runbook](DEV_01_LOCAL_QA_RUNBOOK.md)
- [Development completion plan](DEVELOPMENT_COMPLETION_PLAN.md)
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/audit-log/audit-log.service.ts`
- `apps/api/src/audit-log/audit-sanitize.ts`
- `tests/e2e/utils/e2e-helpers.ts`
- `tests/e2e/global-setup.ts`
- `apps/api/scripts/seed-demo-workflows.ts`
- `scripts/user-testing-cleanup-plan.cjs`
- `apps/api/prisma/schema.prisma`
- `BUG_AUDIT.md`
- `README.md`

## 2. Safety Rules For DEV-03 Mutation QA

- Default state: no mutation. A future DEV-03 batch must explicitly approve every login and every mutation category before execution.
- Default environment: local disposable only. Do not use production or shared customer data.
- Keep production hosting research paused. AWS remains future production direction only; Vercel remains beta/user-testing/staging only.
- Do not change database schema, migrations, seed data, environment variables, Vercel/Supabase settings, app behavior, accounting logic, ZATCA behavior, email behavior, storage behavior, or production docs.
- Do not run destructive commands such as seed/reset/delete, raw SQL cleanup, Prisma reset, Docker volume removal, or broad file deletion.
- Do not run E2E, smoke, exports, downloads, PDF generation, backup/restore, real email, real ZATCA, live bank feed, or provider mutation unless a later ticket explicitly approves that exact scope.
- Keep every QA action scoped to fake, clearly marked records created for the current batch.
- Treat audit-log writes from approved login/mutation actions as expected evidence, not as incidental noise.

## 3. Approved Environments

### Approved By Default

- Local disposable API/web/Postgres/Redis only, using `localhost`/`127.0.0.1` targets and existing local configuration.
- Transactional or test-harness-created local data when the test itself proves rollback or cleanup scope without destructive reset/delete.
- Existing local health/readiness checks when service startup is explicitly in scope for that future batch.

### Not Approved By Default

- Production: never approved in DEV-03.
- Deployed beta/user-testing/staging: not approved unless a later prompt explicitly names it and permits the exact login/data scope.
- Shared local data that may contain real customer/vendor/accounting records.
- The README seed admin/demo organization for state-changing QA unless the local database is explicitly declared disposable for that run.

### Remote Exception Rule

Remote beta/user-testing may only be considered after a separate approval that names the target, confirms the organization is disposable, confirms credentials come from an approved secret store, and states which mutation categories are allowed. This policy does not grant that approval.

## 4. Login And Audit Policy

### Why Login Writes Audit Logs

`AuthService.login` authenticates by email/password. When the user has an active organization membership, it writes an audit log entry with:

- action: `AUTH_LOGIN`
- entity type: `User`
- entity id: the authenticated user id
- after metadata containing the user email

The E2E helpers also call `/auth/login`, then `/auth/me`, then set `ledgerbyte.accessToken` and `ledgerbyte.activeOrganizationId` in browser `localStorage`. That API login still writes the same login audit event.

### When Login Is Allowed In Future DEV-03 Parts

Login is allowed only when all of these are true:

- The future prompt explicitly approves login/audit-writing for that DEV-03 batch.
- The target is local disposable or separately approved non-production disposable.
- The user is a fake DEV-03 fixture user, not a real staff/customer/tester account.
- The organization is a fake DEV-03 fixture organization.
- The run records only sanitized evidence.
- The batch does not print passwords, tokens, cookies, headers, database URLs, request bodies, or response bodies.

### Audit-Log Labeling And Containment

Because the schema has no dedicated QA run id field, future fixture data must carry a run marker in visible fake fields:

- Run marker format: `DEV03-<part>-<area>-<YYYYMMDDHHmm>-<shortId>`.
- Fixture organization name: `DEV03 Local QA <area> <shortId>`.
- Fixture user email: `dev03.<area>.<shortId>@ledgerbyte.local.test`.
- Fixture records: include the marker in names, display names, descriptions, notes, references, statement descriptions, or document numbers where the domain model allows it.
- Audit evidence should be filtered by the fixture user, organization, entity type, action, timestamp window, and marker-bearing entity data where available.

### Evidence That May Be Recorded

Allowed evidence:

- HTTP method/path and status code.
- Audit action name, entity type, count, and timestamp range.
- Fixture run marker.
- Sanitized entity id only when the record is confirmed disposable and useful for follow-up.
- Before/after status names such as `DRAFT -> FINALIZED`.
- Numeric totals or counts for fake fixtures only.
- Error class and sanitized error message.

Forbidden evidence:

- Access tokens, refresh tokens, cookies, auth headers, API keys, passwords, reset tokens, invite tokens, database URLs, connection strings, direct URLs, SMTP credentials, provider credentials, signed XML, QR payloads, attachment bodies, PDF bodies, request bodies, response bodies containing customer/vendor data, or raw audit metadata dumps.

## 5. Fixture Data Policy

### Allowed Fixture Data

Use only fake local data with explicit markers:

- Organizations: `DEV03 Local QA <area> <shortId>`.
- Users: `dev03.<area>.<shortId>@ledgerbyte.local.test`.
- Customers: `DEV03 Customer <area> <shortId>`.
- Suppliers: `DEV03 Supplier <area> <shortId>`.
- Items: `DEV03 Item <area> <shortId>` with SKU `DEV03-<AREA>-<shortId>`.
- Bank accounts: `DEV03 Bank <area> <shortId>`.
- Warehouses: `DEV03 Warehouse <area> <shortId>`.
- Journal descriptions: include `DEV03 <area> <shortId>`.
- Statement rows: fake dates, fake references, fake counterparties, and marker-bearing descriptions.
- Attachments, if ever approved later: tiny fake text fixtures only; no real document scans, no customer content, no signed XML/QR bodies.

Use fake domains from reserved testing spaces such as `.test` or `.local.test`. Use small, easy-to-audit amounts and current/open local fiscal periods created for the fixture run, not real business dates.

### Required Isolation Markers

Each future mutation batch must define:

- `runId`: timestamp plus short random suffix.
- `area`: `ar`, `ap`, `banking`, `inventory`, `journals`, or `outputs`.
- `owner`: the local fixture user.
- `organization`: the local fixture organization.
- `marker`: `DEV03-<part>-<area>-<runId>`.
- `startedAt` and `finishedAt` timestamps for audit filtering.

### Data That Must Never Be Used As Fixtures

- Real customer, vendor, employee, bank, invoice, tax, ZATCA, email, storage, attachment, or payroll data.
- Production or customer-imported records.
- Beta/user-testing records unless a separate prompt explicitly declares them disposable and approves the run.
- Real bank statements, real PDFs, real attachments, real signed XML, real QR payloads, real tax identifiers, real phone numbers, or real addresses.
- Unmarked records, even in a local database.
- Default seed/demo records as mutation targets unless the entire local database is explicitly disposable for the batch.

## 6. Mutation Policy

### Allowed Future Mutation Categories

Only after explicit batch approval, future DEV-03 parts may mutate local disposable fixture records for:

- Creating fixture organizations, users, roles, contacts, accounts, tax rates, items, warehouses, bank accounts, and fiscal periods needed for the batch.
- Sales/AR: create, edit, finalize, void, allocate, reverse allocation, create refunds, and void refunds.
- Purchases/AP: create, approve, close, convert, finalize, void, allocate, reverse allocation, create refunds, and void refunds.
- Banking/Reconciliation: create local bank accounts, create/void transfers, preview/import fake statement rows, match/categorize/ignore fake statement transactions, submit/approve/reopen/close/void reconciliations.
- Inventory: create/edit/approve/void adjustments, create/void transfers, create/void receipts/issues, preview/post/reverse local inventory asset or COGS entries, create/submit/approve/post/reverse/void variance proposals.
- Journals/Fiscal periods: create/post/reverse manual journals and create/close/reopen/lock fixture fiscal periods.
- Reports/Documents output gates: only if separately approved, generate/export/download fake fixture outputs and verify archive/download permission behavior.

### Forbidden Mutation Categories

Always forbidden by default:

- Any production, shared, or real customer mutation.
- Database migration, schema change, RLS/runtime-role change, raw SQL cleanup, Prisma reset, broad delete, seed, demo reseed, or Docker volume reset.
- Vercel/Supabase setting changes, environment changes, deploys, provisioning, DNS, provider configuration, or production hosting research.
- Real email sends, real ZATCA network calls, CSID, signing, clearance/reporting, PDF/A-3 compliance claims, live bank feeds, payment gateway capture, backup execution, restore execution, object-storage migration execution, or storage-provider mutation.
- Role/team/admin settings mutations outside the specific approved local disposable fixture need.
- Exports/downloads/PDF/archive writes unless the output batch explicitly approves them.

### Approval Needed Before Each Batch

Every future batch prompt must state:

- Environment target.
- Login approval: yes/no.
- Fixture creation approval: yes/no and method.
- Allowed state transitions.
- Forbidden transitions.
- Output approval: yes/no.
- Cleanup evidence required.
- Commands to run and commands to avoid.

If a batch prompt does not explicitly approve login and mutation, treat the batch as dry-run planning or code-review only.

## 7. Cleanup Policy

### What Cleanup Must Prove

Future cleanup evidence must prove:

- Every mutated record belongs to the current `DEV03-...` marker.
- No unmarked records were touched.
- No production or beta/user-testing data was used.
- Audit logs for the run are retained as evidence unless a separate approved retention test is in scope.
- Ledger balances, inventory quantities, and reconciliation statuses are either returned to expected terminal states by normal application reversals/voids or are documented as intentionally mutated disposable fixtures.
- Output artifacts, if approved, contain only fake fixture data.

### Why Seed/Reset/Delete Remain Forbidden By Default

Seed, reset, and delete commands are broad. They can destroy useful local evidence, hide state-machine defects, or accidentally target a non-disposable database. DEV-03 should prove workflows through normal application transitions and targeted assertions, not by erasing the database after each run.

### Safer Future Cleanup Options

Preferred cleanup options for future local-only runs:

- Use transactional API integration tests that roll back automatically.
- Create a fresh disposable local database outside the normal developer database, only when a future prompt explicitly permits setup.
- Use normal application reversals/voids to return fixture workflows to expected terminal states.
- Record marker-filtered counts before and after the run.
- Leave disposable fixture records in place with a documented marker when preserving audit evidence is more valuable than deletion.
- Prepare a reviewed cleanup plan that lists exact marker-filtered records before any future deletion is considered.

## 8. Secrets And Data Exposure Policy

Never print, paste, commit, log, or document:

- Tokens, cookies, bearer headers, auth headers, password values, invite tokens, password reset tokens, API keys, service-role keys, provider secrets, private keys, database URLs, direct URLs, SMTP passwords, connection strings, or env var values.
- Request bodies or response bodies that include customer/vendor data, document numbers from non-fixture records, attachment bodies, PDF bodies, CSV bodies, signed XML, QR payloads, raw bank statement bodies, email bodies, backup payloads, or generated document base64.
- Screenshots or logs showing secrets or real customer/vendor/accounting data.

Allowed reporting format:

- Redacted endpoint path.
- HTTP status.
- Fixture marker.
- Entity type.
- Status transition labels.
- Counts and summaries.
- Sanitized validation error messages.

## 9. Workflow-Specific Fixture Requirements

### Sales/AR

Required local fixtures:

- Fixture organization, owner/user, open fiscal period, base currency.
- Customer with fake VAT/CRN-style data only.
- Revenue, receivable, tax, and bank/cash accounts.
- Active sales tax rate.
- Service item and optionally inventory-tracked product only if stock issue linkage is approved.
- Sales invoice, customer payment, customer refund source, credit note, and allocation targets carrying the run marker.

Batch must prove invoice status, customer balance, payment/credit allocation, void/reversal state, and audit actions without PDF/archive output unless separately approved.

### Purchases/AP

Required local fixtures:

- Supplier with fake data.
- Expense/asset, payable, tax, and bank/cash accounts.
- Active purchase tax rate.
- Service item and optional inventory product if receipt/bill matching is approved.
- Purchase order, purchase bill, supplier payment, supplier refund source, debit note, and cash expense records carrying the run marker.

Batch must prove AP balance, allocation/reversal, purchase order terminal states, bill finalization/voiding, cash-expense reversal, and audit actions without PDF/archive output unless separately approved.

### Banking/Reconciliation

Required local fixtures:

- Bank/cash account profile linked to fixture ledger account.
- Bank transfer source/destination accounts if transfer QA is in scope.
- Tiny fake statement file/text rows with marker-bearing descriptions.
- Statement import, statement transactions, match candidate journal lines, categorization account, and reconciliation window.

Batch must separate parse preview from import. Preview should be treated as expected no-persistence evidence; import/match/categorize/ignore/reconcile require explicit mutation approval.

### Inventory

Required local fixtures:

- Warehouse and active inventory-tracked item with fake SKU.
- Opening quantity created through an approved local fixture path.
- Inventory adjustment, warehouse transfer, purchase receipt, sales stock issue, and variance proposal records carrying the marker.
- Posting accounts for inventory asset, clearing, COGS, and variance if accounting-posting checks are approved.

Batch must prove no-negative-stock behavior, movement creation/reversal, posting preview boundaries, post/reverse idempotency, and audit actions.

### Journals/Fiscal Periods

Required local fixtures:

- Open fiscal period for allowed posting dates.
- Closed and locked fixture periods only if period-lock testing is approved.
- Posting accounts and balanced journal lines.
- Marker-bearing journal descriptions.

Batch must prove direct journal create/post/reverse and cross-workflow period-lock behavior without touching real periods.

### Reports/Documents Output Gates

Required local fixtures:

- Fake ledger records from earlier approved batches or a dedicated output fixture set.
- Output permissions for the fixture user.
- Explicit approval for CSV/PDF/download/archive generation.

Batch must prove permission gating, redaction, generated-document archive metadata, file-type basics, and no production-compliance wording. Do not inspect or record full PDF/CSV bodies.

## 10. Proposed DEV-03 Execution Model

### Part 3: AR State-Machine QA Dry-Run Plan

- No mutations by default.
- Convert the AR inventory into an exact fixture graph, endpoint list, assertions, and rollback/cleanup evidence plan.
- Identify which targeted unit/API tests can run without local login.

### Part 4: AP State-Machine QA Dry-Run Plan

- No mutations by default unless Part 3 policy is explicitly approved and reused.
- Plan purchase order, purchase bill, supplier payment/refund, debit note, and cash expense fixture flows.

### Part 5: Banking/Reconciliation QA Dry-Run Plan

- Plan fake statement files, preview/import boundary assertions, match/categorize/ignore, transfer, and reconciliation lifecycle checks.
- Keep live feeds and automatic matching out of scope.

### Part 6: Inventory QA Dry-Run Plan

- Plan adjustments, warehouse transfers, receipts, issues, and variance proposal workflows.
- Keep automatic inventory accounting expansion, FIFO, landed cost, returns, serial/batch, and production valuation claims out of scope.

### Part 7: Journals/Reports/Documents Output Gate QA Dry-Run Plan

- Plan direct journal and fiscal period checks.
- Plan output/download/archive evidence only if explicitly approved.
- Keep real ZATCA/email/storage/backup out of scope.

### Part 8: Final Triage

- Consolidate dry-run plan decisions, approved executed evidence if any later batches run it, blockers, fixes, and deferred items.
- Separate code defects from missing policy, fixture, browser, and output approvals.

## 11. Required Pre-Flight Checklist Before Future Mutation QA

Before any future mutation QA, confirm all items:

- Latest commit and `git status --short` inspected.
- Target is local disposable or separately approved non-production disposable.
- No unrelated dirty files will be staged or overwritten.
- API/web/database/Redis readiness, if needed, is verified without migrations or seeds.
- Login/audit-writing approval is explicit.
- Fixture creation method is approved.
- Fixture marker and run id are defined.
- Allowed transitions are listed.
- Forbidden transitions are listed.
- Output/download/PDF/archive approval is explicit if needed.
- Secrets and data exposure rules are restated in the batch plan.
- Cleanup/evidence plan is defined before mutation starts.
- Commands to run and commands to skip are listed.
- Stop condition is defined for unexpected real-data, unmarked-data, permission, readiness, or audit anomalies.

## 12. Commands That Remain Forbidden

Do not run by default in DEV-03:

```powershell
corepack pnpm verify:repo
corepack pnpm verify:ci:local
corepack pnpm e2e
corepack pnpm smoke:accounting
corepack pnpm smoke:accounting:banking
corepack pnpm smoke:accounting:tail
corepack pnpm smoke:accounting:ar
corepack pnpm smoke:accounting:ap
corepack pnpm smoke:accounting:documents
corepack pnpm smoke:accounting:reports
corepack pnpm smoke:accounting:zatca-safe
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm demo:seed-workflows
corepack pnpm user-testing:cleanup-plan
```

Also forbidden by default:

- Any Prisma reset, migrate reset, db push, raw SQL delete/truncate/update cleanup, Docker volume reset/removal, deployment command, env-var command, Vercel/Supabase mutation, ZATCA command, email send/retry command, backup/restore command, report export/download/PDF generation command, browser login, or smoke/E2E command.

`corepack pnpm verify:diff`, `git diff --check`, and `git diff --cached --check` remain the default safe verification commands for policy-only docs work.

## 13. Open Questions

- Should DEV-03 use transactional Jest/API integration tests first, before any browser-runtime mutation QA?
- Should a dedicated local `DEV03` fixture bootstrap helper be designed in a later ticket, or should each batch create fixtures through the existing API under test?
- Should future login use API login only, UI login only, or both when browser access is unblocked?
- Should audit-log assertions become a required acceptance criterion for every state-machine mutation?
- Should generated documents and report exports be deferred to a separate DEV-03 output ticket even if AR/AP state-machine batches pass?
- Should a disposable local database naming convention be standardized before any future mutation QA?
- Should cash expense remain in AP Part 4 scope even though it was not in the original minimum list? Recommendation: yes.

## 14. Recommended Next Step

Proceed with `DEV-03 Part 3: AR state-machine QA dry-run plan`.

Part 3 should not execute AR mutations by default. It should convert this policy into a precise AR fixture graph, endpoint plan, assertion matrix, audit evidence checklist, and stop/cleanup rules. Actual AR mutation execution should wait for a later prompt that explicitly approves local disposable login and fixture mutation.
