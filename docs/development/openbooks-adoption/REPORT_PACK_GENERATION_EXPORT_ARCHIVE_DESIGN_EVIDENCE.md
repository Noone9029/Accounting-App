# Report-Pack Generation, Export, Download, And Archive Design Evidence

Date: 2026-06-21

Goal ID: `OB-REPORT-PACK-DESIGN-01`

Branch: `codex/report-pack-generation-export-archive-design`

## Selected Slice

Create a docs-only design package for future report-pack generation, PDF/CSV/XLSX export, download links, archive writes, email delivery, scheduling, audit events, failure/retry handling, and blocked storage/signed URL boundaries.

This slice does not implement runtime behavior.

## Baseline Inspected

| File | Finding |
| --- | --- |
| `apps/api/src/reports/report-pack-manifest.ts` | Manifest status remains `PLANNING_ONLY`; execution boundary flags for generation, download, email, scheduling, archive writes, generated-document mutation, storage mutation, provider calls, and compliance submission are all typed `false`. |
| `apps/api/src/reports/reports.controller.ts` | The only report-pack route is `GET /reports/report-pack/manifest-preview`; existing report export routes are separate and keep their existing permission checks. |
| `apps/api/src/reports/reports.service.ts` | `reportPackManifestPreview` builds metadata from supported report kinds; it does not generate report-pack artifacts, write archive records, call storage, call providers, or submit compliance data. |
| `apps/web/src/app/(app)/report-packs/page.tsx` | UI consumes the preview, renders loading/error/empty states, and states that generation, downloads, exports, email, scheduling, archive writes, storage, signed URLs, provider calls, and compliance submissions remain disabled. |
| `apps/web/src/lib/report-packs.ts` | Web client calls only `/reports/report-pack/manifest-preview`, normalizes preview metadata, and keeps disabled boundary copy explicit. |
| `docs/development/openbooks-adoption/REPORT_PACK_MANIFEST_PREVIEW_ENDPOINT_EVIDENCE.md` | Records the API slice as read-only and keeps generation/export/download/archive/storage/signed URL/provider/compliance blockers open. |
| `docs/development/openbooks-adoption/REPORT_PACK_PREVIEW_UI_CONSUMPTION_EVIDENCE.md` | Records the UI slice as read-only, with no mutation actions and no browser durable persistence. |

## Design Artifacts Added

| File | Purpose |
| --- | --- |
| `docs/architecture/REPORT_PACK_GENERATION_EXPORT_ARCHIVE_DESIGN.md` | Future-only architecture plan for domain models, state machines, API shape, permissions, audit events, storage/download/archive blockers, failure/retry/idempotency, and sequencing. |
| `docs/development/openbooks-adoption/REPORT_PACK_GENERATION_EXPORT_ARCHIVE_DESIGN_EVIDENCE.md` | Evidence for baseline inspection, docs changed, guardrails, checks, and non-goals. |

## Status Docs Updated

| File | Purpose |
| --- | --- |
| `docs/IMPLEMENTATION_STATUS.md` | Records the docs-only design and preserves production-readiness blockers. |
| `docs/REMAINING_ROADMAP.md` | Moves report-pack generation/export/download/archive from design-needed to contract/foundation-next. |
| `docs/PROJECT_AUDIT.md` | Adds a conservative audit note with no readiness claim. |
| `docs/PRODUCT_READINESS_SCORECARD.md` | Records product clarity improvement without production readiness score increase. |
| `docs/development/openbooks-adoption/OPENBOOKS_ADOPTION_NEXT_GOALS.md` | Marks Goal 23 implemented and names the next guarded slice. |

## Guardrails Preserved

- Object storage approval remains `BLOCKED`.
- Real object storage remains unimplemented/unproven.
- Signed URLs remain unimplemented/unproven.
- Runtime generated documents remain DB-backed unless separately changed.
- Report-pack archive writes remain blocked until storage approval.
- Download links remain blocked until signed URL behavior is proven.
- Report-pack generation, PDF/CSV/XLSX generation, downloads, exports, email delivery, scheduling, archive writes, generated-document mutation, provider calls, compliance behavior, ZATCA/UAE/Peppol/ASP behavior, AI proposals, Inbox behavior, and hosted mutations remain out of scope.

## Runtime Behavior

No runtime API endpoint, runtime UI behavior, Prisma schema, migration, report generation, PDF/CSV/XLSX generation, download/export behavior, email sending, scheduling, archive write, generated-document mutation, object storage behavior, signed URL behavior, provider call, or compliance behavior was added.

## Clean-Room And MIT Attribution Posture

- No OpenBook source was copied, translated, ported, vendored, or imported.
- No OpenBook schema, comments, UI text, file structure, dependency, or implementation details were reused.
- The design is LedgerByte-native and references only LedgerByte's current report-pack manifest/preview baseline.
- No new attribution entry is required because no OpenBook source chunks were used.

## Checks Run

- `corepack pnpm install --frozen-lockfile` PASS
- `corepack pnpm verify:openbooks-clean-room` PASS
- `git diff --check` PASS
- `git diff --cached --check` PASS
- production-source scan for `OpenBook|OpenBooks|muhammad-fiaz` under `apps` and `packages` PASS
- changed-file scan confirming only docs changed PASS
- staged-file scan confirming only docs changed PASS
- architecture-doc blocked source-name scan PASS

## Skipped Checks

- Runtime API tests were skipped because runtime API files did not change.
- Runtime web/browser tests were skipped because runtime UI files did not change.
- Full monorepo exhaustive tests were skipped because docs-only checks, clean-room validation, diff checks, and scans passed.

## Hosted, Provider, Storage, And Compliance Mutations

None run for this design slice.

No hosted migrations, Supabase mutations, Vercel deploy mutations, manual Vercel deployments, provider calls, seed/reset/delete commands, storage actions, generated-document object storage operations, signed URL operations, ZATCA/UAE/Peppol/ASP actions, or compliance submissions were run for this design slice.

## Next Recommended Goal

Open a narrow report-pack execution contract foundation PR from current `origin/main`. Keep it contract/test-only unless storage approval, signed URL proof, archive writes, generation workers, delivery, and scheduling have been separately approved.
