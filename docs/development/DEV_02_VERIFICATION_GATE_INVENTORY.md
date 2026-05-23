# DEV-02 Verification Gate Inventory

Status: Part 1 inventory completed on 2026-05-23.
Source state inspected: `f1ce45b Finalize DEV-01 route QA triage`.

## Scope

DEV-02 Part 1 inventories existing verification commands only. It does not change app behavior, production docs, infrastructure, provider settings, environment variables, schema, migrations, seed data, customer data, accounting records, ZATCA, email, storage, roles, settings, or deployed targets.

Production hosting research remains paused. AWS stays a future production direction only. Vercel stays beta/user-testing/staging only.

## Current Verification Landscape

- The repository has a pnpm workspace gate surface at the root plus package-specific scripts for `apps/api`, `apps/web`, and packages under `packages/*`.
- Typecheck and build scripts are broad and non-data-mutating, but can be slower because they traverse multiple packages.
- API Jest coverage is broad: 87 committed API `.spec.ts` files were found under `apps/api`.
- Web Jest coverage is broad for helper/component/page tests: 52 committed web `.test.ts`/`.test.tsx` files were found under `apps/web/src`.
- `packages/zatca-core` has real Node test coverage. `packages/accounting-core`, `packages/pdf-core`, `packages/shared`, and `packages/ui` expose placeholder `test` scripts or route package tests through API coverage.
- Playwright E2E exists under `tests/e2e`; it requires API/web availability and credentials, and local runs seed workflow data by default.
- Playwright visual regression exists under `tests/visual`; it starts a local web server on `127.0.0.1:3030` and uses mocked API fixtures.
- API smoke scripts are deep and valuable, but they log in and create/update/void/read/export/download test records. They are not safe default gates unless the target is disposable local/test data and the run is explicitly allowed.
- One GitHub Actions workflow exists: `.github/workflows/deployed-e2e.yml`. It is manual dispatch only and targets the beta/user-testing Vercel URLs by default.
- No dedicated markdown link checker, docs linter, or PR CI gate was found.

## Typecheck Commands

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm typecheck` | Root workspace | Runs recursive package `typecheck` scripts where present. | No | No | Yes | Yes | Good default candidate; can be slower than targeted filters. |
| `corepack pnpm --filter @ledgerbyte/api typecheck` | `apps/api` | API TypeScript compile check. | No | No | Yes | Yes | Same command as API `lint`; safe targeted backend gate. |
| `corepack pnpm --filter @ledgerbyte/web typecheck` | `apps/web` | Web TypeScript compile check. | No | No | Yes | Yes | Same command as web `lint`; safe targeted frontend gate. |
| `corepack pnpm --filter @ledgerbyte/accounting-core typecheck` | `packages/accounting-core` | Accounting package TypeScript compile check. | No | No | Yes | Yes | Package test coverage is via API tests. |
| `corepack pnpm --filter @ledgerbyte/pdf-core typecheck` | `packages/pdf-core` | PDF package TypeScript compile check. | No | No | Yes | Yes | Package test coverage is via API tests. |
| `corepack pnpm --filter @ledgerbyte/shared typecheck` | `packages/shared` | Shared package TypeScript compile check. | No | No | Yes | Yes | Shared package has no real test script yet. |
| `corepack pnpm --filter @ledgerbyte/ui typecheck` | `packages/ui` | UI package TypeScript compile check. | No | No | Yes | Yes | UI package is minimal and has no real tests yet. |
| `corepack pnpm --filter @ledgerbyte/zatca-core typecheck` | `packages/zatca-core` | ZATCA core TypeScript compile check. | No | No | Yes | Yes | Safe code gate; does not run ZATCA network calls. |

## Unit And Component Test Commands

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm test` | Root workspace | Runs recursive package tests where present. | No expected live services | No expected data mutation | Yes | Yes | Includes API Jest, web Jest, ZATCA package tests, plus placeholder package tests. |
| `corepack pnpm --filter @ledgerbyte/api test` | `apps/api` | API Jest controller/service/rules/PDF/ZATCA/storage/email tests. | No expected live DB | No | Yes | Yes | Broad backend unit gate. Some tests mock Prisma/services; not a smoke replacement. |
| `corepack pnpm --filter @ledgerbyte/web test` | `apps/web` | Web Jest helper/component/page tests in jsdom. | No | No | Yes | Yes | Broad frontend unit/component gate. |
| `corepack pnpm --filter @ledgerbyte/web test -- <pattern>` | `apps/web` | Targeted web Jest subset by filename/test regex. | No | No | Yes | Yes | Best fast gate after small frontend changes. |
| `corepack pnpm --filter @ledgerbyte/zatca-core test` | `packages/zatca-core` | Node tests for ZATCA core mapping/checklist behavior. | No | No | Yes | Yes | Safe package test; does not call ZATCA services. |
| `corepack pnpm test:user-testing-cleanup-plan` | Root script | Node tests for the read-only user-testing cleanup planner. | No | No | Yes | Yes | Safe harness test. The actual cleanup-plan command logs in and should not be a default gate. |
| `node --test scripts/test-credential-env.test.cjs` | Root direct script | Tests deployed-vs-local credential guard behavior. | No | No | Yes | Yes | Existing test file has no package script wrapper yet. |

## API Test And Smoke Commands

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm --filter @ledgerbyte/api test -- smoke-http` | `apps/api` | Smoke request timeout/progress label redaction helpers. | No | No | Yes | Yes | Good targeted harness check. |
| `corepack pnpm --filter @ledgerbyte/api test -- smoke-phases` | `apps/api` | Smoke phase script wiring and redaction guardrails. | No | No | Yes | Yes | Good targeted harness check. |
| `corepack pnpm smoke:accounting` | Root/API | Full accounting API smoke against a live API. | API, DB; usually Docker locally | Yes | Only on disposable local/test data | Only with disposable test target | Creates clearly named smoke records, finalizes/voids/posts/downloads/exports in smoke scope. Not a default gate yet. |
| `corepack pnpm smoke:accounting:banking` | Root/API | Focused banking API smoke slice. | API, DB | Yes | Only on disposable local/test data | Manual only | Includes bank transfer/statement/reconciliation-style operations. |
| `corepack pnpm smoke:accounting:tail` | Root/API | Aggregate late smoke phases. | API, DB | Yes | Only on disposable local/test data | Manual only | Historically too broad for deployed ceilings; split phases are safer. |
| `corepack pnpm smoke:accounting:ar` | Root/API | Narrow AR tail phase. | API, DB | Yes | Only on disposable local/test data | Manual only | Creates AR smoke records; safer than full smoke but still mutating. |
| `corepack pnpm smoke:accounting:ap` | Root/API | Narrow AP tail phase. | API, DB | Yes | Only on disposable local/test data | Manual only | Creates AP smoke records; still mutating. |
| `corepack pnpm smoke:accounting:documents` | Root/API | Generated document/archive/storage readiness smoke. | API, DB | Yes | Only on disposable local/test data | Manual only | May download/generated-document/archive-check smoke artifacts. |
| `corepack pnpm smoke:accounting:reports` | Root/API | Reports/dashboard/report-output API smoke. | API, DB | Yes | Only on disposable local/test data | Manual only | Can exercise CSV/PDF availability; not safe for default gates. |
| `corepack pnpm smoke:accounting:zatca-safe` | Root/API | No-network ZATCA-safe smoke phase. | API, DB | Yes | Only on disposable local/test data | Manual only | Must keep real ZATCA disabled; do not run in DEV-02 Part 1. |

## Web Test Commands

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm --filter @ledgerbyte/web test` | `apps/web` | jsdom web helper/component/page tests. | No | No | Yes | Yes | Good fast frontend gate. |
| `corepack pnpm --filter @ledgerbyte/web test -- permissions sidebar` | `apps/web` | Permission/sidebar targeted tests. | No | No | Yes | Yes | Useful after navigation/permission changes. |
| `corepack pnpm --filter @ledgerbyte/web test -- reports` | `apps/web` | Report page/helper tests by pattern. | No | No | Yes | Yes | Pattern should be selected by changed files. |
| `corepack pnpm --filter @ledgerbyte/web test -- storage email` | `apps/web` | Storage/email readiness UI helper tests by pattern. | No | No | Yes | Yes | Useful for admin-readiness UI changes. |

## Package Test Commands

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm --filter @ledgerbyte/accounting-core test` | `packages/accounting-core` | Placeholder script only. | No | No | Low value | Low value | Prints that accounting core tests run from `apps/api`. |
| `corepack pnpm --filter @ledgerbyte/pdf-core test` | `packages/pdf-core` | Placeholder script only. | No | No | Low value | Low value | Prints that PDF renderer tests run from `apps/api`. |
| `corepack pnpm --filter @ledgerbyte/shared test` | `packages/shared` | Placeholder script only. | No | No | Low value | Low value | Prints `No shared tests yet`. |
| `corepack pnpm --filter @ledgerbyte/ui test` | `packages/ui` | Placeholder script only. | No | No | Low value | Low value | Prints `No UI package tests yet`. |
| `corepack pnpm --filter @ledgerbyte/zatca-core test` | `packages/zatca-core` | ZATCA core unit tests. | No | No | Yes | Yes | Real package test coverage exists here. |

## Smoke And Local QA Commands

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docker compose -f infra/docker-compose.yml up -d postgres redis` | Local infra | Starts local Postgres and Redis dependencies. | Docker | Starts containers | Only when explicitly allowed | CI only with service policy | Startup command, not a verification gate. Do not run in docs-only gate inventory threads. |
| `corepack pnpm --filter @ledgerbyte/api dev` | `apps/api` | Starts local API on port 4000. | DB for readiness | Starts process | Yes when local QA allowed | No default CI | Startup command; no data mutation by itself. |
| `corepack pnpm --filter @ledgerbyte/web dev` | `apps/web` | Starts local web on port 3000. | No | Starts process | Yes when local QA allowed | No default CI | Startup command; no data mutation by itself. |
| `Invoke-WebRequest http://localhost:4000/health` | Local API | API liveness. | API process | No | Yes | Yes with service target | Lightweight, no DB check. |
| `Invoke-WebRequest http://localhost:4000/readiness` | Local API | API database readiness via `SELECT 1`. | API and DB | No | Yes | Yes with service target | Read-only DB check; failure should block authenticated/data-backed QA claims. |
| `Invoke-WebRequest http://localhost:3000/login` | Local web | Public web route shell availability. | Web process | No | Yes | Yes with service target | Does not prove auth or app-shell runtime behavior. |
| `Invoke-WebRequest http://localhost:3000/dashboard` | Local web | App route shell serving. | Web process | No | Yes | Yes with service target | Shell-only; no browser/session proof. |
| `corepack pnpm demo:seed-workflows` | Root/API | Seeds validated demo workflow records through API. | API, DB | Yes | Only when explicitly allowed | No default CI | Refuses remote unless opt-in; still a seed/mutation command. |
| `corepack pnpm user-testing:cleanup-plan` | Root script | Read-only count plan for user-testing cleanup. | API and credentials | Login may write audit log | Manual only | Manual only | No deletion, but not a default gate because it logs in and targets user-testing data. |

## Playwright And E2E Commands

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm e2e` | Root Playwright | Browser smoke for auth/navigation, sales, purchases, banking, reports, inventory, attachments, permissions, email/auth, ZATCA, storage. | Web, API, DB; usually Docker locally | Yes locally by default through workflow seeding and login audit | Only on disposable local/test data | Manual/non-production only today | `global-setup` seeds demo workflows for local API targets unless `LEDGERBYTE_E2E_SEED_WORKFLOWS=false`. |
| `corepack pnpm e2e:headed` | Root Playwright | Same E2E suite in headed browser mode. | Web, API, DB | Yes locally by default | Manual only | No default CI | Useful debugging command, not a gate. |
| `LEDGERBYTE_E2E_SEED_WORKFLOWS=false corepack pnpm e2e` | Root Playwright | Browser smoke without automatic workflow seeding. | Web, API, DB, existing fixtures | Login audit still likely | Safer if fixture data exists | Manual/non-production only | Needs credential and fixture policy before becoming a gate. |
| `node scripts/check-deployed-e2e-env.cjs` | Root script | Deployed web/API root, `/health`, `/readiness`, and credential presence. | Deployed web/API | No app data mutation | N/A for local | Yes for manual deployed workflow | GET-only preflight; must not point at production. |

## Visual Regression Commands

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm test:visual` | Root Playwright visual | Mocked visual screenshots and UI wording/overflow assertions. | Starts local web only | No app data mutation | Yes | Yes if browser deps installed | Uses mocked API fixtures at `127.0.0.1:4999`; good deeper UI gate. |
| `corepack pnpm exec playwright test -c playwright.visual.config.ts --update-snapshots` | Root Playwright visual | Refreshes visual baselines. | Starts local web only | Mutates snapshot files | Manual only | No default CI | Only after reviewed intentional UI changes. |

## Build And Codegen Checks

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm build` | Root workspace | Recursive package builds. | No live services expected | No app data mutation | Yes | Yes | Strong pre-push/CI candidate; may be slower. |
| `corepack pnpm --filter @ledgerbyte/api build` | `apps/api` | Nest API build. | No | No | Yes | Yes | Targeted backend build. |
| `corepack pnpm --filter @ledgerbyte/web build` | `apps/web` | Next.js production build. | No live services expected | No app data mutation | Yes | Yes | Targeted frontend build; may be heavier than typecheck/test. |
| `corepack pnpm --filter @ledgerbyte/shared build` | `packages/shared` | ESM/CJS TypeScript build and CJS marker. | No | Writes package build output | Yes | Yes | Build artifacts should remain ignored/uncommitted unless package policy changes. |
| `corepack pnpm db:generate` | Root/API | Prisma client generation. | No DB required | No DB mutation; writes generated client artifacts | Yes | Yes | Safe codegen gate when Prisma/schema/client changes; may hit Windows DLL locks if API is running. |

## Docs, Link, And Safety Checks

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `git diff --check` | Git | Working-tree whitespace/conflict-marker check. | No | No | Yes | Yes | Required lightweight check for these DEV threads. |
| `git diff --cached --check` | Git | Staged diff whitespace/conflict-marker check. | No | No | Yes | Yes | Run after staging. |
| `node scripts/check-deployed-e2e-env.cjs` | Root script | Deployed URL and readiness preflight. | Deployed web/API | No | Not local-default | Manual CI only | Safe only for non-production URLs and configured secrets. |
| `corepack pnpm test:user-testing-cleanup-plan` | Root script test | Cleanup-plan safety behavior. | No | No | Yes | Yes | Good safety-harness test. |
| `node --test scripts/test-credential-env.test.cjs` | Root direct test | Local/deployed credential guard behavior. | No | No | Yes | Yes | Candidate for a future package script. |
| No dedicated command found | Docs/link checks | Markdown links, docs lint, stale doc anchors. | N/A | N/A | N/A | N/A | Gap: no markdownlint/link-check script exists. |

## Health And Readiness Checks

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `curl -fsS http://localhost:4000/` | Local API | Public API root status JSON with health/readiness links. | API | No | Yes | Yes with service | Safe root check; does not prove database readiness. |
| `curl -fsS http://localhost:4000/health` | Local API | API liveness. | API | No | Yes | Yes with service | Lightweight. |
| `curl -fsS http://localhost:4000/readiness` | Local API | API and database readiness. | API and DB | No | Yes | Yes with service | Read-only DB check. |
| `curl -fsS http://localhost:3000/login` | Local web | Web route load for public auth page. | Web | No | Yes | Yes with service | Shell check only. |
| `curl -fsS http://localhost:3000/dashboard` | Local web | Web route load for authenticated app route shell. | Web | No | Yes | Yes with service | Does not prove login/session. |
| `curl -fsS https://ledgerbyte-api-test.vercel.app/health` | Beta API | Deployed beta API liveness. | Network/beta API | No | Manual only | Manual workflow only | Keep beta/user-testing only, not production. |
| `curl -fsS https://ledgerbyte-api-test.vercel.app/readiness` | Beta API | Deployed beta API and DB readiness. | Network/beta API/DB | No | Manual only | Manual workflow only | Do not run against production in DEV-02. |

## ZATCA-Related Commands

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm --filter @ledgerbyte/zatca-core test` | `packages/zatca-core` | Pure package tests for local ZATCA helpers. | No | No | Yes | Yes | Only ZATCA command suitable for default code gates today. |
| `corepack pnpm zatca:csr-dry-run` | Root/API | CSR dry-run path. | Depends on API script/env | Should be no real network | Manual only | Manual only | Specialized ZATCA gate; do not include in default gates yet. |
| `corepack pnpm zatca:csr-local-generate` | Root/API | Local CSR generation path. | Local env/files | May write local artifacts | Manual only | No default CI | Specialized; out of DEV-02 Part 1 execution scope. |
| `corepack pnpm zatca:local-signing-dry-run` | Root/API | Local signing dry-run path. | Local SDK/env prerequisites | Should not call network | Manual only | Manual only | Requires explicit ZATCA scope and safe env. |
| `corepack pnpm zatca:local-signed-xml-validate` | Root/API | Local signed XML validation path. | Local SDK/env prerequisites | May write temp artifacts | Manual only | Manual only | Needs Java/SDK policy; not a default gate. |
| `corepack pnpm zatca:compliance-csid-plan` | Root/API | Compliance CSID plan mode. | Script/env | No real network expected | Manual only | Manual only | Planning command, but keep out of default gates. |
| `corepack pnpm zatca:compliance-csid-dry-run` | Root/API | Compliance CSID dry-run/mock path. | Script/env | No real network expected | Manual only | Manual only | Keep out of default gates until ZATCA policy is explicit. |
| `corepack pnpm zatca:compliance-csid-custody-plan` | Root/API | CSID custody plan mode. | Script/env | No real network expected | Manual only | Manual only | Specialized safety gate, not default. |
| `corepack pnpm zatca:validate-generated -- --invoice-id <id>` | Root script/API | Generated invoice XML validation against running API. | API, DB, local SDK env | Reads invoice; may write temp files | Manual only | No default CI | Requires invoice id and ZATCA SDK setup; out of default gates. |
| `corepack pnpm zatca:debug-pih-chain` | Root script/API | PIH chain debug helper. | API/DB context likely | Reads debug data | Manual only | No default CI | Debug-only; do not include in gates. |
| `corepack pnpm zatca:validate-sdk-hash-mode` | Root script | SDK hash mode validation helper. | Local SDK/env | No app data mutation expected | Manual only | Manual only | Keep out of default gates until SDK prerequisites are stable. |

## Database And Migration Commands Found

| Command | Workspace/package | What it verifies | Needs DB/API/web/Docker | Mutates data | Safe local dev | Safe CI | Current risk/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corepack pnpm db:generate` | Root/API | Prisma client generation. | No DB required | No DB mutation | Yes | Yes | Candidate only when schema/client changes; not run in this thread. |
| `corepack pnpm db:migrate` | Root/API | Applies Prisma migrations with `prisma migrate deploy`. | DB | Yes, schema mutation | Only with explicit approval | Only with approved disposable/test DB | Not part of default verification gates yet. |
| `corepack pnpm db:seed` | Root/API | Runs Prisma seed. | DB | Yes, data mutation | Only with explicit approval | Only with approved disposable/test DB | Not part of default verification gates yet. |

## Existing CI Workflow Summary

| Workflow | Trigger | Main commands | Target | Safety notes |
| --- | --- | --- | --- | --- |
| `.github/workflows/deployed-e2e.yml` / `Deployed E2E Smoke` | Manual `workflow_dispatch` only | `corepack pnpm install --frozen-lockfile`, `corepack pnpm exec playwright install --with-deps chromium`, `node scripts/check-deployed-e2e-env.cjs`, `corepack pnpm e2e` | Defaults to `ledgerbyte-web-test.vercel.app` and `ledgerbyte-api-test.vercel.app` | Requires GitHub E2E secrets, uploads Playwright artifacts, uses one worker, and must stay beta/user-testing only. It is not a PR gate. |

No automatic pull request, push, scheduled, docs, typecheck, unit-test, build, smoke, or visual CI workflow was found.

## Gaps In The Current Verification Gate

- No default PR CI gate exists for install, typecheck, unit tests, build, or docs safety.
- No lightweight local gate script combines the safest checks.
- No pre-push gate separates fast non-mutating checks from database/browser/smoke checks.
- No dedicated docs link checker or markdown linter was found.
- No safe authenticated browser runtime path is established after DEV-01 because the in-app Browser local URL policy blocks route visits and login writes audit logs.
- No restricted-role fixture strategy is documented for browser/runtime QA.
- No default disposable-data policy exists for mutation-heavy smoke and E2E commands.
- No clear split exists between non-mutating report checks and output-producing export/download/PDF checks.
- No CI service container strategy is established for local API/web/E2E against disposable Postgres/Redis.
- No ZATCA SDK/manual command is stable enough for default gates beyond `@ledgerbyte/zatca-core test`.
- Placeholder package tests can give false confidence because several packages only echo that tests live elsewhere.

## Unsafe Or Unclear Commands For Default Gates

- `corepack pnpm db:migrate`: schema mutation; explicit approval only.
- `corepack pnpm db:seed`: data mutation; explicit approval only.
- `corepack pnpm demo:seed-workflows`: data mutation through API; disposable targets only.
- `corepack pnpm smoke:accounting` and all smoke slices: deep and useful, but mutating and sometimes output-producing.
- `corepack pnpm e2e`: logs in and local global setup seeds workflow data by default.
- `corepack pnpm e2e:headed`: interactive/debugging only.
- `corepack pnpm user-testing:cleanup-plan`: read-only counts and no deletion, but logs in and touches user-testing audit/security surfaces.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts --update-snapshots`: mutates snapshots.
- ZATCA CSR/signing/SDK/hash/debug commands: specialized manual checks only; no real ZATCA network or production compliance gate belongs in DEV-02 defaults.
- Any deployed Vercel/Supabase smoke/E2E run: manual non-production only, never production.

## Proposed DEV-02 Part 2 Gate Design

### Fast Local Gate

- `git diff --check`
- Targeted changed-workspace typecheck, for example `corepack pnpm --filter @ledgerbyte/web typecheck` or `corepack pnpm --filter @ledgerbyte/api typecheck`.
- Targeted Jest by changed area, for example `corepack pnpm --filter @ledgerbyte/web test -- permissions sidebar` or `corepack pnpm --filter @ledgerbyte/api test -- smoke-http`.
- Optional shell health checks only if API/web are already running and the thread allows local runtime checks.

### Pre-Commit Or Pre-Push Candidate Gate

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build` when code changed or before pushing larger changes.
- `git diff --check`
- `git diff --cached --check` after staging.
- No migrations, seed, smoke, login, E2E, visual snapshot updates, or deployed checks by default.

### CI Pull Request Gate

- Install with `corepack pnpm install --frozen-lockfile`.
- Run `corepack pnpm typecheck`.
- Run `corepack pnpm test`.
- Run `corepack pnpm build`.
- Run `git diff --check` if CI checkout policy supports it.
- Consider `corepack pnpm test:visual` only after browser dependencies and snapshot stability are proven in CI.
- Keep API smoke/E2E out of the default PR gate until disposable data and service containers are designed.

### Deeper Nightly Or Manual Gate

- `corepack pnpm test:visual` for mocked visual regression.
- Local disposable `corepack pnpm e2e` after explicitly approved Docker/API/web/database setup.
- Local disposable smoke slices, preferring `smoke:accounting:ar`, `ap`, `documents`, `reports`, and `zatca-safe` over monolithic full smoke when diagnosing.
- Manual deployed beta/user-testing workflow only after preflight passes and credentials are from the secret store.

## Deferred Verification Areas

- Full E2E against production.
- Production smoke checks.
- Migrations against any non-approved database.
- Seed/reset/delete.
- Real ZATCA network calls, CSID execution, signing, clearance/reporting, PDF/A-3, and production compliance checks.
- Real customer email sending, retry workers, provider webhooks, or alert delivery.
- Backup/restore execution.
- Production deploys or provider setting changes.
- Customer-data mutation or production data inspection.
- Browser/runtime authenticated QA until a safe local browser and audit-log policy is approved.
- Mutation/state-machine QA until a disposable fixture/data policy is approved.

## Recommended Next Ticket

`DEV-02 Part 2: design verification gate`
