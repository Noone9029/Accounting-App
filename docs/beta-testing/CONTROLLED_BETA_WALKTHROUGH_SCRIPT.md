# Controlled Beta Walkthrough Script

Date: 2026-07-01

Use this script with assigned beta accounts and test/demo data only. Do not run provider, payment, email, storage, signed-URL, backup/restore, ZATCA, UAE, Peppol, ASP, seed/reset/delete, migration, or destructive actions.

Severity guide:

- Blocker: prevents workflow, risks data loss, trust, security, or compliance.
- High: core workflow confusing or visibly broken.
- Medium: workaround exists.
- Low: polish.

## Script A: Owner Walkthrough

| Step | Route | Action | Expected result | What not to do | Feedback prompt | Severity if failed |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | `/login` | Log in with assigned beta credentials. | Login succeeds and routes to the assigned test organization. | Do not share credentials or reset links. | Was login clear and safe? | Blocker |
| A2 | `/dashboard` | Review KPIs, attention items, and navigation. | Dashboard loads with controlled-beta-safe information. | Do not treat dashboard numbers as production financial truth. | Which three signals are useful or confusing? | High |
| A3 | `/sales/invoices` | Inspect invoice list and one invoice detail if available. | Draft/finalized/paid/void states are understandable. | Do not finalize, void, delete, email, or collect payment. | Are invoice status and action boundaries clear? | High |
| A4 | `/sales/quotes` | Inspect quote list and one quote detail. | Quote is clearly non-posting until converted through approved flow. | Do not convert a real quote or email a customer. | Does quote wording avoid invoice/compliance confusion? | Medium |
| A5 | `/customers` | Open a customer profile or statement if assigned. | Customer context, activity, and statement links are understandable. | Do not enter real customer data. | Can you find invoices, payments, and statement context? | Medium |
| A6 | `/purchases/bills` | Inspect bills and one bill detail if available. | AP status, supplier context, and review boundaries are understandable. | Do not finalize, pay, void, delete, or upload production documents. | Are payable actions clear? | High |
| A7 | `/bank-accounts` | Inspect bank accounts and account detail if available. | Manual banking status is clear. | Do not upload raw bank exports or expect live bank feeds. | Is the no-live-feed boundary obvious? | High |
| A8 | `/bank-accounts/00000000-0000-0000-0000-000000002112/reconciliations` | Inspect reconciliation history. | Reconciliation history loads without overflow and shows review state. | Do not close, reopen, or mutate reconciliation periods. | Can you understand reconciliation history and restrictions? | High |
| A9 | `/items` | Inspect inventory item catalog. | Item list and inventory navigation are understandable. | Do not post stock adjustments, transfers, receipts, or issues. | Is operational stock wording clear? | Medium |
| A10 | `/reports` | Inspect report index and safe reports. | Reports are readable and not presented as official filing evidence. | Do not use beta output for official accounting, audit, or tax filing. | Which reports need clearer labels? | High |
| A11 | `/documents` | Inspect document archive. | Archive status and source labels are understandable. | Do not upload real documents or rely on production object storage. | Are document status labels clear? | Medium |
| A12 | `/settings/storage` and `/settings/compliance` | Inspect readiness wording. | Storage/compliance surfaces show restrictions and blockers. | Do not run migration, provider, ZATCA, UAE, Peppol, ASP, backup, restore, or signed-URL operations. | Does any wording sound production-ready? | High |
| A13 | `/setup` | Inspect setup/readiness guidance. | Setup guidance is useful and does not overclaim readiness. | Do not enter sensitive production company data. | What three setup steps are confusing? | Medium |
| A14 | End | Note three confusing points and three useful points. | Feedback is recorded without secrets or sensitive data. | Do not include credentials or production data. | What would stop you from using the beta again? | Medium |

## Script B: Accountant/Reviewer Walkthrough

| Step | Route | Action | Expected result | What not to do | Feedback prompt | Severity if failed |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | `/login` | Log in with assigned reviewer credentials. | Login succeeds into assigned test organization. | Do not share credentials or reset links. | Is access scoped correctly? | Blocker |
| B2 | `/reports` | Inspect report index and available financial reports. | Report names, filters, and internal-review wording are clear. | Do not rely on reports for official filing or audit. | Which accounting trust concerns remain? | High |
| B3 | `/reports/general-ledger` | Inspect general ledger if route is available. | Ledger rows, dates, accounts, debit/credit labels, and balances are readable. | Do not export or certify as official ledger evidence. | Are debit/credit/balance labels trustworthy? | High |
| B4 | `/reports/trial-balance` | Inspect trial balance if route is available. | Totals and account grouping are readable. | Do not use as official close evidence. | What would an accountant need before relying on this? | High |
| B5 | `/reports/profit-and-loss` | Inspect P&L if route is available. | Period and amount labels are clear. | Do not treat as accountant-certified. | Are revenue/expense labels clear? | Medium |
| B6 | `/reports/balance-sheet` | Inspect balance sheet if route is available. | Asset/liability/equity grouping is clear. | Do not certify or file. | Are report boundaries explicit? | Medium |
| B7 | `/customers` and `/customers/[id]/statement` | Inspect customer statement using a safe test customer. | Statement route and return navigation are understandable. | Do not download or send official statements for real customers. | Are statement balances and aging labels clear? | High |
| B8 | `/suppliers` and `/suppliers/[id]/statement` | Inspect supplier statement using safe test supplier. | Supplier activity and statement context are understandable. | Do not use for real supplier settlement. | Are payable labels and balances clear? | High |
| B9 | `/settings/audit-logs` | Inspect audit logs if visible. | Audit events are readable and non-destructive. | Do not delete, purge, or export sensitive logs. | Is audit evidence useful enough for beta review? | Medium |
| B10 | `/settings/number-sequences` | Inspect number sequence settings if visible. | Sequence wording is guarded and clear. | Do not change production-like numbering. | Is document numbering risk clear? | Medium |
| B11 | `/settings/roles` | Inspect permissions/roles without mutating. | Permissions are understandable for assigned role. | Do not create roles, change roles, or grant broad access. | Are role boundaries clear? | High |
| B12 | `/settings/compliance` and `/settings/zatca` if visible | Inspect VAT/ZATCA/readiness wording. | Wording is readiness-only and does not imply production compliance. | Do not request CSID, submit, clear, report, sign, or upload compliance artifacts. | Does any wording imply compliance certification? | High |
| B13 | `/documents` | Inspect archive metadata. | Document status/source labels are clear. | Do not upload production documents or expect production storage proof. | What archive evidence is missing? | Medium |
| B14 | `/bank-accounts` and reconciliation route | Inspect banking/reconciliation evidence. | Manual/no-live-feed boundary is clear. | Do not import real bank statements or close reconciliations. | Is reconciliation evidence trustworthy enough for beta feedback? | High |
| B15 | End | Note accounting trust concerns and stop. | Concerns are captured in the feedback form. | Do not include production customer data. | What must be fixed before wider beta? | Medium |
