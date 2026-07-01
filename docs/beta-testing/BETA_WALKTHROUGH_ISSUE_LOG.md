# Redesigned Frontend Beta Walkthrough Issue Log

Goal ID: `BETA-WALKTHROUGH-01`

Date: 2026-06-23

| ID | Area | Severity | Status | Finding | Resolution or next action |
| --- | --- | --- | --- | --- | --- |
| BETA-WALK-001 | Banking reconciliation history | Medium | Fixed | `/bank-accounts/[id]/reconciliations` produced document-level horizontal overflow at tablet width because a secondary panel switched to horizontal layout too early. | Changed the panel breakpoint from `lg` to `xl`; targeted rerun passed 3/3 and full combined workflow rerun passed 181/181. |
| BETA-WALK-002 | Sales quote visual fixture | Low | Fixed | Quote workflow visual tests were stale after redesigned detail pages added related delivery/collection lookups and the list page rendered a loading heading containing the same text as the page heading. | Tightened heading assertions to exact page heading and added local empty fixture responses for current related lookups; quote suite passed 3/3. |
| BETA-WALK-003 | Remaining broad visual families | Medium | Fixed | Large remaining visual suite batches timed out before returning usable output, so owner/security/settings, report drilldown, detail-state, secondary operational, and role-filtered full-pass evidence was incomplete in `BETA-WALKTHROUGH-01`. | `BETA-FIX-01` split the timed-out files and completed all required shards: 1,077/1,077 Playwright visual tests passed by direct specs or documented splits. |
| BETA-WALK-004 | Live disposable demo org | Medium | Fixed | A real authenticated local API/demo-org walkthrough was not run because no clearly disposable, safe org/runtime was available and the goal forbade seed/reset/delete or hosted mutation. | `BETA-FIX-01` used the deployed Vercel/Supabase test environment non-mutatively; API readiness reported database OK, login worked, and live walkthrough passed 23/23 checks. |
| BETA-WALK-005 | Public/auth visual evidence | Low | Open | Auth and marketing Jest coverage passed, and `BETA-FIX-01` captured live login screenshot evidence, but first-class desktop/tablet/mobile Playwright visual fixtures for public/marketing/auth routes remain thinner than authenticated route coverage. | Add public/auth visual fixtures in a follow-up if beta entry screens require screenshot signoff. |
| BETA-PROV-001 | First tester provisioning | Blocker | Blocked | Approved tester identities were not provided, so accounts, invites, emails, and first real tester onboarding cannot be safely executed. | `CONTROLLED-BETA-PROVISION-01` prepared provisioning docs/templates/checklists and non-mutating environment evidence. Next required goal is `CONTROLLED-BETA-APPROVAL-01`. |

## Closed Fix Evidence

- `BETA-WALK-001`: `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/refund-collections-banking-detail-polish.visual.spec.ts --grep "reconciliations-list at tablet"` passed 3/3.
- `BETA-WALK-001` and `BETA-WALK-002`: full combined workflow rerun passed 181/181.
- `BETA-WALK-003`: `BETA-FIX-01` completed all required visual shards with 1,077 passing tests. Timed-out full-file commands were not counted; they were split and rerun.
- `BETA-WALK-004`: `BETA-FIX-01` completed a live Vercel/Supabase walkthrough with 23/23 checks passing and no hosted mutation.

## Beta Readiness Decision

After `BETA-FIX-01`, LedgerByte is `GO with restrictions` for controlled beta. No product-launch, production-compliance, provider, banking automation, payment, email, storage, signed URL, or production-readiness claim is made by this walkthrough.

`CONTROLLED-BETA-PROVISION-01` does not change that decision. Provisioning is blocked only by missing approved tester identities, not by a new product regression.
