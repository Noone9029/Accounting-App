# Sales Invoice Workflow Summary API Evidence

## PR Title

`Add sales invoice workflow summary API`

## Branch

`codex/openbook-sales-document-workflow-summary`

## Commit

`pending before final commit`

## Scope

- Add a LedgerByte-native sales invoice workflow summary builder.
- Add a read-only API service method backed by existing invoice and generated-document state.
- Add `GET /sales-invoices/:id/workflow-summary`.
- Add focused service/builder and controller coverage.

## Adopted Behavior

- Behavior inspiration: clearer sales-document workflow state and next-step visibility.
- LedgerByte-native implementation: summary is derived from LedgerByte invoice status, journal linkage, balance due, and generated-document archive records.
- OpenBook source used: `No`.

## Clean-Room Confirmation Checklist

- [x] No OpenBook code copied.
- [x] No OpenBook schema copied.
- [x] No OpenBook comments copied.
- [x] No OpenBook UI text copied.
- [x] No OpenBook file names, function names, or implementation structure copied.
- [x] No OpenBook dependency added.
- [x] No OpenBook source fetched, vendored, imported, translated, ported, or reused.
- [x] Production source does not reference OpenBook.
- [x] Implementation is LedgerByte-native and follows existing invoice/generated-document service boundaries.

## Files Changed

| File | Purpose |
| --- | --- |
| `apps/api/src/sales-invoices/sales-invoice.service.ts` | Adds `workflowSummary` and `buildSalesInvoiceWorkflowSummary` for read-only invoice workflow state. |
| `apps/api/src/sales-invoices/sales-invoice-rules.spec.ts` | Covers draft/finalized/voided workflow summaries and tenant-scoped generated-document reads. |
| `apps/api/src/sales-invoices/sales-invoice.controller.ts` | Adds `GET /sales-invoices/:id/workflow-summary`. |
| `apps/api/src/sales-invoices/sales-invoice.controller.spec.ts` | Covers permission metadata and controller delegation. |
| `docs/development/openbooks-adoption/SALES_INVOICE_WORKFLOW_SUMMARY_API_EVIDENCE.md` | Records guardrails and validation evidence for this slice. |

## Runtime Behavior Changed

`yes`

The API now exposes a read-only sales invoice workflow summary endpoint. It does not finalize, void, allocate payments, generate PDFs, send email, mutate hosted systems, add public invoice hosting, change object storage, or submit compliance data.

## Summary Basis

- Included: active-organization invoice status, balance, customer target, journal/reversal journal linkage, and generated-document archive records for `sourceType = SalesInvoice`.
- Excluded: cross-tenant invoices, hosted public invoice links, payment initiation, email sending, provider actions, object-storage promotion, and compliance submission.
- Permissions: endpoint requires existing `salesInvoices.view` permission.

## Tests Run

- `corepack pnpm --filter @ledgerbyte/api test -- sales-invoice-rules.spec.ts sales-invoice.controller.spec.ts`: `failed before implementation as expected; missing workflow builder/service/controller`.
- `corepack pnpm --filter @ledgerbyte/api test -- sales-invoice-rules.spec.ts sales-invoice.controller.spec.ts`: `passed`.

## Tests Skipped And Why

- Full monorepo test suite: not required for this API-only read-model slice unless focused checks fail.
- Browser/visual checks: not applicable; no web UI changed.
- Hosted/public invoice checks: not applicable; this slice does not add hosted public invoice behavior.

## Screenshots/Evidence Captured

- Not applicable; API-only behavior covered by focused Jest tests.

## Feature Status

`PARTIAL`

Sales invoice workflow summary API is implemented as a narrow sales-document workflow slice. Quote workflow UI/API refinements, public invoice design, generated-document UX, and sales-document workflow UI consumption remain future slices.

## Guardrails

- No hosted mutations were added.
- No public invoice hosting, external link sharing, email sending, provider integration, provider submission, or external network behavior was added.
- No object-storage, backup, signed URL, or generated-document production claim was added.
- No ZATCA, UAE, Peppol, ASP, tax filing, or production compliance claim was added.
- No OpenBook source was copied or reused.
