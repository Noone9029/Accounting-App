# VAT Return Review Foundation

Date: 2026-06-12

Status: controlled-beta accountant-review foundation only. This is not an official filing workflow.

## Current Status

- `GET /reports/vat-return` returns a draft VAT Return review surface.
- `GET /reports/vat-return?format=csv` returns an internal review CSV export only.
- No VAT Return PDF endpoint exists.
- No filing status, submission record, approval workflow, or tax-authority exchange is implemented.

## Data Sources

- Finalized sales invoices in the selected date range.
- Finalized purchase bills in the selected date range.
- Draft and voided documents are excluded.
- VAT Summary remains a separate account-basis review derived from posted VAT accounts 220 and 230.

## Calculation Boundaries

- This lane reuses the existing VAT Return data shape and totals.
- No new VAT math, report math, posting logic, or journal behavior was added.
- The export reflects the same current-period VAT Return data already shown in the UI.

## Export And Status Boundaries

- CSV export is internal review only.
- The CSV is not a government-format filing export.
- Export does not create a submission record or filing approval state.
- Export does not call ZATCA or any other tax authority.
- Export does not prove compliance, certification, or accountant sign-off.

## Review Still Needed

- Accountant or tax advisor review of VAT Return terminology, boundaries, and expected filing-ready layout.
- Legal/tax review of any future government-format filing export.
- Product review of how draft/internal review status should evolve into an approval workflow later.

## Not Implemented

- Official filing format.
- Tax-authority submission workflow.
- ZATCA execution, signing, clearance/reporting, or PDF-A3.
- Filing approval workflow.
- Compliance approval or production filing claims.

## Forbidden Wording

- Official VAT filing.
- Submitted to tax authority.
- ZATCA compliant.
- Approved by ZATCA.
- Certified VAT return.
- Government-format export unless it is actually implemented and reviewed.

## Next Steps For Official Filing Readiness

1. Get accountant/tax advisor review on current VAT Summary and VAT Return definitions.
2. Define the reviewed filing-ready data shape and authority-specific format requirements.
3. Add approval workflow and filing-state controls before any real submission path.
4. Keep ZATCA/signing/clearance/reporting work in explicitly approved lanes only.
