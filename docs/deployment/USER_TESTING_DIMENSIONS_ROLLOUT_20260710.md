# LedgerByte User-Testing Dimensions Rollout Evidence

Date: 2026-07-10

Status: **PASS for the bounded demo/user-testing dimensions rollout.** The requested logical backup was attempted but failed because the local Docker engine required by Supabase CLI dump was unavailable. The user explicitly accepted this burner-environment risk and authorized rollout continuation.

This is demo/user-testing evidence only. It is not production approval, managed PITR or restore proof, live-provider proof, regulatory-compliance proof, or money-movement proof.

## Scope And Source

- Clean rollout baseline: `e1ae58bfdc7c4fd8a7fd2e7d3b775301a03a0d59`
- Final API source deployed: `59b757125b3723b32c9c1db80063214f9d100a85`
- Hosted Supabase user-testing project: `xynelbjqcmbgtscfmmzv`
- Environment classification: burner/demo user-testing, not production
- Approved database secret source: `E:\LedgerByteSecrets\user-testing-db.env`, outside `E:\Accounting App`
- The database URL password components were percent-encoded without committing or documenting their values.
- The direct database hostname was IPv6-only and unreachable from this runner. `DIRECT_URL` therefore used the approved Supavisor IPv4 session pooler on port 5432, which is supported for Prisma migrations from IPv4-only environments.
- Database URLs and DPAPI smoke credentials were process-only and removed after each use.
- No local repository `.env` file was edited or committed.
- No Supabase project setting or provider setting was changed.
- No Vercel environment-variable change was required.

The burner/demo secret-exposure risk was explicitly accepted by the user. No database URL, password, token, cookie, authorization header, DPAPI ciphertext, or other secret is included in this document or the repository diff.

## Best-Effort Logical Backup

Supabase CLI 2.109.1 was used with the requested schema and `--data-only --use-copy` commands. The CLI requires its Supabase Postgres Docker image; Docker Desktop's Linux engine pipe was unavailable on this host. Both requested outputs remained zero bytes, so no SHA256 can truthfully be reported.

| Attempt | File | Bytes | SHA256 | Result |
| --- | --- | ---: | --- | --- |
| `E:\LedgerByteBackups\supabase-user-testing-pre-dimensions-migration-20260710-192548` | `schema.sql` | 0 | Not available | Failed during the initial direct-host attempt |
| `E:\LedgerByteBackups\supabase-user-testing-pre-dimensions-migration-20260710-192548` | `data.sql` | 0 | Not available | Failed during the initial direct-host attempt |
| `E:\LedgerByteBackups\supabase-user-testing-pre-dimensions-migration-20260710-192933` | `schema.sql` | 0 | Not available | Failed; Docker engine unavailable |
| `E:\LedgerByteBackups\supabase-user-testing-pre-dimensions-migration-20260710-192933` | `data.sql` | 0 | Not available | Failed; Docker engine unavailable |

This accepted demo risk is not backup, PITR, restore, RPO, or RTO proof. A successful hosted backup and restore drill remains required before any production claim.

## Hosted Migration Evidence

Before mutation, Prisma reported exactly these two pending migrations and no others:

- `20260710110000_add_accounting_dimension_catalogs`
- `20260710120000_assign_journal_line_dimensions`

Both migrations were applied through the repository's Prisma deploy command. Post-migration Prisma status reported `Database schema is up to date`.

Read-only hosted verification confirmed:

- both migration rows are finished and not rolled back;
- `CostCenter` and `Project` exist;
- `JournalLine.costCenterId` and `JournalLine.projectId` exist;
- both journal-line foreign keys use `NO ACTION` deletion behavior;
- tenant-scoped catalog and journal-line indexes exist;
- Supabase security advisors returned zero notices after the DDL;
- performance advisors contained informational baseline and unused-index notices, including expected unused indexes before dimension traffic.

## Local Verification

| Gate | Result |
| --- | --- |
| `corepack pnpm --filter @ledgerbyte/api db:generate` | PASS |
| `corepack pnpm --filter @ledgerbyte/api exec prisma migrate status` | PASS; schema up to date |
| PDF metadata-wrap and single-page footer regression tests | PASS; 9/9 targeted renderer tests |
| `corepack pnpm --filter @ledgerbyte/api typecheck` | PASS |
| `corepack pnpm --filter @ledgerbyte/web typecheck` | PASS |
| `corepack pnpm typecheck` | PASS |
| `corepack pnpm build` | PASS |
| `corepack pnpm test` | PASS; web 167 suites/712 tests, API 203 suites/1,835 passed and 34 skipped, package tests passed |

The build changed only `apps/web/next-env.d.ts` in generated output. That one-line churn was restored after each build.

## Deployment Evidence

| Component | Stable alias | Deployment URL | Deployment ID | State |
| --- | --- | --- | --- | --- |
| API | `https://ledgerbyte-api-test.vercel.app` | `https://ledgerbyte-api-test-pcjl67cz7-ahmad-khalid-s-projects.vercel.app` | `dpl_BK6iRzrmYaqCmjxrRFNX25f7H9fR` | READY; production target for user-testing project |
| Web | `https://ledgerbyte-web-test.vercel.app` | `https://ledgerbyte-web-test-8c8pu9a0a-ahmad-khalid-s-projects.vercel.app` | `dpl_AuLPhqjhznsqCBDEXRZNWLEtbtRa` | READY; retained |

`dpl_EWZRzgHoeN625UDiEjvR2JaoawLQ` first proved the migrated dimensions API, but PDF visual QA exposed overlapping long dimension labels. Commit `ba903209` added a measured-height metadata-card fix and regression test, deployed as `dpl_AS28qtNv7Wegv9eBVUom3k2v9T5Y`. Full-page review then found a footer-only blank second page. Commit `59b75712` moved the footer above PDFKit's automatic page-break boundary and added a one-page regression test.

A preview-target validation deployment, `dpl_EEZbwjM3eC2kJrPtXQ3mA6t9aRUU`, served root and health but could not prove database readiness because it used the preview environment. The stable alias was rolled back immediately to `dpl_AS28qtNv7Wegv9eBVUom3k2v9T5Y`. The corrected production-target deployment `dpl_BK6iRzrmYaqCmjxrRFNX25f7H9fR` used the user-testing project's established runtime environment and replaced the stable alias only after root, health, and database readiness passed. An earlier isolated `apps/api` CLI attempt failed during dependency installation and never changed an alias.

The web runtime was not redeployed because the dimensions change did not alter web UI or route source. The existing READY web deployment remained on its stable alias.

## Public Smoke

| Route | HTTP | Result |
| --- | ---: | --- |
| API `GET /` | 200 | PASS |
| API `GET /health` | 200 | PASS |
| API `GET /readiness` | 200 | PASS; database `ok` |
| Web `GET /` | 200 | PASS |
| Web `GET /login` | 200 | PASS |

## Authenticated Dimensions Smoke

The approved current-user DPAPI store was used without printing its password. The normal Chromium UI login used cookie authentication; no bearer token was injected into the browser.

| Check | Result |
| --- | --- |
| Browser `POST /auth/login` | 201 PASS |
| Browser cookie-authenticated `GET /auth/me` | 200 PASS |
| Dashboard redirect and shell | PASS; zero page or console errors |
| API `/auth/me` and active test membership | PASS |
| Cost center create/list/update/archive | PASS; `UTCC-MRF1SZIQ` left ARCHIVED |
| Project create/list/update/archive | PASS; `UTPR-MRF1SZIQ` left ARCHIVED |
| Draft manual journal dimensions | PASS; `UT-DIM-MRF1SZIQ` left DRAFT |
| Draft journal balance | PASS; debit `1.0000`, credit `1.0000` |
| Existing journal after archive | PASS; archived labels retained |
| New journal reuse of archived dimensions | Explicit 400 PASS; no second journal created |
| General ledger dimension filter | 200 PASS; exact labels returned |
| Trial balance dimension filter | 200 PASS; exact labels returned |
| Profit and loss dimension filter | 200 PASS; exact labels returned |
| Balance sheet dimension filter | 200 PASS; exact labels returned |
| VAT summary dimension filter | 200 PASS; exact labels returned |
| Cash flow dimension filter | 200 PASS; exact labels returned |
| VAT return dimension filter | Explicit 400 PASS |
| Revenue trend dimension filter | Explicit 400 PASS |
| Top customers dimension filter | Explicit 400 PASS |
| Top products/services dimension filter | Explicit 400 PASS |
| Aged receivables dimension filter | Explicit 400 PASS |
| Aged payables dimension filter | Explicit 400 PASS |
| General ledger CSV | PASS; both human-readable dimension labels included |
| General ledger PDF | PASS; both labels extracted and visually readable |
| Generated report archive | PASS; both dimension IDs retained in source context |
| Archived PDF integrity | PASS; generated and archived bytes matched |

One post-fix pass received a transient Vercel HTTP `500` for the final aged-payables request while application logs recorded the expected `BadRequestException` and application status `400`. A fresh bounded rerun passed all six unsupported-report checks with zero retries. No database or renderer exception was observed.

## PDF And Archive Verification

The first deployed PDF exposed overlap because metadata rows advanced by a fixed 13 points. The corrected renderer measures wrapped text, expands both metadata cards to the larger required height, and advances subsequent rows by measured height. Full-page rendering then exposed a footer-only second page because the footer coordinate crossed PDFKit's bottom page-break boundary; the final renderer keeps the footer inside the safe page area.

Final generated and archived PDF evidence:

- size: 2,178 bytes each;
- SHA256: `D637E2F5841C75851789C89996729E2B1F0900E0F2A602EE48FFF1955DA933C2` for both;
- pages: 1;
- extracted cost-center label: PASS;
- extracted project label: PASS;
- full-page visual overlap, clipping, footer, and blank-page review: PASS;
- archive provider: `database`;
- database content present: yes;
- external storage key: no.

The required report archive remained in the database adapter. No live/external storage provider was invoked.

## Limitations And Safety Boundaries

- This is burner/demo user-testing evidence only, not production proof.
- The logical backup failed and managed PITR/restore remains unproven.
- The marked test cost center and project remain archived, and the marked journal remains draft for tester inspection.
- The draft journal was never posted, reversed, paid, allocated, reconciled, or included as posted financial activity.
- No live Wio, bank, payment, OCR, email, external storage, webhook-delivery, ZATCA, UAE compliance, or money-movement flow ran.
- No provider was enabled and no provider/compliance environment variable was changed.
- No real customer/vendor document, payment, bank credential, payout, email, OCR payload, compliance submission, or external webhook was created or sent.
- No ZATCA or UAE FTA compliance claim is made.

## Conclusion

The two dimensions migrations are applied only to the approved demo Supabase project, the corrected API deployment is READY on the canonical alias, the unchanged web alias is healthy, authenticated dimension workflows and report boundaries pass, and the one-page generated/archived report presents long dimension labels without overlap or a blank footer-only page.

This result is suitable for hosted user testing under the recorded burner-risk posture. It must not be promoted as production readiness or compliance approval.
