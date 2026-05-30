# DEV-11 Sales Stock Issue COGS Evidence Verification

Date: 2026-05-30

Latest commit inspected: `7c4384e7 Check DEV-11 sales stock issue COGS`

Marker: `DEV11-INV-20260530T000000`

## 1. Purpose And Scope

This Part 6 pass independently verifies the DEV-11 sales stock issue COGS evidence from Part 5. It is read-only verification only.

No runtime mutation, COGS posting, COGS reversal, fixture creation, report output, CSV/PDF/download/archive generation, E2E, smoke, full test, full build, migration, seed/reset/delete, deploy, environment change, production/beta target, customer-data access, body output, or secret output was performed.

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
- `docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_CHECK_EVIDENCE.md`
- `docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_PREFLIGHT.md`
- `docs/development/DEV_11_INVENTORY_FIXTURE_EVIDENCE_VERIFICATION.md`
- `docs/inventory/INVENTORY_ACCOUNTING_DESIGN.md`
- `docs/inventory/INVENTORY_ACCOUNTING_INTEGRITY_AUDIT.md`
- `BUG_AUDIT.md`
- `README.md`

## 4. Read-Only Verification Method

A temporary read-only Prisma verifier was created at `apps/api/scripts/dev11-part6-cogs-verify.temp.ts`, executed with `corepack pnpm --dir apps/api exec tsx scripts/dev11-part6-cogs-verify.temp.ts`, and removed after verification.

The verifier only selected marker rows and summarized counts, statuses, actions, account codes, and numeric balances. It did not call posting, reversal, void, output, login, migration, seed, reset, delete, deploy, email, ZATCA, backup, or restore paths.

## 5. COGS State Verification

| Check | Verified value |
| --- | --- |
| Sales stock issue safe ID | `c3d25519` |
| Issue status | `POSTED` |
| COGS source journal linked | Yes |
| COGS reversal journal linked | Yes |
| `cogsPostedAt` populated | Yes |
| `cogsReversedAt` populated | Yes |
| Source COGS journal safe ID | `8459b09e` |
| Reversal journal safe ID | `8b8c57c5` |

The issue remains an operational posted stock issue; it was not voided during Part 5 or Part 6.

## 6. Journal Verification

Source COGS journal:

| Check | Verified value |
| --- | --- |
| Status | `REVERSED` |
| Total debit | `50.0000` |
| Total credit | `50.0000` |
| Debit account | COGS `DEV11-5000` |
| Credit account | Inventory Asset `DEV11-1200` |
| Reversed-by relation | Reversal journal `8b8c57c5` |

Reversal journal:

| Check | Verified value |
| --- | --- |
| Status | `POSTED` |
| Reversal-of relation | Source COGS journal `8459b09e` |
| Total debit | `50.0000` |
| Total credit | `50.0000` |
| Debit account | Inventory Asset `DEV11-1200` |
| Credit account | COGS `DEV11-5000` |

Journal counts in the marker organization were `3` entries and `6` lines: one baseline purchase-bill clearing journal, one COGS source journal, and one COGS reversal journal.

## 7. Financial Statement Impact Verification

Safe numeric checks confirmed:

- Source COGS effect: Dr COGS `DEV11-5000` `50.0000`; Cr Inventory Asset `DEV11-1200` `50.0000`.
- Reversal effect: Dr Inventory Asset `DEV11-1200` `50.0000`; Cr COGS `DEV11-5000` `50.0000`.
- Final COGS net from source plus reversal: `0.0000`.
- Final Inventory Asset net from source plus reversal: `0.0000`.
- Source plus reversal trial-balance totals: debit `100.0000`, credit `100.0000`.
- Operational stock movements remained `3`, so inventory quantity evidence was not polluted by COGS accounting checks.

## 8. Generated-Document/Output Baseline

Generated-document count stayed `0`.

No CSV, PDF, download, archive, attachment, generated-document output, or report output was created or read.

## 9. Audit Baseline

Audit log count for the marker organization is `2`.

The verifier selected action names only, not audit `before` or `after` bodies. Persisted audit actions are standardized as:

| Action | Count |
| --- | ---: |
| `COGS_POSTED` | `1` |
| `COGS_REVERSED` | `1` |

## 10. Discrepancies/Blockers

No discrepancies or blockers were found.

One documentation precision was corrected in the Part 5 evidence: persisted audit events use standardized names `COGS_POSTED` and `COGS_REVERSED`.

## 11. No-Mutation/No-Output/No-Secret Guarantee

Part 6 was read-only. It printed only safe target classification, safe ID prefixes, counts, statuses, account codes, audit action counts, and numeric summaries.

It did not print DB URLs, tokens, auth headers, cookies, secrets, request/response payload bodies, audit metadata bodies, customer/vendor payload bodies, inventory payload bodies, CSV/PDF bodies, generated-document base64, or attachment bodies.

## 12. Commands Run

- `corepack pnpm --dir apps/api exec tsx scripts/dev11-part6-cogs-verify.temp.ts`

## 13. Commands Skipped

- Runtime mutation commands
- COGS posting
- COGS reversal
- Fixture creation
- Stock issue void
- Report CSV/PDF/download/archive generation
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

`DEV-11 Part 7: purchase receipt inventory asset preflight`
