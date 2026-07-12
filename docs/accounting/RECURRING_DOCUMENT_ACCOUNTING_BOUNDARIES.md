# Recurring Document Accounting Boundaries

| Type | Generated record | Accounting boundary |
| --- | --- | --- |
| Sales invoice | Normal invoice in `DRAFT` | No finalize, journal, email, collection, or compliance submission. |
| Purchase bill | Normal bill in `DRAFT` | No finalize, AP journal, payment, or inventory posting. In other words, purchase bills generate as drafts. |
| Expense | `RecurringExpenseProposal` | Current cash expenses post during creation, so the scheduler never creates one directly. The web UI shows immutable date; subtotal, discount, taxable, tax, and final totals; FX rate/date/source/snapshot ID; paid-through account; and each line's gross, discount, taxable, tax, total, account, and dimensions before an explicit “Review and post expense” confirmation. Review revalidates references and requires recalculated transaction-currency totals to match before using the normal expense workflow; it never moves money. |
| Manual journal | Normal journal in `DRAFT` | Balanced base-currency lines only; manual journals generate as drafts and never post automatically. |

Each adapter revalidates tenant ownership and active status for the party, account, item, tax rate, branch, cost center, project, paid-through account, and FX snapshot it uses. Inactive, archived, cross-tenant, incomplete, or unsupported evidence blocks safely.

A locked period occurrence is not shifted. Generated drafts are corrected using their ordinary draft editor. If a user later posts a generated record manually, corrections use the existing reversal, credit-note, or debit-note workflow. The recurring engine never deletes or rewrites posted accounting.

Foreign manual-journal templates remain fail-closed under current journal FX restrictions. No live rate provider, bank, payment provider, OCR, external storage, webhook delivery, ZATCA, UAE FTA, or email provider is called.
