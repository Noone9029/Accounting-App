# DEV-11 Sales Stock Issue COGS Check Evidence

Date: 2026-05-30

Latest commit inspected before mutation: `10b3503d Preflight DEV-11 sales stock issue COGS`

Marker: `DEV11-INV-20260530T000000`

## 1. Approval Text Used

`I approve DEV-11 Part 5 local-only sales stock issue COGS posting checks under marker DEV11-INV-20260530T000000. No production, no beta, no customer data, no CSV, no PDF, no download/archive output.`

## 2. Local Target Proof

| Check | Result |
| --- | --- |
| Database scheme | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Classification | `local-only accepted` |

The Part 5 runner rejected non-local or hosted-looking database targets before any mutation. No hosted/provider target was used.

## 3. Marker And Safe IDs

| Component | Safe ID prefix |
| --- | --- |
| Organization | `837b9c13` |
| User | `e08ad608` |
| Sales stock issue | `c3d25519` |

Marker issue: `DEV11-INV-SSI-0001`.

## 4. Pre-Check Counts

| Area | Before |
| --- | ---: |
| Organizations | `1` |
| Users | `1` |
| Accounts | `9` |
| Inventory settings | `1` |
| Items | `1` |
| Warehouses | `1` |
| Stock movements | `3` |
| Sales stock issues | `1` |
| Journal entries | `1` |
| Journal lines | `2` |
| Generated documents | `0` |
| Audit logs | `0` |

## 5. COGS Preview Result

| Check | Result |
| --- | --- |
| Preview status | `POSTABLE` |
| `canPost` | `true` |
| Blocking reasons | `0` |
| Total debit | `50.0000` |
| Total credit | `50.0000` |

Preview journal shape:

- Dr COGS account `DEV11-5000` for `50.0000`.
- Cr Inventory Asset account `DEV11-1200` for `50.0000`.

## 6. COGS Post Result

COGS posting completed through the real local `SalesStockIssueService.postCogs` path.

| Check | Result |
| --- | --- |
| Issue number | `DEV11-INV-SSI-0001` |
| COGS journal safe ID | `8459b09e` |
| `cogsJournalEntryId` populated | Yes |
| `cogsPostedAt` populated | Yes |
| `cogsPostedById` populated | Yes |
| Source journal status after post | `POSTED` |

## 7. Journal Entry/Line Evidence

The posted COGS journal was summarized only; no payload bodies were printed.

| Line | Side | Account | Amount |
| ---: | --- | --- | ---: |
| 1 | Debit | COGS `DEV11-5000` | `50.0000` |
| 2 | Credit | Inventory Asset `DEV11-1200` | `50.0000` |

The journal balanced with total debit `50.0000` and total credit `50.0000`, used the marker issue reference, and passed the fiscal-period guard.

Post delta before reversal:

| Area | Delta |
| --- | ---: |
| Journal entries | `+1` |
| Journal lines | `+2` |
| Audit logs | `+1` |
| Stock movements | `0` |
| Generated documents | `0` |

## 8. Duplicate-Post Behavior

Duplicate COGS post was blocked with the existing code policy:

`COGS has already been posted for this stock issue.`

Counts stayed unchanged during the duplicate-post expected-failure check.

## 9. Void-Blocker Behavior

Active-COGS void was checked through the service precondition path after confirming from code inspection that the blocker fires before the void transaction. It was blocked with:

`Reverse COGS posting before voiding this stock issue.`

Counts and marker issue state stayed unchanged during the void-blocker expected-failure check.

## 10. Reversal Result

COGS reversal completed through the real local `SalesStockIssueService.reverseCogs` path.

| Check | Result |
| --- | --- |
| Source COGS journal safe ID | `8459b09e` |
| Source COGS journal final status | `REVERSED` |
| Reversal journal safe ID | `8b8c57c5` |
| Reversal points to source journal | Yes |
| `cogsReversalJournalEntryId` populated | Yes |
| `cogsReversedAt` populated | Yes |
| Final preview status | `REVERSED` |
| Final `canPost` | `false` |

Reversal journal shape:

- Dr Inventory Asset `DEV11-1200` for `50.0000`.
- Cr COGS `DEV11-5000` for `50.0000`.

## 11. Final Counts

| Area | Before | Final | Delta |
| --- | ---: | ---: | ---: |
| Organizations | `1` | `1` | `0` |
| Users | `1` | `1` | `0` |
| Accounts | `9` | `9` | `0` |
| Inventory settings | `1` | `1` | `0` |
| Items | `1` | `1` | `0` |
| Warehouses | `1` | `1` | `0` |
| Stock movements | `3` | `3` | `0` |
| Sales stock issues | `1` | `1` | `0` |
| Journal entries | `1` | `3` | `+2` |
| Journal lines | `2` | `6` | `+4` |
| Generated documents | `0` | `0` | `0` |
| Audit logs | `0` | `2` | `+2` |

Final audit-log delta consists of one persisted `COGS_POSTED` action and one persisted `COGS_REVERSED` action. These are the standardized audit event names for the service actions `POST_COGS` and `REVERSE_COGS`.

## 12. Financial Statement Impact Summary

Safe numeric journal checks confirmed:

- Post impact: Dr COGS `DEV11-5000` `50.0000`; Cr Inventory Asset `DEV11-1200` `50.0000`.
- Final net after reversal: COGS account net `0.0000`; Inventory Asset account net `0.0000`.
- Source plus reversal trial-balance totals: debit `100.0000`; credit `100.0000`.
- Operational inventory quantities and stock movements stayed unchanged.

## 13. No CSV/PDF/Download/Archive/Body Output Guarantee

No CSV, PDF, download, archive, generated-document output, attachment output, full payload body, request body, response body, DB URL, token, auth header, cookie, or secret was printed.

Generated-document count stayed `0`.

## 14. No Production/Beta/Customer-Data Guarantee

The check ran only on `localhost:5432/accounting`, inside the synthetic marker organization for `DEV11-INV-20260530T000000`. No production, beta, hosted/shared, provider, or customer-data target was used.

## 15. Commands Run

- `corepack pnpm --dir apps/api exec tsx scripts/dev11-part5-cogs-check.temp.ts`

## 16. Commands Skipped

- Fixture creation outside the marker scope
- Unrelated inventory mutations
- Report generation beyond safe numeric journal reads
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

## 17. Temporary Runner Cleanup

Temporary runner `apps/api/scripts/dev11-part5-cogs-check.temp.ts` was removed after the check.

## 18. Recommended Next Thread

`DEV-11 Part 6: sales stock issue COGS evidence verification`

## 19. Verification Note

Part 6 read-only verification is recorded in [docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_EVIDENCE_VERIFICATION.md](docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_EVIDENCE_VERIFICATION.md). It verified the COGS source/reversal journals, final counts, zero generated-document count, standardized audit actions `COGS_POSTED` and `COGS_REVERSED`, and no discrepancies.
