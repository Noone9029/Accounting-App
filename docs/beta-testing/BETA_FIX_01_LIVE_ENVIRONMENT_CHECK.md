# BETA-FIX-01 Live Environment Check

Date: 2026-06-23

## Deployment Metadata

| Target | Project | Deployment | Status | Commit | Notes |
| --- | --- | --- | --- | --- | --- |
| Web | `ledgerbyte-web-test` (`prj_TQViL2ZHGtZgVRaxutr9GEiv08n8`) | `dpl_67sfsGb68VXWUXwrrtbjgUVN8xub` | `READY`, production alias | `bbd784e482c3e250ad75795570c8bcefebdbff82` | Commit message `Capture shell topbar and sidebar UX fixes (#214)`; no `gitDirty` metadata on the active deployment. |
| API | `ledgerbyte-api-test` (`prj_2GeXXbVWoD1WaDOhylTR3cEPlUCR`) | `dpl_68Vxdj6FNYwXgQRdBMwqr4N3Bk1i` | `READY`, production alias | `206fd385eb6f1faff9f73d15fa0eea904301f9f1` | API was not changed in this goal; health and readiness are OK. |

Team: `team_lAUvESBraFO74ZDE8jwU6xN4` (`ahmad-khalid-s-projects`)

Supabase test project reference: `xynelbjqcmbgtscfmmzv`

## Non-Mutating HTTP Checks

| URL | Result |
| --- | --- |
| `https://ledgerbyte-api-test.vercel.app/` | HTTP 200, API index returned `status: ok`. |
| `https://ledgerbyte-api-test.vercel.app/health` | HTTP 200, `{"status":"ok","service":"api"}`. |
| `https://ledgerbyte-api-test.vercel.app/readiness` | HTTP 200, `status: ok`, `checks.database: ok`. |
| `https://ledgerbyte-web-test.vercel.app/login` | HTTP 200. |
| `https://ledgerbyte-web-test.vercel.app/dashboard` | HTTP 200. |
| `https://ledgerbyte-web-test.vercel.app/sales/invoices` | HTTP 200. |
| `https://ledgerbyte-web-test.vercel.app/settings/roles` | HTTP 200. |
| `https://ledgerbyte-web-test.vercel.app/bank-accounts/00000000-0000-0000-0000-000000002112/reconciliations` | HTTP 200. |

## Decision

The live test stack is usable for the BETA-FIX-01 walkthrough. No Vercel deployment, Vercel env mutation, Supabase mutation, hosted migration, or reseed was needed.
