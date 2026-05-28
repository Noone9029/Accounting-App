# DEV-08J Purchase Debit Note Repeated Blocker Negative Check Evidence

## Scope

- Task: `DEV-08J Part 20: approved local purchase debit note repeated blocker negative check`.
- Approval phrase status: received exactly.

## Results

| Call | Source | Result |
| --- | --- | --- |
| Void active allocation debit note | `PDN-000128` | blocked: `Cannot void purchase debit note with active allocations. Reverse allocations first.` |
| Void debit note with posted refund | `PDN-000129` | blocked: `Cannot void purchase debit note with posted supplier refunds. Void refunds first.` |
| Apply purchase debit note | `PDN-000130` | ok |
| Apply when unapplied exhausted | `PDN-000130` | blocked: `Amount applied cannot exceed purchase debit note unapplied amount.` |
| Reverse purchase debit note allocation | `PDN-000130` | ok |
| Reverse same allocation again | `PDN-000130` | blocked: `Purchase debit note allocation has already been reversed.` |
| Void unblocked purchase debit note | `PDN-000130` | ok, status `VOIDED`, reversal prefix `a9456af1` |
| Void already voided purchase debit note | `PDN-000130` | ok |

## Side Effects

| Count | Before | After |
| --- | ---: | ---: |
| Generated documents | `857` | `857` |
| Email outbox rows | `224` | `224` |
| ZATCA submission logs | `331` | `331` |
| Planned signed artifact drafts | `33` | `33` |
| Journal entries | `3185` | `3186` |
