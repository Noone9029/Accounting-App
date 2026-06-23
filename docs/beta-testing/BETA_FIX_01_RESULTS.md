# BETA-FIX-01 Results

Date: 2026-06-23

Branch: `codex/beta-fix-01`

Baseline inspected: `bbd784e482c3e250ad75795570c8bcefebdbff82`

## Decision

`GO with restrictions` for controlled beta.

Reason: the two beta evidence blockers from `BETA-WALKTHROUGH-01` are closed for controlled-beta purposes:

- Required visual families were split into completed shards and passed with 1,077 total Playwright visual tests.
- The live Vercel/Supabase test walkthrough passed 23/23 non-mutating checks, including login, shell controls, sidebar accordion, seeded reconciliation history, core route families, readiness pages, placeholder honesty, and mobile/tablet quick pass.

Restrictions remain:

- Controlled beta only; not public production launch.
- No production compliance, provider, object storage, signed URL, live bank feed, payment collection, real email, or tax-authority submission claim.
- Public/marketing/auth screenshot fixture coverage remains a low-priority evidence gap, although live login was captured in this pass.

## Issues Fixed

No app runtime bug fix was required.

Test/evidence fixes:

- Refreshed `polished-workflows` snapshots for the current PR #214 shell/sidebar design.
- Updated stale topbar/account menu visual assertions.
- Updated stale generic-compliance/settings/account/document/list visual assertions.
- Updated route-family visual collectors to match current registry source shape.

## Remaining Issue Counts

| Severity | Count | Notes |
| --- | ---: | --- |
| Blocker | 0 | No controlled-beta blocker remains from this evidence pass. |
| High | 0 | No high-severity frontend issue found in visual shards or live walkthrough. |
| Medium | 0 | Previous visual timeout and live walkthrough blockers are closed. |
| Low | 1 | Public/marketing/auth visual fixture depth remains thin; live login evidence exists. |

## Verification Summary

- Live environment checks: API root, health, readiness, web login/dashboard/sales/settings/reconciliation routes all returned HTTP 200; API readiness reported `database: ok`.
- Vercel active web deployment: `dpl_67sfsGb68VXWUXwrrtbjgUVN8xub`, commit `bbd784e482c3e250ad75795570c8bcefebdbff82`, no active `gitDirty` metadata.
- Vercel active API deployment: `dpl_68Vxdj6FNYwXgQRdBMwqr4N3Bk1i`, commit `206fd385eb6f1faff9f73d15fa0eea904301f9f1`.
- Live walkthrough: PASS 23/23.
- Required visual evidence: PASS 1,077/1,077 by direct specs or documented splits.

## Safety

No production data, hosted migration, Supabase mutation, Vercel env mutation, seed/reset/delete, provider call, ZATCA/UAE/Peppol/ASP action, payment collection, real email, object-storage/signed-URL action, accounting logic change, report math change, VAT math change, inventory valuation change, banking/reconciliation logic change, or shutdown action was performed.

Next recommended goal: `CONTROLLED-BETA-LAUNCH-01: Prepare controlled beta launch packet and tester onboarding.`
