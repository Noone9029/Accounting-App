# DEV-11 Clearing Variance Proposal Check Evidence

Date: 2026-05-30

Latest commit inspected before mutation: `7e00d22d Preflight DEV-11 clearing variance proposal`

Marker: `DEV11-INV-20260530T000000`

## 1. Approval Text Used

`I approve DEV-11 Part 11 local-only clearing variance proposal posting checks under marker DEV11-INV-20260530T000000. No production, no beta, no customer data, no CSV, no PDF, no download/archive output.`

## 2. Local Target Proof

| Check | Result |
| --- | --- |
| Database scheme | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Classification | `local-only accepted` |

The runner rejected non-local or hosted-looking database targets before mutation. No hosted/provider target was used.

## 3. Marker And Safe IDs

| Component | Safe ID prefix |
| --- | --- |
| Organization | `837b9c13` |
| User | `e08ad608` |
| Purchase bill | `6d84a149` |
| Purchase receipt | `a413ac33` |
| Variance proposal | `141aa064` |
| Source variance journal | `267366ad` |
| Reversal journal | `1270a557` |

## 4. Pre-Check Counts

The original pre-Part-11 marker baseline was:

| Area | Before |
| --- | ---: |
| Organizations | `1` |
| Users | `1` |
| Accounts | `9` |
| Inventory settings | `1` |
| Items | `1` |
| Warehouses | `1` |
| Stock movements | `3` |
| Purchase receipts | `1` |
| Sales stock issues | `1` |
| Variance proposals | `0` |
| Variance proposal events | `0` |
| Journal entries | `5` |
| Journal lines | `10` |
| Generated documents | `0` |
| Audit logs | `4` |

The resumed verifier confirmed final deltas from this baseline exactly.

## 5. Clearing Variance Read

Only small numeric read checks were used. No CSV, PDF, download, archive, or report body output was generated.

| Check | Result |
| --- | --- |
| Reconciliation status | `BILL_WITHOUT_RECEIPT_POSTING` |
| Bill clearing debit | `90.0000` |
| Active receipt clearing credit | `0.0000` |
| Net clearing difference | `90.0000` |
| Clearing variance row count | `2` |
| First matching variance status | `BILL_WITHOUT_RECEIPT_POSTING` |
| First matching variance amount | `90.0000` |
| Warning count on first row | `2` |

The extra variance row is expected because the marker receipt asset posting was reversed in Part 8.

## 6. Proposal Create/Identify Result

The runner created the marker clearing variance proposal during the approved mutation path, then resumed from the same marker proposal after a temporary runner assertion stopped on reversal-line ordering. No duplicate marker proposal was created.

| Check | Result |
| --- | --- |
| Workflow mode in final verifier | `resumed-existing-marker-proposal` |
| Proposal status after create | `DRAFT` |
| Amount | `90.0000` |
| Debit account | Inventory Adjustment Loss `DEV11-5100` |
| Credit account | Inventory Clearing `240` |
| Journal created by create | No |

## 7. Submit Result

The proposal moved from `DRAFT` to `PENDING_APPROVAL`.

Event evidence includes one `SUBMIT` event with `DRAFT -> PENDING_APPROVAL`.

## 8. Approve Result

The proposal moved from `PENDING_APPROVAL` to `APPROVED`.

Event evidence includes one `APPROVE` event with `PENDING_APPROVAL -> APPROVED`.

## 9. Post Result

The approved proposal was posted through the real local `InventoryVarianceProposalService.post` path.

| Check | Result |
| --- | --- |
| Proposal status after post | `POSTED` |
| Source journal safe ID | `267366ad` |
| Source journal final status | `REVERSED` after the later reversal |
| Total debit | `90.0000` |
| Total credit | `90.0000` |

Source journal line evidence:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | Inventory Adjustment Loss `DEV11-5100` | `90.0000` | `0.0000` |
| 2 | Inventory Clearing `240` | `0.0000` | `90.0000` |

## 10. Duplicate-Post Behavior

Duplicate post was blocked with the existing code policy:

`Only approved variance proposals can be posted.`

Counts stayed unchanged during the duplicate-post expected-failure check.

## 11. Reversal Result

Variance proposal reversal completed through the real local `InventoryVarianceProposalService.reverse` path.

| Check | Result |
| --- | --- |
| Final proposal status | `REVERSED` |
| Source journal safe ID | `267366ad` |
| Source journal final status | `REVERSED` |
| Reversal journal safe ID | `1270a557` |
| Reversal points to source journal | Yes |

Reversal journal line evidence:

| Line | Account | Debit | Credit |
| ---: | --- | ---: | ---: |
| 1 | Inventory Adjustment Loss `DEV11-5100` | `0.0000` | `90.0000` |
| 2 | Inventory Clearing `240` | `90.0000` | `0.0000` |

## 12. Void Result

The final resumed verifier checked the safe terminal-state void blocker. Voiding the reversed proposal was blocked with:

`Reversed variance proposals are terminal.`

The active-posted void check was not rerun after resume because the marker proposal was already reversed. The initial runner reached reversal, and final counts confirmed no void mutation survived.

## 13. Final Counts

| Area | Before | Final | Delta |
| --- | ---: | ---: | ---: |
| Organizations | `1` | `1` | `0` |
| Users | `1` | `1` | `0` |
| Accounts | `9` | `9` | `0` |
| Inventory settings | `1` | `1` | `0` |
| Items | `1` | `1` | `0` |
| Warehouses | `1` | `1` | `0` |
| Stock movements | `3` | `3` | `0` |
| Purchase receipts | `1` | `1` | `0` |
| Sales stock issues | `1` | `1` | `0` |
| Variance proposals | `0` | `1` | `+1` |
| Variance proposal events | `0` | `5` | `+5` |
| Journal entries | `5` | `7` | `+2` |
| Journal lines | `10` | `14` | `+4` |
| Generated documents | `0` | `0` | `0` |
| Audit logs | `4` | `9` | `+5` |

Event actions:

| Action | Transition |
| --- | --- |
| `CREATE` | `null -> DRAFT` |
| `SUBMIT` | `DRAFT -> PENDING_APPROVAL` |
| `APPROVE` | `PENDING_APPROVAL -> APPROVED` |
| `POST` | `APPROVED -> POSTED` |
| `REVERSE` | `POSTED -> REVERSED` |

Audit action summary:

| Action | Count |
| --- | ---: |
| `INVENTORY_VARIANCE_PROPOSAL_CREATED` | `1` |
| `INVENTORY_VARIANCE_PROPOSAL_SUBMITTED` | `1` |
| `INVENTORY_VARIANCE_PROPOSAL_APPROVED` | `1` |
| `INVENTORY_VARIANCE_PROPOSAL_POSTED` | `1` |
| `INVENTORY_VARIANCE_PROPOSAL_REVERSED` | `1` |

## 14. Financial Statement Impact Summary

Post impact before reversal:

- Dr Inventory Adjustment Loss `DEV11-5100` `90.0000`.
- Cr Inventory Clearing `240` `90.0000`.

Reversal impact:

- Dr Inventory Clearing `240` `90.0000`.
- Cr Inventory Adjustment Loss `DEV11-5100` `90.0000`.

Final source-plus-reversal net:

| Check | Result |
| --- | ---: |
| Inventory Adjustment Loss net | `0.0000` |
| Inventory Clearing net | `0.0000` |
| Source plus reversal trial debit | `180.0000` |
| Source plus reversal trial credit | `180.0000` |

Operational stock movements remained `3`, so inventory quantity evidence was not polluted by the variance proposal accounting checks.

## 15. No CSV/PDF/Download/Archive/Body Output Guarantee

No CSV, PDF, download, archive, generated-document output, attachment output, full payload body, request body, response body, DB URL, token, auth header, cookie, audit metadata body, or secret was printed.

Generated-document count stayed `0`.

## 16. No Production/Beta/Customer-Data Guarantee

The check ran only on `localhost:5432/accounting`, inside the synthetic marker organization for `DEV11-INV-20260530T000000`. No production, beta, hosted/shared, provider, or customer-data target was used.

## 17. Commands Run

- `corepack pnpm --dir apps/api exec tsx scripts/dev11-part11-variance-proposal-check.temp.ts`
- `corepack pnpm --dir apps/api exec -- tsx scripts/dev11-part11-variance-proposal-check.temp.ts`

The first command completed the approved lifecycle through reversal but stopped on a temporary order-sensitive assertion for reversal journal lines. The second command resumed from the existing marker proposal, verified the final state, verified safe blocker checks, and created no duplicate proposal.

## 18. Commands Skipped

- Fixture creation outside the marker scope
- Unrelated inventory mutations
- Report generation beyond safe numeric reads
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

## 19. Temporary Runner Cleanup

Temporary runner `apps/api/scripts/dev11-part11-variance-proposal-check.temp.ts` was removed after the check.

## 20. Recommended Next Thread

`DEV-11 Part 12: clearing variance proposal evidence verification`

## 21. Verification Note

Part 12 read-only verification is recorded in [DEV_11_CLEARING_VARIANCE_PROPOSAL_EVIDENCE_VERIFICATION.md](DEV_11_CLEARING_VARIANCE_PROPOSAL_EVIDENCE_VERIFICATION.md). It verified the marker variance proposal lifecycle, source/reversal journal relationship, final counts, zero generated-document count, persisted audit actions, source-plus-reversal financial net, and no discrepancies.
