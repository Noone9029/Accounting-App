# Supabase RLS and Data API Strategy

Status: phased strategy, not executed
Date: 2026-07-02

## Source Guidance Checked

Current Supabase documentation says RLS is defense in depth for Postgres tables, and the Data API should expose only tables/views protected by RLS and explicit privileges. Supabase changelog guidance also notes newer projects are moving away from automatic public-schema Data/GraphQL API exposure for new tables, so LedgerByte should make grants/default privileges explicit instead of relying on platform defaults.

## LedgerByte Position

LedgerByte currently uses Supabase as managed Postgres behind the Nest API. The web app should not directly access LedgerByte app tables through Supabase REST/GraphQL/Realtime/Storage clients.

## Phased Strategy

| Phase | Action | Mutation? | Exit criteria |
| --- | --- | --- | --- |
| 0 | Keep current API-only data path; document grants/RLS posture. | No | Current docs and diagnostics merged. |
| 1 | Read-only hosted grants/default privilege audit. | No | Inventory of exposed schemas, anon/authenticated grants, views, functions, default privileges. |
| 2 | Runtime-role cutover in test/staging. | Yes, dedicated goal only | API passes smoke and cross-tenant tests using least-privilege role. |
| 3 | RLS pilot on low-risk table family. | Yes, dedicated goal only | Policies tested for service behavior, update/select semantics, and no accidental browser access. |
| 4 | Broaden RLS/Data API hardening. | Yes, staged | All exposed objects have explicit grants and reviewed policies or are unexposed. |

## RLS Policy Rules

- Do not blindly use `TO authenticated` without row ownership/tenant predicates.
- Do not rely on user-editable metadata claims for authorization.
- Include both `USING` and `WITH CHECK` for update/insert policies where applicable.
- Review views and functions separately; RLS does not protect functions automatically.
- Keep `service_role` and admin credentials out of browser contexts.

## Current Blockers

- No safe hosted mutation is part of this PR.
- Runtime role password creation and Vercel secret cutover require a separate reviewed execution window.
- Existing Data API/default-privilege state must be re-audited live before changes.

## SECURITY-EXECUTION-01 Evidence

Phase 0 now includes local/source-only evidence under `docs/security/evidence/`:

- Tenant model scope catalog.
- API controller/service tenancy-risk catalog.
- Environment separation name-presence check.
- Seed/demo/cleanup/deploy/migration/provider/compliance script inventory.

This does not enable RLS, inspect live hosted grants, mutate Supabase, mutate Vercel, or prove Data API posture.

## SECURITY-TENANT-ISOLATION-04 Matrix Update

`docs/security/SUPABASE_RLS_POLICY_READINESS_MATRIX.md` now maps all 112 Prisma models to future RLS policy-design readiness:

- Direct tenant-key models can move to draft policy design after API-level denial tests are planned.
- Join-table and parent-path models need explicit parent path review before policy SQL exists.
- Tenant root, user-scoped, system/admin, and global-reference models require separate grants/admin handling.
- Data API exposure remains high risk unless tables stay API-only or RLS/grants are proven in a separate hosted goal.

No executable SQL policy was written or applied. RLS remains inactive, Supabase hosted grants were not inspected, and browser Data API access to LedgerByte app tables is still not approved.
