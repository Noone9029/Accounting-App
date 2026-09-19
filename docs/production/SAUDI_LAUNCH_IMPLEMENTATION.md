# Saudi launch implementation and evidence

This is the current launch record for the September 19, 2026 implementation. Older handoff entries describe historical scope and proofs; they are not a statement of current production readiness.

## Approved product scope

- Saudi trading and retail SME accounting/inventory back office. No POS, FIFO, landed costs, bank feeds, or annual subscriptions in this release.
- The owner selected a UAE business as the intended subscription seller and reported an existing UAE Stripe account. The exact registered seller and account match remain unverified. Starter is SAR 149/month for 3 seats; Growth is SAR 299/month for 10. Active members and pending invitations count toward the seat limit, including the owner. Both plans have the same core capabilities. The trial lasts 14 days and requires no card.
- Inventory uses perpetual moving-average quantity and value. Costs are frozen when goods move; financial posting remains an explicit reviewed action. New production organizations start clean. Existing beta stock needs a reviewed cutover, not silent historical recosting.
- Public signup and live collection remain release actions after accounting, Saudi e-invoicing, provider, recovery, legal, and capacity evidence passes.

## Workspace recovery and source provenance

The original `E:\Accounting App` checkout was at `9f6996d8e8a2468f282675bc54b2659e6523437d`. Exactly 41 deleted tracked source files were restored from that commit. Local resource instructions and the bank import review were copied into `.codex-logs/source-recovery-20260919` before recovery; existing unrelated files were preserved. The restored package files have no content diff against that original commit.

GitHub main was independently checked using `git ls-remote`: `90e0eaa4896a55c1c8cda1c4101f4ab1323a4a61`, 322 commits ahead. Implementation uses the isolated `codex/saudi-public-launch` branch in `E:\AccountingAppWorktrees\saudi-launch` from that revision. Old `dist` and installed dependencies are not verification evidence.

Node 22.23.2 was downloaded from the official Node distribution and its archive checked against the published SHA-256 list. `.nvmrc` records the version. pnpm 10.15.1 installed fresh dependencies from the frozen lockfile with lifecycle scripts disabled; Prisma generation and builds are explicit operations. Stripe 22.6.2 is an exact dependency in the updated lockfile.

## What current main already supplied

- Billing catalog, subscription, entitlement, lifecycle and management abstractions, with synthetic provider/database proofs.
- Revocable database-backed login sessions and password-reset session revocation.
- Database-backed outbox claims/retries and local multi-worker evidence; Redis is unnecessary for this scope.
- Local PostgreSQL recovery, runtime-role/tenant isolation proofs, and an S3-compatible adapter proved against local object storage. These do not establish hosted recovery or hosted isolation.
- ZATCA XML/cryptography work, issuance metadata and chain serialization, durable sandbox submission records, and a separate Simulation compliance-CSID operator path. Local validation is distinct from a successful official simulation and from production onboarding.

## Seller and external setup

The owner's nominated source is [ledgerbyte.io](https://ledgerbyte.io/). Its [contact page](https://ledgerbyte.io/contact), rechecked September 19, 2026, publishes the LedgerByte brand, `info@ledgerbyte.io`, +971 56 137 1569, and Shams Business Center, Sharjah Media City Free Zone, Al Messaned, Sharjah, UAE. These are public contact details, not a verified legal seller record. The inspected pages do **not** establish the exact registered legal entity name. Do not infer a legal suffix, license number, VAT registration, Stripe merchant identity, or an appointed Saudi accountant from the website.

`app.ledgerbyte.io` is the proposed application hostname, not a verified deployed application address. The existing `ledgerbyte.io` marketing site stays separate. Domain/DNS control and email sender authentication remain to be verified; a published contact inbox does not establish SMTP delivery, SPF/DKIM/DMARC, or SaaS support coverage. Existing website terms/privacy text must not be represented as a reviewed SaaS subscription contract.

The Stripe connector returned an authentication-required error during account discovery. No test key or DigitalOcean project credentials were found in the process environment. Keys and OTPs must go into an approved secret store or local process environment, never this document or chat.

| Owner input or external work | Concrete result needed |
| --- | --- |
| Intended UAE seller | Exact registered name, license/address, applicable tax registrations and verified Stripe merchant account match; reviewed SaaS terms and receipt identity. Keep `BILLING_SELLER_LEGAL_NAME` blank until supplied and verified. |
| Saudi accountant | Named reviewer and written findings on the acceptance fixture below, bill/receipt clearing, return treatment, trial balance, VAT, and period close |
| ZATCA developer/simulation and production path | Authorized portal operator and applicable taxpayer/device identity; official Simulation onboarding and document matrix; then reviewed tenant-isolated production credential/key custody, durable issuance integration and applicable production clearance/reporting validation. The normal runtime adapter remains disabled; local retry and Windows sandbox custody are not production custody. |
| Stripe test setup and later collection | Reauthenticated account discovery, verified seller/account match, reviewed SAR monthly prices, restricted test credentials, webhook secret, payment-method-only portal configuration, and paid/failure/recovery browser proof. Live-key refusal remains in code; live collection requires a separate reviewed implementation and readiness check. |
| DigitalOcean and email | Reviewed project and final quote within the budget, Frankfurt only after transfer/retention review, restricted runtime and migration identities, private bucket, authenticated transactional sender, provider delivery/bounce proof, alerts, and independently recoverable backups. The proposed email provider and hosting template are not purchased or provisioned services. |
| Data/privacy/support | Transfer and recordkeeping review, retention/export/deletion rules, incident/support owner, response process, and reviewed customer disclosures |

No accountant or third party has been contacted by this implementation. The table is an action packet for the owner; it is not evidence that reviews or account setup have happened.

## Accountant acceptance packet

Use synthetic organizations and base currency SAR. Retain document IDs, immutable movement IDs, journal IDs, original and base amounts, tax amounts, trial balance and valuation exports for each case. The reviewer must assess the actual ledger and reports, not only green unit tests.

1. Receive 10 at 10, issue 8, receive 10 at 20: quantity 12, inventory value 220, average 18.3333; the first issue remains 80 after the later receipt. Review receipt asset/clearing and COGS postings separately.
2. Return part of the first issue after the second receipt: use the original issue cost, cap cumulative returned quantity, and reconcile the reviewed COGS reversal. Repeat the same command and verify no extra movement/journal.
3. Finalize a discounted foreign-currency bill, then receive it in several parts. Total capitalized base cost must equal finalized net base bill cost, including the last allocation's rounding residue. Recoverable tax must not be silently capitalized.
4. Transfer between two warehouses with different averages. Source cost equals destination incoming value; total organization quantity/value is unchanged. For supplier returns, preserve the original receipt credit, remove the current carrying value, and explicitly review any difference in the separately mapped gain/loss account.
5. Race two issues that together exceed stock: at most the available quantity can commit. Retry identical keys; reject a reused key with different content. Run tenant-denial cases.
6. Close the period and reject new stock and financial postings into it. Reject a movement dated before that item/warehouse's latest valued movement. Correct in an open period with an auditable source reference.
7. Reconcile inventory assets, clearing, COGS, returns, VAT, receivables/payables, trial balance and reports. Document any operational movement awaiting its explicit financial posting.

## Verification resources

Run one heavy command at a time. On this 32-logical-CPU Windows machine, the maximum worker count is 16; the default is one, with two for the web build. `scripts/run-resource-bounded.py` puts the complete child process tree inside a Windows Job Object with an 18-GiB memory ceiling and 50% CPU hard cap, leaving headroom under the aggregate 20-GB project ceiling. Continue passing explicit test/build concurrency controls. It fails rather than running unbounded on unsupported systems.

`scripts/with-local-postgres.py` creates a fresh loopback-only PostgreSQL database and random run-only credentials, deploys migrations, runs a command, and shuts down/removes its disposable cluster. Invoke it inside the resource runner with `--pg-bin` pointing to PostgreSQL binaries. It overrides inherited database URLs and never uses an existing hosted database. It enables the existing `LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION` test flag. Use `--skip-migrate` only for harness diagnostics.

The dependency refresh and its compatibility rationale are in [the security note](DEPENDENCY_SECURITY_REFRESH_2026-09-19.md). The production audit now reports zero critical and high findings. No vulnerability suppression was added.

The following evidence is local and synthetic. It does not satisfy hosted, accountant, Stripe network or official ZATCA simulation acceptance.

| Check | Result and scope |
| --- | --- |
| Frozen dependency install | PASS, Node 22.23.2 / pnpm 10.15.1; updated lockfile reinstalled with `--frozen-lockfile --ignore-scripts --network-concurrency=4 --child-concurrency=1`. |
| API and web production builds | PASS, compiled API plus Next 16.3.3, 153 routes, two web build workers. |
| Post-refresh database proof | PASS, all 115 migrations applied to a fresh local PostgreSQL database; 37 suites / 299 tests. Covers inventory/GL reconciliation, trial concurrency/expiry/seats, fake-provider paid lifecycle, registration throttling, durable ZATCA retry state and local certificate/custody boundaries. |
| Final inventory regression | PASS, seven suites / 92 tests after source-journal, clearing-account and period-reopen fixes, plus the separate two-test zero-cost database proof. Both zero-cost scenarios pass, including explicit review, return costs, audit rollback, close/lock blockers and stock voids without a financial journal. |
| Auth, billing and signup permission regression | PASS, three suites / 32 tests, including two English/Arabic journeys through the actual permission provider and page boundary, delayed membership refresh, viewer action restrictions, public catalog and provider identifier privacy. |
| Local browser | PASS, fresh migrated database, built API/web and same-origin proxy: registration, mock-outbox verification, organization, 14-day no-card trial, EN/AR dashboard and inventory review, persisted locale, worker-stopped expiry (403), retained invoice/PDF reads (200), logout cookie replay denial (401), Arabic login after logout, zero page errors. Owned runtime ports closed and the disposable cluster removed. |
| Deployment/recovery/browser/Prisma guards | PASS, 19 tests, including actual Prisma config loader, circular records and prototype safety. |
| Production dependency audit | PASS, zero critical and zero high findings; no suppression. |
| Full API regression | PASS, 316 suites / 3,112 tests. Eight opt-in database suites (67 tests) are skipped in the ordinary gate; disposable database proofs run separately above. |
| Shared compliance packages | PASS, UAE package 44 tests and ZATCA package 52 tests. Three external SDK/JDK/certificate oracle tests are skipped because that separate local tool/material setup is not configured; this is not official Simulation evidence. |
| CI credential and cleanup-plan guards | PASS, 11 tests. |
| Full web regression | PASS, 194 suites / 904 tests. Includes updated billing/auth contracts, viewer control gating, and recurring calendar dates across time zones and English/Arabic. |

Local evidence files are under ignored `.dev-logs/`: `final-frozen-install.log`, `final-build.log`, `final-web-build.log`, `launch-proof-results.json`, `final-inventory-results.json`, `zero-inventory-results.json`, `final-auth-billing-results.json`, `final-web-results.json`, `final-web-tests.log`, `recurring-date-tests.log`, `final-ci.log`, `final-package-tests.log`, `final-ci-guards.log`, `final-guards.log`, `production-audit.log`, and `saudi-launch-browser-proof/evidence.json`. The full-gate log preserves its successful generation/typechecks/API results and the subsequently repaired web failures; remaining component checks passed serially instead of repeating the unchanged API suite. This is component-level completion, not a claim that the earlier full-gate process exited successfully. Likewise, the inventory log preserves seven successful suites plus an old zero-cost fixture failure, and `zero-inventory-results.json` records its successful isolated rerun. The browser evidence lists the current run's five screenshots; older failure screenshots in that ignored directory are not acceptance evidence. No cookies, verification links, passwords or provider bodies are retained in that evidence. An abandoned directory from an early local harness diagnostic remains ignored at `.dev-logs/local-postgres/proof-l2p4z4k_`; its server was stopped, and it is not a recovery artifact.

The browser review verifies the named journeys and pages, not complete Arabic coverage of every historical screen. The final public-release rehearsal still needs the complete commercial, accounting and bilingual document matrix. Docker image execution is unverified because the local Docker daemon was unavailable; ignored local proof directories are excluded from the build context. Hosted restore, rollback, runtime tenant isolation, provider delivery/payment, official ZATCA and bounded production-capacity checks require the external setup above. The restore helper compares selected legacy core tables only and labels its result partial. Hosted recovery acceptance additionally requires restored inventory, billing, session, attachment and other application state; the helper alone cannot pass that release gate.

## Deployment and release

See [deployment implementation](../../infra/deployment/README.md) for the secret-free DigitalOcean template, same-origin ingress, worker, migration separation, read-only hosted recovery verifier and rollback procedure. Frankfurt and the approximately $90 baseline are conditional on the reviewed region, final provider quote and measured capacity. No standby database or high-availability promise is included. Four-hour recovery and 15-minute data-loss objectives become commitments only after measured drills.

The final rehearsal must include both languages, signup/verification/org/trial, expiry with the worker stopped, payment failure and recovery, duplicate/out-of-order webhooks, failed upgrades, seat-safe renewal downgrades, revoked sessions, retained read/export access, the accountant packet, PDF/import/posting/worker load, database and object restore, failed deployment rollback, and provider outages. Budget failure blocks rollout; it does not justify removing required recovery or security controls.
