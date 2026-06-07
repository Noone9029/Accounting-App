# DEV-11 Clearing Variance Proposal Evidence Verification

Date: 2026-05-30

Latest commit inspected: `58d7b722 Check DEV-11 clearing variance proposal`

Marker: `DEV11-INV-20260530T000000`

## 1. Purpose And Scope

This Part 12 pass independently verifies the DEV-11 clearing variance proposal evidence from Part 11. It is read-only verification only.

No runtime mutation, proposal creation, proposal submission, proposal approval, posting, reversal, voiding, fixture creation, output generation, CSV/PDF/download/archive generation, E2E, smoke, full test, full build, migration, seed/reset/delete, deploy, environment change, production/beta target, customer-data access, body output, or secret output was performed.

## 2. Local Target Proof

| Check | Result |
| --- | --- |
| Database scheme | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Classification | `local-only accepted` |

The verifier rejected non-local or hosted-looking targets before any read.

## 3. Source Evidence Inspected

- `CODEX_HANDOFF.md`
- `docs/development/DEV_11_CLEARING_VARIANCE_PROPOSAL_CHECK_EVIDENCE.md`
- `docs/development/DEV_11_CLEARING_VARIANCE_PROPOSAL_PREFLIGHT.md`
- `docs/development/DEV_11_INVENTORY_FIXTURE_EVIDENCE_VERIFICATION.md`
- `docs/inventory/INVENTORY_ACCOUNTING_DESIGN.md`
- `docs/inventory/INVENTORY_ACCOUNTING_INTEGRITY_AUDIT.md`
- `BUG_AUDIT.md`
- `README.md`

## 4. Read-Only Verification Method

A temporary read-only Prisma verifier was created at `apps/api/scripts/dev11-part12-variance-proposal-verify.temp.ts`, executed with `corepack pnpm --dir apps/api exec -- tsx scripts/dev11-part12-variance-proposal-verify.temp.ts`, and removed after verification.

The verifier only selected marker rows and summarized counts, statuses, events, audit action names, account codes, and numeric balances. It did not call proposal create, submit, approve, post, reverse, void, output, login, migration, seed, reset, delete, deploy, email, ZATCA, backup, or restore paths.

## 5. Proposal Lifecycle Verification

| Check | Verified value |
| --- | --- |
| Proposal safe ID | `141aa064` |
| Final status | `REVERSED` |
| Amount | `90.0000` |
| Debit account | Inventory Adjustment Loss `DEV11-5100` |
| Credit account | Inventory Clearing `240` |
| Purchase bill safe ID | `6d84a149` |
| Purchase receipt safe ID | `a413ac33` |

Lifecycle event verification:

| Action | Transition |
| --- | --- |
| `CREATE` | `null -> DRAFT` |
| `SUBMIT` | `DRAFT -> PENDING_APPROVAL` |
| `APPROVE` | `PENDING_APPROVAL -> APPROVED` |
| `POST` | `APPROVED -> POSTED` |
| `REVERSE` | `POSTED -> REVERSED` |

Exactly one marker variance proposal exists for the marker bill/receipt pair.

## 6. Journal Verification

Source variance journal:

| Check | Verified value |
| --- | --- |
| Safe ID | `267366ad` |
| Status | `REVERSED` |
| Total debit | `90.0000` |
| Total credit | `90.0000` |
| Debit account | Inventory Adjustment Loss `DEV11-5100` |
| Credit account | Inventory Clearing `240` |
| Reversed-by relation | Reversal journal `1270a557` |

Reversal journal:

| Check | Verified value |
| --- | --- |
| Safe ID | `1270a557` |
| Status | `POSTED` |
| Reversal-of relation | Source journal `267366ad` |
| Total debit | `90.0000` |
| Total credit | `90.0000` |
| Debit account | Inventory Clearing `240` |
| Credit account | Inventory Adjustment Loss `DEV11-5100` |

Journal counts in the marker organization are `7` entries and `14` lines: the baseline bill clearing journal, COGS source/reversal pair, receipt asset source/reversal pair, and variance proposal source/reversal pair.

## 7. Financial Statement Impact Verification

Safe numeric checks confirmed:

- Source variance effect: Dr Inventory Adjustment Loss `DEV11-5100` `90.0000`; Cr Inventory Clearing `240` `90.0000`.
- Reversal effect: Dr Inventory Clearing `240` `90.0000`; Cr Inventory Adjustment Loss `DEV11-5100` `90.0000`.
- Final Inventory Adjustment Loss net from source plus reversal: `0.0000`.
- Final Inventory Clearing net from source plus reversal: `0.0000`.
- Source plus reversal trial-balance totals: debit `180.0000`, credit `180.0000`.
- Operational stock movements remained `3`, so inventory quantity evidence was not polluted by variance accounting checks.

## 8. Generated-Document/Output Baseline

Generated-document count stayed `0`.

No CSV, PDF, download, archive, attachment, generated-document output, or report output was created or read.

## 9. Audit Baseline

Audit log count for the marker organization is `9`.

The verifier selected action names only, not audit `before` or `after` bodies. Persisted variance proposal audit actions are:

| Action | Count |
| --- | ---: |
| `INVENTORY_VARIANCE_PROPOSAL_CREATED` | `1` |
| `INVENTORY_VARIANCE_PROPOSAL_SUBMITTED` | `1` |
| `INVENTORY_VARIANCE_PROPOSAL_APPROVED` | `1` |
| `INVENTORY_VARIANCE_PROPOSAL_POSTED` | `1` |
| `INVENTORY_VARIANCE_PROPOSAL_REVERSED` | `1` |

## 10. Discrepancies/Blockers

No application discrepancies or blockers were found.

Part 11 noted a temporary runner assertion issue around reversal journal line ordering. Part 12 verified the persisted source and reversal lines by account/side/amount and found the application state correct.

## 11. No-Mutation/No-Output/No-Secret Guarantee

Part 12 was read-only. It printed only safe target classification, safe ID prefixes, counts, statuses, event transitions, account codes, audit action counts, and numeric summaries.

It did not print DB URLs, tokens, auth headers, cookies, secrets, request/response payload bodies, audit metadata bodies, customer/vendor payload bodies, inventory payload bodies, CSV/PDF bodies, generated-document base64, or attachment bodies.

## 12. Commands Run

- `corepack pnpm --dir apps/api exec -- tsx scripts/dev11-part12-variance-proposal-verify.temp.ts`

## 13. Commands Skipped

- Runtime mutation commands
- Proposal create/submit/approve/post/reverse/void
- Fixture creation
- Output generation
- CSV/PDF/download/archive generation
- Login/browser flows
- E2E
- Smoke
- Full tests
- Full build
- Migrations
- Seed/reset/delete
- Deploys
- Environment changes
- ZATCA
- Email
- Backup/restore
- Production/beta/customer-data access

## 14. Recommended Next Thread

`DEV-11 Part 13: inventory valuation reports and financial statement impact preflight`
