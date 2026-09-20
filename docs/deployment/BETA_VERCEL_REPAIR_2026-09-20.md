# Existing Vercel beta repair — 2026-09-20

Status: **Local repair and database reconciliation verified; deployment pending.** This record concerns only the existing `ledgerbyte-web-test` / `ledgerbyte-api-test` Vercel projects and Supabase project `xynelbjqcmbgtscfmmzv`. It is not a production launch or recovery proof.

## Source and before state

Repair checkout: `E:\AccountingAppWorktrees\beta-vercel-repair`, branch `codex/beta-vercel-repair`, based on verified main `90e0eaa4896a55c1c8cda1c4101f4ab1323a4a61`. The repair is still uncommitted when this entry is prepared; the coordinating task must record its final revision and provider outcomes.

| Surface | Confirmed current deployment before repair | Immutable deployment hostname |
| --- | --- | --- |
| API | `dpl_9xC8cNziAJeVSXbSpstXG7txfrUV` | `ledgerbyte-api-test-btvtgi5io-ahmad-khalid-s-projects.vercel.app` |
| Web | `dpl_87moFnjjBpesJ2p8k2exWoegdv5N` | `ledgerbyte-web-test-if9yttxy8-ahmad-khalid-s-projects.vercel.app` |

Both are July 15 CLI deployments. Their provider metadata does not supply a source SHA. Historical rollout documentation correlates them with `bf369ceba4593d024dcc637cb97bb82523d9572a`; that correlation is not independent proof of their exact deployed source.

The existing aliases are `https://ledgerbyte-api-test.vercel.app` and `https://ledgerbyte-web-test.vercel.app`. Authenticated reads of `/auth/me`, `/contacts`, and `/accounts` returned 200. A cookie-authenticated `POST /contacts` with an empty object and no CSRF header returned **403 Invalid CSRF token**. It did not create a contact. The browser client reads its CSRF token from the web origin's cookies, while the separate API origin sets a host-only cookie: successful reads do not prove authenticated writes work.

## Repair scope

- Add an opt-in same-origin web `/api` proxy using build-time `LEDGERBYTE_API_UPSTREAM=https://ledgerbyte-api-test.vercel.app`. The upstream is allowlisted; when enabled, `NEXT_PUBLIC_API_URL` becomes `/api`. Next's `/api/locale` stays local, including unsupported-method responses. Cookies and the CSRF header remain required; no CSRF exemption or browser bearer-token workaround was added.
- Retain API deployment from the repository root through `api/index.js` and web deployment from `apps/web`. Root API postinstall now builds all five runtime workspace packages, including the previously omitted UAE package, before Prisma generation and Nest build. Its explicit build step verifies the compiled wrapper target and package entrypoints. It does not migrate or seed.
- Use serial workspace/install lifecycle builds, one Next worker, and 4-GiB Node heap limits alongside the host aggregate resource ceiling. The web project root is confirmed as `apps/web`, its build-command override is off, and its Node setting was changed from 24 to 22. The API project is also confirmed on Node 22. Node 22 is the repair's validation runtime.
- Carry only dependency security updates and two Nest startup fixes from prior work: the fake billing provider's factory registration and explicit `EMAIL_PROVIDER` injection for document delivery. See [dependency/build note](../production/BETA_DEPENDENCY_SECURITY_REFRESH_2026-09-20.md).

Draft PR #421 and its Saudi launch changes are excluded: no perpetual inventory migration, legacy inventory cutover, new self-service/trial journey, Stripe integration or launch catalog is part of this repair. Existing accounting data is to be retained. No business-data cleanup, reset, revaluation or backfill is included.

## Database reconciliation before deployment

Current inspection found **103 successful Prisma migration records**. Three fixed-asset migrations already have schema effects and corresponding Supabase history, but lack their canonical Prisma history records:

| Canonical repository migration | Existing Supabase history version |
| --- | --- |
| `20260715090000_add_fixed_assets_mvp` | `20260715125416` |
| `20260715150000_add_fixed_asset_disposal_evidence` | `20260715134401` |
| `20260715153000_add_fixed_asset_disposal_review` | `20260715134403` |

Do not execute those three schema migrations again. After catalog/provenance checks, the coordinating task applied the guarded metadata reconciliation and verified **106 Prisma records, all three reconciled entries, and zero unresolved migrations**. The schema was not replayed. Scripts are [catalog preflight](BETA_FIXED_ASSET_CATALOG_PREFLIGHT_20260920.sql) and [Prisma history reconciliation](BETA_FIXED_ASSET_PRISMA_RECONCILE_20260920.sql).

All six later main migrations in the [ordered application plan](BETA_PENDING_MIGRATIONS_APPLY_PLAN_20260920.sql) are now applied: sales-invoice email delivery, customer-document delivery, supplier email templates, ZATCA sandbox state, EGS/ICV uniqueness, and the existing paid-SaaS subscription catalog. The coordinator submitted each separately through Supabase `apply_migration`, removing only its outer SQL transaction wrapper, and separately read back `historyVerified=true` before advancing. The three September launch migrations are excluded.

Final metadata checks confirm **112 finished Prisma migrations, zero unresolved migrations and zero invalid indexes**. The 15 newly created tables have zero browser-role grants and zero PUBLIC table grants. Billing plans and subscriptions both remain zero; no catalog/subscription seed was performed. Before/after counts are unchanged: **16 organizations, 117 contacts, 259 stock movements and 635 journals**. These counts support preservation of those existing records; they are not a backup or full database fingerprint.

The Supabase UI confirms the project is on **FREE with no available backups**. No verified backup, point-in-time restore, logical snapshot or recoverable database point is claimed. The reviewed decision for this narrow additive repair proceeds using an atomic provider transaction for each block and the recorded old application deployments for code rollback, leaving additive schema in place. This supersedes the earlier hard recovery-point prerequisite; it does not establish full database recovery or authorize destructive down-migrations. Existing accounting data must be preserved.

When submitting one block through Supabase `apply_migration`, remove only its outer SQL `BEGIN`/`COMMIT`: the provider supplies the transaction. Retain procedural `DO`-block boundaries, guards, timeouts, schema statements, access revokes and canonical Prisma history checksums. The canonical repository migration files remain unchanged. Run the block's final read-only verification query separately through `execute_sql` and require `historyVerified=true` before advancing.

## Completed local checks

Checks used a bounded Windows process job (18 GiB aggregate, 50% CPU) with one test/build worker. API build and targeted API tests briefly overlapped; observed combined peak was approximately 3.8 GiB, and subsequent operations were serialized. Fixtures and checks were local; these results do not establish a successful hosted deployment.

| Check | Result | Local evidence |
| --- | --- | --- |
| Nest injection, organization/permission guards, contacts and auth cookies | 54 tests passed, 5 suites | `.dev-logs/api-regression.log` |
| Same-origin proxy, CSRF client and existing API client | 30 tests passed, 3 suites | `.dev-logs/proxy-tests.log` |
| Vercel build configuration and Next/Prisma compatibility | 10 tests passed | `.dev-logs/build-guards.log` |
| API build / Prisma generation | Passed | `.dev-logs/api-build.log` |
| Web production build | Passed | `.dev-logs/web-build.log` |
| Production dependency audit | 0 critical, 0 high | `.dev-logs/dependency-audit.log` |

The coordinating task also added `.vercelignore` to exclude local logs, environment files and generated build artifacts. CLI dry-run packaging reported 3,013 files / 39.9 MB with zero excluded artifacts remaining in the upload set. This is packaging verification, not a deployed result.

## Pending completion evidence

Record the final source revision, new API/web deployment IDs and alias promotion. Verify API health/readiness, same-origin login, a bounded authorized business write and its read-back, logout/revocation, and language switching through the actual aliases. Keep existing accounting records intact and provider/production gates unchanged. Update this record with actual results rather than treating local tests or an HTTP 200 page as hosted acceptance.
