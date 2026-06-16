# UI Owner Security Organization Settings Visual QA Sprint Closure

Date: 2026-06-17

Branch: `feature/ui-owner-security-organization-settings-visual-qa`

## Base And Merge Context

- PR `#61` (`Add owner settings generated-document visual QA`) was reverified and merged into `main` first.
- Latest `main` after PR `#61` merge: `b8799c8f4e77c7be87f8a4a5fde0aaec33bc3fde`.
- This branch was created fresh from updated `origin/main`.
- The original ZATCA request-body stash remained preserved and was not restored, dropped, overwritten, or mixed into this work.
- `codex/purchase-bill-seeded-uuid-validation` was left untouched.

## Scope

This was a frontend visual QA, fixture realism, route/action consistency, and documentation sprint only.

Changed scope:

- Local/test-only visual fixture coverage for real role-detail API responses used by `/settings/roles/[id]`.
- New authenticated Playwright visual QA matrix for real Owner organization, team, roles, role detail, audit-log, compliance, setup, and organization setup surfaces.
- Status, readiness, roadmap, audit, handoff, and closure documentation.

Unchanged scope:

- No backend API changes.
- No Prisma schema changes.
- No migrations.
- No seed/reset/delete.
- No hosted/customer-data mutation.
- No real auth provider changes.
- No auth/session/security business logic changes.
- No payment/accounting/business logic changes.
- No report calculation logic changes.
- No journal posting logic changes.
- No UAE PINT-AE changes.
- No ZATCA behavior changes.
- No provider integration changes.
- No real ASP calls.
- No real email.
- No Vercel/Supabase commands.
- No production infrastructure commands.
- No production compliance claims.
- No fake security, SSO, MFA, API, provider, automation, bank-feed, storage, archive, or certification claims.

## Fixture Approach

Fixtures use existing app route contracts, labels, roles, and permissions only.

Owner organization/security states checked:

- Settings redirect to the real team management surface.
- Team members with Owner, Accountant, Sales, Purchases, Viewer, pending invite, suspended user, long names, long emails, status badges, and role controls.
- Role list with system roles, a long custom read-only role, permission counts, member counts, and owner-only role creation.
- Role detail with system role protection, a long custom role, permission matrix, read-only restricted role state, and owner-only save/delete affordances.
- Audit logs with long actor names, long event descriptions, entity links, timestamps, and retention action visibility.
- Compliance readiness as the real API/provider-adjacent settings surface, with controlled-beta/local-readiness wording and no active ASP/FTA claim.
- Guided setup with complete, incomplete, and blocked-provider-evidence states.
- Organization setup with organization name, legal name, VAT number, country, currency, timezone, and mobile-safe form layout.

Unsupported states were documented as skipped. No SSO, MFA, API keys, session management, integration, or security certification feature was invented.

## Routes Checked

- `/settings`
- `/settings/team`
- `/settings/roles`
- `/settings/roles/role-owner`
- `/settings/roles/role-custom-long`
- `/settings/audit-logs`
- `/settings/compliance`
- `/setup`
- `/organization/setup`

Skipped routes because they do not exist:

- `/settings/security`
- `/settings/sessions`
- `/settings/api`
- `/settings/integrations`
- `/settings/organization`
- `/organization`
- `/settings/users`

Intentionally skipped existing route:

- `/settings/zatca` exists, but this branch intentionally avoids ZATCA-specific visual expansion.

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
- Settings cards and registry links point to real app routes or existing placeholders.
- Primary/admin actions are visible only when allowed by existing permissions.
- Owner-only actions are hidden, disabled, or blocked for restricted roles according to existing behavior.
- Tables preserve readable headers and stay inside horizontal scrollers on compact viewports.
- Long organization/user/role/email/event text does not break layout.
- Role chips, status badges, and permission summaries remain readable.
- Empty/restricted states are clear.
- Controls do not crush on mobile.
- Danger/destructive settings actions are not visually over-prominent.
- Mobile layouts stack safely.
- Sidebar and topbar create-menu route links remain real.
- No fake security/provider/certification/SSO/MFA/API claims appear.
- No forbidden UAE/ZATCA/Peppol compliance claims appear.

## Route And Action Consistency

- The spec reads `apps/web/src/lib/sidebar-nav.ts` and `apps/web/src/lib/global-create-actions.ts`.
- App-local `href` values are checked against real App Router pages or existing placeholder scaffolds.
- Settings/organization href checks confirm the real implemented surfaces include `/settings/team`, `/settings/roles`, and `/organization/setup`.
- The checks confirm `/settings/security` and `/settings/api` are not active registry destinations.
- No fake destination routes were added.

## Findings Fixed

- Visual fixture coverage now includes read-only `/roles/:id` responses so the existing role-detail route can be exercised without a real API.
- The visual spec was calibrated to the real app shell account-menu/sign-out variants and organization-loading state.
- No frontend product layout, permission, link, or copy defect required a source UI change in this branch.

## Artifacts

- Screenshots and `visual-results.json` were generated under `artifacts/visual-qa/owner-security-organization-settings-visual-qa/`.
- Generated artifact contents: `84` PNG screenshots and `visual-results.json`.
- Screenshots and large visual artifacts are intentionally not committed because `artifacts/` is ignored.

## Verification

Passed:

- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/owner-security-organization-settings-visual-qa.visual.spec.ts --reporter=line` - `84 passed`.
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
- Forbidden-claim scan over touched visual fixture/spec files and generated `visual-results.json` - clean.

Notes:

- The first visual command failed because the fresh worktree did not yet have local dependencies installed. `corepack pnpm install --frozen-lockfile` restored dependencies without changing the lockfile.
- Two visual calibration runs failed on spec assumptions only: topbar organization/account-control variants. The final visual command passed `84/84`.
- No migrations, seed, reset, delete, smoke, hosted check, real ASP call, real ZATCA call, real email, deploy, or infrastructure command ran.

## Safety Notes

- No backend/API/schema/auth/provider/UAE PINT-AE/ZATCA behavior changed.
- No auth/session/security business logic changed.
- No production compliance claims were added.
- No fake security, SSO, MFA, API, provider, automation, bank-feed, storage, archive, or certification claims were added.
- Provider evidence is still unavailable: no sandbox docs, no credentials, no provider response, and no commercial terms.
- Remaining UI migration/polish scope: deeper real security/session/API settings only if product routes are implemented later, organization profile editing beyond setup, generated-document detail route if added later, storage execution evidence after real provider proof, and accountant/legal review of settings/compliance wording.
