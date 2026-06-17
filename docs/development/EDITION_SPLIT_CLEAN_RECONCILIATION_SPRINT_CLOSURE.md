# Edition Split Clean Reconciliation Sprint Closure

Date: 2026-06-17

## Scope

- Cleanly reconciled the preserved dirty country-edition split into `feature/edition-split-clean-reconciliation`.
- Base branch was fresh `origin/main` at `137f808d978e7afa0cce0dcc82fa6f06ffcc35a5`.
- PR `#63` had already been merged during repo hygiene.

## Preserved Inputs

- Dirty country-edition work remains preserved on `feature/edition-split-preserve-current-changes`.
- Safety patch remains at `E:\Repo-Hygiene-Safety\Accounting-App-20260617-192644\primary-country-edition-repo-hygiene-safety-20260617-192644.patch`.
- Small untracked source copies remain under the same repo hygiene safety folder.
- ZATCA stash remains preserved at `stash@{0}`.
- `codex/purchase-bill-seeded-uuid-validation` and `codex/wafeq-banking-reconciliation-audit-polish` were left untouched.

## Reconciled Changes

- Added `apps/web/src/lib/edition.ts` and edition tests for `GENERIC`, `KSA`, and `UAE`.
- Generic/base surfaces now default to neutral LedgerByte accounting workspace copy.
- KSA-only UI gates ZATCA navigation, settings, invoice fetches/actions, wording, and SAR defaults.
- UAE-only UI gates UAE eInvoicing/PINT-AE navigation, settings, invoice fetches/actions, wording, and AED defaults.
- Country routes are guarded instead of removed.
- Shared accounting, reports, documents, inventory, banking, roles, permissions, and shell behavior remain shared.

## Excluded From Dirty Branch

- Broad shell/dashboard visual redesign hunks.
- `apps/web/src/components/ui-ledger.tsx`.
- `apps/web/src/app/globals.css`.
- `apps/web/tailwind.config.ts`.
- App-shell create/search/organization switcher churn.
- `stitch-frontend-pass-safety.patch`, screenshots, artifacts, `.vercel`, local env files, build output, and dependency output.

## Safety Boundaries

- Frontend/test/docs only.
- No backend API, Prisma schema, migration, seed/reset/delete, hosted/customer-data mutation, auth/session/security business logic, accounting/business logic, payment/report/journal logic, UAE PINT-AE serializer/rules, ZATCA core behavior, provider integration, real ASP call, real ZATCA call, real email, Supabase command, Vercel command, or production infrastructure command was run.
- No production compliance, provider, certification, accreditation, permanent archive, live bank feed, or official approval claim was added.

## Deployment Notes

- Existing Vercel URLs are prior deployment evidence only:
  - `https://ledgerbyte-ksa.vercel.app`
  - `https://ledgerbyte-uae.vercel.app`
  - `https://ledgerbyte-web-test.vercel.app`
- No deploy was run in this branch.
- No custom domain was configured.

## Remaining Risk

- Provider evidence remains unavailable: no ASP validation, FTA reporting proof, ZATCA production response, sandbox credentials, provider response, or commercial terms.
- The preserved dirty branch still contains excluded UI churn and should not be merged wholesale.
- Final Vercel environment-variable checks should happen only in an explicit deployment/configuration task.

## Recommended Next Prompt

`Review country edition split PR`
