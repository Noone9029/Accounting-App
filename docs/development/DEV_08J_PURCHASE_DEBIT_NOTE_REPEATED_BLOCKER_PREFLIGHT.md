# DEV-08J Purchase Debit Note Repeated Blocker Preflight

## Scope

- Task: `DEV-08J Part 19: purchase debit note repeated blocker preflight`.
- Runtime mutation performed: no.

## Planned Calls

- Void debit note with active allocation.
- Void debit note with posted supplier refund.
- Apply purchase debit note.
- Attempt to apply beyond unapplied amount.
- Reverse purchase debit note allocation.
- Reverse the same allocation again.
- Void unblocked purchase debit note.
- Void the same debit note again.

## Approval Gate

Required Part 20 phrase was received exactly in the upfront approval bundle:

`I approve DEV-08J Part 20 local-only purchase debit note repeated blocker negative check under marker DEV08J-AP-20260528T000000. No production, no beta, no customer data.`
