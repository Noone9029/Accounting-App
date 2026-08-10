# Data Management Export Manifest API Evidence

Date: 2026-06-20
Branch: codex/openbook-export-manifest-planning

## Scope

This slice adds a read-only data-management planning endpoint:

- `GET /data-management/export-manifest`
- Required permission: `reports.export`.
- Runtime behavior: counts tenant-scoped records for planned export scopes and returns a manifest describing formats, permissions, exclusions, blocked actions, and safety notes.

## Clean-Room And Reuse Check

- No OpenBook source code was copied in this slice.
- The implementation uses LedgerByte-owned Prisma models, permission constants, guards, and module patterns.
- The endpoint does not export tenant data, generate files, create backups, restore data, import data, create signed URLs, send email, or call external providers.
- The endpoint does not read generated-document bytes or object-storage payloads.

## Guardrails

- All counts are scoped by the active `organizationId`.
- The manifest is plan-only metadata; it is not a backup artifact and not a production data-portability claim.
- Generated document scope is metadata-only and excludes PDF/base64 content, object storage payloads, and signed URLs.
- Import remains design-only until schema mapping, validation, audit logging, and permission boundaries are approved.
- No hosted mutations, storage-provider promises, ZATCA, UAE, Peppol, ASP, provider, or compliance production claims are added.

## Files

- `apps/api/src/data-management/data-management.service.ts`
- `apps/api/src/data-management/data-management.controller.ts`
- `apps/api/src/data-management/data-management.module.ts`
- `apps/api/src/data-management/data-management.service.spec.ts`
- `apps/api/src/data-management/data-management.controller.spec.ts`
- `apps/api/src/app.module.ts`

## Focused Checks

Passed locally:

- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- data-management.controller.spec.ts data-management.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm verify:openbooks-clean-room`
- `git diff --check`

## Skipped Checks

Full monorepo verification is intentionally skipped for this narrow read-only API slice unless a focused check exposes shared breakage.
