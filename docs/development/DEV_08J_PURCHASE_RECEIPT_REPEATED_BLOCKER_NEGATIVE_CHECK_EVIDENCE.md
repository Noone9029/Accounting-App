# DEV-08J Purchase Receipt Repeated Blocker Negative Check Evidence

## Scope

- Task: `DEV-08J Part 26: approved local purchase receipt repeated blocker negative check`.
- Approval phrase status: received exactly.

## Results

| Call | Source | Result |
| --- | --- | --- |
| Post already asset-posted receipt | `PRC-000232` | blocked: `Inventory asset posting has already been posted for this purchase receipt.` |
| Void active asset-posted receipt | `PRC-000232` | blocked: `Reverse inventory asset posting before voiding this purchase receipt.` |
| Reverse inventory asset | `PRC-000232` | ok |
| Reverse already reversed inventory asset | `PRC-000232` | blocked: `Inventory asset posting has already been reversed for this purchase receipt.` |
| Void asset-reversed receipt | `PRC-000232` | ok, status `VOIDED` |
| Void already voided receipt | `PRC-000232` | blocked: `Purchase receipt is already voided.` |

## Side Effects

| Count | Before | After |
| --- | ---: | ---: |
| Generated documents | `857` | `857` |
| Email outbox rows | `224` | `224` |
| ZATCA submission logs | `331` | `331` |
| Planned signed artifact drafts | `33` | `33` |
| Journal entries | `3187` | `3188` |
