# User-testing recurring-transactions rollout — 2026-07-13

## Scope and status

LedgerByte's generalized recurring-transactions engine is deployed to the burner/user-testing targets and passed the authenticated hosted acceptance matrix. The engine creates reviewable drafts only. It does not auto-post and this rollout did not invoke providers, compliance adapters, external storage, webhooks, email, OCR, bank feeds, payment collection, or money movement.

This is user-testing/beta evidence only. It is not production approval, a compliance claim, or proof of managed backup/PITR/restore readiness.

## Release identity

| Item | Evidence |
| --- | --- |
| Final `origin/main` | `49a82ac7dfdf90db080c778af0291152bb55b789` |
| Supabase project | `xynelbjqcmbgtscfmmzv` |
| API target | `ledgerbyte-api-test` / `https://ledgerbyte-api-test.vercel.app` |
| Web target | `ledgerbyte-web-test` / `https://ledgerbyte-web-test.vercel.app` |
| Final API deployment | `dpl_31Lg3VK32AgBGiVzuQAp5DJZgREL` |
| Web deployment | `dpl_CkaboBobdQysW8u99LChcKWRX7yE` (unchanged after the initial feature deployment) |

## Pull requests and hosted corrections

| PR | Head | Merge commit | Purpose |
| --- | --- | --- | --- |
| [#300](https://github.com/Noone9029/Accounting-App/pull/300) | `0437b45f9333e40cfcea56b8417797b88eac3476` | `4571f484cdfa5c45d27e25572e7c6d648b5f444f` | Generalized recurring engine, UI, migration/import/export, worker, and review controls |
| [#301](https://github.com/Noone9029/Accounting-App/pull/301) | `10ed6d6d5aff421711bfb3d18ada554037e3df76` | `8a1d7861e41b32665d67af115e2187edfc170bdd` | Tenant-scoped checked relation shape for hosted template creation |
| [#302](https://github.com/Noone9029/Accounting-App/pull/302) | `cd69e19bf123a768b67c22fb0a260737179a4724` | `be68938b5a8ee6dc0f2d7aeeeb80591557eb2bce` | Preserve real audit request context during generalized runs |
| [#303](https://github.com/Noone9029/Accounting-App/pull/303) | `8334e4932e7eb254d040d1b1827f5923d493f826` | `55024ee2074f784137093bc23b5012b75f03d00e` | Checked relation creation for recurring expense proposals |
| [#304](https://github.com/Noone9029/Accounting-App/pull/304) | `4cb3e8e9eb3c6a96ea1769cbad2fdec8eac00c0a` | `8060fe1d2fc4e58100e1c8ff978223a086523498` | Isolate the hosted future-only template update relation failure |
| [#305](https://github.com/Noone9029/Accounting-App/pull/305) | `51f616bdf7ab9d80cb839925a2fe0d95ca8d3a3d` | `49a82ac7dfdf90db080c778af0291152bb55b789` | Atomic tenant-scoped replacement of template lines without Prisma composite nested-update ambiguity |

Each corrective PR passed GitGuardian, repository non-mutating verification, focused regression tests, full API regression, workspace typecheck/build, and an independent read-only Critical/Important review before merge. The final update write shape also passed a rollback-only probe against the burner database; the probe deliberately rolled back.

## Backup attempt and limitation

The required pre-migration logical-dump attempt did not produce a usable backup because the Supabase CLI dump path required a Docker Desktop Linux engine that was unavailable. The two created files are empty and must not be treated as backup evidence.

| File | Size | SHA-256 | Result |
| --- | ---: | --- | --- |
| `E:\LedgerByteBackups\supabase-user-testing-pre-recurring-migration-20260713-013442\schema.sql` | 0 bytes | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` | Failed/empty |
| `E:\LedgerByteBackups\supabase-user-testing-pre-recurring-migration-20260713-013442\data.sql` | 0 bytes | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` | Failed/empty |

The folder and files are outside the repository. Proceeding after this failed attempt was limited to the explicitly approved burner-risk fallback. There is no logical-backup proof, restore drill, PITR proof, RPO proof, or RTO proof from this rollout. Managed Supabase capabilities alone are not production proof.

## Hosted database migration

Exactly the expected four migrations were pending and applied; no unexpected migration was present:

1. `20260712110000_generalize_recurring_transactions`
2. `20260712120000_add_document_line_dimensions`
3. `20260712130000_add_recurring_import_export_types`
4. `20260712140000_add_recurring_worker_indexes`

Final Prisma status found 98 migrations and reported the hosted schema up to date. The legacy/generalized template ID intersection count was `0`, so no existing legacy template row required generalized backfill in this burner project. Existing posted accounting records were not rewritten.

## Local verification

| Gate | Result |
| --- | --- |
| Focused recurring generation adapter tests | 6/6 passed |
| Focused recurring template service tests | 13/13 passed |
| Full API tests | 240/240 suites; 2,421 passed, 34 skipped; 2,455 total |
| Web tests from the feature release gate | 183/183 suites; 830 passed |
| API, web, and workspace typecheck | Passed |
| Workspace production build | Passed |
| Prisma generation and migration diff/status gates | Passed; hosted schema up to date |
| Desktop/mobile/RTL Playwright feature gate | 3/3 passed |
| Independent Critical/Important reviews | Clean |

The API suite includes deterministic schedule coverage for month-end clamping, day 31, annual/leap-day behavior, DST-aware canonical occurrences, catch-up limits, idempotency, retry/recovery, and locked-period blocking.

## Deployment and unauthenticated smoke

| Check | Result |
| --- | --- |
| API `/` | HTTP 200 |
| API `/health` | HTTP 200 |
| API `/readiness` | HTTP 200; database `ok` |
| Web `/`, `/login`, and `/dashboard` shell | HTTP 200 / authenticated dashboard passed |
| Worker `GET /internal/recurring-worker` without bearer secret | HTTP 401 |
| Final API deployment HTTP 500 query | 0 results |

`CRON_SECRET` was absent before rollout. One generated secret was added as a Sensitive Production variable to `ledgerbyte-api-test`; its value was never printed. This was the only Vercel environment mutation. Provider and compliance variables were not changed.

## Authenticated hosted acceptance

The normal browser login, `/auth/me`, and dashboard flow passed using the approved DPAPI credential source. The complete run used marker `Recurring Rollout 1783897546826`, created seven marked templates, and finished with zero browser console/page failures.

| Hosted check | Result |
| --- | --- |
| Browser login, `/auth/me`, dashboard | PASS |
| Sales draft, day 31, dimensions, tax, pause/resume, idempotent replay | PASS |
| Purchase-bill draft and concurrent idempotency | PASS |
| Expense review proposal with no automatic cash-expense posting | PASS |
| Balanced manual-journal draft | PASS |
| Future-only template edit and archived-history guard | PASS |
| Fixed FX evidence and missing-rate fail-closed blocker | PASS |
| Closed/locked-period blocker with no date movement | PASS |
| Reviewed recurring-template import and template/run CSV exports | PASS |
| GL, trial balance, P&L, and balance sheet unchanged before posting; readiness attention visible | PASS |
| Desktop, mobile, Arabic RTL, and console/page-error checks | PASS |

Generated review targets were three sales-invoice drafts, one purchase-bill draft, one expense proposal, and one balanced journal draft. No automatic posting occurred. Marked active/paused smoke templates were archived at cleanup; generated drafts and immutable archived run history remain available for accountant review.

## Boundaries and remaining limitations

- User-testing/beta only; do not promote this evidence to production readiness.
- The failed zero-byte dump means backup/restore, PITR, RPO, and RTO gates remain open.
- Banking remained manual and untouched. No Wio or live bank-feed action occurred.
- No payment, OCR, email, external storage, webhook delivery, ZATCA, UAE FTA/e-invoicing, or other provider/compliance action occurred.
- No money movement occurred.
- The worker is secret-gated and fail-closed; this rollout did not invoke it with the secret or claim scheduled production operation.
- Expense generation creates a review proposal only. A human review action is still required before any cash expense can be created or posted.
- Fixed template FX uses explicit stored evidence. No live exchange-rate provider was enabled.
