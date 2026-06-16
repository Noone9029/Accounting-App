# UI Owner Settings Generated Document Storage Evidence Visual QA Sprint Closure

Date: 2026-06-16

Branch: `feature/ui-owner-settings-generated-document-storage-evidence-qa`

## Base And Merge Context

- PR `#60` (`Add secondary operational route visual QA`) was reverified and merged into `main` first.
- Latest `main` after PR `#60` merge: `85813f7217d32babebf71412f43ea8034f0c0d07`.
- This branch was created fresh from updated `origin/main`.
- The original ZATCA request-body stash remained preserved and was not restored, dropped, overwritten, or mixed into this work.
- `codex/purchase-bill-seeded-uuid-validation` was left untouched.

## Scope

This was a frontend visual QA, fixture realism, route/action consistency, and small copy polish sprint only.

Changed scope:

- Local/test-only visual fixtures for Owner-heavy settings, generated-document archive, and storage evidence states.
- New authenticated Playwright visual QA matrix for Owner settings, document settings, generated documents, storage evidence, setup, accounts, tax rates, and source transaction document evidence surfaces.
- Small frontend wording polish for ZATCA denial copy on document guidance and purchase debit note detail.
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
- No ZATCA behavior changes.
- No provider integration changes.
- No generated-document business logic changes.
- No storage provider logic changes.
- No hosted/customer-data mutation.
- No Vercel/Supabase commands.
- No production infrastructure commands.
- No production compliance claims.
- No fake provider, storage, archive, certification, bank automation, or email claims.

## Fixture Approach

Fixtures use existing app route contracts, labels, roles, and permissions only.

Owner settings states checked:

- Team members with Owner, Accountant, Sales, Purchases, Viewer, pending invite, suspended user, long user name, long email, and role chip wrapping.
- Roles with default roles, a long custom read-only role, permission summaries, and owner-only role creation behavior.
- Storage readiness with database storage, generated-document counts, migration dry-run rows, backup readiness, metadata-only backup evidence rows, revoked evidence rows, and owner-only capture actions.
- Compliance readiness with controlled-beta wording, local readiness fields, missing provider evidence, ASP validation not connected, and no FTA reporting yet.
- Audit logs with many rows, long actor names, long event descriptions, entity links, timestamps, and retention labels.
- Number sequences for invoices, bills, credit notes, debit notes, and statements with long prefixes and future-document-only caution.
- Setup checklist, chart of accounts, and tax rates with existing route labels and conservative UAE/VAT wording.

Generated-document and storage evidence states checked:

- Documents archive with generated, failed, and superseded rows.
- Long generated-document filenames.
- Invoice PDF/generated output row.
- Credit note PDF/generated output row.
- Purchase bill generated output row.
- Purchase debit note generated output row.
- Local-ready database-storage metadata.
- Failed generation state.
- Filtered empty state.
- Source transaction document archive guidance on invoice, bill, credit note, and debit note detail routes.
- Permissioned download/action visibility using existing permissions.
- No fake certification, provider submission, production storage, or permanent archive claim.

## Routes Checked

- `/settings`
- `/settings/team`
- `/settings/roles`
- `/settings/storage`
- `/settings/compliance`
- `/settings/audit-logs`
- `/settings/number-sequences`
- `/settings/documents`
- `/setup`
- `/accounts`
- `/tax-rates`
- `/documents`
- `/sales/invoices/invoice-1`
- `/purchases/bills/bill-1`
- `/sales/credit-notes/credit-note-1`
- `/purchases/debit-notes/debit-note-1`

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
- Settings, mutation, finalize, delete, download, and owner-only actions are hidden, disabled, or blocked for restricted roles according to existing behavior.
- Tables preserve readable headers and stay inside horizontal scrollers on compact viewports.
- Long names, emails, account names, filenames, evidence notes, and event descriptions do not break layout.
- Status badges are not clipped.
- Empty states are clear.
- Filters/search/settings controls do not crush mobile layout.
- Danger/destructive settings actions are not visually over-prominent.
- Mobile layouts stack safely.
- Sidebar and topbar create-menu links remain real app routes or existing placeholders.
- Storage evidence/status copy is conservative.
- Compliance copy remains controlled-beta/local-readiness only.
- No forbidden compliance/provider/certification/storage/archive claims appear.

## Route And Action Consistency

- The spec reads `apps/web/src/lib/sidebar-nav.ts` and `apps/web/src/lib/global-create-actions.ts`.
- App-local `href` values are checked against real App Router pages or existing placeholder scaffolds.
- Topbar create-menu disabled states are checked without inventing routes.
- Settings card, document guidance, generated-document archive, and source transaction links resolve to real app routes.
- No fake destination routes were added.

## Findings Fixed

- Generated-document fixtures now include invoice, credit note, purchase bill, purchase debit note, superseded, failed, and local-ready database-storage rows.
- Storage fixture evidence now includes metadata-only database backup, generated-document backup, and RPO/RTO review rows without executing backup or restore work.
- Purchase debit note and shared document guidance copy now says unsupported ZATCA network submission is not enabled without using stronger "real network" phrasing.
- Visual spec calibration matched existing permissions: Accountant can manage accounts and tax rates; Viewer restricted actions may be hidden or disabled depending on the existing route.

## Artifacts

- Screenshots and `visual-results.json` were generated under `artifacts/visual-qa/owner-settings-generated-document-storage-evidence/`.
- Generated artifact contents: `147` PNG screenshots and `visual-results.json`.
- Screenshots and large visual artifacts are intentionally not committed because `artifacts/` is ignored.

## Verification

Passed:

- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/owner-settings-generated-document-storage-evidence.visual.spec.ts --reporter=line` - `147 passed`.
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
- Forbidden-claim scan over touched frontend/test files, fixture data, and generated `visual-results.json` - clean.

Notes:

- The first two visual command attempts were useful calibration runs and failed on spec assumptions only: compliance "claims to avoid" wording, debit note fixture number prefix, Accountant account/tax permissions, and Viewer disabled settings/action states. The final visual command passed `147/147`.
- Existing React `act(...)` warnings appeared in focused sidebar/report Jest output, but the suites passed.
- `verify:ci:local` ran its standard non-mutating plan, including `db:generate`; no migrations, seed, reset, delete, smoke, hosted check, real ASP call, real ZATCA call, real email, deploy, or infrastructure command ran.

## Safety Notes

- No backend/API/schema/auth/provider/UAE PINT-AE/ZATCA behavior changed.
- No report calculation logic changed.
- No generated-document business logic changed.
- No storage provider logic changed.
- No production compliance claims were added.
- No fake provider/storage/archive/certification claims were added.
- Provider evidence is still unavailable: no sandbox docs, no credentials, no provider response, and no commercial terms.
- Remaining UI migration/polish scope: owner/security settings depth, generated-document detail route if the product later adds it, storage execution evidence after real object-storage proof, accountant review of settings/compliance wording, and broader non-visual verification of generated-document archive behavior.
