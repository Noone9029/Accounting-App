# DEV-08J AP Output Duplicate Sweep Preflight

## Scope

- Task: `DEV-08J Part 4: AP output duplicate generation sweep preflight`.
- Runtime mutation performed: no.
- Output generated/downloaded: no.

## Selected Sources

DEV-08H already proved repeated purchase-order PDF generation creates another archive row. This preflight selected the remaining AP output families from already-proven local DEV-08I sources:

- Purchase bill.
- Supplier payment receipt.
- Supplier refund.
- Purchase debit note.
- Cash expense.

## Expected Behavior

Current generated-document archiving uses create behavior rather than reuse/upsert/supersede behavior. The expected local result for Part 5 was one additional `GeneratedDocument` row per selected source, with email and ZATCA counts unchanged.

## Approval Gate

Required Part 5 phrase was received exactly in the upfront approval bundle:

`I approve DEV-08J Part 5 local-only AP output duplicate generation sweep under marker DEV08J-AP-20260528T000000. No production, no beta, no customer data.`
