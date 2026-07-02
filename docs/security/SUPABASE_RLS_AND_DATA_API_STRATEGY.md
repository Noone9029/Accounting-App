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
