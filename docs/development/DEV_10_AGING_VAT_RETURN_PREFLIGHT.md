# DEV-10 Aging And VAT Return Report Preflight

Date: 2026-05-30

Latest commit inspected: `08cb4c7c Verify DEV-10 core report JSON evidence`

## 1. Purpose And Scope

This preflight defines DEV-10 Part 8 checks for Aged Receivables, Aged Payables, and VAT Return JSON against the local marker fixture `DEV10-RPT-20260530T000000`. It is planning only. No runtime report calls, login, fixture creation, mutation, CSV export, PDF generation, generated-document archive, generated-document download, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production target, beta target, customer data, or body output was used.

## 2. Safety Rules

- Use only the local marker organization verified in DEV-10 Parts 2 and 3.
- Confirm the target is `postgresql` on `localhost:5432/accounting` before Part 8 reads.
- Use service-level JSON reads through `ReportsService` to avoid login/token/cookie exposure.
- Do not call `format=csv` endpoints.
- Do not call `/pdf` endpoints.
- Do not call generated-document archive or download paths.
- Record only filters, row counts, bucket/tax totals, expected values, actual values, pass/fail, and discrepancy summaries.
- Do not print full report payloads, customer/vendor payload bodies, CSV bodies, PDF bytes, generated-document base64, DB URLs, secrets, auth headers, cookies, or tokens.

## 3. Report Endpoint And Method Map

| Report | API endpoint | Service method | UI route | Part 8 output |
| --- | --- | --- | --- | --- |
| Aged Receivables | `GET /reports/aged-receivables` | `ReportsService.agedReceivables` | `/reports/aged-receivables` | JSON summary only |
| Aged Payables | `GET /reports/aged-payables` | `ReportsService.agedPayables` | `/reports/aged-payables` | JSON summary only |
| VAT Return | `GET /reports/vat-return` | `ReportsService.vatReturn` | No committed frontend route | JSON summary only |

## 4. Source Records

| Source record | Fixture state | Expected report impact |
| --- | --- | --- |
| Finalized sales invoice | One marker invoice dated `2026-05-10`, due `2026-05-20`, taxable `1000.0000`, tax `150.0000`, total/open balance `1150.0000` | Aged Receivables one open row; VAT Return sales document count `1` |
| Finalized purchase bill | One marker bill dated `2026-05-12`, due `2026-06-15`, taxable `400.0000`, tax `60.0000`, total/open balance `460.0000` | Aged Payables one open row; VAT Return purchase document count `1` |
| Branch | One marker branch | Optional branch-filter check can be included by resolving branch id inside the Part 8 script and recording only safe presence/pass/fail. |

## 5. Planned Filters

| Report | Planned filters | Notes |
| --- | --- | --- |
| Aged Receivables | `asOf=2026-05-30` | Deterministic bucket from due date `2026-05-20`. |
| Aged Payables | `asOf=2026-05-30` | Deterministic bucket from due date `2026-06-15`. |
| VAT Return | `from=2026-05-01`, `to=2026-05-31` | Includes the finalized marker invoice and bill. |
| Optional branch checks | Same filters plus marker branch id resolved in script | Record only row counts/totals and pass/fail; do not print full branch id. |

## 6. Expected Bucket And Tax Math

| Report | Expected result |
| --- | --- |
| Aged Receivables | row count `1`; bucket `1_30`; bucket total `1150.0000`; grand total `1150.0000` |
| Aged Payables | row count `1`; bucket `CURRENT`; bucket total `460.0000`; grand total `460.0000` |
| VAT Return | sales document count `1`; sales taxable `1000.0000`; output VAT `150.0000`; sales gross `1150.0000`; purchase document count `1`; purchase taxable `400.0000`; input VAT `60.0000`; purchase gross `460.0000`; net VAT `90.0000`; net VAT payable `90.0000`; net VAT refundable `0.0000` |

The expected VAT Return basis remains `FINALIZED_SOURCE_DOCUMENTS`, and the evidence must keep the non-filing/no-submission posture clear.

## 7. Evidence Shape For Part 8

Part 8 should record:

- Approval phrase captured.
- Local target proof.
- Marker used.
- Query filters.
- Row/document counts.
- Aging bucket totals and grand totals.
- VAT taxable/tax/gross totals for sales and purchases.
- Net VAT, payable, refundable, and basis.
- Pass/fail per report.
- Discrepancy summaries only.
- Generated-document count unchanged.
- No CSV/PDF/archive/download proof.
- No production/beta/customer-data proof.
- Temp script used and removed/kept.

Part 8 must not record full report JSON bodies, customer/supplier body data, full document payloads, CSV content, PDF bytes, base64, DB URLs, secrets, tokens, cookies, or auth headers.

## 8. Risks And Blockers

- VAT Return is API-only and not a filing/submission workflow.
- VAT Summary is account-based while VAT Return is finalized-source-document based; this preflight expects them to align only because the marker fixture was built to align.
- Branch-filter behavior for source-document reports is simpler than journal branch filters, but still needs explicit evidence if selected.
- No CSV/PDF/download/archive behavior is covered until Part 10/Part 11.

## 9. Recommended Next Step

Continue with `DEV-10 Part 8: approved local aging and VAT return report checks` because the exact Part 8 approval phrase has been supplied. Keep the execution local-only, JSON-only, and body-safe.

## Part 8 Evidence Note

DEV-10 Part 8 completed on 2026-05-30 and is recorded in [DEV_10_AGING_VAT_RETURN_CHECK_EVIDENCE.md](DEV_10_AGING_VAT_RETURN_CHECK_EVIDENCE.md). The exact Part 8 approval phrase was captured before checks. Local service-level JSON checks passed for Aged Receivables, Aged Payables, VAT Return, and branch-filtered source-document report reads. Generated-document count stayed `0`, and no CSV, PDF, archive, download, full payload body, production/beta target, or customer data was used.
