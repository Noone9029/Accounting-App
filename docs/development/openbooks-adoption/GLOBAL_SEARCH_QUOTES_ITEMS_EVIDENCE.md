# Global Search Quotes And Items Evidence

Date: 2026-06-20

Status: `PARTIAL`

## Slice

This slice extends LedgerByte's existing global search with read-only results for:

- Sales quotes, using the existing sales invoice view permission.
- Products and services, using the existing item view permission.

The implementation is LedgerByte-native. It uses existing LedgerByte Prisma models, routes, permissions, and result contracts.

## Guardrails

- No schema changes or migrations.
- No writes, posting, quote conversion, inventory movement, email, PDF generation, hosted calls, or provider calls.
- No generated-document object storage, signed URL, ZATCA, UAE, Peppol, ASP, or production-compliance readiness change.
- Product and service results route to the existing `/items` list because `main` does not include an item detail route.

## Checks

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- search.service`
- `corepack pnpm --filter @ledgerbyte/web test -- global-search`
- `corepack pnpm verify:openbooks-clean-room`
- `git diff --check`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm --filter @ledgerbyte/web typecheck`

## Next Recommended Slice

Add a focused item-list search/filter UX or item detail route so product/service search results can land directly on the matched catalog record.
