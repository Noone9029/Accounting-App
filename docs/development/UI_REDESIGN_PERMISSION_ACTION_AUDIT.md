# UI Redesign Permission And Action Audit

Date: 2026-06-22

Method: code review of `packages/shared/src/permissions.ts`, `apps/web/src/lib/permissions.ts`, `apps/web/src/lib/app-routes.ts`, app shell create/search tests, route code, and existing focused tests. Mutation buttons were not clicked against a live backend.

| Route/family | Action | Visible to whom | Permission guard | Disabled/blocked state | Mutation risk | Current status | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sales invoices | create/edit/finalize/void/delete/payment/refund/download | Role-based | `salesInvoices.*`, payment/refund/generated document permissions | Draft/finalized/voided states gate actions | High | Existing guards preserved; visual/test review only. | Beta walkthrough should observe only, not mutate. |
| Sales quotes/delivery/recurring/collections/returns | lifecycle/create/edit/download | Role-based | Sales invoice and route-specific guards | Non-posting and terminal status copy | Medium | Existing guards preserved. | Refresh stale visual fixtures. |
| Purchases bills/debit notes/orders/payments/refunds/returns | finalize/pay/void/delete/refund/receive/download | Role-based | `purchaseBills.*`, supplier payment/refund, purchase order, receiving, generated docs | Draft/finalized/voided and source states | High | Existing guards preserved. | AP beta walkthrough observe only. |
| Banking | import/match/unmatch/reconcile/close/void/transfer | Role-based | `bankStatements.*`, `bankReconciliations.*`, `bankTransfers.*` | Manual-only and close-blocker states | High | Existing guards preserved; no live bank/provider claims. | Add more banking visual fixtures. |
| Inventory | post/adjust/transfer/receive/issue/variance proposal | Role-based | `inventory.*`, `inventoryAdjustments.*`, warehouse/purchase/sales guards | Operational/no-auto-posting warnings | High | Existing guards preserved. | Beta observe only. |
| Reports | export/download | Role-based | `reports.view`, `reports.export` | Export buttons hidden for insufficient role in visual specs | Medium | Existing guards preserved. | Add full report-drilldown rerun. |
| Documents | download/archive/attachment upload/delete | Role-based | `generatedDocuments.*`, `documents.*`, `attachments.*` | Archive/download only, no storage mutation in this pass | Medium | Existing guards preserved. | Beta observe/download only if safe data. |
| Settings/team/roles | invite/role create/edit | Owner/admin roles | `users.*`, `roles.*` | Mock invite wording; role permissions checked | High | Existing guards preserved. | Do not send real email. |
| Storage | backup/restore/evidence capture | Admin roles | document settings/attachment/storage readiness permissions | Metadata-only, no backup/restore execution | High | Existing readiness-only state preserved. | Separate approved storage proof goal. |
| Email outbox | retry/send | Admin/email permissions | Existing email permissions and provider readiness | Local/no-provider-send copy | High | Existing guards preserved. | No real sends in beta script. |
| ZATCA/compliance/provider | CSR/CSID/clearance/reporting/provider actions | Compliance/ZATCA roles | `compliance.*`, `zatca.*` | Disabled/readiness-only/no-provider/no-authority | Critical | Existing guards preserved; no provider actions run. | Separate compliance proof only after approval. |

## Action Findings

- No permission expansion was added.
- `GlobalCreateMenu` tests already verify unauthorized or disabled actions remain non-clickable.
- App route registry maps sensitive route families to explicit permissions and sensitivity tags.
- This pass made no backend/API/schema/provider behavior changes.
