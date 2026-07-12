# LedgerByte User-Testing Multi-Currency / FX Rollout Evidence — 2026-07-12

## Scope and verdict

This record covers the hosted **user-testing / demo** rollout of LedgerByte's document-level multi-currency and foreign-exchange accounting foundation.

- Repository base after the hosted hotfix: `f3b1b31b40c2d24af3538a6f473d94b04308a625`
- Supabase project: `xynelbjqcmbgtscfmmzv`
- API project: `ledgerbyte-api-test`
- Web project: `ledgerbyte-web-test`
- Result: the allowlisted FX migrations are applied, the final API/web deployments are healthy, foreign document/revaluation/settlement/report evidence passed in the dedicated sandbox, and a hosted-only Prisma relation defect found during settlement smoke was fixed through PR #298 before final verification.

This is not production-readiness, tax-compliance, managed-restore, live-rate-provider, or money-movement evidence.

## Merged delivery arc

| Phase | PR | Head | Merge commit | Result |
| --- | --- | --- | --- | --- |
| FX foundation and fail-closed readiness | [#291](https://github.com/Noone9029/Accounting-App/pull/291) | `3244fac9` | `06a50e28` | Merged |
| Document-level currency and frozen rates | [#292](https://github.com/Noone9029/Accounting-App/pull/292) | `6ae4f05d` | `1dbd5eb4` | Merged |
| FX-aware foreign document journals | [#293](https://github.com/Noone9029/Accounting-App/pull/293) | `c78dec86` | `fda5f0d8` | Merged |
| Realized FX settlements | [#294](https://github.com/Noone9029/Accounting-App/pull/294) | `c308199b` | `46357499` | Merged |
| Controlled revaluation | [#295](https://github.com/Noone9029/Accounting-App/pull/295) | `5e409d4c` | `38e6f7e6` | Merged |
| FX reporting and close controls | [#296](https://github.com/Noone9029/Accounting-App/pull/296) | `74f51325` | `81aae6f2` | Merged |
| Import, read-only API, audit, and documentation | [#297](https://github.com/Noone9029/Accounting-App/pull/297) | `c36e53dd` | `b9bf30d9` | Merged |
| Hosted settlement relation hotfix | [#298](https://github.com/Noone9029/Accounting-App/pull/298) | `868552bb` | `f3b1b31b` | Merged; CI and GitGuardian green |

## Secret and target preflight

The approved database source was `E:\LedgerByteSecrets\user-testing-db.env`.

- The file resolved outside `E:\Accounting App`.
- `DATABASE_URL` and `DIRECT_URL` were present, nonblank, non-local, and contained project ref `xynelbjqcmbgtscfmmzv`.
- The values were loaded into the current process only and removed in `finally` blocks.
- Repo `.env` files, `apps/api/.env`, Vercel environment variables, and Supabase environment variables were not read or changed for this rollout.
- Final checks confirmed `DATABASE_URL`, `DIRECT_URL`, and all temporary `LEDGERBYTE_*` credential variables were absent from the operator process.

The DPAPI credential store was `%LOCALAPPDATA%\LedgerByte\user-testing-credentials.json`. Its password was decrypted in-process as UTF-16LE, passed only to child verification processes, never printed as plaintext, and cleared afterward.

### Operator-log handling incident

During an early credential-format search, a recursive text search traversed the approved credential JSON and emitted the `passwordDpapi` **ciphertext** into local tool output. No plaintext password, bearer token, cookie, authorization header, database URL, or raw authenticated response body was emitted. The ciphertext remains protected by Windows current-user DPAPI, but this run cannot claim a perfectly ciphertext-clean operator log. Rotate/reseal the non-production credential store if local evidence-retention policy requires it.

## Pre-migration logical backup attempt

Backup folder, outside the repository:

`E:\LedgerByteBackups\supabase-user-testing-pre-fx-migration-20260712-163252`

| File | Size | SHA-256 | Result |
| --- | ---: | --- | --- |
| `E:\LedgerByteBackups\supabase-user-testing-pre-fx-migration-20260712-163252\schema.sql` | 0 bytes | Not available | Failed |
| `E:\LedgerByteBackups\supabase-user-testing-pre-fx-migration-20260712-163252\data.sql` | 0 bytes | Not available | Failed |

Both Supabase CLI dump attempts failed before producing content because the local Docker Desktop Linux engine was unavailable. The CLI could not start its required Postgres dump container. The zero-byte files are not backups and must not be represented as restore evidence.

The objective explicitly allowed best-effort backup on this burner/demo target. This exception does not apply to production.

## Hosted migrations

Preflight found exactly these five pending migrations and no unexpected Prisma migration:

1. `20260710220000_add_fx_rate_and_account_configuration`
2. `20260711110000_add_document_fx_context`
3. `20260711130000_add_journal_line_fx_amounts`
4. `20260711140000_add_realized_fx_settlement_evidence`
5. `20260711160000_add_fx_revaluation_runs`

All five were applied by `prisma migrate deploy`. Post-migration status reported 94 migrations and `Database schema is up to date!`.

Read-only metadata checks confirmed:

- `CurrencyRateSnapshot`
- `FxAccountConfiguration`
- `FxRevaluationRun`
- `FxRevaluationLine`
- `FxMonetaryBalance`
- document base/rate/snapshot/transaction-total columns
- journal-line transaction debit/credit, snapshot, and functional-only columns
- customer/supplier allocation realized gain/loss and carrying-basis columns
- generated-document `accountingContextJson`

No existing posted journal was recalculated or rewritten by the rollout process.

## Deployments and alias proof

| Surface | Deployment | Alias | Status |
| --- | --- | --- | --- |
| API initial FX build | `dpl_GneW5PBUsHQmKgv79eS7KJ8nAu8k` | Superseded | `/`, `/health`, and `/readiness` returned 200 |
| API final hotfix build | `dpl_GJJMf8kpMJNBjbYw38uBfuKQ3pyj` | `https://ledgerbyte-api-test.vercel.app` | Ready; direct and alias `/`, `/health`, `/readiness` returned 200 |
| Web FX build | `dpl_6Q3MS2xqpaaSDcC8URdnMT5mdzPq` | `https://ledgerbyte-web-test.vercel.app` | Ready; alias home, login, and dashboard shell returned 200 |

The web deployment was not repeated for PR #298 because the hotfix changed API code and tests only.

## Hosted defect found and repaired

The first full foreign settlement run reached `POST /customer-payments` and returned HTTP 500. Sanitized Vercel metadata identified `PrismaClientValidationError` in `CustomerPayment.create`.

Root cause: the direct realized-FX allocation nested create used checked relation objects for organization/invoice but supplied the realized-FX journal through scalar `realizedFxJournalEntryId`. Prisma rejects that mixed nested-create shape.

PR #298 changed the write to the tenant-scoped relation connect:

`realizedFxJournalEntry.connect.organizationId_id`

Verification before merge:

- Regression test failed against the old scalar payload.
- Customer and supplier payment focused suites: 89 passed.
- Prisma client generation passed.
- API typecheck passed.
- `git diff --check` passed.
- Added-lines high-risk secret scan: 0 matches.
- PR Verification and GitGuardian passed.

The final hosted replay progressed beyond the original 500 and persisted both customer and supplier realized-FX evidence.

## Authenticated browser and accounting smoke

Only the dedicated user-testing organization and records marked `FX Rollout` / `fx-rollout-*` were used.

| Area | Evidence | Result |
| --- | --- | --- |
| Browser login | Repository Playwright UI login reached `/dashboard` | Pass |
| `/auth/me` | Authenticated dashboard request returned 200 | Pass |
| Dashboard | Exact `Dashboard` heading loaded | Pass |
| Legacy E2E helper | Continued navigation helper expects an old `Organization` shell label | Blocked after login/dashboard; not an auth failure |
| Manual FX configuration | Realized/unrealized gain/loss posting accounts saved | Pass |
| Manual rates | Recognition, closing, and settlement snapshots captured as immutable `MANUAL` evidence | Pass |
| Provider state | Catalog reported live-rate provider disabled | Pass |
| Dimensions | Marked cost center and project created for composition checks | Pass |
| Manual foreign journal | Posting rejected with HTTP 400 | Pass; intentional fail-closed limitation |
| Dimensioned manual journal | Base-currency journal posted and balanced | Pass |
| Foreign invoices | Settlement and open-exposure invoices finalized with frozen rate evidence | Pass |
| Foreign bills | Settlement and open-exposure bills finalized with frozen rate evidence | Pass |
| Generated journals | Foreign invoice/bill journals balanced in base currency | Pass |
| Revaluation preview | Eligible open foreign AR/AP captured at the reviewed closing rate | Pass |
| Revaluation review | `DRAFT -> REVIEWED` | Pass |
| Revaluation post | Balanced unrealized-FX journal created | Pass |
| Revaluation reverse | Balanced reversal journal created and run marked reversed | Pass |
| Customer settlement | Partial plus final settlement posted | Pass |
| Supplier settlement | Partial plus final settlement posted | Pass |
| Realized gain | Customer allocation persisted realized gain and journal evidence | Pass |
| Realized loss | Supplier allocation persisted realized loss and journal evidence | Pass |
| Full settlement | AR/AP transaction balances reduced to zero for settlement documents | Pass |
| GL composition | Transaction-currency plus cost-center/project filters accepted together | Pass |
| GL CSV | Currency filter and dimension labels retained | Pass |
| GL PDF | Valid PDF generated | Pass |
| Generated-document archive | Canonical base currency, transaction currency, dimensions, rate scope, and revaluation scope retained | Pass |
| Trial balance | Dimension filters accepted | Pass |
| P&L | Dimension filters accepted | Pass |
| Balance sheet | Dimension filters accepted | Pass |
| AR/AP aging | Transaction-currency filters accepted | Pass |
| Customer/supplier statements | Foreign-currency evidence retained | Pass |
| FX activity reports | Realized, unrealized, rate-snapshot, and current open-exposure reports loaded | Pass |
| Public API v1 | Authenticated currency and FX-rate reads loaded; no public unauthenticated access enabled | Pass |
| Unsupported filters | TB, P&L, balance sheet, VAT summary, and cash flow rejected transaction-currency filters with HTTP 400 | Pass; honest boundary |
| Report-pack preview | Remained an unfiltered planning preview | Pass; truthful boundary |
| Report-pack record | Planning-only record retained GL FX/dimension scope | Pass |
| Report-pack execution | Archive write remained disabled | Pass |

Final read-only continuation summary: **18 passed, 0 failed**. The dedicated report-pack scope proof added **2 passed, 0 failed**.

## Skipped and prohibited work

The rollout did not invoke or enable:

- live rate providers
- Wio or any other bank feed
- bank credentials, statement import, reconciliation, or banking mutations
- payment collection, payout, or money movement
- OCR
- customer/vendor email delivery
- webhook delivery
- external object storage
- ZATCA, UAE FTA, Peppol, or other compliance adapters
- official filing, clearance, reporting, signing, or compliance claims
- Vercel or Supabase environment-variable changes

## Limitations and user-testing boundary

- The logical backup failed and produced zero-byte files. There is no dump-based restore evidence from this run.
- Supabase managed PITR/restore was not exercised. Managed service availability is not production restore proof.
- RPO 24 hours / RTO 8 hours is not proven here.
- Manual foreign-currency journal posting remains intentionally fail-closed; operational foreign postings are produced through supported document, settlement, and revaluation workflows.
- Core statements remain base-currency accounting reports. Transaction-currency filtering is exposed only where implemented and is rejected elsewhere rather than silently ignored.
- Current open-exposure intentionally rejects historical date filters.
- Public API v1 reads remain authenticated/internal; API keys, OAuth, and unauthenticated public access remain disabled.
- Multiple marked sandbox records were created across retry runs. They were not deleted because safe cleanup was outside this rollout and posted accounting evidence must not be destructively removed.
- The older navigation E2E helper has stale shell-text expectations after successful login/dashboard load.
- This is invite-only user-testing/beta evidence, not production or compliance certification.

## Closeout statement

The hosted user-testing target now carries the five FX migrations and the merged customer-settlement hotfix. The final API and web aliases are healthy, the dedicated sandbox demonstrated foreign documents, balanced base journals, controlled revaluation, realized gain/loss settlements, FX-aware reporting, and archive context, and no live provider, compliance, or money-movement flow occurred.
