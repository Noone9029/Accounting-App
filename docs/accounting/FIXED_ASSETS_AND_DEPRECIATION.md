# Fixed assets and depreciation MVP

LedgerByte’s fixed-assets MVP is a tenant-scoped operational register connected to the general ledger. It supports active categories, manual acquisition, capitalization from a finalized purchase-bill line, reviewed opening balances, monthly straight-line depreciation, disposal/write-off, reversal, audit evidence, reports, and accounting-close readiness.

The register stores acquisition cost, salvage floor, useful life, accumulated depreciation, carrying value, currency evidence, dimensions, source links, movements, schedule lines, and version fields. Every posting uses an open fiscal period and creates balanced posted journal evidence in the same transaction.

The MVP deliberately excludes declining-balance methods, daily prorating, multiple books, impairment, revaluation, components, leases, partial capitalization, and provider/compliance automation. These are future policy decisions, not hidden behavior.

## Workflow

1. Configure a category and five tenant-owned posting account mappings.
2. Create a draft asset or select an eligible finalized purchase-bill line.
3. Review the asset and capitalize it through an explicit posting action.
4. Generate a next-month-starting straight-line schedule.
5. Preview, review, post, and if needed reverse a monthly depreciation run.
6. Dispose or write off with proceeds, gain/loss, accumulated-depreciation clearing, and future-schedule stop evidence.

All list, detail, report, and import operations remain local to the active organization.
