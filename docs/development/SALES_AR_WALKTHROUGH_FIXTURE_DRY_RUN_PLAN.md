# Sales/AR Walkthrough Fixture Dry-run Plan

Date: 2026-06-04

Sprint: Local Services Bring-up and Sales/AR Walkthrough Dry-run Sprint

Marker:

`SALES-AR-WALKTHROUGH-20260604`

Execution mode: dry-run plan and guarded dry-run execution only. No sample data was created.

## Scope

This plan converts the accountant walkthrough sample-data plan into a future local-only dry-run fixture shape.

The dry run must:

- Use only synthetic data.
- Prove the target is local before any API or database access.
- Refuse Supabase, Vercel, production, staging, beta, user-testing, hosted Postgres, and unknown remote targets.
- Print safe planned metadata only.
- Print no passwords, tokens, auth headers, cookies, DB URLs, PDF bodies, base64, customer-sensitive notes, signed XML, QR payloads, or provider credentials.
- Create no data.
- Run no seed, reset, delete, cleanup, PDF generation, email, payment, VAT filing, ZATCA, backup/restore, smoke, E2E, hosted check, or customer-data workflow.

## Planned Fake Records

| Planned record | Fake identifier | Expected count | Expected route/checkpoint |
| --- | --- | ---: | --- |
| Walkthrough marker | `SALES-AR-WALKTHROUGH-20260604` | 1 | Applies to all planned fixture records. |
| Customer | `CUST-SAR-WALKTHROUGH-001` | 1 | `/customers/[id]`; customer ledger, statement, activity, and dashboard AR review. |
| Service item | `SVC-SAR-WALKTHROUGH-001` | 1 | Invoice and quote service-line review. |
| Product item | `PROD-SAR-WALKTHROUGH-001` | 0 or 1 | Include only if existing local item behavior supports it safely without inventory automation. |
| Revenue account reference | `4010-SAR-WALKTHROUGH-REVENUE` | 1 | Revenue/account coding checkpoint. |
| VAT/tax rate reference | `TAX-SAR-WALKTHROUGH-15` | 1 | 15 percent tax examples; operational VAT views only. |
| Tax-exclusive invoice | `INV-SAR-WALKTHROUGH-TEX-001` | 1 | `/sales/invoices/[id]`; finalized invoice, balance due, PDF label. |
| Tax-inclusive invoice | `INV-SAR-WALKTHROUGH-TIN-001` | 1 | `/sales/invoices/[id]`; inclusive tax wording. |
| No-tax invoice | `INV-SAR-WALKTHROUGH-NTX-001` | 1 | `/sales/invoices/[id]`; no-tax wording without formal exemption claim. |
| Customer payment | `PAY-SAR-WALKTHROUGH-001` | 1 | Payment allocation and receipt wording; no bank reconciliation claim. |
| Credit note | `CN-SAR-WALKTHROUGH-001` | 1 | Credit note adjustment wording and balance effect. |
| Refund scenario | `REF-SAR-WALKTHROUGH-001` | 0 or 1 | Include only if local refund route/API is available safely; no gateway/bank transfer claim. |
| Quote awaiting acceptance | `SQ-SAR-WALKTHROUGH-AWAIT-001` | 1 | `/sales/quotes/[id]`; non-posting quote awaiting action. |
| Accepted quote | `SQ-SAR-WALKTHROUGH-ACCEPT-001` | 1 | `/sales/quotes/[id]`; accepted quote not posting AR by itself. |
| Draft invoice from quote | `INV-SAR-WALKTHROUGH-QUOTE-DRAFT-001` | 1 | `/sales/invoices/[id]`; draft invoice only. |
| Recurring template | `REC-SAR-WALKTHROUGH-001` | 1 | `/sales/recurring-invoices/[id]`; schedule preview/manual generation wording. |
| Generated recurring draft invoice | `INV-SAR-WALKTHROUGH-REC-DRAFT-001` | 1 | `/sales/invoices/[id]`; generated draft invoice remains draft. |
| Delivery note from invoice | `DN-SAR-WALKTHROUGH-INV-001` | 1 | `/sales/delivery-notes/[id]`; source invoice and fulfillment wording. |
| Delivery note from quote | `DN-SAR-WALKTHROUGH-QUOTE-001` | 1 | `/sales/delivery-notes/[id]`; source quote and non-posting wording. |
| Overdue collection case | `COL-SAR-WALKTHROUGH-OVERDUE-001` | 1 | `/sales/collections/[id]`; linked overdue invoice follow-up. |
| Promise-to-pay activity | `ACT-SAR-WALKTHROUGH-PTP-001` | 1 | Promise wording; no payment received implication. |
| Disputed collection case | `COL-SAR-WALKTHROUGH-DISPUTE-001` | 1 | Dispute wording; no legal automation implication. |
| AR Aging checkpoint | `AR-SAR-WALKTHROUGH-AGING-001` | 1 | `/reports/aged-receivables`; outstanding sales invoices only. |
| VAT Summary checkpoint | `VAT-SAR-WALKTHROUGH-SUMMARY-001` | 1 | `/reports/vat-summary`; operational summary only. |
| VAT Return checkpoint | `VAT-SAR-WALKTHROUGH-RETURN-001` | 1 | `/reports/vat-return`; draft/not official filing only. |
| Dashboard checkpoint | `DASH-SAR-WALKTHROUGH-001` | 1 | `/dashboard`; read-only Sales/AR attention signals. |

## Expected Counts

Future dry-run output should summarize planned counts only:

| Area | Planned count |
| --- | ---: |
| Customers | 1 |
| Service items | 1 |
| Product items | 0 or 1 |
| Sales invoices | 5 |
| Customer payments | 1 |
| Credit notes | 1 |
| Refunds | 0 or 1 |
| Sales quotes | 2 |
| Recurring invoice templates | 1 |
| Delivery notes | 2 |
| Collection cases | 2 |
| Collection activities | 1 or more |
| Reports/tax/dashboard checkpoints | 4 |

## Expected Routes

Future dry-run output should list route patterns only, not real IDs:

- `/dashboard`
- `/customers/[id]`
- `/sales/invoices/[id]`
- `/sales/quotes/[id]`
- `/sales/recurring-invoices/[id]`
- `/sales/delivery-notes/[id]`
- `/sales/collections/[id]`
- `/reports/aged-receivables`
- `/reports/vat-summary`
- `/reports/vat-return`
- `/tax`
- `/documents`

## Script Shape

Script path:

`apps/api/scripts/sales-ar-walkthrough-fixture.ts`

Required flags:

- `--dry-run`
- `--marker SALES-AR-WALKTHROUGH-20260604`
- `--execute` only after a later explicit local mutation approval

Required guards:

- Validate marker is present.
- Validate target URL/database host is local before connecting.
- Refuse hosted or unknown remote targets.
- Refuse execute mode by default.
- Refuse cleanup/delete paths.
- Print counts and fake identifiers only.
- Do not print secret values, payload bodies, PDFs, base64, auth headers, cookies, or tokens.
- Do not call email, payment, ZATCA, VAT filing, backup/restore, smoke, E2E, or hosted workflows.

## Dry-run Command

Only after local target guards pass:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

This command was run on 2026-06-05 after Docker, local Postgres, local Redis, local API, local web, local health/readiness, and local seed/demo login gates passed.

## Current Status

Dry-run planning is documented and the guarded dry-run command passed.

Fixture script status: added.

Dry-run execution status: passed in dry-run mode only.

Sample data creation status: not executed.

Fixture execute status: not run.
