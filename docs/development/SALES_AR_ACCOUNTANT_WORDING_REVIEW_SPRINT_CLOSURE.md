# Sales/AR Accountant Wording Review Sprint Closure

Date: 2026-06-04
Sprint: Accountant Sales/AR Wording and Review Sprint
Product: LedgerByte

## Surfaces Reviewed

- Sales invoices, invoice detail actions, invoice PDF/download/archive wording, payment and credit allocation wording, and local ZATCA readiness wording.
- Sales quotes, quote form/detail/list/edit wording, quote PDF/archive wording, and quote conversion wording.
- Recurring invoice template list/detail/form wording and manual draft-invoice generation wording.
- Delivery notes, source panels, detail/PDF/archive wording, customer activity, and related delivery-note panels.
- Collections list/detail/form wording, activity timeline labels, invoice/customer panels, global create/search labels, and promise-to-pay wording.
- Customer detail/activity, customer ledger visibility, customer collections panel, and generated-document archive labels.
- AR Aging, VAT Summary, VAT Return, and Tax workspace wording connected to Sales/AR.

## Wording Changed

- Collection activity labels now use `Planned email` and `Planned reminder`, and helper text says these are internal planning records only.
- Collection safe wording now says collection cases do not send email or reminders, create payment links, allocate payments, post journals, file VAT, call ZATCA, or change invoice balances.
- Sales invoice local ZATCA panel now says `Local ZATCA readiness groundwork`, avoids production submission wording, and changes clearance/reporting buttons to blocker checks.
- ZATCA action status labels now say action/readiness rather than submission.
- AR Aging guidance now states it is based on outstanding sales invoices only and excludes quotes, recurring templates, delivery notes, and collection cases.
- VAT Summary and VAT Return wording now says operational/draft and not an official filing workflow.
- Quote edit/list/form wording now avoids implying real email delivery and says quotes are non-posting until converted and finalized as sales invoices.

## Unsafe Claims Removed Or Guarded

- Guarded invoice ZATCA wording so it does not imply production clearance/reporting requests.
- Guarded collections wording so planned email/reminder and payment received note do not imply sent email, scheduler, payment receipt, allocation, or posting.
- Guarded AR Aging wording so non-posting Sales/AR records are excluded from aging.
- Guarded VAT wording so draft/operational tax screens do not imply official filing.

## Documentation Added

- `docs/accountant-review/SALES_AR_ACCOUNTANT_REVIEW_CHECKLIST.md`
- `docs/accountant-review/SALES_AR_SAMPLE_REVIEW_INDEX.md`

## Intentionally Skipped

- No accounting calculation changes.
- No posting behavior changes.
- No payment allocation changes.
- No email sending, email scheduler, or automatic reminders.
- No payment links or payment gateway behavior.
- No real ZATCA, CSID, clearance, reporting, or PDF/A-3 behavior.
- No inventory movement behavior.
- No production infrastructure, hosted/customer-data checks, migrations, seed/reset/delete, backup/restore, or deployed E2E.
- No marketing files were modified.

## Marketing Typecheck Blocker

`apps/web/src/app/marketing.test.tsx` remains unrelated and untracked. It was not modified in this sprint.

Known blocker:

- `apps/web/src/app/marketing.test.tsx(35,13): 'HomePage' cannot be used as a JSX component. Its type '() => void' is not a valid JSX element type.`
- `apps/web/src/app/marketing.test.tsx(65,10): 'HomePage' cannot be used as a JSX component. Its type '() => void' is not a valid JSX element type.`

## Validation Results

- `corepack pnpm --filter @ledgerbyte/web test -- collections sales/invoices report-pages documents sales-quote-form`
  - Passed: 10 test suites, 36 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- parties customer-collections-panel global-search global-create-menu recurring-invoice-form sales/recurring-invoices delivery-note-form sales/delivery-notes sales/quotes`
  - Passed: 12 test suites, 49 tests.
- `git diff --check`
  - Passed with line-ending conversion warnings only.
- `corepack pnpm --filter @ledgerbyte/web typecheck`
  - Failed only on unrelated untracked marketing work at `apps/web/src/app/marketing.test.tsx`.

Backend/API typecheck was not run because this sprint did not touch backend/API files.

## Remaining Accountant Review Gaps

- Qualified accountant review has not happened yet.
- Sales invoice default organization document title remains configurable through document settings; changing stored defaults would require a separate document-settings policy decision.
- Customer payment, refund, and credit-note wording should be reviewed with real accountant feedback during the checklist walkthrough.
- Full browser E2E, full smoke, deployed beta walkthrough, and hosted/customer-data proof remain separate tasks.

## Recommended Next Sprint

Run a Sales/AR Accountant Review Findings Sprint after a qualified accountant walks through the checklist and sample index with safe local or mocked sample data. Prioritize terminology fixes, document-title policy, statement/aging clarity, and any must-fix accounting review findings before considering email, payment-link, automation, or production-compliance work.
