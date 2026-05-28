# DEV-08J Cash Expense Repeated Void Negative Check Evidence

## Scope

- Task: `DEV-08J Part 23: approved local cash expense repeated void negative check`.
- Approval phrase status: received exactly.

## Results

| Call | Source | Result |
| --- | --- | --- |
| Void posted cash expense | `EXP-000066` | ok, status `VOIDED`, reversal prefix `2987b7c4` |
| Void already voided cash expense | `EXP-000066` | ok |

## Side Effects

| Count | Before | After |
| --- | ---: | ---: |
| Generated documents | `857` | `857` |
| Email outbox rows | `224` | `224` |
| ZATCA submission logs | `331` | `331` |
| Planned signed artifact drafts | `33` | `33` |
| Journal entries | `3186` | `3187` |
