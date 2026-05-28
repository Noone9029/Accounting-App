# DEV-08J AP Repeated Idempotency Blocker Preflight

## Purpose And Scope

- Task: `DEV-08J Part 1: AP repeated idempotency and blocker paths preflight`.
- Latest commit inspected: `0342d742 Close DEV-08I AP output permission evidence`.
- Local `HEAD` matched `origin/main`: yes (`0 0` ahead/behind after `git fetch origin main --prune`).
- Branch inspected: `main`.
- Marker: `DEV08J-AP-20260528T000000`.
- Runtime mutation performed: no.
- Negative-check service calls performed: no.
- Output generation/download/login/browser/email/ZATCA performed: no.

This preflight stayed read-only. It inspected the DEV-08I closure, previous AP closure docs, AP service code, Prisma schema, local Docker health, and local database metadata. It did not generate PDFs, read PDF bodies/base64, send email, run ZATCA, run migrations, seed/reset/delete, deploy, change environment/provider/schema settings, or use production/beta/customer data.

## Local Target And Baseline

| Check | Result |
| --- | --- |
| Docker Postgres | `infra-postgres-1`, healthy, local port `5432` |
| Docker Redis | `infra-redis-1`, healthy, local port `6379` |
| Database target | protocol `postgresql`, host `localhost`, port `5432`, database `accounting` |
| Organization prefix | `00000000` |
| Local actor prefix | `09f892d4` |
| Reused local fake supplier prefix | `4a37083e` |
| Expense/cash account prefixes | `a07f9dd7` / `1b3fd542` |
| Inventory item/warehouse prefixes | `025c708a` / `083d035b` |
| Existing DEV-08J marker fixtures | `0` |
| DEV-08J temporary scripts before runner creation | `0` |

Baseline side-effect counts before DEV-08J writes:

| Count | Baseline |
| --- | ---: |
| Generated documents | `852` |
| Email outbox rows | `224` |
| ZATCA submission logs | `331` |
| Planned signed artifact drafts | `33` |
| Journal entries | `3161` |

## Path Inventory

Repeated/idempotency paths selected:

- Purchase order `approve`, `markSent`, `close`, `void`, and `convertToBill`.
- Purchase bill `finalize` and `void`.
- Supplier payment `applyUnapplied`, `reverseUnappliedAllocation`, and `void`.
- Supplier refund `void`.
- Purchase debit note `apply`, `reverseAllocation`, and `void`.
- Cash expense `void`.
- Purchase receipt `postInventoryAsset`, `reverseInventoryAsset`, and `void`.
- Generated-document duplicate archive behavior for purchase bill, supplier payment receipt, supplier refund, purchase debit note, and cash expense. DEV-08H already proved purchase-order duplicate generation creates another archive row.

Active/blocker paths selected:

- Purchase bill void blocked by active supplier payment allocation.
- Purchase bill void blocked by active supplier payment unapplied allocation.
- Purchase bill void blocked by active purchase debit note allocation.
- Supplier payment void blocked by active unapplied allocation.
- Supplier payment void blocked by posted supplier refund.
- Purchase debit note void blocked by active allocation.
- Purchase debit note void blocked by posted supplier refund.
- Purchase receipt void blocked by active inventory asset posting.
- Purchase receipt repeated asset-post/reversal/void blockers.

The purchase bill service currently does not contain a linked-receipt void blocker, so linked-receipt bill blocking is documented as a policy/code gap rather than selected as an executable negative check. Purchase receipt insufficient-stock void coverage is also not selected in this arc because it would require broader cross-domain stock consumption setup; it remains a residual inventory-specific gap.

## Selected DEV-08J Sequence

1. Create a marker-scoped local source fixture pack for repeated and blocker checks.
2. Verify the fixture pack read-only.
3. Run duplicate AP output generation for selected already-proven DEV-08I AP sources, recording only safe hashes, byte counts, counts, filenames, statuses, and prefixes.
4. Run repeated/idempotency and blocker checks by AP family: purchase orders, purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, and purchase receipts.
5. Review the DEV-08I source-PDF permission policy edge and either apply a narrow hardening or document the product policy.
6. Close DEV-08J with a read-only evidence summary and next prompt.

## Approval Gate

Required Part 2 phrase was received exactly in the upfront approval bundle:

`I approve DEV-08J Part 2 local-only AP repeated blocker source fixture mutation under marker DEV08J-AP-20260528T000000. No production, no beta, no customer data.`

## Commands Run

- `git status --short --branch`.
- `git rev-parse --show-toplevel`.
- `git rev-parse HEAD`.
- `git branch --show-current`.
- `git fetch origin main --prune`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `docker ps --format ...`.
- Read-only `rg`/`Get-Content` inspection of the DEV-08J prompt pack, handoff, DEV-08I closure, previous AP closure docs, AP service code, and Prisma schema.
- Read-only Prisma metadata inventory through the temporary guarded DEV-08J runner.

## Commands Skipped

- State-changing AP service calls and negative checks.
- Output generation, generated-document download, PDF/body/base64 reads, login/browser flows, real email, provider calls, and real ZATCA.
- Migrations, seed/reset/delete, deploys, environment/provider/schema changes, backups/restores, production-hosting research, full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.

## Part 2 Note

Completed in [DEV_08J_AP_REPEATED_BLOCKER_SOURCE_FIXTURE_MUTATION_EVIDENCE.md](DEV_08J_AP_REPEATED_BLOCKER_SOURCE_FIXTURE_MUTATION_EVIDENCE.md). The approved local-only fixture pack created marker-scoped AP sources and active blocker dependencies without generating PDFs, sending email, running ZATCA, using production/beta/customer data, or changing generated-document/email/ZATCA counts.

## Exact Next Prompt Title

`DEV-08K Part 1: AP generated-document email design preflight`
