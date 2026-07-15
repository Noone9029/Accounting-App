# LedgerByte Product UI Stabilization — User-Testing Rollout Evidence

Date: 2026-07-15
Environment: approved non-production burner user-testing deployment only

## Merge and source proof

- Implementation PR: [#356](https://github.com/Noone9029/Accounting-App/pull/356)
- Implementation branch: `codex/ui-stabilization-foundation`
- Reviewed feature head: `3bc71b2ea2aa141cb277bee4c4f2b056b3092c42`
- Implementation merge commit: `536049e742bf5a7aae65c6378a9f964f94b6c45d`
- Final `origin/main`: `536049e742bf5a7aae65c6378a9f964f94b6c45d`
- Merge proof: final `origin/main` contains squash merge commit `536049e742bf5a7aae65c6378a9f964f94b6c45d`; the pre-squash feature tip is recorded for review identity, while direct ancestry is not asserted because PR #356 used the repository's squash merge convention

## Stabilization scope

The merged change is frontend/docs/test hardening only. It covers the shared `LedgerActionDialog` busy/dismiss contract, mobile navigation dialog semantics and focus trap/restoration, explicit `/accounting-close` permission mapping, deterministic visual fixtures, bounded all-active-route verification, and honest route/page dispositions. No new product capability, accounting policy, API contract, schema, migration, provider, compliance submission, email delivery, storage-provider call, or money movement was added.

Inventory evidence remains 205 page modules, 96 canonical route definitions, 92 active routes, and 4 intentionally planned entries. No native `window.confirm` or `window.prompt` call sites remain under `apps/web/src`.

## Local verification on the reviewed implementation

| Gate | Result |
| --- | --- |
| Web Jest | 187 suites; 862 tests passed; 0 snapshots |
| API Jest baseline recorded in the stabilization ledger | 248 suites; 2,531 passed; 35 skipped |
| Web production build | Passed; Next 16.2.4 generated 142 static pages |
| Route/page inventory and disposition checks | Passed; 205 page modules and 92 active canonical routes |
| Interactive mobile guard | Passed; 1 test |
| All-active structural visual matrix | Passed; 18/18 cells, 92 active routes per cell, six roles × three viewports |
| Arabic RTL visual suite | Passed; 177 checks across 59 authenticated routes |
| Role-filtered visual suite | Passed; 171 checks across Owner, Admin, Accountant, Sales, Purchases, Viewer |
| Polished workflow visual suite | Passed; 31 checks |
| Independent review lanes | 0 Critical and 0 Important findings in UI, permissions, responsive/accessibility, and harness reviews |

## Burner deployments

| Surface | Project | Deployment | Canonical alias | Status |
| --- | --- | --- | --- | --- |
| Web | `ledgerbyte-web-test` | `dpl_73bmZq7jbkNSymXXrCoJEKBq1mN2` | `https://ledgerbyte-web-test.vercel.app` | READY |
| API | `ledgerbyte-api-test` | `dpl_S89AFCJzBsxonMqWtE5zvHT5UjC1` | `https://ledgerbyte-api-test.vercel.app` | READY |

The approved Supabase project reference is `xynelbjqcmbgtscfmmzv`. It was not mutated. No migrations were run and no environment variables were changed. The API was redeployed from the merged worktree because the explicit burner deployment lane was exercised; the merged diff itself contains no API source or schema change.

## Authenticated hosted smoke

The smoke loaded the approved DPAPI-backed burner credential in process memory only. Passwords, ciphertext, tokens, headers, request bodies, response bodies, and organization identifiers were not printed.

| Check | Result |
| --- | --- |
| API `/`, `/health`, `/readiness` | HTTP 200 |
| Deployed UI login | Passed; normal `/login` flow reached the authenticated shell |
| `/auth/me` and `/bank-accounts` | HTTP 200 in the authenticated session |
| Owner-session route shell checks | Passed for `/dashboard`, `/accounting-close`, `/fx-close`, `/settings/storage`, `/sales-invoices`, `/purchase-bills`, `/inventory/items`, and `/email-outbox`; all returned HTTP 200 with visible main content |
| Two-organization switch | Passed; 2 active options were exposed, selection changed, and no write action was performed |
| Mobile navigation | Passed; drawer exposed `role=dialog` and `aria-modal=true`, Escape dismissed it, and focus returned to the trigger |
| Arabic RTL mobile | Passed; `dir=rtl`, no document-level horizontal overflow |
| Desktop/mobile/RTL browser errors | 0 page errors and 0 console errors in the bounded proof; no document-level overflow |
| Destructive dialog on hosted records | Not exercised: the burner session did not expose a destructive record action without creating or mutating data. Shared destructive-dialog behavior is covered by local Jest and the interactive UI guard; no hosted record was created solely for this check. |

The repository-wide legacy deployed E2E command was also attempted with the same credential guard. It produced 22 passed, 4 failed, and 7 skipped in 8 minutes. The failures were limited to two strict locators that matched persistent loading headings, one transient `/bank-accounts` HTTP 500 during the run (a direct recheck returned 200), and a ZATCA page heading wait. That run is not counted as a full hosted-E2E pass; the bounded stabilization-specific proof above is the authoritative hosted UI result for this rollout.

## Safety and limitations

- This is burner user-testing evidence, not a production-readiness, compliance, provider, backup/restore, or real banking/payment claim.
- Hosted proof used the existing seeded organization context and did not create invoices, bills, journals, attachments, payments, or other business records.
- Role/viewport breadth is proven by the merged local visual matrices; the hosted browser session itself used the approved owner credential plus the two-organization switch.
- The next product arc remains Fixed Assets and Depreciation; it is outside this rollout.
- The protected root checkout `E:\Accounting App` remained dirty only in `BANK_STATEMENT_IMPORT_PROOF_REVIEW.md` and was not touched.
