# DEV-08J Purchase Bill Repeated Finalize Void Preflight

## Scope

- Task: `DEV-08J Part 10: purchase bill repeated finalize and void preflight`.
- Runtime mutation performed: no.

## Planned Calls

- Finalize an already finalized bill.
- Void bills blocked by active supplier payment allocation, active supplier payment unapplied allocation, and active purchase debit note allocation.
- Void an unblocked finalized bill.
- Void the same bill again.
- Finalize the voided bill.

## Approval Gate

Required Part 11 phrase was received exactly in the upfront approval bundle:

`I approve DEV-08J Part 11 local-only purchase bill repeated finalize and void negative check under marker DEV08J-AP-20260528T000000. No production, no beta, no customer data.`
