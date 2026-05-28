# DEV-08H AP Output PDF Archive Email Preflight

## Purpose And Scope

This document starts DEV-08H: local-only AP output safety evidence for PDF rendering, generated-document archive/download metadata, duplicate generation behavior, and AP email boundaries.

- Task: `DEV-08H Part 1: AP output PDF archive email preflight`.
- Latest commit inspected: `88dd99a6 Close DEV-08G purchase receipt inventory evidence`.
- Local `HEAD` matched `origin/main` at `88dd99a6`.
- Branch inspected: `main`.
- Marker: `DEV08H-AP-20260528T000000`.
- Runtime mutation performed: no.
- Output mutation performed: no PDF generation, no archive record creation, no generated-document download, no email enqueue/send, no ZATCA action.
- Local-only target proof: Docker Postgres and Redis were listening locally; the configured API database target was classified as local-only without printing the URL.
- Temporary script proof: no `*dev08h*` script remained under `apps/api/scripts` after preflight.

## AP Output Route Map

| Family | Read-only data route | Output/archive route | Explicit archive route | Permission | Service method | Document type |
| --- | --- | --- | --- | --- | --- | --- |
| Purchase order | `GET /purchase-orders/:id/pdf-data` | `GET /purchase-orders/:id/pdf` | `POST /purchase-orders/:id/generate-pdf` | `purchaseOrders.view` | `PurchaseOrderService.pdfData/pdf/generatePdf` | `PURCHASE_ORDER` |
| Purchase bill | `GET /purchase-bills/:id/pdf-data` | `GET /purchase-bills/:id/pdf` | `POST /purchase-bills/:id/generate-pdf` | `purchaseBills.view` | `PurchaseBillService.pdfData/pdf/generatePdf` | `PURCHASE_BILL` |
| Supplier payment receipt | `GET /supplier-payments/:id/receipt-pdf-data` | `GET /supplier-payments/:id/receipt.pdf` | `POST /supplier-payments/:id/generate-receipt-pdf` | `supplierPayments.view` | `SupplierPaymentService.receiptPdfData/receiptPdf/generateReceiptPdf` | `SUPPLIER_PAYMENT_RECEIPT` |
| Supplier refund | `GET /supplier-refunds/:id/pdf-data` | `GET /supplier-refunds/:id/pdf` | `POST /supplier-refunds/:id/generate-pdf` | `supplierRefunds.view` | `SupplierRefundService.pdfData/pdf/generatePdf` | `SUPPLIER_REFUND` |
| Purchase debit note | `GET /purchase-debit-notes/:id/pdf-data` | `GET /purchase-debit-notes/:id/pdf` | `POST /purchase-debit-notes/:id/generate-pdf` | `purchaseDebitNotes.view` | `PurchaseDebitNoteService.pdfData/pdf/generatePdf` | `PURCHASE_DEBIT_NOTE` |
| Cash expense | `GET /cash-expenses/:id/pdf-data` | `GET /cash-expenses/:id/pdf` | `POST /cash-expenses/:id/generate-pdf` | `cashExpenses.view` | `CashExpenseService.pdfData/pdf/generatePdf` | `CASH_EXPENSE` |
| Generated document archive | `GET /generated-documents`, `GET /generated-documents/:id` | `GET /generated-documents/:id/download` | n/a | `generatedDocuments.view`, `generatedDocuments.download` | `GeneratedDocumentService.list/get/download` | stored archive metadata |

## Generated Document Service Map

- `pdfData` and receipt `receiptPdfData` methods read source records and document settings only; they do not archive generated documents.
- Each AP `pdf` method renders the PDF buffer and calls `GeneratedDocumentService.archivePdf(...)`, which stores sanitized filename, `application/pdf`, `storageProvider=database`, base64 content, SHA-256 content hash, byte count, source type/id, document number, status `GENERATED`, and generated-by metadata.
- Each AP `generatePdf` method delegates to the matching `pdf` method and returns generated-document metadata rather than a streamed body.
- `GeneratedDocumentService.download(...)` reads the stored base64 content and returns a buffer to the controller; DEV-08H evidence must record only byte counts and hashes, not bodies or base64.
- The generic archive audit action is `CREATE` on `GeneratedDocument`.
- AP output archive uses normal PDF rendering only. It does not create PDF/A-3 artifacts, signed XML, QR payloads, clearance/reporting submissions, private keys, CSIDs, or production-compliance evidence.

## Email Boundary Map

- Email readiness, outbox, provider events, retry, diagnostics, suppression, and monitoring are centralized under `apps/api/src/email`.
- Current AP controllers inspected in Part 1 expose PDF/data/archive/download-related behavior only; no AP document email-send route was found in the AP controllers.
- The web email outbox page is an administrative/readiness surface for mock/local invite, password-reset, diagnostics, retry, provider-event, and suppression records.
- DEV-08H may inspect email readiness and outbox metadata, but must not call a real provider or send customer/vendor email.

## Source Strategy

- Existing DEV-08G receipt evidence is not suitable as the DEV-08H source pack because the receipt sources are voided and purchase receipts are not one of the AP output families in this branch.
- Part 1 found no existing DEV-08H marker collision: purchase orders `0`, purchase bills `0`, supplier payments `0`, supplier refunds `0`, purchase debit notes `0`, cash expenses `0`, generated documents `0`, marker email outbox rows `0`, and marker ZATCA rows `0`.
- Part 2 should create a fresh local-only fake AP output source fixture pack under marker `DEV08H-AP-20260528T000000`.
- Planned source pack: one purchase order, one finalized purchase bill, one posted supplier payment with a small allocation and unapplied balance, one posted supplier refund from that local payment balance, one finalized purchase debit note, and one posted cash expense.
- Local readiness inputs exist for this plan: an open 2026 fiscal period, active fake supplier contacts, active posting accounts including cash/bank, AP, VAT receivable, and expense accounts, and an active purchase VAT rate.

## Output Safety Rules

- Print safe prefixes, document numbers, statuses, filenames, content hashes, byte counts, and counts only.
- Never print PDF bodies, base64, request/response bodies, auth headers, cookies, database URLs, tokens, XML, QR payloads, private keys, CSIDs, email bodies, or attachment bodies.
- Use only local fake data.
- Do not send email or call a real email provider.
- Do not claim ZATCA/PDF-A3/production compliance from normal PDF archive generation.

## Expected Part 2 Target

Create local fake AP source records only. Part 2 must not generate PDFs, create `GeneratedDocument` records, download output, enqueue/send email, run ZATCA, run browser/login flows, migrate, seed, reset, delete, deploy, or change environment/provider/schema settings.

## Approval Phrase For Part 2

`I approve DEV-08H Part 2 local-only AP output source fixture mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08H Part 2: approved local AP output source fixture mutation`

## Part 2 Note

- Part 2 completed the approved local-only fixture mutation in [DEV_08H_AP_OUTPUT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md](DEV_08H_AP_OUTPUT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md).
- Created source numbers: `PO-000144`, `BILL-000423`, `PAY-000318`, `SRF-000127`, `PDN-000127`, and `EXP-000065`.
- Generated-document, marker email, and marker ZATCA counts remained `0`.
