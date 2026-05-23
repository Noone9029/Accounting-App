# DEV-04 Final Fixture Runner Handoff

## 1. Purpose And Scope

This handoff finalizes DEV-04 fixture runner planning and dry-run guard work. It records what exists, what was verified, what remains blocked, and what approvals are required before any future local fixture creation.

This is finalization only. It does not approve execute mode, fixture creation, database writes, login, audit-writing flows, runtime mutation, exports, downloads, PDF generation, generated-document archive creation, smoke, E2E, migrations, seed/reset/delete, deployments, environment changes, ZATCA, email, backup/restore, production checks, beta/user-testing checks, or production-hosting research.

## 2. DEV-04 Work Completed

- Part 1 fixture implementation plan: [DEV_04_LOCAL_DISPOSABLE_FIXTURE_PLAN.md](DEV_04_LOCAL_DISPOSABLE_FIXTURE_PLAN.md) defined local-disposable fixture families, safety boundaries, implementation options, cleanup/retention strategy, login/audit strategy, and recommended staged execution.
- Part 2 fixture script design: [DEV_04_FIXTURE_SCRIPT_DESIGN.md](DEV_04_FIXTURE_SCRIPT_DESIGN.md) defined the runner contract, CLI flags, guard model, redaction policy, module layout, test plan, and direct Prisma versus service/API boundary.
- Part 3 dry-run runner skeleton: `apps/api/scripts/dev04-fixture-runner.ts` implemented plan/dry-run/cleanup-plan behavior with no write path, plus package scripts for safe plan-only commands.
- Part 4 guard hardening: `apps/api/scripts/dev04-fixture-runner.spec.ts` expanded guard coverage and the runner output now clearly reports `NO DATA CREATED`, `NO DATABASE WRITES`, disabled execute/fixture/mutation/login flags, and the manual approval required before write behavior.

## DEV-05 Approval Plan Note

DEV-05 Part 1 created [DEV_05_LOCAL_FIXTURE_CREATION_APPROVAL_PLAN.md](DEV_05_LOCAL_FIXTURE_CREATION_APPROVAL_PLAN.md). That plan defines the required local disposable database, fixture creation, login/audit-write, cleanup/retention, and no-production/no-beta approvals before any future fixture creation. It keeps the first proposed target to Sales/AR with `DEV03-AR-...` markers and does not enable execute mode, create fixture data, connect to a database, login, write audit logs, or mutate records.

## DEV-05 Execute-Gated Skeleton Note

DEV-05 Part 2 added [DEV_05_EXECUTE_GATED_FIXTURE_SKELETON.md](DEV_05_EXECUTE_GATED_FIXTURE_SKELETON.md). The runner now contains an execute-gated skeleton for future Sales/AR fixture creation approvals, but it still refuses `--execute`, performs no fixture creation, opens no database connection, performs no database writes, runs no login/audit-writing flow, and executes no runtime mutation.

## 3. Runner Path And Commands

Runner path:

```text
apps/api/scripts/dev04-fixture-runner.ts
```

Test path:

```text
apps/api/scripts/dev04-fixture-runner.spec.ts
```

Safe root commands:

```powershell
corepack pnpm fixture:dev04:plan -- --family ar --marker DEV03-AR-20260524T130000 --database-url postgresql://fixture:dummy@localhost:5432/ledgerbyte_dev04
corepack pnpm fixture:dev04:dry-run -- --family ar --marker DEV03-AR-20260524T130000
corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000
```

API command:

```powershell
corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --plan --family all --marker DEV04-20260524T130000
```

No root execute script exists. `--execute` is parsed only so the runner can refuse it before any database connection or write behavior.

## 4. Guard Summary

- Mode guard: only `--plan`, `--dry-run`, and `--cleanup-plan` are allowed.
- Execute guard: `--execute` and `--allow-local-mutation` fail immediately with a nonzero exit and no fixture creation.
- Login guard: `--allow-login` fails; login remains unimplemented and unapproved.
- Marker guard: markers are required, uppercase/hyphen-only, and must start with `DEV03-` or `DEV04-`. Family-specific `DEV03-...` markers must match the selected family.
- Target guard: explicit database/API targets must use local-looking hosts such as `localhost`, `127.0.0.1`, `host.docker.internal`, `postgres`, or `api`.
- Hosted/deployed guard: obvious Supabase, Vercel, AWS/RDS, Railway, Render, Fly, DigitalOcean, production, prod, and live targets are refused.
- Environment guard: generic `DATABASE_URL` is intentionally ignored by the dry-run runner. Use explicit `--database-url` or `LEDGERBYTE_DEV04_DATABASE_URL` only to validate a local plan target.
- Destructive term guard: destructive or forbidden operation terms such as migrate, seed, reset, delete, truncate, drop, purge, E2E, smoke, deploy, ZATCA, email, backup, and restore are rejected in CLI arguments.
- Redaction guard: secret-looking keys and connection strings are redacted in summaries and errors.
- Cleanup guard: `--cleanup-plan` prints inventory planning only; deletion is not implemented.

## 5. Test Coverage Summary

`apps/api/scripts/dev04-fixture-runner.spec.ts` covers:

- plan/dry-run output for each fixture family.
- all-family plan behavior.
- missing, malformed, secret-looking, destructive, lowercase, and mismatched markers.
- hosted/deployed database and API URL rejection.
- local database/API target acceptance for plan-only classification.
- generic `DATABASE_URL` ignored and dedicated `LEDGERBYTE_DEV04_DATABASE_URL` validated.
- `--execute` refusal.
- cleanup-plan no-delete wording.
- sanitized JSON summary non-mutating flags.
- redaction of database URLs, bearer values, API keys, SMTP passwords, and direct URLs.
- destructive argument rejection.

## 6. Safe Command Examples

Plan all fixture families without any target:

```powershell
corepack pnpm fixture:dev04:plan -- --family all --marker DEV04-20260524T130000
```

Plan one local AR family and validate a local-looking database target without connecting:

```powershell
corepack pnpm fixture:dev04:plan -- --family ar --marker DEV03-AR-20260524T130000 --database-url postgresql://fixture:dummy@localhost:5432/ledgerbyte_dev04
```

Dry-run one family:

```powershell
corepack pnpm fixture:dev04:dry-run -- --family ar --marker DEV03-AR-20260524T130000
```

Print cleanup inventory planning only:

```powershell
corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000
```

Print sanitized JSON summary:

```powershell
corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --dry-run --family bank --marker DEV03-BANK-20260524T130000 --json-summary
```

## 7. Explicit Non-Goals

- No execute mode.
- No fixture creation.
- No database writes.
- No database connection.
- No login or audit-writing flow.
- No production, beta/user-testing, deployed API, hosted database, or customer-data target.
- No migrations, seed/reset/delete, destructive cleanup, smoke, E2E, deploy, ZATCA, email, backup/restore, exports, downloads, PDF generation, or archive generation.
- No real customer, vendor, bank, tax, ZATCA, email, storage, attachment, or document payload data.

## 8. What Was Verified

DEV-04 Part 5 verification ran these non-mutating checks:

- `corepack pnpm --filter @ledgerbyte/api test --runTestsByPath scripts/dev04-fixture-runner.spec.ts`: passed with 34 tests.
- `corepack pnpm fixture:dev04:plan -- --family ar --marker DEV03-AR-20260524T130000 --database-url postgresql://localhost:5432/ledgerbyte_dev04`: exited 0, accepted the local-looking database target as plan-only, printed `NO DATA CREATED`, and printed `NO DATABASE WRITES`.
- `corepack pnpm fixture:dev04:dry-run -- --family ar --marker DEV03-AR-20260524T130000`: exited 0 and printed the same non-mutating boundary.
- `corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000`: exited 0, stated deletion is not implemented, printed `NO DATA CREATED`, and printed `NO DATABASE WRITES`.
- Non-mutating `--execute` refusal check through the API fixture command: exited 1 before any fixture creation and printed that execute mode is not implemented.
- Hosted target refusal check with `https://ledgerbyte-api-test.vercel.app`: exited 1 and refused the hosted/deployed target.
- JSON summary check for `DEV03-BANK-20260524T130000`: exited 0 and reported `createdFixtureData`, `fixtureCreationEnabled`, `mutationEnabled`, `databaseWritesEnabled`, `loginEnabled`, and `executeEnabled` as `false`.
- Redaction coverage is included in the targeted Jest spec for database URLs, bearer values, API keys, SMTP passwords, and direct URLs.

These checks did not require Docker, API/web services, login, database access, fixture creation, production/beta access, or network access beyond normal package command execution.

## 9. What Remains Blocked

- Actual fixture creation remains blocked.
- Execute mode remains blocked and unimplemented.
- Login/audit-writing remains blocked until explicitly approved.
- Any database write, Prisma write, service-layer write, or runtime mutation remains blocked.
- Cleanup execution remains blocked; only cleanup planning exists.
- AR/AP/banking/inventory/JRD state-machine mutation QA remains blocked until fixture creation and login/audit policy are approved.
- Report/export/download/PDF/generated-document archive QA remains blocked until output evidence rules are approved.
- E2E, smoke, migrations, seed/reset/delete, deployments, ZATCA, email, backup/restore, production checks, beta/user-testing checks, and customer-data checks remain blocked.

## 10. Required Approvals Before Future Fixture Creation

Before any future fixture creation or mutation run, a prompt must explicitly approve:

- local disposable database target and how it is identified.
- fixture creation method and selected fixture family.
- login/audit-write behavior if needed.
- cleanup/retention policy and whether records remain as audit evidence.
- explicit no-production/no-beta/no-customer-data boundary.
- exact allowed state transitions and forbidden transitions.
- whether output-producing actions are still blocked or separately approved.

## 11. Recommended Next Development Ticket

After DEV-05 Parts 1 and 2, the next ticket is `DEV-05 Part 3: approve and run local AR fixture creation`.

That ticket must explicitly approve local disposable database use, fixture creation method/family/marker, login/audit behavior if needed, cleanup/retention, and the no-production/no-beta/no-customer-data boundary before any real fixture creation can happen.

## 12. Exact Next Prompt Title

`DEV-05 Part 3: approve and run local AR fixture creation`
