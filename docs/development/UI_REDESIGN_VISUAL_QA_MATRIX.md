# UI Redesign Visual QA Matrix

Date: 2026-06-22

Base: `d12535cd2fc608797bc4664543cbbb1920379406`

## Visual Runs

| Spec used | Route/family | Viewport | Result | Screenshot updated | Blocker or note |
| --- | --- | --- | --- | --- | --- |
| `polished-workflows.visual.spec.ts` | Setup, dashboard, reports, customer/supplier statements, invoice/bill detail, bank account detail, stock valuation, documents, route assertions | 1366/820/390 | Final rerun PASS, 31/31. Initial run had 30 passed / 1 transient failure; targeted `/reports` tablet rerun passed before the final clean rerun. | No | Final rerun confirms the transient "Loading access" state did not persist. |
| `authenticated-route-hardening.visual.spec.ts` | Dashboard, sales invoice list/new, purchase bill list/new, customer/supplier detail, customer/supplier payments, credit/debit notes, documents, reports, compliance, storage, bank accounts | 1440/1024/390 | Final rerun PASS, 60/60 after stale assertion updates and topbar breakpoint fix. | No | Updated test-only expectations for current banner/compliance/dashboard copy. |
| `quote-workflow.visual.spec.ts` | Sales quote create/edit/detail/conversion | Existing fixture viewport | Attempted; failed on older fixture console 404 expectations. | No | Blocked by mocked API fixture gaps for routes now requested by the redesigned shell/detail panels. No product bug confirmed. |
| `recurring-invoice-workflow.visual.spec.ts` | Recurring invoice workflow | Existing fixture viewport | Included in broader command; no failure listed in final failure set. | No | Covered in attempted 307-test batch. |
| `delivery-note-workflow.visual.spec.ts` | Delivery note list/create/edit/detail | Existing fixture viewport | Attempted; 2 failures. | No | Blocked by older fixture expectations/missing mocked API coverage after redesign route shell expansion. |
| `collections-workflow.visual.spec.ts` | Collections workflow | Existing fixture viewport | PASS, 3/3. | No | Mocked local-only API fixture; no real mutations. |
| `owner-settings-generated-document-storage-evidence.visual.spec.ts` | Settings, team, roles, storage, audit logs, documents, setup, accounts/tax, document detail routes | 1440/1024/390 | Attempted; many passes, failures from stale expected text and the audit-log overflow. | No | Audit-log overflow fixed separately; remaining failures are stale route expected text/permission fixture expectations. |
| `report-drilldown-dense-entry-visual-qa.visual.spec.ts` | Reports, statements, documents, audit logs | 1440/1024/390 | Attempted; audit-log overflow failures found. Final targeted audit-log tablet/mobile rerun PASS, 6/6 after fix. | No | Full rerun deferred until older broad spec fixture expectations are refreshed. |

## Required Family Coverage

| Family | Current visual evidence | Status |
| --- | --- | --- |
| Dashboard | Polished workflow and authenticated route hardening at desktop/tablet/mobile. | Passed after current test update. |
| Sales invoices | Polished invoice detail plus authenticated invoice list/new at desktop/tablet/mobile. | Passed. |
| Sales quotes | Quote workflow spec attempted. | Blocked by stale/missing fixture API coverage. |
| Purchase bills | Polished bill detail plus authenticated purchase bill list/new at desktop/tablet/mobile. | Passed. |
| Purchase orders | Historical fixture coverage only; no current standalone pass. | Deferred, fixture expansion needed. |
| Bank accounts/reconciliation/statement review | Polished bank account, transfer/import/reconciliation assertions; authenticated bank accounts. | Representative pass. |
| Contacts/customers/suppliers | Polished statements and authenticated customer/supplier detail. | Passed. |
| Inventory balances/items/warehouses | Polished stock valuation/items/warehouse/receipt/adjustment/transfer assertions. | Representative pass. |
| Reports/report packs | Polished reports and report drilldown attempted. | Reports pass in polished; report drilldown audit overflow fixed; report packs deferred. |
| Documents | Polished documents and authenticated documents/storage. | Passed. |
| Settings/storage/ZATCA/compliance | Authenticated storage/compliance passed; owner settings attempted; ZATCA-specific expansion skipped. | Representative pass with known fixture-refresh gap. |
| Setup/onboarding | Polished setup and owner settings setup. | Passed. |
| Auth/login/register/reset/invite | No Playwright visual fixture exists. | Skipped with blocker. |
| Marketing landing/public | No Playwright visual fixture exists. | Skipped with blocker. |

## Fixes From Visual QA

- `apps/web/src/components/app-shell/topbar.tsx`: changed the topbar horizontal row breakpoint from `lg` to `xl` so the desktop sidebar plus topbar controls do not force document-level overflow at 1024px.
- `apps/web/src/app/(app)/settings/audit-logs/page.tsx`: added `min-w-0` to the audit log table/detail panels so dense table content stays inside the intended horizontal scroller.
- `tests/visual/authenticated-route-hardening.visual.spec.ts`: updated stale assertions for current conservative compliance/dashboard copy.

## Known Visual Gaps

- Public/auth and marketing need first-class visual fixtures.
- Older quote, delivery-note, owner-settings, and report-drilldown broad specs need fixture refreshes for current redesigned shell routes and expected copy.
- ZATCA-specific visual expansion should remain readiness-only and must not execute provider/compliance actions.

## Final Visual Verification

- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/polished-workflows.visual.spec.ts`: PASS, 31/31.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/authenticated-route-hardening.visual.spec.ts`: PASS, 60/60.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/report-drilldown-dense-entry-visual-qa.visual.spec.ts --grep "audit-logs at (tablet|mobile)"`: PASS, 6/6.
