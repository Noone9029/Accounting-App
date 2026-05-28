# DEV-08J Supplier Payment Repeated Blocker Negative Check Evidence

## Scope

- Task: `DEV-08J Part 14: approved local supplier payment repeated blocker negative check`.
- Approval phrase status: received exactly.

## Results

| Call | Source | Result |
| --- | --- | --- |
| Void active unapplied allocation payment | `PAY-000320` | blocked: `Cannot void supplier payment with active unapplied allocations. Reverse allocations first.` |
| Void payment with posted refund | `PAY-000321` | blocked: `Cannot void supplier payment with posted supplier refunds. Void refunds first.` |
| Apply unapplied payment | `PAY-000323` | ok |
| Apply when unapplied exhausted | `PAY-000323` | blocked: `Amount applied cannot exceed the supplier payment unapplied amount.` |
| Reverse unapplied allocation | `PAY-000323` | ok |
| Reverse same allocation again | `PAY-000323` | blocked: `Supplier payment unapplied allocation has already been reversed.` |
| Void unblocked payment | `PAY-000324` | ok, status `VOIDED`, reversal prefix `400c412a` |
| Void already voided payment | `PAY-000324` | ok |

## Side Effects

| Count | Before | After |
| --- | ---: | ---: |
| Generated documents | `857` | `857` |
| Email outbox rows | `224` | `224` |
| ZATCA submission logs | `331` | `331` |
| Planned signed artifact drafts | `33` | `33` |
| Journal entries | `3183` | `3184` |
