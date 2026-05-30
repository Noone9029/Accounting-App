# DEV-09 Bank Transaction Actions Preflight

Status: completed read-only preflight
Date: 2026-05-30
Latest commit inspected: `85a847e3 Verify DEV-09 statement import parser`
Marker: `DEV09-BANK-20260530T000000`

## Scope

This preflight plans the approved local Part 8 bank statement transaction action checks. It is documentation and code inspection only.

Actions not performed: match, categorize, ignore, unignore, unmatch, reconciliation lifecycle mutation, statement import, E2E, smoke, migration, seed/reset/delete, deploy, environment change, production/beta/shared target access, customer-data access, real bank file access, output generation, download, PDF generation, email, ZATCA, backup, restore, or body/secret printing.

## Read First Evidence

- [DEV_09_BANKING_RECONCILIATION_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_09_BANKING_RECONCILIATION_FIXTURE_EVIDENCE_VERIFICATION.md)
- [DEV_09_STATEMENT_IMPORT_PARSER_EVIDENCE_VERIFICATION.md](DEV_09_STATEMENT_IMPORT_PARSER_EVIDENCE_VERIFICATION.md)

The marker fixture is ready for the selected Part 8 actions:

- Bank profile is active and local-only.
- Statement import exists with status `IMPORTED`.
- Three statement transactions exist and are still `UNMATCHED`.
- A posted two-line synthetic journal exists as the match candidate.
- No reconciliation rows exist yet.

## Selected Part 8 Actions

Part 8 should run exactly these synthetic local actions:

1. Match transaction:
   - Statement reference: `DEV09-BANK-20260530T000000-MATCH-001`
   - Current status: `UNMATCHED`
   - Type/amount: `CREDIT` / `100.0000`
   - Candidate source: posted journal `DEV09-BANK-20260530T000000-JE-000001`
   - Expected result: `MATCHED`, linked journal line/entry, match type `JOURNAL_LINE`
   - Journal delta: `0`
   - Audit delta: `+1`

2. Categorize transaction:
   - Statement reference: `DEV09-BANK-20260530T000000-CATEGORIZE-001`
   - Current status: `UNMATCHED`
   - Type/amount: `DEBIT` / `20.0000`
   - Category account: `DEV09-6200`
   - Expected result: `CATEGORIZED`, created posted manual journal, match type `MANUAL_JOURNAL`
   - Expected journal shape: debit category account `20.0000`, credit bank account `20.0000`
   - Journal delta: `+1` entry, `+2` lines
   - Audit delta: `+1`

3. Ignore transaction:
   - Statement reference: `DEV09-BANK-20260530T000000-IGNORE-001`
   - Current status: `UNMATCHED`
   - Type/amount: `DEBIT` / `5.0000`
   - Expected result: `IGNORED` with synthetic reason
   - Journal delta: `0`
   - Audit delta: `+1`

Expected import status after all three actions:

- `RECONCILED`, because all marker statement rows should be in reconciled statuses (`MATCHED`, `CATEGORIZED`, or `IGNORED`) and none should remain `UNMATCHED`.

## Unsupported Or Deferred Actions

- Unmatch/unignore are not selected for Part 8 because no dedicated endpoints or service methods are present in the inspected banking service.
- Closed-period blocker checks are deferred until reconciliation close creates a closed period in the later approved close/void batch.
- Reconciliation create/submit/approve/close/void is deferred to Parts 10 and 11.
- Statement import void is not selected because the fixture rows will become matched/categorized/ignored and the goal is transaction action evidence, not import void evidence.

## No-Partial-Write Plan

Part 8 should verify:

- The three selected transaction ids are the only marker transaction ids changed.
- Marker statement import and transaction counts stay unchanged.
- Marker bank reconciliation and reconciliation-item counts stay unchanged.
- Journal count increases only by the categorization journal.
- Audit count increases only by the three selected action logs.
- The match action does not create a journal.
- The ignore action does not create a journal.
- No real bank files, customer data, raw bodies, secrets, output downloads, PDFs, email, ZATCA, migrations, seed/reset/delete, or deploys are used.

## Required Part 8 Approval Phrase

Already received from the user and must be validated at Part 8 execution:

`I approve DEV-09 Part 8 local-only bank transaction match categorize ignore mutation under marker DEV09-BANK-20260530T000000. No production, no beta, no customer data.`

## Verification Plan

Required for this part:

- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check` if anything is staged

Skipped by design:

- Full tests, full build, E2E, smoke, browser login, persisted statement import, migrations, seed/reset/delete, production/beta/customer-data checks, output/download/PDF, real email, ZATCA, backup/restore, and deploys.

## Next Step

Proceed to `DEV-09 Part 8: approved local bank transaction match categorize ignore mutation`.
