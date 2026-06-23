# Redesigned Frontend Beta Walkthrough Issue Log

Goal ID: `BETA-WALKTHROUGH-01`

Date: 2026-06-23

| ID | Area | Severity | Status | Finding | Resolution or next action |
| --- | --- | --- | --- | --- | --- |
| BETA-WALK-001 | Banking reconciliation history | Medium | Fixed | `/bank-accounts/[id]/reconciliations` produced document-level horizontal overflow at tablet width because a secondary panel switched to horizontal layout too early. | Changed the panel breakpoint from `lg` to `xl`; targeted rerun passed 3/3 and full combined workflow rerun passed 181/181. |
| BETA-WALK-002 | Sales quote visual fixture | Low | Fixed | Quote workflow visual tests were stale after redesigned detail pages added related delivery/collection lookups and the list page rendered a loading heading containing the same text as the page heading. | Tightened heading assertions to exact page heading and added local empty fixture responses for current related lookups; quote suite passed 3/3. |
| BETA-WALK-003 | Remaining broad visual families | Medium | Blocked | Large remaining visual suite batches timed out before returning usable output, so owner/security/settings, report drilldown, detail-state, secondary operational, and role-filtered full-pass evidence is incomplete in this goal. | Run smaller dedicated files/greps in `BETA-FIX-01`; do not count timed-out output as pass. |
| BETA-WALK-004 | Live disposable demo org | Medium | Blocked | A real authenticated local API/demo-org walkthrough was not run because no clearly disposable, safe org/runtime was available and this goal forbids seed/reset/delete or hosted mutation. | Prepare a disposable demo organization/runtime explicitly approved for user-testing walkthroughs before launch signoff. |
| BETA-WALK-005 | Public/auth visual evidence | Low | Open | Auth and marketing Jest coverage passed, but first-class desktop/tablet/mobile screenshot evidence for public/auth entry remains thinner than authenticated route visual coverage. | Add public/auth visual fixtures in a follow-up if beta entry screens require screenshot signoff. |

## Closed Fix Evidence

- `BETA-WALK-001`: `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/refund-collections-banking-detail-polish.visual.spec.ts --grep "reconciliations-list at tablet"` passed 3/3.
- `BETA-WALK-001` and `BETA-WALK-002`: full combined workflow rerun passed 181/181.

## Beta Readiness Decision

`BETA-FIX-01` is required before controlled beta launch because evidence blockers remain. No product-launch, production-compliance, provider, banking automation, payment, email, storage, signed URL, or hosted readiness claim is made by this walkthrough.
