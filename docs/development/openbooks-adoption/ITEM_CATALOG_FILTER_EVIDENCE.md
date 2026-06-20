# OpenBook Adoption Slice: Item Catalog Filtering

## Scope

This slice adds LedgerByte-native in-page filtering to the product and service catalog at `/items`.

The filter matches loaded catalog rows by:

- item name
- SKU
- description
- product or service type
- active or disabled status
- inventory tracking mode labels

## Guardrails

- No OpenBook source code was copied in this slice.
- No AGPL-risk source was introduced.
- No schema, API, storage, provider, hosted mutation, or compliance surface changed.
- No ZATCA, UAE, Peppol, ASP, storage-provider, or production-readiness claim was added.
- The filter runs against already-loaded LedgerByte items and does not change tenant, permission, audit, fiscal-lock, or accounting behavior.

## Verification

Run these checks for the PR:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/web test -- items/page`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `corepack pnpm verify:openbooks-clean-room`
- `git diff --check`

## Next Slice

After the global-search PR that adds product/service results merges, add a narrow route handoff from global search to `/items` with a prefilled catalog query, or add a dedicated item detail route if LedgerByte needs item-level navigation before that handoff.
