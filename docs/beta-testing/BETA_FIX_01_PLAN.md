# BETA-FIX-01 Plan

Date: 2026-06-23

Branch: `codex/beta-fix-01`

Baseline inspected: `bbd784e482c3e250ad75795570c8bcefebdbff82` (`Capture shell topbar and sidebar UX fixes (#214)`)

## Objective

Resolve the remaining redesigned frontend beta evidence blockers from `BETA-WALKTHROUGH-01`:

- Broad visual families timed out before usable evidence.
- No controlled live test environment walkthrough had been run against the deployed Vercel/Supabase review stack.

This pass is evidence stabilization, not new product implementation.

## Environment

- Live web: `https://ledgerbyte-web-test.vercel.app`
- Live API: `https://ledgerbyte-api-test.vercel.app`
- Supabase test project reference: `xynelbjqcmbgtscfmmzv`
- Demo login: the BETA-FIX-01 prompt-provided beta workspace credentials.

## Safe Scope

Allowed actions:

- Non-mutating HTTP health/readiness checks.
- Login to the controlled beta workspace.
- Navigate seeded data and read-only routes.
- Open topbar/sidebar menus.
- Capture screenshots and JSON walkthrough artifacts.
- Run local mocked Playwright visual shards.
- Update stale frontend visual assertions/snapshots when the redesigned behavior is correct.
- Update evidence docs and issue logs.

Forbidden actions:

- Production data access or mutation.
- Hosted migrations, reseeds, deletes, resets, or destructive database commands.
- Vercel environment mutation.
- Supabase schema/data mutation.
- Provider calls, ZATCA/UAE/Peppol/ASP actions, payment collection, real email, storage/object-storage/signed URL operations.
- Accounting, report, VAT, inventory valuation, banking, or reconciliation logic changes.

## Pass Criteria

- Required visual shards either pass directly or are split into completed sub-shards with precise results.
- Timed-out visual commands are recorded as timeouts and not counted as passes.
- Live environment health/readiness checks return usable status.
- Live walkthrough covers login, topbar, sidebar, core workflow route families, reconciliation history, readiness pages, placeholder honesty, and mobile/tablet quick pass.
- Blocker/high frontend findings are fixed or explicitly logged.
- Final readiness decision is `GO`, `GO with restrictions`, or `NO-GO` with exact rationale.

## No-Mutation Guarantee

This goal did not require a deployment, hosted migration, Supabase mutation, seed/reset/delete, provider call, storage operation, email send, payment action, production smoke, or production database operation.
