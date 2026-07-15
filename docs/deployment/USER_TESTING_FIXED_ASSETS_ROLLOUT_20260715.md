# Fixed Assets MVP: Burner Rollout Evidence

Status: **PARTIAL PASS for the approved burner/user-testing environment.**

Scope is limited to Supabase project `xynelbjqcmbgtscfmmzv`, Vercel projects `ledgerbyte-api-test` and `ledgerbyte-web-test`, and the aliases below. This is not production, compliance, backup, or restore proof.

## Source and merge evidence

- Fixed-assets MVP merged through PR #360 at `121ce8ed22416f75ea32938c60671a907fea4d68`.
- PostgreSQL identifier correction merged through PR #361 at `bd64b6de3438b4db29d31b85dc8891b5227e8246`.
- The deployed source commit is `88aba85ce9783e93e99d077ebc443ee9c56ca121`, the fixed-assets migration correction commit represented by the merged tree.

## Supabase evidence

- Migration `add_fixed_assets_mvp` applied successfully to project `xynelbjqcmbgtscfmmzv`.
- Supabase migration ledger records version `20260715125416` for that migration.
- The fixed-asset schedule-line indexes were read back successfully, including `fixed_asset_schedule_org_asset_period_key` and `fixed_asset_schedule_org_asset_date_idx`.
- The first migration attempt failed closed because PostgreSQL identifier truncation would have collided two long index names. The transaction left no fixed-asset tables or migration entry; the corrected migration was then applied.

## Vercel evidence

| Surface | Deployment | State | Alias |
| --- | --- | --- | --- |
| API | `dpl_5seyMBj1ogqjAUbfYUQj2Cppb4vb` | READY | `https://ledgerbyte-api-test.vercel.app` |
| Web | `dpl_H6s3pBHGNQVvtgqTmwd4V2ZAjbw1` | READY | `https://ledgerbyte-web-test.vercel.app` |

Observed read-only checks after deployment:

- API `/`, `/health`, and `/readiness`: HTTP 200.
- API `/fixed-assets` and `/reports/fixed-assets/register` without credentials: HTTP 401.
- Web `/fixed-assets` and `/reports/fixed-assets`: HTTP 200.

## Authenticated smoke boundary

Authenticated feature smoke is **not claimed**. The current local DPAPI credential store could not be decrypted in this operator session, and the existing evidence classifies the stored burner credential as stale. Generated-user fallback was not enabled, and the mutation-capable smoke script correctly remained fail-closed without its explicit disposable-target approval variables.

Do not promote this document to production readiness, compliance approval, backup/restore proof, or successful authenticated fixed-asset workflow proof until the approved burner credential is repaired or rotated and the authenticated smoke is rerun.
