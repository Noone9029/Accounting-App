# Sales/AR Sample Output Naming Guide

Prepared: 2026-06-04

Use this guide when naming screenshots, PDFs, or short videos outside the repository for accountant review. The goal is consistent file names without committing sensitive files.

## Naming Rules

- Use lowercase words separated by hyphens.
- Prefix files with `sales-ar-`.
- Include a two-digit sequence number.
- Include the reviewed route or output area.
- Do not include real customer names, real invoice numbers, real tax IDs, auth tokens, or environment names.
- Store outputs outside the repo unless a separate safe artifact policy explicitly allows committing them.

## Naming Examples

- `sales-ar-01-dashboard-overview.png`
- `sales-ar-02-customer-ledger.png`
- `sales-ar-03-tax-exclusive-invoice.pdf`
- `sales-ar-04-tax-inclusive-invoice.pdf`
- `sales-ar-05-sales-quote.pdf`
- `sales-ar-06-recurring-template.png`
- `sales-ar-07-delivery-note.pdf`
- `sales-ar-08-collection-case.png`
- `sales-ar-09-ar-aging.png`
- `sales-ar-10-vat-summary.png`
- `sales-ar-11-vat-return.png`
- `sales-ar-12-documents-archive.png`

## Optional Review Bundle Structure

If a reviewer keeps files outside the repo, use a folder name such as:

`ledgerbyte-sales-ar-accountant-review-YYYY-MM-DD`

Suggested external folder layout:

- `screenshots/`
- `pdfs/`
- `videos/`
- `finding-references/`

## Do Not Commit

Do not commit:

- Real customer data.
- Real supplier data.
- Real invoice, quote, delivery note, collection, tax, or bank data.
- PDF bodies or generated binary PDFs from real customer records.
- Screenshots with secrets, tokens, database URLs, auth headers, cookies, provider credentials, signed XML, or QR payloads.
- Production/customer records.
- Files that imply accountant approval unless a separate signed approval artifact exists and is approved for storage.
