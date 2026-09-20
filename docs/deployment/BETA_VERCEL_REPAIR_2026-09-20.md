# Existing Vercel beta repair — 2026-09-20

Status: **API and corrected web promoted; live same-origin contact/security checks passed.** Database reconciliation is verified. This record concerns only the existing `ledgerbyte-web-test` / `ledgerbyte-api-test` Vercel projects and Supabase project `xynelbjqcmbgtscfmmzv`. It is not a production launch or recovery proof.

## Source and before state

Repair checkout: `E:\AccountingAppWorktrees\beta-vercel-repair`, branch `codex/beta-vercel-repair`, based on verified main `90e0eaa4896a55c1c8cda1c4101f4ab1323a4a61`. API source `c2e615a9c529185807ba93f26cee40daf4ed6069` is deployed. The first web candidate used `bd7f3c9d1cb36eadfb7918da01a642b30f7944fe` and was rolled back; the replacement web deploys routing revision fc76b2d74b5f76bee444daa0b7825d695dc1a8a8.

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

Initial inspection found **103 successful Prisma migration records**. Three fixed-asset migrations already had schema effects and corresponding Supabase history, but lacked their canonical Prisma history records:

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

An expanded web check later passed 41 tests before the first web candidate was deployed. Those tests did not expose the route-resolver interaction described below. The additional seven real Next resolver cases now pass, including a negative control reproducing the old catch-all failure. The corrected fresh web build passes; its compiled manifest places the proxy in afterFiles with no fallback rules. Total targeted web coverage is 48 passing tests.

## Live API outcome

API deployment **`dpl_BiGBrtvjARvfwMCaSJSYgRMcABsh`**, from `c2e615a9c529185807ba93f26cee40daf4ed6069`, built successfully and was promoted to `https://ledgerbyte-api-test.vercel.app`. It remains live and healthy after the web rollback.

| Bounded API check | Observed result |
| --- | --- |
| Health / readiness | 200 / 200, database OK |
| Cookie login | 201 |
| Authenticated `/auth/me`, `/contacts`, `/accounts` | 200 each |
| Cookie-authenticated contact request without CSRF | 403 |
| Contact request with valid CSRF and empty object | 400 validation rejection |
| Unauthorized tenant access | 403 |
| Unauthenticated request | 401 |
| Logout / subsequent revoked-session request | 201 / 401 |

The valid-CSRF request reached payload validation. It did not establish successful contact creation; **no contact was created**. These checks validate the API directly, not the web proxy or a completed browser business write.

## First web candidate and rollback

Web deployment **`dpl_cWEvUqs92MXDvnb8yXYLpBifE1FW`**, from `bd7f3c9d1cb36eadfb7918da01a642b30f7944fe`, built and was promoted. Live checks found that the application catch-all route intercepted `/api` requests before the proxy's fallback rewrite. Those requests returned **200 HTML**, rather than the API response. A successful build and HTTP 200 were therefore insufficient acceptance.

The coordinator immediately rolled the web alias back to its previous deployment, **`dpl_87moFnjjBpesJ2p8k2exWoegdv5N`**. The repaired API remained promoted. This demonstrates a limited **web application rollback** while leaving the additive database schema and API in place; it is not a database restore, disaster-recovery test, or complete system rollback.

The routing correction moves the proxy to `afterFiles`, ahead of dynamic catch-all resolution while retaining the local locale endpoint. The seven-case real Next resolver regression and corrected local build pass. Starting a compiled local Next server was rejected by automatic approval review (blocked by policy); no local listener started. Hosted same-origin acceptance is recorded below.

## Final web and database outcome

Corrected web deployment **`dpl_FsD7tYvW8mdkghyZjhHc7hZY5bjz`**, source `fc76b2d74b5f76bee444daa0b7825d695dc1a8a8`, was promoted to `https://ledgerbyte-web-test.vercel.app`. API remains `dpl_BiGBrtvjARvfwMCaSJSYgRMcABsh`. Both builds are READY on Node 22. The existing API custom alias was retained.

The web origin's `/api/health` and `/api/readiness` returned JSON 200 with database OK; `/api/contacts` without authentication returned JSON 401. Authenticated proof used host-only web cookies and the normal CSRF header, with no bearer header for business requests:

| Same-origin check | Result |
| --- | --- |
| Login; separate auth/CSRF cookies | 201; two headers, auth HttpOnly, CSRF readable, both host-only |
| Me, contacts, accounts, inventory, fixed assets, trial balance | 200 each |
| Billing status | 200; account/subscription absent |
| Missing CSRF / valid CSRF with invalid body | 403 / 400 |
| Wrong tenant / unauthenticated | 403 / 401 |
| Marked synthetic contact create | 201 |
| Update / read-back / deactivate / inactive read-back | 200 / 200 / 200 / confirmed |
| Logout / replay of revoked session | 201 / 401 |
| Local locale POST ar / en; GET | 200 with rtl/ltr and locale cookie; GET 405 |

The smoke created exactly one uniquely marked contact without email, phone or tax identifiers, updated it and set `isActive=false`. No journals, stock movements, invoices, payments or provider operations were created. Final database counts: organizations 16, contacts 118 (117 original plus one inactive synthetic), stock movements 259, journals 635, finished Prisma migrations 112, unresolved migrations 0, billing plans 0, subscriptions 0. The synthetic prefix count is one and active count is zero.

The English and Arabic public pages were inspected in the in-app browser. The authenticated journey above is HTTP cookie/CSRF evidence through the deployed web origin, not a claim that an operator completed the signed-in browser forms. A fresh browser login is required because old API-host cookies do not migrate to the web host. Reload the beta, then log in again.

Local verification includes 54 focused API tests, 48 web tests (41 client/download tests plus seven real resolver cases), ten build guards, fresh API/web builds, and zero high/critical production dependency findings. Initial PR CI found five failures caused by July/August synthetic dates being compared with September's clock. Only test fixtures were changed to fixed clocks; expiry rejection remains tested, and all 59 affected API tests passed. See [PR 423](https://github.com/Noone9029/Accounting-App/pull/423) for current automated verification. No real ZATCA call, signing material or billing activation was involved.

The rollback performed during this repair was an application deployment rollback. Supabase Free still has no verified backup or restore capability. Public launch, live Stripe collection, official Saudi simulation/production acceptance, hosted recovery, accountant review and legacy-inventory cutover remain separate unfinished launch work. The Saudi launch implementation in draft PR421 was not deployed. No database reset, seed, down-migration, role expansion or authorization bypass occurred.