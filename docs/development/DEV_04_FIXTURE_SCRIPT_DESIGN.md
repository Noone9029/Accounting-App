# DEV-04 Fixture Script Design

## 1. Purpose And Scope

This document designs the local disposable fixture runner for future DEV-03-approved state-machine QA. It converts the DEV-04 Part 1 fixture plan into a concrete runner contract, guard model, command naming proposal, module layout, and test plan.

This was design only when created in DEV-04 Part 2. No fixture runner was created, no package scripts were changed, no login was run, no fixture data was created, and no runtime mutation was executed in that part.

## DEV-04 Part 3 Implementation Note

DEV-04 Part 3 implemented the dry-run skeleton at `apps/api/scripts/dev04-fixture-runner.ts` with non-mutating guard tests in `apps/api/scripts/dev04-fixture-runner.spec.ts`. The root package now exposes `fixture:dev04:plan`, `fixture:dev04:dry-run`, and `fixture:dev04:cleanup-plan`; the API package exposes `fixture:dev04`.

The implementation remains plan-only: `--execute` and `--allow-local-mutation` are refused, login is disabled, no Prisma or service-layer writes are imported, no database connection is opened, no fixture data is created, and production/beta/user-testing targets are rejected by guard logic. A root `fixture:dev04:execute` script was intentionally not added.

## DEV-04 Part 4 Hardening Note

DEV-04 Part 4 hardened the dry-run runner guards, output, and tests without adding execute behavior. The runner now ignores generic `DATABASE_URL` defaults; use explicit `--database-url` or `LEDGERBYTE_DEV04_DATABASE_URL` only when a local target guard check is needed. This avoids accidentally validating a normal application runtime database value during plan-only fixture work.

The runner output now states `NO DATA CREATED`, `NO DATABASE WRITES`, selected mode/family/marker, disabled execute/fixture/mutation/login status, cleanup-plan-only status, and the next manual approval needed before any write behavior can be implemented. JSON summaries include explicit non-mutating flags: fixture creation disabled, mutation disabled, database writes disabled, login disabled, execute disabled, and cleanup-plan-only status.

The guard tests now cover hosted/deployed target variants, local target variants, marker edge cases, generic `DATABASE_URL` isolation, `--execute` refusal, cleanup-plan wording, redaction, and JSON non-mutating flags. No fixture data, login, database connection, Prisma write, service-layer write, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was performed.

## 2. Non-Goals

- Do not implement the runner in this part.
- Do not add package scripts yet.
- Do not create, seed, reset, delete, migrate, or mutate database records.
- Do not login or generate tokens.
- Do not call API routes, smoke scripts, E2E global setup, ZATCA scripts, email scripts, backup/restore scripts, export/download/PDF paths, or deployment tooling.
- Do not change app behavior, service behavior, Prisma schema, migrations, production docs, provider settings, or environment variables.

## 3. Runner Safety Model

The runner should be safe before it is useful. The default path must be planning output only.

- Local only: mutation mode must target local disposable database URLs only.
- Dry-run by default: running the command with no mode must behave like `--plan`.
- Explicit `--execute` required later: write behavior must never happen from `--plan`, `--dry-run`, or omitted mode.
- Local database target required for future execute: future `--execute` must require a parseable PostgreSQL-style `DATABASE_URL` or explicit `--database-url` value whose hostname is local.
- Production/beta/user-testing rejected: reject production, deployed beta/user-testing, hosted database, hosted API, or public URL hostnames.
- No reset/delete by default: no broad reset, truncate, delete, purge, migrate, seed, or volume cleanup behavior belongs in the runner.
- No secrets printed: database URL, passwords, tokens, headers, API keys, private keys, SMTP values, and provider secrets must never be printed.
- No tokens/cookies/headers logged: login remains disabled by default and no future API mode may print auth material.
- No output bodies logged: never print request/response bodies, PDFs, CSV bodies, generated-document base64, attachment content, signed XML, QR payloads, bank statement content, email bodies, or backup payloads.

## 4. Proposed Runner Path And Command Names

Recommended implementation location:

- Runner entry: `apps/api/scripts/dev04-fixture-runner.ts`
- Helper directory: `apps/api/scripts/dev04-fixtures/`
- Tests: `apps/api/scripts/dev04-fixtures/*.spec.ts` or `apps/api/scripts/dev04-fixture-runner.spec.ts`

This belongs in `apps/api` because later phases may need Prisma, application DTOs, permission constants, and service-layer fixture calls. Root scripts can delegate into the API package.

Suggested API package script names:

```json
{
  "fixture:dev04": "tsx scripts/dev04-fixture-runner.ts",
  "test:fixture:dev04": "jest --config jest.config.cjs --runTestsByPath scripts/dev04-fixture-runner.spec.ts"
}
```

Suggested root package script names:

```json
{
  "fixture:dev04:plan": "corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --plan",
  "fixture:dev04:dry-run": "corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --dry-run",
  "fixture:dev04:execute": "corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --execute --allow-local-mutation",
  "fixture:dev04:cleanup-plan": "corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --cleanup-plan --dry-run"
}
```

Suggested dry-run command:

```powershell
corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --dry-run --family ar --marker DEV03-AR-20260524T120000
```

Suggested future execute command, not approved yet:

```powershell
corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --execute --allow-local-mutation --family ar --marker DEV03-AR-20260524T120000
```

Suggested future cleanup-plan command:

```powershell
corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --cleanup-plan --dry-run --family ar --marker DEV03-AR-20260524T120000
```

Part 3 should implement only the dry-run skeleton and tests, not the future execute path.

## 5. CLI Interface Design

| Flag | Required | Default | Meaning |
| --- | --- | --- | --- |
| `--plan` | No | Enabled when no mode is supplied | Print planned actions and guard decisions; no database connection required unless a database URL is provided. |
| `--dry-run` | No | Same as `--plan` | Validate inputs and print the same no-write action plan. |
| `--execute` | No | Disabled | Future write mode. Must be blocked unless `--allow-local-mutation` is also present and all guards pass. |
| `--cleanup-plan` | No | Disabled | Print marker-scoped cleanup inventory plan only; no deletion execution. |
| `--family ar\|ap\|bank\|inv\|jrd\|all` | No | `all` | Select fixture family or all planned families. |
| `--marker DEV03-...` | Yes for family plans | None | Explicit marker for fixture names and evidence. Must match selected family unless using `all`. |
| `--run-id <id>` | No | Derived from marker or current timestamp in plan mode | Stable suffix for names. Must be printable and non-secret. |
| `--database-url <url>` | No | `DATABASE_URL` when needed | Future execute target. Must be redacted in logs. |
| `--allow-local-mutation` | Future execute only | Disabled | Explicit approval flag required with `--execute`. |
| `--no-login` | No | Enabled | Makes login disabled and visible in summary. |
| `--allow-login` | Future only | Disabled | Possible future explicit approval flag; must stay rejected until a later prompt approves login. |
| `--json-summary` | No | Disabled | Print a sanitized machine-readable summary with no secrets or payload bodies. |
| `--help` | No | Disabled | Print usage and safety exclusions. |

Mode rules:

- No mode equals `--plan`.
- `--plan` and `--dry-run` are aliases.
- `--execute` must conflict with `--plan`, `--dry-run`, and `--cleanup-plan`.
- `--execute` without `--allow-local-mutation` must fail before any database connection.
- `--allow-login` should fail in Part 3 because login remains explicitly unimplemented and unapproved.
- `--cleanup-plan` must never delete records; it only describes marker-scoped inventory queries for a later implementation.

## 6. Guard Design

### Environment Guard

- Allow planning in any environment because it does not connect or write.
- For future execute, require a local development/test context. Reject `NODE_ENV=production`.
- Reject CI execute unless a later ticket explicitly designs disposable service containers.
- Print only `targetKind`, such as `local-database`, `plan-only`, or `rejected-hosted-target`; do not print env var values.

### Database URL Guard

- Parse `DATABASE_URL` or `--database-url` with `URL`.
- Accept only PostgreSQL-style protocols such as `postgresql:` and `postgres:`.
- Accept only local hosts: `localhost`, `127.0.0.1`, `::1`, and optionally Docker-local aliases explicitly listed in code later.
- Reject empty database names in execute mode.
- Reject query strings that imply remote poolers or provider-specific endpoints when hostname is not local.
- Never print the URL. Redacted output should look like `postgresql://<redacted>@localhost:<port>/<database>`.

### Marker Guard

- Required prefixes:
  - `ar`: `DEV03-AR-`
  - `ap`: `DEV03-AP-`
  - `bank`: `DEV03-BANK-`
  - `inv`: `DEV03-INV-`
  - `jrd`: `DEV03-JRD-`
  - bootstrap/infrastructure records: `DEV04-`
- For `--family all`, either require an umbrella `DEV04-...` marker plus generated family markers, or require explicit family markers in a future config file. Do not invent unmarked names.
- Reject markers containing whitespace, URL-like text, path separators, quotes, shell metacharacters, or secret-looking fragments.
- Require a date/time or run-id suffix for execute mode.

### Production/Beta Hostname Denylist

Reject hostnames or rendered targets containing:

- `ledgerbyte-api-test`
- `ledgerbyte-web-test`
- `vercel.app`
- `supabase.co`
- `amazonaws.com`
- `rds.amazonaws.com`
- `neon.tech`
- `render.com`
- `fly.dev`
- `railway.app`
- `digitalocean.com`
- `azure.com`
- `prod`
- `production`

The denylist is not the only guard; local-host allowlisting must still be the primary execute guard.

### Destructive Command Denylist

The runner should never spawn commands containing:

- `migrate`
- `db:seed`
- `demo:seed-workflows`
- `seed`
- `reset`
- `delete`
- `truncate`
- `drop`
- `purge`
- `docker volume`
- `prisma migrate`
- `prisma db push`

Part 3 should not spawn any child commands except perhaps test-only self-inspection. Future versions should prefer in-process planning and service calls over shell command composition.

### Logging And Redaction Guard

- Redact keys containing `password`, `token`, `secret`, `key`, `authorization`, `cookie`, `database`, `direct_url`, `smtp`, `private`, `csr`, `certificate`, `base64`, `content`, `xml`, `qr`, `attachment`, `pdf`, `csv`, and `body`.
- Summaries may include family, marker, mode, target classification, planned record types, planned counts, and created/reused counts after a future approved run.
- No stack traces should include env values; normalize known error messages before printing.

### Confirmation/Approval Guard

Future execute must require all of:

- `--execute`
- `--allow-local-mutation`
- local database URL guard passes
- marker guard passes
- selected family is explicit
- login stays disabled unless a future approved prompt implements and enables an explicit login flag

Do not use interactive prompts. The runner must fail fast and be scriptable.

## 7. Fixture Architecture

### Base Bootstrap Layer

Purpose: plan or create the minimal tenant/user/permission foundation for later local QA.

Responsibilities:

- Fixture organization plan.
- Fixture user plan.
- Role and permission plan.
- Active membership plan.
- Foundation records such as document settings, number sequences, minimal account/tax setup, and optional fiscal period plan.

Default mode: plan only.

Future write path: guarded direct Prisma may be allowed for bootstrap only after explicit approval.

### Business Fixture Layer

Purpose: plan family-specific records that exercise workflow services later.

Responsibilities:

- AR: customer, service item, invoice, payment, refund, credit note plan.
- AP: supplier, purchase order, bill, payment, refund, debit note, cash expense plan.
- Banking: bank profiles, transfer, statement import rows, transaction, reconciliation plan.
- Inventory: item, warehouses, opening stock, adjustment, transfer, receipt, issue, variance plan.
- JRD: accounts, taxes, journals, fiscal periods, report filters, generated-document/output gate plan.

Future write path: use service/API-layer calls where business validation, state transitions, balances, journals, stock movements, and audit behavior matter.

### Cleanup-Plan Layer

Purpose: produce marker-scoped cleanup inventory before any actual cleanup implementation.

Responsibilities:

- Count planned marker-bearing records by family and model.
- Separate safe draft records from posted/finalized/voided/reversed/archived/generated/audit records.
- Identify terminal-state records that should be retained as audit evidence.
- Explicitly state that deletion is not implemented.

### Summary/Evidence Layer

Purpose: print sanitized, repeatable output for docs and future QA logs.

Allowed summary fields:

- mode
- family
- marker
- runId
- target classification
- login enabled/disabled
- mutation enabled/disabled
- planned record groups
- planned counts
- guard results
- skipped forbidden areas
- created/reused counts only in a future approved execute mode

Forbidden summary fields:

- full URLs with credentials
- env values
- passwords
- tokens
- headers
- request/response bodies
- generated documents
- PDF/CSV/XML/QR/attachment bodies
- real customer/vendor/accounting payloads

## 8. Direct Prisma Vs Service/API Layer Decision

### Direct Prisma Allowed Later Only For Bootstrap

Direct Prisma may be acceptable after future approval for:

- Fixture organization.
- Fixture user with fake `.local.test` email.
- Role definitions and permissions copied from known defaults.
- Active membership.
- Organization document settings.
- Minimal number sequences if needed for record creation.
- Base chart/account/tax records only if service-level setup is unavailable or unsuitable for bootstrap.

Reason: these records are prerequisites for authenticated service/API behavior and are not themselves workflow state-machine assertions. They still need marker guards, local DB guards, and redacted evidence.

### Service/API Layer Required Later For Business Records

Use service/API-layer behavior for:

- Sales invoices, customer payments, refunds, credit notes.
- Purchase orders, bills, supplier payments/refunds, debit notes, cash expenses.
- Bank profiles, bank transfers, statement imports, statement transactions, reconciliations.
- Inventory adjustments, movements, transfers, receipts, stock issues, variance proposals.
- Manual journals, fiscal periods, report/PDF/generated-document output gates, audit retention, and settings mutations.

Reason: these workflows depend on validations, status transitions, balance updates, journals, fiscal-period guards, inventory movements, idempotency, permission assumptions, and audit logs. Direct inserts would bypass the behavior DEV-03 is trying to validate.

## 9. Fixture Families

| CLI family | Marker prefix | Scope |
| --- | --- | --- |
| `ar` | `DEV03-AR-` | Sales invoices, customer payments, refunds, credit notes, AR output labels. |
| `ap` | `DEV03-AP-` | Purchase orders, purchase bills, supplier payments/refunds, debit notes, cash expenses, AP output labels. |
| `bank` | `DEV03-BANK-` | Bank account profiles, bank transfers, statement import rows, statement transactions, reconciliations, report labels. |
| `inv` | `DEV03-INV-` | Items, warehouses, opening stock, adjustments, transfers, receipts, sales issues, variance proposals, inventory reports. |
| `jrd` | `DEV03-JRD-` | Journals, fiscal periods, accounts, taxes, reports, generated documents, audit, storage/document readiness output gates. |
| `all` | family-specific prefixes required | Prints all family plans. Future execute should probably require one family at a time until cleanup evidence is proven. |

## 10. Proposed Module/File Layout

```text
apps/api/scripts/dev04-fixture-runner.ts
apps/api/scripts/dev04-fixtures/cli.ts
apps/api/scripts/dev04-fixtures/guards.ts
apps/api/scripts/dev04-fixtures/markers.ts
apps/api/scripts/dev04-fixtures/redaction.ts
apps/api/scripts/dev04-fixtures/summary.ts
apps/api/scripts/dev04-fixtures/bootstrap-plan.ts
apps/api/scripts/dev04-fixtures/cleanup-plan.ts
apps/api/scripts/dev04-fixtures/families/ar.ts
apps/api/scripts/dev04-fixtures/families/ap.ts
apps/api/scripts/dev04-fixtures/families/bank.ts
apps/api/scripts/dev04-fixtures/families/inv.ts
apps/api/scripts/dev04-fixtures/families/jrd.ts
apps/api/scripts/dev04-fixture-runner.spec.ts
```

Part 3 can keep this smaller if needed:

- one runner file
- one guard helper
- one test file

The design should still reserve the module boundaries above so the later implementation can grow without mixing business fixture plans into CLI parsing or guard code.

## 11. Proposed Tests For Part 3 Implementation

Part 3 should add non-mutating tests only.

Required tests:

- Guard rejects production, beta, and hosted URLs.
- Guard accepts local PostgreSQL-style URLs and redacts them in output.
- Dry-run prints plan only and never calls write functions.
- `--execute` fails without `--allow-local-mutation`.
- `--execute --allow-local-mutation` still fails in Part 3 because write mode is not implemented.
- Marker validation accepts correct family prefixes and rejects mismatched prefixes.
- Family selection supports `ar`, `ap`, `bank`, `inv`, `jrd`, and `all`.
- Redaction removes secret-looking fields from JSON summaries.
- Destructive command denylist rejects seed/reset/delete/migrate/smoke/E2E/deploy/ZATCA/email/backup/restore terms.
- `--no-login` is the default and any `--allow-login` flag fails until a later approved implementation.
- `--json-summary` contains no URLs with credentials, tokens, cookies, headers, payload bodies, or env values.

Suggested test command after implementation:

```powershell
corepack pnpm --filter @ledgerbyte/api test -- dev04-fixture-runner
```

If the runner is implemented as a pure Node/CJS root helper instead, use `node --test`. The preferred API-package location makes Jest more consistent with existing API tooling.

## 12. Data Evidence Policy

Can be logged:

- selected mode
- selected family
- marker and run id
- target classification, not target secret
- local hostname only, if needed
- planned entity group names
- planned counts
- guard pass/fail names
- created/reused counts after a future approved execute run
- sanitized entity ids only for confirmed disposable local records
- sanitized status transitions such as `DRAFT -> FINALIZED`

Must not be logged:

- database URLs
- direct URLs
- passwords
- tokens
- cookies
- authorization headers
- API keys
- provider secrets
- private keys
- request or response bodies
- customer/vendor/accounting payloads from non-fixture records
- attachment bodies
- PDF/CSV/XML/QR bodies
- raw bank statement content
- email bodies
- backup payloads

## 13. Cleanup Policy Design

Part 3 should implement cleanup planning only, if any cleanup surface is added.

Cleanup plan rules:

- Identify records by marker prefix only.
- Print model/table groups and counts only.
- Separate draft/setup records from posted/finalized/reversed/voided/archived/generated-document/audit records.
- State that deletion execution is not implemented.
- State that audit logs are retained by default.
- Do not download document, attachment, PDF, CSV, statement, or generated-document bodies.
- Do not call delete, purge, truncate, reset, or migration commands.

Deletion or destructive cleanup remains forbidden until a separate future prompt explicitly approves exact marker-filtered deletion behavior.

## 14. Implementation Sequence

1. `DEV-04 Part 3: implement fixture runner dry-run skeleton`
   - Add runner skeleton, CLI parser, guard helpers, marker helpers, redaction, family plan output, JSON summary, and non-mutating tests.
   - Add package scripts only for dry-run/plan and tests.
   - Keep execute mode present but blocked.

2. `DEV-04 Part 4: harden fixture runner guards and docs`
   - Expand tests for target guards, denylist, marker-family matching, redaction, cleanup-plan output, and JSON non-mutating flags.
   - Clarify runner output and docs while keeping execute mode and fixture creation disabled.

3. `DEV-04 Part 5: approved local fixture creation run`
   - Only after explicit user approval, implement and run local bootstrap/fixture creation against a confirmed disposable local database.
   - Record created/reused counts and audit boundaries.

4. Later approved mutation QA
   - Run AR first, then AP, banking/reconciliation, inventory, and JRD output gates only with explicit login/mutation/output approvals.

## 15. Risks And Blockers

- Service-layer construction may be difficult outside Nest dependency injection; Part 3 should not solve this yet.
- Direct Prisma bootstrap can bypass audit logs, so its boundary must stay small and explicit.
- Login writes audit logs and remains blocked until a later prompt approves it.
- Existing E2E and demo workflow helpers create records and should not become default fixture commands.
- Marker-based cleanup is only as reliable as the fields that accept markers; some models may need indirect marker association through organization or source records.
- `all` family execution could create too much blast radius; execute should prefer one family at a time until cleanup evidence is proven.
- Output-gate fixture work can create generated-document records and expose document bodies; keep it separate from initial runner execution.
- Fiscal period lock fixtures may be irreversible through normal app workflows and need special retention treatment.

## 16. Open Questions

- Should Part 3 implement the runner entirely in TypeScript under `apps/api/scripts`, or start with a smaller root CJS guard-only runner and move to API TypeScript later?
- Should the future execute mode require a user-provided run id rather than deriving one automatically?
- Should `--family all` remain plan-only forever, with execute mode requiring one family per run?
- Should direct Prisma bootstrap create audit logs for setup records, or should audit logging begin only once service/API-layer business creation is approved?
- Should future service/API fixture creation call Nest providers directly or run against a local API over HTTP with an approved login/session?
- Should cleanup inventory be required before execute mode can run?

## 17. Recommended Next Step

Proceed with `DEV-04 Part 3: implement fixture runner dry-run skeleton`.

Part 3 should implement only non-mutating runner scaffolding: CLI parsing, dry-run output, family plan output, local target guards, marker validation, redaction, blocked execute mode, blocked login mode, JSON summary, and guard tests. It should not create fixture data, login, call business services, or mutate records.
