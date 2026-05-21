# LedgerByte Accountant Review Sample Output Index

Prepared: 2026-05-22

This index describes how to collect review samples without committing sensitive PDFs or real customer data. No binary PDF samples are committed in this packet.

## Sample Handling Rules

- Use mock or local demo data when sharing files outside the engineering team.
- Do not commit PDFs generated from real beta/customer data.
- Do not paste PDF bodies, document text, customer/vendor names, document numbers, signed XML, QR payloads, request bodies, response bodies, tokens, cookies, or auth headers into findings.
- Redact screenshots if they show real names, document numbers, bank references, addresses, tax IDs, or emails.
- Treat sample outputs as review evidence only, not legal, tax, audit, or ZATCA certification.

## Existing Safe Visual Snapshots

The mocked visual regression suite provides stable PNG baselines for layout review:

- Setup, dashboard, and reports landing.
- Customer contact statement, invoice detail, and customer payment success.
- Supplier contact statement, purchase bill detail, supplier payment success, and purchase debit note.
- Bank account detail, statement imports, reconciliation, and bank transfer detail.
- Inventory item, warehouse, receipt, adjustment, transfer, and stock valuation routes.
- Documents archive, document settings, and number sequence settings.

Run the focused visual suite:

```powershell
corepack pnpm test:visual
```

Snapshot files are under:

```text
tests/visual/polished-workflows.visual.spec.ts-snapshots/
```

Update snapshots only when an intentional UI change has been reviewed:

```powershell
corepack pnpm exec playwright test -c playwright.visual.config.ts --update-snapshots
```

## Local PDF Renderer Samples

The API PDF renderer tests use mock fixtures and verify that PDFs render as nonempty `%PDF` buffers. They do not require real beta credentials.

Run:

```powershell
corepack pnpm --filter @ledgerbyte/api test -- pdf-rendering.spec.ts report-pdf-renderers.spec.ts
```

Relevant renderer coverage includes:

| Output | Renderer/test area | Review note |
| --- | --- | --- |
| Sales invoice PDF | `renderInvoicePdf` | Check invoice status, VAT/tax labels, totals, balance due, payment allocation wording. |
| Customer receipt PDF | `renderPaymentReceiptPdf` | Check receipt title, allocation labels, unapplied credit wording. |
| Customer statement PDF | `renderCustomerStatementPdf` | Check AR-specific statement labels, opening/closing balance clarity, debit/credit help. |
| Supplier statement PDF | `renderCustomerStatementPdf` with supplier labels | Check AP-specific payable wording and debit/credit convention. |
| Bank reconciliation report PDF | `renderBankReconciliationReportPdf` | Check statement/ledger closing balance, difference, item snapshot labels. |
| Trial balance PDF | `renderTrialBalanceReportPdf` | Check debit/credit columns and balanced presentation. |

## Authenticated Beta Document Download Patterns

Use these patterns only in the user-testing environment with secret-store credentials. Do not print auth headers, tokens, response bodies, or PDF contents.

| Output | API endpoint pattern | Archive expectation |
| --- | --- | --- |
| Sales invoice PDF | `GET /sales-invoices/:id/pdf` | Creates generated-document archive row. |
| Customer payment receipt PDF | `GET /customer-payments/:id/receipt.pdf` | Creates generated-document archive row. |
| Sales credit note PDF | `GET /credit-notes/:id/pdf` | Creates generated-document archive row. |
| Purchase bill PDF | `GET /purchase-bills/:id/pdf` | Creates generated-document archive row. |
| Supplier payment receipt PDF | `GET /supplier-payments/:id/receipt.pdf` | Creates generated-document archive row. |
| Purchase debit note PDF | `GET /purchase-debit-notes/:id/pdf` | Creates generated-document archive row. |
| Customer statement PDF | `GET /contacts/:id/statement.pdf` | Creates generated-document archive row. |
| Supplier statement PDF | `GET /contacts/:id/supplier-statement.pdf` | Creates `SUPPLIER_STATEMENT` archive row. |
| Archived generated PDF | `GET /generated-documents/:id/download` | Downloads an existing archive row. |

For review records, capture only:

- Output type.
- Redacted route pattern.
- HTTP status.
- Content type.
- Safe filename extension.
- Whether bytes are nonzero and begin with `%PDF`.
- Whether an archive row exists when expected.

## UI Routes For Manual Review

Use local mock data or sanitized beta data:

| Area | Route |
| --- | --- |
| Documents archive | `/documents` |
| Document settings | `/settings/documents` |
| Number sequences | `/settings/number-sequences` |
| Customer statement | `/contacts/:customerId` statement area |
| Supplier statement | `/contacts/:supplierId` supplier statement area |
| Sales invoice | `/sales/invoices/:id` |
| Customer payment receipt | `/sales/customer-payments/:id` |
| Credit note | `/sales/credit-notes/:id` |
| Purchase bill | `/purchases/bills/:id` |
| Supplier payment receipt | `/purchases/supplier-payments/:id` |
| Purchase debit note | `/purchases/debit-notes/:id` |
| AR aging | `/reports/aged-receivables` |
| AP aging | `/reports/aged-payables` |
| General ledger | `/reports/general-ledger` |
| Trial balance | `/reports/trial-balance` |
| Profit and loss | `/reports/profit-and-loss` |
| Balance sheet | `/reports/balance-sheet` |
| VAT summary | `/reports/vat-summary` |
| Inventory movement report | `/inventory/reports/movement-summary` |
| Inventory valuation report | `/inventory/reports/stock-valuation` |
| Low-stock report | `/inventory/reports/low-stock` |
| Bank reconciliation | `/bank-accounts/:id/reconciliation` and `/bank-reconciliations/:id` |

## Review Evidence Checklist

For each captured sample, record:

- Reviewer name and date.
- Product area.
- Local/mock/beta source.
- Data sensitivity level.
- Whether the sample can be shared outside engineering.
- Finding references from `ACCOUNTANT_REVIEW_FINDINGS_TEMPLATE.md`.
