# UI Secondary Operational Route Polish Visual QA Sprint Closure

Date: 2026-06-16

Branch: `feature/ui-secondary-operational-route-polish-visual-qa`

## Base And Merge Context

- PR `#59` (`Add report drilldown dense entry visual QA`) was reverified and merged into `main` first.
- Latest `main` after PR `#59` merge: `b36ffe56f83a79edbe04f148f4e1a86ecf38b5d9`.
- This branch was created fresh from updated `origin/main`.
- The original ZATCA request-body stash remained preserved and was not restored, dropped, overwritten, or mixed into this work.
- `codex/purchase-bill-seeded-uuid-validation` was left untouched.

## Scope

This was a frontend visual QA, fixture realism, route/action consistency, and small route polish sprint only.

Changed scope:

- Local/test-only visual fixtures for secondary operational routes.
- New authenticated Playwright visual QA matrix for contacts, settings, setup, documents, chart of accounts, tax rates, and banking-adjacent routes.
- Small frontend fixes for contact mutation gating and chart-of-accounts form wrapping.
- Status, readiness, roadmap, audit, handoff, and closure documentation.

Unchanged scope:

- No backend API changes.
- No Prisma schema changes.
- No migrations.
- No seed/reset/delete.
- No production auth provider changes.
- No payment/accounting/business logic changes.
- No report calculation logic changes.
- No journal posting logic changes.
- No UAE PINT-AE changes.
- No ZATCA changes.
- No provider integration changes.
- No hosted/customer-data mutation.
- No Vercel/Supabase commands.
- No production infrastructure commands.
- No production compliance claims.
- No fake automation, fake bank feed, fake AI, fake provider connectivity, fake storage connectivity, fake export success, or certification claims.

## Fixture Approach

Fixtures use existing app route contracts, labels, roles, and permissions only.

Customer and supplier lists checked:

- Many rows.
- Long legal names and long contact fields.
- TRN/TIN-style tax fields where the existing contact model exposes them.
- Balances, overdue states, inactive rows, and filtered empty states.

Settings and admin-adjacent states checked:

- Settings overview redirect to team settings.
- Team members with Owner/Admin, Accountant, Sales, Purchases, Viewer, pending invite, inactive/suspended user, and long names/emails.
- Roles with Owner, Accountant, Sales, Purchases, Viewer, and a long custom read-only role.
- Storage readiness without provider/storage production claims.
- Compliance readiness with controlled-beta wording, missing provider evidence, ASP validation not connected, and no FTA reporting yet.
- Audit logs with many rows, long actor names, long event descriptions, entity links, timestamps, and empty/search states.

Operational setup states checked:

- Setup checklist complete, incomplete, and blocked-provider-evidence states.
- Long organization/readiness wording.
- Call-to-action visibility through existing permissions.

Documents and generated-document states checked:

- Long generated document filenames.
- Failed document generation state.
- Local-ready generated PDF/archive rows.
- Filtered empty states.
- No fake certification, real email, production storage, or provider claims.

Accounting/settings states checked:

- Chart of accounts with many accounts, long account names, account codes, active/inactive rows, control/posting rows, and empty/search states.
- Tax rates with UAE VAT 5%, zero-rated/exempt style rows, reverse-charge review wording where supported by existing UI, inactive historical rates, and conservative UAE wording only.
- Number sequences for invoices, bills, credit notes, debit notes, customer/supplier statements, long prefixes, and future-document-only caution.

Banking-adjacent states checked:

- Bank account list with active/inactive/manual records.
- Bank account detail.
- Statement transaction review with unmatched, matched, and rule-suggestion rows.
- No live bank feed, real bank sync, or automatic reconciliation claim.

## Routes Checked

- `/customers`
- `/suppliers`
- `/settings`
- `/settings/team`
- `/settings/roles`
- `/settings/storage`
- `/settings/compliance`
- `/settings/audit-logs`
- `/settings/number-sequences`
- `/accounts`
- `/tax-rates`
- `/setup`
- `/documents`
- `/bank-accounts`
- `/bank-accounts/bank-1`
- `/bank-accounts/bank-1/statement-transactions`

Skipped routes because they do not exist:

- `/settings/users`
- `/settings/organization`
- `/settings/taxes`
- `/settings/numbering`
- `/settings/chart-of-accounts`
- `/settings/security`
- `/settings/api`
- `/settings/uae-einvoicing`
- `/onboarding`
- `/documents/document-1`
- `/generated-documents`
- `/bank-accounts/bank-account-1`
- `/bank-accounts/bank-account-1/transactions`

Intentionally skipped existing route:

- `/settings/zatca` exists, but this branch intentionally avoids ZATCA-specific visual expansion. UAE readiness wording is covered at `/settings/compliance`.

## Roles And Viewports

Roles checked:

- `Owner`
- `Accountant`
- `Viewer`

Viewports checked:

- Desktop `1440x1000`
- Tablet `1024x768`
- Mobile `390x844`

## Visual Assertions

The matrix verifies:

- Route loads or expected existing unauthorized state appears.
- Authenticated shell is visible where expected.
- No document-level horizontal overflow.
- No severe topbar/content overlap.
- Page title or expected route heading is visible.
- Primary actions are visible only when allowed.
- Mutation/settings/export/destructive actions are hidden, disabled, or blocked for restricted roles according to existing behavior.
- Tables preserve readable headers and stay inside horizontal scrollers on compact viewports.
- Long names, emails, account names, filenames, and event descriptions do not break layout.
- Status badges are not clipped.
- Empty states are clear.
- Filters/search controls do not crush mobile layout.
- Danger/destructive settings actions are not visually over-prominent.
- Mobile layouts stack safely.
- Sidebar and topbar create-menu links remain real app routes or existing placeholders.
- Compliance cards use conservative wording.
- No forbidden compliance/provider/certification/storage/bank automation claims appear.

## Route And Action Consistency

- The spec reads `apps/web/src/lib/sidebar-nav.ts` and `apps/web/src/lib/global-create-actions.ts`.
- App-local `href` values are checked against real App Router pages or existing placeholder scaffolds.
- Topbar create-menu disabled states are checked without inventing routes.
- Settings/compliance route wording is checked for controlled-beta/provider-evidence boundaries.
- No fake destination routes were added.

## Findings Fixed

- Viewer could see `Add customer` and `Add supplier` links on contact list pages; those actions now require `contacts.manage`.
- The chart-of-accounts create form caused tablet/mobile document-level horizontal overflow; the form grid now wraps at `md` widths and uses the dense row layout only at `xl`.
- The local visual fixture now covers `/accounts/next-code`, preventing the chart-of-accounts create form from depending on an unhandled local API call during visual QA.
- Visual fixture/assertion calibration was added for storage action text, visible account table text, route/action consistency, and disabled create-menu behavior.

## Artifacts

- Screenshots and `visual-results.json` were generated under `artifacts/visual-qa/secondary-operational-route-polish/`.
- Generated artifact contents: `147` PNG screenshots and `visual-results.json`.
- Screenshots and large visual artifacts are intentionally not committed because `artifacts/` is ignored.

## Verification

Passed:

- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/secondary-operational-route-polish.visual.spec.ts --reporter=line` - `147 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- sidebar` - `3 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- dashboard` - `22 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- invoices` - `12 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- bills` - `8 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- customer-payments` - `32 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- supplier-payments` - `12 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- financial-flow-scene` - `1 passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- report-pages` - `13 passed`.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web build` - passed.
- `corepack pnpm verify:diff` - passed.
- `corepack pnpm verify:ci:local` - passed.
- `git diff --check` - passed.
- `git diff --cached --check` - passed.

Notes:

- The first visual command attempt in the isolated worktree failed because dependencies were not installed in that worktree. `corepack pnpm install --frozen-lockfile` was run, lockfile stayed unchanged, and the final visual command passed.
- Existing React `act(...)` warnings appeared in focused sidebar/report Jest output, but the suites passed.

## Forbidden-Claim Scan

The forbidden-claim scan over touched frontend source, fixture data, docs, and generated `visual-results.json` must remain clean for:

- `FTA certified`
- `Peppol certified`
- `accredited ASP`
- `official UAE provider`
- `production compliant`
- `ZATCA certified`
- `real ASP validation`
- `FTA reporting enabled`
- `live bank feed connected`
- `automatic reconciliation enabled`
- `real bank sync enabled`
- `official VAT approval`
- `certified VAT report`
- `provider connected`
- `production storage enabled`

Result: clean over touched frontend source/test files, visual fixture data, and generated `visual-results.json`.

## Skipped Commands

- No hosted E2E.
- No smoke against hosted environments.
- No seed/reset/delete.
- No migrations.
- No real ASP calls.
- No real ZATCA calls.
- No real email.
- No Vercel/Supabase commands.
- No production infrastructure commands.

## Remaining Scope

- Owner/security settings depth and access-review flows.
- Generated-document storage execution evidence only after real object-storage setup exists.
- Secondary route component migration breadth beyond the checked polish.
- Dense entry-form ergonomics beyond the checked secondary routes.
- Accountant sign-off on settings, compliance, storage, tax, and numbering wording.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
