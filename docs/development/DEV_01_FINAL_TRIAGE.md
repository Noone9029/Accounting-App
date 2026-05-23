# DEV-01 Final Triage

Status: completed during DEV-01 Part 8 on 2026-05-23.

Latest pushed state inspected at start of Part 8: `996a2ca QA DEV-01 reports settings admin routes`.

## DEV-01 Scope Completed

DEV-01 covered committed web route QA and blocker triage only. It did not research production hosting, deploy, provision, migrate, seed, reset, delete, change environment variables, change Vercel/Supabase settings, change database schema, run destructive commands, execute login-dependent audit-writing flows, run ZATCA/email flows, export/download reports or PDFs, mutate business records, or implement placeholder modules.

The completed DEV-01 evidence is mixed-depth:

- Route inventory from committed `apps/web/src/app` files.
- Shell HTTP route-load checks where local web/API runtime was available.
- API `/health` and `/readiness` checks as runtime readiness proof only.
- Graphify-assisted dependency/blast-radius review where graph output existed.
- Source-level review for authenticated route behavior because Browser local route visits were blocked.
- Targeted frontend-only fixes for confirmed route/permission/link/wording defects.

## Route Batches Completed

| DEV-01 part | Batch | Evidence summary |
| --- | --- | --- |
| Part 1 | Route inventory and QA batch plan | Completed route inventory, route grouping, placeholder notes, and batch plan. |
| Part 2 | Auth, dashboard, setup, navigation | Browser/runtime and code review where possible; API health was blocked at that time. |
| Part 3 | Sales/AR | Mostly code review due Browser URL policy and API health blocker; one query-prefill fix. |
| Part 3.5 | Local QA runtime blocker triage | Identified missing local Postgres/Redis as the API blocker; created runbook; later local services were healthy. |
| Part 4 | Purchases/AP | Shell route checks, Graphify-assisted review, and small prefill fixes. |
| Part 5 | Banking/reconciliation | Shell route checks, Graphify-assisted review, and small permission/link fixes. |
| Part 6 | Inventory | Shell route checks, Graphify-assisted review, and small permission/filter/export fixes. |
| Part 7 | Reports/documents/settings/admin/audit | Shell route checks, Graphify-assisted review, and export/download permission fixes. |
| Part 8 | Placeholder/unimplemented routes and final triage | Shell route checks, Graphify-assisted review, placeholder permission/wording fix, and this final triage. |

## Shell Route Checks By Batch

Only counts explicitly captured in DEV-01 logs are listed.

| Batch | Shell route checks |
| --- | ---: |
| Purchases/AP | 21 routes returned `200`. |
| Banking/reconciliation | 14 routes returned `200`. |
| Inventory | 28 routes returned `200`. |
| Reports/documents/settings/admin/audit | 24 routes returned `200`. |
| Placeholder/titleMap sweep | 31 titleMap paths returned `200`; 20 rendered placeholder copy and 11 exact real pages did not. |
| Real route shadow spot-check | 5 routes returned `200` and did not render placeholder copy. |

## Fixes Completed Across DEV-01

- `/setup`, `/organization/setup`, and app-shell placeholder routes were guarded from unauthenticated exposure by the app-shell permission boundary.
- `/sales/invoices/new` now honors `?customerId=...`.
- `/purchases/bills/new` now honors `?supplierId=...`.
- `/purchases/supplier-payments/new` now honors `?supplierId=...&billId=...` and preselects the target open-bill amount.
- Banking detail/reconciliation pages hide create/import/transfer/report-download links unless matching permissions exist; draft reconciliation creation route now requires create permission.
- `/items` avoids management-only account/tax-rate fetches for viewers.
- `/inventory/stock-movements` honors query filters and hides adjustment/transfer links unless matching create permissions exist.
- Inventory clearing report CSV buttons, core report CSV/PDF buttons, and generated-document archive downloads are permission-gated.
- Placeholder/future-module direct URLs now use nearest existing permissions instead of only `dashboard.view`.
- Placeholder copy now states no live integration, payroll, bank-feed, billing, ZATCA, email, posting, or production workflow runs from placeholders.

## Remaining Blockers By Severity

### Blocker

- Authenticated browser-runtime QA is not complete because the in-app Browser local URL policy blocks route visits and login-dependent QA was avoided to prevent audit-log writes.
- DEV-01 has no approved safe fixture for restricted-role browser/runtime QA across all route groups.

### High

- State-machine mutation QA remains deferred: invoice/bill finalization and voiding, payment/refund allocation and reversal, credit/debit note allocation and reversal, bank reconciliation lifecycle, inventory adjustment/transfer/receipt/issue/proposal workflows, journal posting/reversal, fiscal period transitions, and settings/admin mutations.
- Output-producing QA remains deferred: report CSV/PDF export, generated-document download, audit CSV export, PDF/archive generation, attachment workflows, and document/template output checks.
- Dedicated future-module permissions do not yet exist for payroll, fixed assets, projects, cost centers, beneficiaries, integrations, API keys, and document templates.

### Medium

- `/settings/team` loads `/roles`; a custom `users.view` role without `roles.view` may need a clearer fallback or a policy decision.
- `/settings/storage` exposes backup evidence controls through `auditLogs.manageRetention`; confirm the intended storage/backup permission policy.
- `/settings/email-outbox` uses `users.manage` for diagnostics/evidence/suppression/cleanup; confirm whether a dedicated email-admin permission is needed.
- Credit-note, debit-note, inventory adjustment, purchase receipt, and sales stock issue update/void permissions reuse create permissions in places where dedicated update/void permissions may be clearer.
- `/inventory/variance-proposals/new` depends on accounts while visible route permission only requires variance proposal creation.
- Placeholder route duplicates such as `/products`, `/accounting`, `/sales`, and `/purchases` need a UX decision: redirect, real index page, or remain direct-only placeholders.

### Low

- Browser-level sidebar active states, responsive layout, exact empty/error rendering, and invalid-id/not-found states still need visual/runtime QA.
- Graphify output remains useful but stale; future dependency review should refresh it before treating graph edges as current planning input.

## Deferred Runtime And Browser QA

- Authenticated app-shell route rendering with real local session.
- Restricted-role access-denied rendering and sidebar filtering.
- Organization switching and tenant context behavior.
- Dynamic detail routes with real missing/invalid ids.
- Browser layout and responsive behavior on desktop/mobile.
- Browser-level placeholder access-denied behavior for unauthenticated and restricted roles.

## Deferred Mutation And State-Machine QA

- Sales/AR: invoice finalization/voiding, credit allocation/reversal, customer payment allocation/reversal, customer refund voiding, PDF/archive generation.
- Purchases/AP: purchase order approval/void/convert, bill finalization/voiding, supplier payment allocation/reversal, supplier refund voiding, debit-note allocation/reversal, cash expense voiding.
- Banking/reconciliation: bank profile mutation, statement import/preview/parse/import, match/categorize/ignore, reconciliation submit/approve/close/reopen/void, bank transfer posting/voiding.
- Inventory: item/warehouse mutations, stock movement creation, adjustment approve/void/delete, warehouse transfer void, purchase receipt/sales issue post/void/reverse, variance proposal submit/approve/post/reverse/void.
- Reports/documents/admin: exports/downloads/PDFs, account/tax/branch/settings changes, journal post/reverse, team invite/member changes, role changes, storage/email/ZATCA/audit retention actions.

## Permission-Policy Questions

- Should future modules get dedicated permissions before any route leaves placeholder state?
- Should `/products` redirect to `/items` or become a real product/service index?
- Should `/accounting`, `/sales`, and `/purchases` become real area index pages instead of placeholder roots?
- Should email administration use a dedicated `email.manage` or `emailOutbox.manage` permission instead of `users.manage`?
- Should backup/storage evidence use dedicated storage/backup permissions instead of `auditLogs.manageRetention`?
- Should credit/debit note edits and inventory lifecycle actions get dedicated update/void permissions?
- Should variance-proposal creation require accounts visibility or provide a narrower account picker dependency?

## Intentionally Placeholder-Only Routes

The following committed `titleMap` paths are intentionally placeholder-only after DEV-01:

- `/get-started`
- `/inbox`
- `/sales`
- `/sales/quotes`
- `/sales/recurring-invoices`
- `/sales/cash-invoices`
- `/sales/delivery-notes`
- `/sales/api-invoices`
- `/purchases`
- `/beneficiaries`
- `/payroll`
- `/products`
- `/accounting`
- `/fixed-assets`
- `/cost-centers`
- `/projects`
- `/developer`
- `/developer/api-keys`
- `/integrations`
- `/document-templates`

Exact real pages that overlap `titleMap` keys were verified not to be shadowed by the catch-all in shell checks, including `/reports`, `/sales/invoices`, `/purchases/bills`, `/bank-accounts`, and `/branches`.

## Recommended Fixes Before DEV-02 Execution Gates

- Define safe local/browser runtime policy for authenticated QA without leaking secrets or relying on production data.
- Create or document a safe restricted-role fixture strategy.
- Decide which mutation workflows can be safely tested with local/demo data and which must remain code-review only.
- Convert deferred blockers into a command matrix that separates safe unit/typecheck/build checks from smoke/E2E/mutation/export/download checks.
- Decide dedicated permission strategy for future modules and shared admin/email/storage policies before expanding those pages.
- Decide UX handling for placeholder roots and synonyms: redirect, hide, or build real index pages.

## Recommended Next Ticket

`DEV-02 Part 1: verification gate inventory`
