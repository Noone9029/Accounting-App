# UI Redesign Responsive QA

Date: 2026-06-22

Breakpoints used: 390px mobile, 768/820/1024px tablet depending on existing spec, and 1366/1440px desktop.

| Family | 390 mobile | 768/820/1024 tablet | 1440 desktop | Finding |
| --- | --- | --- | --- | --- |
| Dashboard | Polished/authenticated pass. | Polished/authenticated pass. | Polished/authenticated pass. | No current overflow. |
| Sales | Authenticated sales routes pass; polished invoice detail passes. | Pass for authenticated sales routes. | Pass. | Quote/delivery older specs need fixture refresh. |
| Purchases | Authenticated purchase bill routes pass; polished bill detail passes. | Pass for covered routes. | Pass. | Purchase-order/AP/matching visuals still need expansion. |
| Banking | Authenticated bank accounts pass; polished bank detail/import/reconciliation assertions pass. | Pass for representative covered routes. | Pass. | Deeper statement/rules/reconciliation detail visuals remain follow-up. |
| Contacts | Polished statements and authenticated customer/supplier detail pass. | Pass. | Pass. | No confirmed overflow. |
| Inventory | Polished stock valuation/items/warehouse/receipt/adjustment/transfer assertions pass. | Pass for covered routes. | Pass. | Deep inventory reports/settings visuals remain follow-up. |
| Accounting/admin | Audit logs initially overflowed at tablet/mobile. | Fixed with topbar `xl` breakpoint and audit-log panel `min-w-0`; targeted rerun PASS. | Pass for targeted route. | Full owner/settings spec still needs fixture refresh. |
| Reports | Polished reports pass; audit-log dense route fixed. | Targeted audit-log pass after fix. | Pass. | Full report-drilldown rerun deferred. |
| Documents/storage | Polished documents and authenticated storage pass. | Pass. | Pass. | No confirmed overflow. |
| Settings/compliance | Authenticated storage/compliance pass. | Pass. | Pass. | ZATCA-specific visuals deferred. |
| Setup/onboarding | Polished setup pass. | Pass. | Pass. | No confirmed overflow. |
| Auth/public/marketing | Code/test review only. | Code/test review only. | Code/test review only. | Need visual fixtures. |

## Confirmed Responsive Fixes

- Topbar now keeps stacked layout until `xl`, preventing sidebar plus tablet topbar controls from creating document-level overflow.
- Audit-log table/detail panels now use `min-w-0`, allowing the dense audit table to remain inside its horizontal scroller on tablet/mobile.
- Final reruns passed after the fixes: `polished-workflows.visual.spec.ts` 31/31, `authenticated-route-hardening.visual.spec.ts` 60/60, and targeted audit-log tablet/mobile visual checks 6/6.

## Remaining Responsive Gaps

- Add public/auth visual fixtures.
- Refresh broad owner-settings/report-drilldown specs after copy/fixture updates, then rerun complete 390/1024/1440 sweeps.
