# DEV-08J Purchase Bill Repeated Finalize Void Negative Check Evidence

## Scope

- Task: `DEV-08J Part 11: approved local purchase bill repeated finalize and void negative check`.
- Approval phrase status: received exactly.

## Results

| Call | Source | Result |
| --- | --- | --- |
| Finalize already finalized | `BILL-000425` | ok |
| Void active supplier payment allocation bill | `BILL-000426` | blocked: `Cannot void purchase bill with active supplier payment allocations. Void payments first.` |
| Void active supplier payment unapplied allocation bill | `BILL-000427` | blocked: `Cannot void purchase bill with active supplier payment unapplied allocations. Reverse allocations first.` |
| Void active purchase debit note allocation bill | `BILL-000429` | blocked: `Cannot void purchase bill with active purchase debit note allocations. Reverse allocations first.` |
| Void unblocked finalized bill | `BILL-000425` | ok, status `VOIDED`, reversal prefix `85ed7b8d` |
| Void already voided bill | `BILL-000425` | ok |
| Finalize voided bill | `BILL-000425` | blocked: `Voided purchase bills cannot be finalized.` |

## Side Effects

| Count | Before | After |
| --- | ---: | ---: |
| Generated documents | `857` | `857` |
| Email outbox rows | `224` | `224` |
| ZATCA submission logs | `331` | `331` |
| Planned signed artifact drafts | `33` | `33` |
| Journal entries | `3182` | `3183` |
