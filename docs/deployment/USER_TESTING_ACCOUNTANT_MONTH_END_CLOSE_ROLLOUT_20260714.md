# Accountant Month-End Close: Burner Rollout Evidence

Date: 2026-07-14
Final merged baseline before this evidence record: `cfdb723c5bfff801c3f5f2456a0820d71497252f`
Scope: approved burner Supabase project `xynelbjqcmbgtscfmmzv`, API `ledgerbyte-api-test`, and web `ledgerbyte-web-test` only.

## Release chain

The accountant-close implementation merged through PRs #307–#316, #322, #324, #343–#345, #347–#349. The close-rollout deployment hardening then merged through:

| PR | Merge commit | Purpose |
| --- | --- | --- |
| #349 | `1e5299547e4cfbad951eda27bdb6c98370eced84` | Bound close revalidation budget |
| #350 | `b98ff3d6e68f60027829ff6ef00179d09c6b4683` | Configure CLI API function duration |
| #351 | `163c7411eb817781011f8b356bb16d01e4f58928` | Use supported Vercel API config |
| #352 | `3d0896b2491930461ccf0a0b393ae6b4e54691af` | Fix root API functions config |
| #353 | `033b68b3db6600bb089c24d6eb596be172a820b2` | Configure API Vercel build output |
| #354 | `cfdb723c5bfff801c3f5f2456a0820d71497252f` | Extend close revalidation transaction budget |

PR #345’s GitGuardian Security Checks and Non-mutating verification completed successfully before merge.

## Migrations and backup boundary

All five accountant-close migrations are present and applied in the approved burner project:

1. `20260713073000_add_accounting_close_workspace_foundation`
2. `20260713080000_add_accounting_close_task_policy_fields`
3. `20260713090000_add_accounting_close_task_reopen_reason`
4. `20260713100000_allow_reviewed_close_snapshot_status`
5. `20260714090000_add_accounting_close_signoff_policy`

Final Prisma status: 103 successful remote migrations, with no pending, failed, unfinished, or rolled-back migrations.

The requested outside-repository logical backup was attempted before mutation. Docker Linux was unavailable, so the output was zero bytes. This rollout makes **no** backup, restore, PITR, RPO, or RTO claim.

## Deployment verification

| Component | Deployment | Canonical URL | Verification |
| --- | --- | --- | --- |
| API | `dpl_GypFARs3GsPmXJwgW2bFM6WrTQ7b` | `https://ledgerbyte-api-test.vercel.app` | `/`, `/health`, and `/readiness` returned HTTP 200; readiness reported a healthy database. |
| Web | `dpl_4opVitD6SdAQX77SRz3kfGDxG3xu` | `https://ledgerbyte-web-test.vercel.app` | `/`, `/login`, `/dashboard`, and `/accounting-close` returned HTTP 200. |

The previous healthy deployments were retained as rollback targets while the canonical aliases were promoted.

## Authenticated API smoke

An initial run against the pre-existing demo organization correctly failed closed at prepare-for-review because the tenant already had authoritative FX blockers: draft manual-rate documents, missing closing rates, and unposted revaluations. No override was added and no historical FX data was changed.

A dedicated, explicitly marked burner organization was provisioned with the ordinary organization foundation data, including active posting asset and revenue accounts. The complete authenticated close smoke then passed all **160 of 160** checks and finished `LOCKED`.

| Proof surface | Result |
| --- | --- |
| Login, identity, organization membership, account catalog | Passed |
| Cycle creation and readiness refresh | Passed |
| Warning-only draft-journal readiness path | Passed |
| Task assignment, completion, reopening, re-completion, and report evidence | Passed |
| Stable readiness hash and immutable snapshots | Passed |
| Single-user demo preparer/reviewer sign-off policy | Passed |
| Authoritative source drift invalidates review | Passed |
| Atomic close and idempotent close replay | Passed |
| Atomic lock and idempotent lock replay | Passed |
| Fiscal-period lock and post-lock posting rejection | Passed |
| Close evidence JSON, CSV, and PDF exports | Passed |

The smoke used marked demo data and application endpoints only. It did not enable provider collection, bank feeds, compliance submission, email delivery, OCR, object storage, or money movement.

## Tenant isolation

Using the same authenticated user under the original organization context, a locked close-cycle identifier from the isolated burner organization was probed through four read routes. All four returned `404`:

- close cycle
- close tasks
- readiness snapshots
- JSON close-evidence export

This proves tenant-scoped identifier rejection for the tested close read surfaces without exposing the cross-tenant record.

## Deployed browser QA

Real-browser QA authenticated through the deployed web UI and visited `/accounting-close` in each scenario below.

| Scenario | Direction | Console/page errors | Document overflow |
| --- | --- | --- | --- |
| Desktop 1440×1000 | LTR | 0 | None |
| Mobile 390×844 | LTR | 0 | None |
| Mobile 390×844, Arabic | RTL | 0 | None |

## Known limitations and boundaries

- This is burner/demo evidence only; it is not production authorization.
- The original demo tenant remains blocked by its actual FX readiness data. That behavior is expected and was preserved.
- The backup attempt did not yield a usable backup; no restore/PITR/RPO/RTO assurance is implied.
- The UI run verifies rendering, directionality, console/page errors, and document overflow. It does not assert a provider or compliance integration because none was enabled.
- Locked close evidence and marked smoke records are preserved so this proof remains auditable.
