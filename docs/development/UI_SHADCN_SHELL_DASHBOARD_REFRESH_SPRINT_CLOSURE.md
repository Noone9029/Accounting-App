# UI shadcn shell/dashboard refresh sprint closure

Date: 2026-06-16

Branch: `feature/ui-shadcn-shell-dashboard-refresh`

Base: `origin/main` at `2d99e42be0ab2d6d2f45fd36091bb9f3f0bece6c` after PR `#49` was merged.

## Scope completed

- Introduced shadcn/ui as the frontend component foundation for `apps/web`.
- Added LedgerByte wrapper components for page headers, KPI cards, data tables, filters, status badges, empty states, action grids, and panel sections.
- Reworked the app shell with a dark grouped sidebar, cleaner top command bar, existing organization switcher, existing global search trigger behavior, existing create-menu route contracts, permission-filtered navigation, and mobile sheet navigation.
- Redesigned `/dashboard` around existing dashboard summary and onboarding data only.
- Added one restrained Three.js financial-flow visual on the dashboard header/background layer.
- Migrated the sales invoices list and purchase bills list to the new list pattern.
- Migrated the sales invoice workflow guidance/detail surface to the new panel/action pattern.

## Safety boundaries

- Frontend-only modernization.
- No backend API changes.
- No Prisma schema or migration changes.
- No UAE PINT-AE behavior changes.
- No ZATCA behavior changes.
- No provider adapter changes.
- No Vercel, Supabase, hosted data, or production infrastructure changes.
- No production compliance claims were added.
- No fake dashboard numbers, fake automation, fake compliance state, or non-functional action controls were added.
- Controlled beta/user-testing wording remains preserved.

## Three.js usage

- `three` is used only by `apps/web/src/components/dashboard/financial-flow-scene.tsx`.
- The scene is a subtle animated line/flow visual behind the dashboard header.
- It is client-only, cleans up animation frames and WebGL resources, and falls back for reduced motion, unavailable WebGL, and jsdom tests.
- It does not imply accounting automation, live financial connectivity, compliance readiness, or production status.

## Screens migrated

- App shell layout/sidebar/topbar.
- `/dashboard`.
- `/sales/invoices`.
- `/purchases/bills`.
- Sales invoice workflow guidance/detail surface.

## Verification

- `corepack pnpm --filter @ledgerbyte/web test -- sidebar`
- `corepack pnpm --filter @ledgerbyte/web test -- dashboard`
- `corepack pnpm --filter @ledgerbyte/web test -- invoices`
- `corepack pnpm --filter @ledgerbyte/web test -- bills`
- `corepack pnpm --filter @ledgerbyte/web typecheck`

Additional repository verification and browser visual verification are tracked in the PR handoff.

## Skipped

- No migrations.
- No seed/reset/delete.
- No smoke or E2E.
- No hosted checks.
- No ASP, ZATCA, or email calls.
- No Vercel/Supabase commands.
- No production infrastructure commands.

## Remaining UI migration scope

- Secondary list/detail routes.
- Dense entry forms and line-item editors.
- Reports and settings surfaces.
- More mobile edge states.
- More role-filtered authenticated screenshots.
- Gradual replacement of one-off styling with the new LedgerByte wrappers.

## Next recommended prompt title

`LedgerByte secondary routes shadcn UI migration`
