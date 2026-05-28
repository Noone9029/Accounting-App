# DEV-08J AP Repeated Idempotency And Blocker Closure

## Scope

- Task: `DEV-08J Part 31: AP repeated idempotency and blocker closure`.
- Marker: `DEV08J-AP-20260528T000000`.
- Latest commit inspected at arc start: `0342d742 Close DEV-08I AP output permission evidence`.
- Local-only target: sanitized DB host `localhost`, port `5432`, database `accounting`.
- Runtime data mutations in this arc: approved local fixture creation, duplicate output sweep, and approved repeated/blocker service checks only.
- Production/beta/customer data used: no.
- Real email/ZATCA/deploy/migration/seed/reset/delete/env/provider/schema changes: no.

## What DEV-08J Proved

- Created local marker-scoped AP fixtures for repeated/idempotency and blocker checks.
- Verified AP duplicate output behavior: repeated generation creates additional generated-document archive rows for purchase bill, supplier payment receipt, supplier refund, purchase debit note, and cash expense.
- Proved purchase order repeated transition behavior and blockers.
- Proved purchase bill repeated finalize/void behavior and active allocation blockers.
- Proved supplier payment active allocation/refund blockers, repeated apply/reverse behavior, and void-repeat behavior.
- Proved supplier refund repeated void behavior.
- Proved purchase debit note active allocation/refund blockers, repeated apply/reverse behavior, and void-repeat behavior.
- Proved cash expense repeated void behavior.
- Proved purchase receipt repeated asset post/reverse/void blockers.
- Hardened the source PDF permission edge so AP source PDF stream/generate paths require source view plus `generatedDocuments.download`, while `pdf-data` remains source-view read-only.

## Final Side-Effect State

| Count | Final |
| --- | ---: |
| Generated documents | `857` |
| Email outbox rows | `224` |
| ZATCA submission logs | `331` |
| Planned signed artifact drafts | `33` |
| Journal entries | `3188` |

## Final Fixture States

- Purchase orders remained in the expected approved/sent/closed/voided/billed states.
- `BILL-000425`, `PAY-000324`, `SRF-000129`, `PDN-000130`, `EXP-000066`, and `PRC-000232` ended voided as expected.
- Blocker fixture bills/payments/debit notes remained posted/finalized with their active dependencies intact.
- `PRC-000232` ended voided with inventory asset posting both posted and reversed.

## What DEV-08J Did Not Prove

- Production, beta, hosted/shared-target, or customer-data behavior.
- Real email provider sending or AP generated-document email/outbox design.
- Real ZATCA network/signing/clearance/reporting/PDF-A3 behavior.
- Full browser E2E, full smoke, full build, full repo test suite, or cleanup executor behavior.
- All possible permission matrices beyond the source PDF edge hardened here.
- Product decision for generated-document duplicate reuse/supersede/versioning.

## Verification Summary

- Targeted API helper test passed.
- Targeted AP page Jest suites passed.
- API typecheck passed.
- `corepack pnpm verify:diff` and `git diff --check` are recorded in final command evidence for this closure.
- Full web test/typecheck remained blocked by unrelated untracked marketing/nav/permission-matrix work and was not fixed in this AP branch.

## Next Branch

`DEV-08K Part 1: AP generated-document email design preflight`

Reason: DEV-08H found no safe AP document email outbox path, DEV-08I proved AP output permissions, and DEV-08J closed repeated/idempotency/blocker behavior plus the source PDF permission edge. The next AP gap is designing AP generated-document email/outbox safely without real provider sends.
