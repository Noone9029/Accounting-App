# BETA-FIX-01 Visual Shard Plan And Results

Date: 2026-06-23

Visual command policy:

- Run individual specs or smaller greps, not one giant visual batch.
- Count only completed commands as pass evidence.
- Record full-file timeouts separately.
- Refresh snapshots only when the current redesigned behavior is correct.
- Keep fixes limited to frontend visual fixtures/assertions unless a real product regression is confirmed.

## Required Shards

| Spec | Strategy | Result | Notes |
| --- | --- | --- | --- |
| `polished-workflows.visual.spec.ts` | Full spec, snapshot refresh, full rerun | PASS 31/31 | Refreshed stale shell/sidebar snapshots after PR #214. |
| `authenticated-route-hardening.visual.spec.ts` | Full file timed out, then desktop/tablet/mobile splits | PASS 60/60 by splits | Updated topbar/account menu assertions for current shell. |
| `quote-workflow.visual.spec.ts` | Full spec | PASS 3/3 | Current quote fixture coverage stable. |
| `delivery-note-workflow.visual.spec.ts` | Full spec after exact heading assertion update | PASS 4/4 | Fixed stale ambiguous heading assertion. |
| `recurring-invoice-workflow.visual.spec.ts` | Full spec | PASS 3/3 | No changes needed. |
| `collections-workflow.visual.spec.ts` | Full spec | PASS 3/3 | No changes needed. |
| `refund-collections-banking-detail-polish.visual.spec.ts` | Full file timed out, then role/viewport splits | PASS 168/168 by splits | Updated current shell assertions and viewer primary-action expectation. |
| `owner-settings-generated-document-storage-evidence.visual.spec.ts` | Full file timed out, then role/consistency splits | PASS 147/147 by splits | Updated generic compliance/account/settings permission expectations. |
| `report-drilldown-dense-entry-visual-qa.visual.spec.ts` | Full spec | PASS 147/147 | Updated current shell assertions. |
| `role-filtered-route-polish.visual.spec.ts` | Full spec | PASS 117/117 | Updated current shell, settings, and compliance expectations. |
| `secondary-operational-route-polish.visual.spec.ts` | Full file timed out, then role/route/consistency splits | PASS 147/147 by splits | Updated stale empty-state, compliance, accounts, documents, and settings permission expectations. |
| `detail-states-accountant-mobile-table-review.visual.spec.ts` | Full spec | PASS 154/154 | No product bug confirmed. |
| `owner-security-organization-settings-visual-qa.visual.spec.ts` | Full spec after test-only route collector/settings permission updates | PASS 93/93 | Updated settings overview permission and scoped route collector to security/organization paths. |

Total required visual evidence completed: 1,077 passing Playwright visual tests.

## Timeout Accounting

Timed-out full-file commands were not counted as passes:

- `authenticated-route-hardening.visual.spec.ts`
- `refund-collections-banking-detail-polish.visual.spec.ts`
- `owner-settings-generated-document-storage-evidence.visual.spec.ts`
- `secondary-operational-route-polish.visual.spec.ts`

Each timed-out file was split and then covered by completed passing commands.

## Fixes Made

All changes were test/snapshot fixture stabilization only:

- Updated shell assertions for Notifications, Help, Account menu, and current account-menu contents.
- Updated settings overview permission expectations to match the current read-only settings hub.
- Updated generic compliance wording expectations.
- Updated stale list/empty-state assertions for customers, suppliers, documents, and delivery-note headings.
- Updated route collector scope in owner security/organization visual QA.
- Refreshed `polished-workflows` screenshots for the current PR #214 shell/sidebar design.

No app runtime behavior, backend behavior, schema, hosted state, provider behavior, storage behavior, compliance behavior, accounting math, report math, VAT math, inventory valuation, banking, or reconciliation logic changed.
