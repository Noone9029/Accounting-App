# DEV-08J Supplier Refund Repeated Void Negative Check Evidence

## Scope

- Task: `DEV-08J Part 17: approved local supplier refund repeated void negative check`.
- Approval phrase status: received exactly.

## Results

| Call | Source | Result |
| --- | --- | --- |
| Void posted supplier refund | `SRF-000129` | ok, status `VOIDED`, reversal prefix `2a1e0742` |
| Void already voided supplier refund | `SRF-000129` | ok |

## Side Effects

| Count | Before | After |
| --- | ---: | ---: |
| Generated documents | `857` | `857` |
| Email outbox rows | `224` | `224` |
| ZATCA submission logs | `331` | `331` |
| Planned signed artifact drafts | `33` | `33` |
| Journal entries | `3184` | `3185` |
