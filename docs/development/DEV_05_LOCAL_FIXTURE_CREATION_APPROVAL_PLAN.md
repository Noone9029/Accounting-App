# DEV-05 Local Fixture Creation Approval Plan

## 1. Purpose And Scope

This document defines the approval-ready plan for the first local disposable fixture creation run after DEV-04 finalized the dry-run-only fixture runner.

This is planning only. It does not enable execute mode, add an execute package script, create fixture data, connect to a database, login, write audit logs, mutate records, run migrations, run seed/reset/delete, run smoke/E2E, export/download/PDF/archive anything, trigger ZATCA/email/backup/restore, deploy, change environment variables, change provider settings, or research production hosting.

## 2. Current Status

- DEV-04 runner is dry-run-only and finalized in [DEV_04_FINAL_FIXTURE_RUNNER_HANDOFF.md](DEV_04_FINAL_FIXTURE_RUNNER_HANDOFF.md).
- Runner path: `apps/api/scripts/dev04-fixture-runner.ts`.
- Runner tests: `apps/api/scripts/dev04-fixture-runner.spec.ts`.
- Safe commands exist:
  - `corepack pnpm fixture:dev04:plan`
  - `corepack pnpm fixture:dev04:dry-run`
  - `corepack pnpm fixture:dev04:cleanup-plan`
  - `corepack pnpm --filter @ledgerbyte/api fixture:dev04`
- No root execute script exists.
- `--execute` is refused before any database connection or write behavior.
- No fixtures have been created.
- No login, audit-writing flow, DB write, DB connection, or runtime mutation has been performed for DEV-05.

## DEV-05 Part 2 Execute-Gated Skeleton Note

DEV-05 Part 2 added [DEV_05_EXECUTE_GATED_FIXTURE_SKELETON.md](DEV_05_EXECUTE_GATED_FIXTURE_SKELETON.md). The runner now models an execute request, approval gates, AR proposed records, and non-mutating JSON evidence, but execute mode still exits refused and no fixture data, database connection, database write, login, audit-writing flow, or runtime mutation is performed.

## DEV-05 Part 3A AR Fixture Preflight Note

DEV-05 Part 3A added [DEV_05_AR_FIXTURE_CREATION_PREFLIGHT.md](DEV_05_AR_FIXTURE_CREATION_PREFLIGHT.md). It packages the exact non-mutating preflight commands, first AR target, required `DEV03-AR-...` marker pattern, approval phrase, evidence policy, and stop conditions for a future Part 3B. It still performs no execute mode, login, fixture creation, database connection/write, or runtime mutation.

## DEV-05 Part 3B AR Fixture Run Note

DEV-05 Part 3B added [DEV_05_AR_FIXTURE_CREATION_RUN.md](DEV_05_AR_FIXTURE_CREATION_RUN.md). The required approval phrase was received and the runner was narrowed to a manually invoked, approved local Sales/AR base-fixture execute path. The first run was blocked because the explicit local PostgreSQL target on `localhost:5432` was not reachable. No fixture records, database writes, login/audit-writing flows, AR lifecycle mutations, or output actions occurred.

## 3. Approval Required Before Fixture Creation

Fixture creation must not start until a future prompt explicitly approves all of these:

1. Local disposable DB approval:
   - names the exact local database target class, such as `localhost`, `127.0.0.1`, `host.docker.internal`, or a local Docker service name.
   - confirms the target is disposable and contains no real customer/vendor/accounting data.
   - confirms the runner must reject production, beta, user-testing, hosted, Supabase, Vercel, RDS, Railway, Render, Fly, DigitalOcean, prod, production, and live targets.

2. Fixture creation approval:
   - names the fixture family to create.
   - names the marker prefix and run id.
   - states whether only bootstrap records or AR draft records are allowed.
   - confirms no lifecycle transitions are allowed unless separately listed.

3. Login/audit-write approval, if needed:
   - states whether login is allowed.
   - names the fake fixture user and fixture organization.
   - defines what audit evidence may be recorded.
   - confirms tokens, cookies, headers, passwords, DB URLs, and request/response bodies must not be logged.

4. Cleanup/retention approval:
   - confirms cleanup-plan runs before creation.
   - states whether records are retained as audit evidence or later cleaned through normal application transitions.
   - confirms raw delete/reset/truncate/purge remains forbidden unless separately approved with exact marker filters.

5. No-production/no-beta boundary approval:
   - explicitly confirms no production target.
   - explicitly confirms no Vercel beta/user-testing target.
   - explicitly confirms no Supabase hosted target.
   - explicitly confirms no shared/customer data.

## 4. Proposed First Fixture Creation Target

Recommended first target: Sales/AR.

Reason:

- DEV-03 final triage lists Sales/AR invoice finalization, customer payment allocation, customer refunds, and credit notes as high-risk ledger workflows.
- DEV-04 recommends one fixture family at a time until cleanup evidence is proven.
- AR has clear fixture markers, existing unit coverage, and a focused path to later approved mutation QA.

Proposed target details:

- Environment: local disposable only.
- Family: `ar`.
- Marker pattern: `DEV03-AR-<YYYYMMDDHHmm>-<shortId>`.
- Example marker for planning: `DEV03-AR-20260524T130000`.
- Data source: fake local data only.
- Scope for first approved creation run: bootstrap plus AR base setup only unless a later prompt explicitly allows draft AR records.
- Real customer/vendor data: forbidden.
- Production/beta/user-testing/deployed targets: forbidden.

## 5. Required Local Pre-Flight Checks

Before any future fixture creation implementation or run, perform these checks in order:

1. `git status --short`
2. `corepack pnpm verify:diff`
3. `corepack pnpm --filter @ledgerbyte/api test --runTestsByPath scripts/dev04-fixture-runner.spec.ts`
4. `corepack pnpm fixture:dev04:plan -- --family ar --marker DEV03-AR-<runId> --database-url postgresql://localhost:5432/<local-disposable-db>`
5. `corepack pnpm fixture:dev04:dry-run -- --family ar --marker DEV03-AR-<runId>`
6. `corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-<runId>`
7. Explicit local DB target guard check through `--database-url` or `LEDGERBYTE_DEV04_DATABASE_URL`

Passing these checks proves only runner guard behavior and planning output. It does not prove that fixture creation is safe, implemented, or approved.

## 6. Data Boundary

Allowed:

- Local disposable database only.
- Local hostnames accepted by the runner guard for planning, such as `localhost`, `127.0.0.1`, `host.docker.internal`, and repo-local Docker service names.
- Fake `.local.test` emails.
- Fake customer names, item names, references, tax labels, bank/cash names, and account names carrying `DEV03-AR-` or `DEV04-` markers.

Forbidden:

- Production databases, APIs, hosts, URLs, credentials, customer data, or provider accounts.
- Vercel beta/user-testing/staging targets.
- Supabase hosted targets.
- RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, prod, production, or live targets.
- Real customers, vendors, banks, invoices, tax identifiers, addresses, phone numbers, emails, statement files, PDFs, attachments, signed XML, QR payloads, or backup artifacts.
- Any unmarked record as a fixture target.

## 7. Proposed Fixture Records For First Approved Run

The first approved run should prefer bootstrap and minimum AR base records. It should not create finalizable or posted state-machine records until the run prompt explicitly allows them.

### Organization

- Name: `DEV03-AR-ORG-<runId>`.
- Legal/display fields: fake local-only values.
- Currency: `SAR`, unless the later prompt approves another local fixture currency.
- Notes/reference fields, where available: include `DEV03-AR-<runId>`.

### User And Role

- User email: `dev03-ar-<runId>@ledgerbyte.local.test`.
- User display name: `DEV03-AR-USER-<runId>`.
- Role: `DEV03-AR-ROLE-<runId>`.
- Permissions: minimum AR setup and later AR QA permissions only, unless owner-equivalent bootstrap is explicitly approved.
- Login: disabled unless separately approved.

### Customer

- Name: `DEV03-AR-CUSTOMER-<runId>`.
- Email/domain: fake `.local.test` only.
- Tax/VAT/CRN fields: fake non-real values only.
- Address/phone: fake values only or omitted where optional.

### Item Or Service

- Service item: `DEV03-AR-SERVICE-<runId>`.
- SKU/reference: `DEV03-AR-SVC-<runId>`.
- Inventory tracking: off for the first AR fixture run unless inventory linkage is separately approved.
- Sales account/tax dependencies: point only at local fixture accounts/tax rates.

### Tax And Account Dependencies

- Accounts receivable: `DEV03-AR-ACCT-AR-<runId>`.
- Revenue: `DEV03-AR-ACCT-REV-<runId>`.
- VAT payable, if needed: `DEV03-AR-ACCT-VAT-<runId>`.
- Bank/cash account dependency, if needed: `DEV03-AR-ACCT-CASH-<runId>`.
- Tax rate, if needed: `DEV03-AR-TAX-<runId>`.
- Every dependency must be in the same fixture organization.

### AR Draft Objects, Only If Later Approval Allows

These should stay out of the first creation run unless the future prompt explicitly expands scope beyond base setup:

- Draft invoice: `DEV03-AR-INV-DRAFT-<runId>`.
- Draft credit note: `DEV03-AR-CN-DRAFT-<runId>`.
- Payment/refund candidates: planned only until mutation approval.

## 8. What Must Still Not Happen In The First Fixture Run

The first fixture run must not:

- finalize invoices.
- void invoices.
- allocate payments or credits.
- reverse allocations.
- create customer refunds.
- void refunds.
- create posted payments.
- create finalized credit notes.
- export or download reports/documents.
- generate PDFs.
- create generated-document archive records.
- send email.
- run ZATCA actions.
- run backup/restore.
- run migrations, seed/reset/delete, smoke, or E2E.
- mutate production, beta, user-testing, Supabase, Vercel, or customer data.

## 9. Cleanup And Retention Plan

- Run `fixture:dev04:cleanup-plan` before any approved creation run.
- Cleanup-plan remains read-only and must not delete records.
- The first creation implementation should produce marker-scoped inventory evidence before and after creation.
- Delete execution remains forbidden.
- Posted/finalized/reversed/voided/generated/audit records must not be raw-deleted casually.
- Audit logs should be retained by default as local disposable evidence once login or mutation is approved.
- Future cleanup automation requires a separate approval, exact marker filters, and proof that no unmarked records are touched.

## 10. Evidence Policy

Allowed evidence:

- command name and exit code.
- fixture family and marker.
- target classification, such as local plan target, without full DB URL.
- created/reused counts for fixture records only after creation is explicitly approved.
- sanitized record ids only when confirmed local disposable.
- status labels and transition names for future mutation QA.
- audit action names and counts for fixture-only records after audit-write approval.

Forbidden evidence:

- tokens, cookies, authorization headers, passwords, reset/invite tokens, API keys, service-role keys, DB URLs, direct URLs, SMTP credentials, private keys, provider secrets, env var values, or connection strings.
- request/response bodies containing customer/vendor/accounting data.
- PDF, CSV, XML, QR, attachment, raw statement, email, backup, or generated-document bodies.
- non-fixture customer/vendor/accounting record ids or document numbers.

## 11. Exact Approval Checklist

A future prompt must explicitly answer every item below before any fixture creation:

- Local disposable DB approved: yes/no.
- Exact local target classification approved: yes/no.
- No production/beta/user-testing/Supabase/Vercel target approved: yes/no.
- Fixture family approved: `ar` only for the first run unless changed explicitly.
- Marker approved: `DEV03-AR-<runId>`.
- Fixture creation method approved: bootstrap direct Prisma, service/API layer, or staged hybrid.
- Login approved: yes/no.
- Audit-write evidence approved: yes/no.
- Fixture records approved: org, user, role, customer, service item, accounts, tax rate, bank/cash dependency, and optionally AR drafts.
- Lifecycle transitions approved: no for the first base fixture run unless explicitly changed.
- Output actions approved: no.
- Cleanup-plan before creation approved: yes/no.
- Retention policy approved: retain marker-bearing records as evidence or define later cleanup path.
- Forbidden commands acknowledged: migrations, seed/reset/delete, smoke, E2E, deploys, env changes, ZATCA, email, backup/restore, exports/downloads/PDF/archive, production-hosting research.

If any item is missing, the next run remains planning or dry-run only.

## 12. Proposed DEV-05 Execution Sequence

1. `DEV-05 Part 1: approved local fixture creation plan`
   - This document.
   - Planning only; no fixture creation.

2. `DEV-05 Part 2: implement execute-gated fixture creation skeleton`
   - Add code structure for a future write path, but keep actual execution disabled unless all guards and explicit approvals are present.
   - Add tests for execute gating, target refusal, no default DB inheritance, marker requirements, no login by default, and no output actions.
   - Do not run actual fixture creation.

3. `DEV-05 Part 3A: local AR fixture creation approval preflight`
   - Create the approval packet and exact preflight checklist for the first AR fixture family.
   - Confirm no root execute script exists and execute remains refused.
   - Do not run actual fixture creation.

4. `DEV-05 Part 3B: approved local AR fixture creation run`
   - Only if explicitly approved in that future prompt.
   - Create the minimum AR fixture family against a confirmed local disposable database.
   - Record sanitized created/reused counts only.

5. `DEV-05 Part 4: verify local fixture evidence`
   - Verify marker-scoped records and audit behavior if approved.
   - Do not execute state-machine transitions unless separately approved.

6. `DEV-05 Part 5: cleanup-plan validation`
   - Validate marker-scoped cleanup inventory.
   - No delete execution unless a later ticket explicitly approves exact marker-filtered cleanup.

## 13. Risks And Blockers

- Execute mode does not exist and must not be enabled without a separate implementation ticket and approval.
- Direct Prisma bootstrap can bypass service validation and audit logs.
- Service/API-layer fixture creation may require authenticated actor context, but login writes audit logs and is not approved by this plan.
- Cleanup is more complex than creation; raw deletion can hide accounting, inventory, reconciliation, document, and audit side effects.
- `all` family execution would be too broad for the first run.
- Output actions can create generated documents and expose financial/customer/vendor data.
- Fiscal periods and posting locks can create hard-to-reverse state and should not be part of the first AR base fixture run.
- Existing demo, smoke, and E2E helpers are mutation-oriented and must not become default fixture commands.

## 14. Recommended Next Step

Proceed with `DEV-05 Part 3B: approved local AR fixture creation run` only if the next prompt includes the exact approval phrase from [DEV_05_AR_FIXTURE_CREATION_PREFLIGHT.md](DEV_05_AR_FIXTURE_CREATION_PREFLIGHT.md) and explicitly approves local disposable database use, fixture creation, marker scope, cleanup/retention, and no-production/no-beta/no-customer-data boundaries.

Without those approvals, keep the runner in plan/dry-run/cleanup-plan or execute-refusal mode only.
