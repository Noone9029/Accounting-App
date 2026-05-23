# DEV-05 AR Fixture Creation Preflight

## 1. Purpose And Scope

This document is the approval packet and preflight checklist for the first future local disposable Sales/AR fixture creation run.

This is still non-mutating. It does not enable execute behavior, add a root execute script, create fixture data, connect to a database, login, write audit logs, mutate records, run migrations, run seed/reset/delete, run smoke/E2E, export/download/PDF/archive anything, trigger ZATCA/email/backup/restore, deploy, change environment variables, change provider settings, or research production hosting.

## 2. Current Runner Status

- Latest commit inspected for this packet: `285efa43 Add DEV-05 execute-gated fixture skeleton`.
- Runner path: `apps/api/scripts/dev04-fixture-runner.ts`.
- Runner tests: `apps/api/scripts/dev04-fixture-runner.spec.ts`.
- Safe root commands available:
  - `corepack pnpm fixture:dev04:plan`
  - `corepack pnpm fixture:dev04:dry-run`
  - `corepack pnpm fixture:dev04:cleanup-plan`
- API runner command available:
  - `corepack pnpm --filter @ledgerbyte/api fixture:dev04`
- No root execute script exists.
- `--execute` is modeled only as a refusal skeleton. Even with every modeled approval flag present, it exits nonzero and prints that fixture creation is still disabled.
- Plan, dry-run, cleanup-plan, and execute-refusal output must include `NO DATA CREATED`, `NO DATABASE WRITES`, no login, no audit-writing flow, and no database connection.
- JSON summary evidence is non-mutating and reports flags such as `executeRequested`, `executeEnabled: false`, `executeRefused`, `createdFixtureData: false`, `databaseWritesEnabled: false`, `writesPerformed: false`, and `loginEnabled: false`.

## 3. First Proposed Fixture Target

- Family: `ar`.
- Marker pattern: `DEV03-AR-<runId>`.
- Example marker for this packet: `DEV03-AR-20260524T130000`.
- Data: fake local data only.
- Target: local disposable database only.
- Production, beta, user-testing, Vercel, Supabase hosted, deployed, shared, or customer-data targets remain forbidden.
- First creation scope, if later approved, should start with bootstrap and AR base records only. Draft AR scaffolds require explicit expansion in the future approval prompt.

## 4. Proposed AR Fixture Records

Future fixture records must be marker-bearing and fake. Proposed labels for `DEV03-AR-20260524T130000`:

- Organization: `DEV03-AR-ORG-20260524T130000`.
- User/role/membership: `DEV03-AR-USER-ROLE-20260524T130000`.
- Fixture user email, if later approved: `dev03-ar-20260524T130000@ledgerbyte.local.test`.
- Customer: `DEV03-AR-CUSTOMER-20260524T130000`.
- Service item: `DEV03-AR-SERVICE-20260524T130000`.
- Tax/account dependencies: `DEV03-AR-TAX-ACCOUNT-20260524T130000`.
- Bank/cash dependency, if needed: `DEV03-AR-CASH-20260524T130000`.
- Draft invoice/payment/credit/refund scaffolds, only if later approved: `DEV03-AR-DRAFT-SCAFFOLDS-20260524T130000`.

The first approved run should prefer base setup records. It should not create finalizable or posted AR state-machine records unless the future prompt explicitly expands scope.

## 5. Exact Non-Mutating Preflight Commands

These commands are allowed for preflight. The execute command is a refusal check only; expected result is nonzero refusal before any database connection or write.

```powershell
git status --short
git log -1 --oneline

corepack pnpm --filter @ledgerbyte/api test --runTestsByPath scripts/dev04-fixture-runner.spec.ts

corepack pnpm fixture:dev04:plan -- --family ar --marker DEV03-AR-20260524T130000 --database-url postgresql://fixture:dummy@localhost:5432/ledgerbyte_dev04
corepack pnpm fixture:dev04:dry-run -- --family ar --marker DEV03-AR-20260524T130000
corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000

corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --execute --allow-local-mutation --approve-local-disposable-db --approve-fixture-creation --approve-cleanup-retention --approve-no-production-no-beta --approve-no-customer-data --family ar --marker DEV03-AR-20260524T130000 --database-url postgresql://fixture:dummy@localhost:5432/ledgerbyte_dev04

corepack pnpm verify:diff
git diff --check
git diff --cached --check
```

Passing these commands proves only guard behavior and planning output. It does not approve or perform fixture creation.

## 6. Exact Future Approval Checklist

A future prompt must explicitly confirm every item before any local fixture write can be considered:

- Local disposable DB approval: yes, and target is local-only.
- Production/beta/user-testing/Vercel/Supabase/deployed/shared/customer-data boundary: explicitly no.
- Fixture family: `ar`.
- Fixture marker: exact `DEV03-AR-<runId>` value.
- Fixture creation method: direct Prisma bootstrap, service/API-layer business setup, or staged hybrid.
- Fixture scope: bootstrap/base records only, or explicitly expanded draft AR scaffolds.
- Login approval: yes/no.
- Audit-write evidence approval: yes/no.
- Cleanup/retention approval: marker-scoped cleanup-plan first, retention or later cleanup path defined.
- Output actions approval: no by default.
- Lifecycle transitions approval: no by default.
- Stop conditions acknowledged.

If any item is missing, the runner must remain in plan/dry-run/cleanup-plan or execute-refusal mode only.

## 7. Exact Approval Phrase Required

The later prompt must include this exact phrase before any future local fixture write:

```text
I approve DEV-05 Part 3B local-only AR fixture creation against a disposable local database. No production, no beta, no customer data.
```

The same prompt must also provide the exact marker, fixture family, creation scope, cleanup/retention decision, and whether login/audit-writing is approved.

## 8. What The Future Approved Run May Do

Only after the exact approval phrase and checklist are present, a future run may:

- run the non-mutating preflight commands.
- validate the explicit local target guard.
- use only fake `DEV03-AR-...` local fixture labels.
- create or reuse marker-bearing local bootstrap/base AR records if execute behavior is separately implemented and still passes guards.
- record sanitized evidence such as command names, exit codes, marker, family, local target classification, planned or created fixture counts, and fixture-only status labels.
- run cleanup-plan before and after fixture creation.

## 9. What The Future Approved Run Still Must Not Do

The first AR fixture creation run still must not:

- finalize invoices.
- void invoices.
- allocate payments or credits.
- reverse allocations.
- create customer refunds unless separately approved.
- export or download reports/documents.
- generate PDFs.
- create generated-document archive records.
- send email.
- run ZATCA actions.
- run backup/restore.
- run migrations.
- run seed/reset/delete.
- run smoke or E2E.
- use production, beta, user-testing, deployed, Supabase hosted, Vercel, shared, or customer data.
- login or write audit logs unless the future prompt explicitly approves that evidence path.

## 10. Evidence Policy

Allowed evidence:

- command names and exit codes.
- fixture family, marker, and run id.
- local target classification without full database URLs.
- planned record labels.
- created/reused counts only after fixture creation is explicitly approved.
- sanitized local disposable record ids only if needed.
- future audit action names and counts only after login/audit-write approval.

Forbidden evidence:

- tokens, cookies, authorization headers, passwords, reset/invite tokens, API keys, service-role keys, DB URLs, direct URLs, SMTP credentials, private keys, provider secrets, env var values, or connection strings.
- request or response bodies containing customer, vendor, or accounting data.
- raw audit dumps.
- signed XML, QR payloads, attachment bodies, PDF bodies, CSV bodies, statement files, email bodies, backup artifacts, or generated-document bodies.
- non-fixture customer/vendor/accounting record ids or document numbers.

## 11. Stop Conditions

Stop immediately if any of these occur:

- Target looks production, beta, user-testing, deployed, Vercel, Supabase hosted, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, prod, production, live, shared, or customer-data related.
- Marker is missing, malformed, not uppercase/hyphen safe, secret-looking, destructive-looking, or not `DEV03-AR-...` for family `ar`.
- Any command implies migration, seed, reset, delete, truncate, purge, smoke, E2E, deploy, ZATCA, email, backup, restore, export, download, PDF, archive generation, login, or audit-writing without explicit approval.
- The execute refusal check does not refuse.
- Any database connection or write occurs during preflight.
- Output exposes secrets, DB URLs, tokens, cookies, headers, customer/vendor/accounting bodies, signed XML/QR payloads, attachment bodies, or PDF bodies.

## 12. Recommended Next Step

Proceed to `DEV-05 Part 3B: approved local AR fixture creation run` only if the next prompt includes the exact approval phrase and the full checklist decisions above.

Without that approval, keep all work in plan/dry-run/cleanup-plan or execute-refusal mode.
