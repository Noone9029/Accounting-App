# DEV-08J AP Output Duplicate Sweep Evidence

## Scope

- Task: `DEV-08J Part 5: approved local AP output duplicate generation sweep`.
- Approval phrase status: received exactly.
- Runtime mutation performed: yes, five local generated-document archive rows.
- PDF bodies/base64 printed: no.

## Side-Effect Counts

| Count | Before | After |
| --- | ---: | ---: |
| Generated documents | `852` | `857` |
| Email outbox rows | `224` | `224` |
| ZATCA submission logs | `331` | `331` |
| Planned signed artifact drafts | `33` | `33` |

## Duplicate Output Results

| Family | Source number | Source prefix | Docs before/after | New doc prefix | Filename | Hash prefix | Size | Prior hash matched |
| --- | --- | --- | ---: | --- | --- | --- | ---: | --- |
| Purchase bill | `BILL-000423` | `16e6f021` | `3 -> 4` | `fcfdeac3` | `purchase-bill-BILL-000423.pdf` | `e5de7500abb6` | `3417` | no |
| Supplier payment | `PAY-000318` | `7efa0003` | `3 -> 4` | `23adc762` | `supplier-payment-PAY-000318.pdf` | `6cb25b34ad5c` | `3136` | no |
| Supplier refund | `SRF-000127` | `e7eed3c7` | `3 -> 4` | `b5dafbfe` | `supplier-refund-SRF-000127.pdf` | `37b6587d14d2` | `3044` | no |
| Purchase debit note | `PDN-000127` | `7c07411c` | `3 -> 4` | `4ada1c31` | `purchase-debit-note-PDN-000127.pdf` | `5b411df35d03` | `3334` | no |
| Cash expense | `EXP-000065` | `bd4d1330` | `3 -> 4` | `cd7acd6f` | `cash-expense-EXP-000065.pdf` | `cb46b9d8d7fb` | `3263` | no |

## Conclusion

Repeated AP output generation currently creates another archive row for the same source. DEV-08J records this as current behavior and leaves reuse/supersede/versioning as a product policy decision.
