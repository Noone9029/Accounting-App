# DEV-08M AP Cleanup Inventory Dry-Run Evidence Verification

## Purpose And Scope

- Task: `DEV-08M Part 3: AP cleanup inventory dry-run evidence verification`.
- Latest commit inspected: `3b3c269f Inventory DEV-08M AP cleanup candidates`.
- Verification type: read-only local verification.
- Runtime mutation performed: no.
- Deletion/update/archive/revoke/cleanup performed: no.
- Production, beta, hosted/shared, or customer data used: no.

This verification reviewed [DEV_08M_AP_CLEANUP_INVENTORY_DRY_RUN_EVIDENCE.md](DEV_08M_AP_CLEANUP_INVENTORY_DRY_RUN_EVIDENCE.md), reran local count-only checks against the same local target, and confirmed the dry-run evidence remains stable.

## Local Target Verification

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Local-only classification | `true` |

## Evidence Verification Result

| Check | Result |
| --- | --- |
| Part 2 was count-only | `true` |
| Markers detected | `12` |
| Live counts matched Part 2 evidence | `true` |
| Entity counts unchanged during verification | `true` |
| Cleanup/delete/archive/revoke occurred | `false` |
| Bodies/secrets/customer data printed | `false` |
| Temporary scripts removed | `true` |

## Reverified Counts

| Entity type | Count |
| --- | ---: |
| AP source documents | `64` |
| AP source document lines | `25` |
| Journals and journal lines | `67` |
| Allocations and reversals | `2` |
| Receipts and stock movements | `9` |
| Generated documents linked by AP source | `24` |
| Email outbox rows linked by source or generated document | `4` |
| Provider events linked to generated-document emails | `0` |
| Audit logs linked to AP source ids | `110` |
| ZATCA marker hits | `0` |
| Users, roles, and memberships marker hits | `6` |

These values matched the Part 2 evidence exactly.

## Dependency Order Review

The Part 2 dependency order is plausible for a future planner, while remaining non-operative because no deletion is approved:

1. Report only; no deletion approved.
2. Email provider events.
3. Email outbox rows.
4. Generated document metadata/content rows.
5. Audit/auth rows.
6. Allocation/reversal rows.
7. Journal lines and journal entries.
8. Stock movements and receipt lines.
9. AP source document lines.
10. AP source documents.
11. Users, roles, memberships.
12. Organization-level ZATCA metadata/logs.

The ordering correctly treats externally linked metadata before generated documents, generated documents before source documents, and audit/auth/ZATCA evidence as preserve-by-default records rather than cleanup targets.

## Temp Script Cleanup

- Temporary verifier path: `apps/api/scripts/dev08m-part3-dry-run-verification.temp.ts`.
- Final `Test-Path` result after deletion: `False`.
- Final `Get-ChildItem apps/api/scripts -Filter '*dev08m*'` result: no matching temp scripts printed.

## Commands Run

- `corepack pnpm --dir apps/api exec tsx scripts/dev08m-part3-dry-run-verification.temp.ts`
- `Remove-Item` for the temporary verifier after path verification.
- `Test-Path -LiteralPath 'apps\api\scripts\dev08m-part3-dry-run-verification.temp.ts'`
- `Get-ChildItem -LiteralPath 'apps\api\scripts' -Filter '*dev08m*'`

## Commands Skipped

- Delete/update/archive/revoke/cleanup execution.
- Migrations, seed/reset/delete, deploys, environment/provider/schema changes, backup/restore, production-hosting research, full E2E, full smoke, full build, and full tests.
- Login/browser/API endpoint calls.
- PDF generation, generated-document downloads, attachment downloads, report exports, body/base64 reads, and request/response body output.
- Real email, provider calls, SMTP, retry workers, webhooks, diagnostics sends, and real AP delivery.
- Real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths, signed XML, and QR payload handling.
- Production, beta, hosted/shared, or customer-data actions.

## Exact Next Prompt Title

`DEV-08M Part 4: generated-document duplicate output policy preflight`
