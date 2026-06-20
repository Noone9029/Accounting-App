# Sales Quote Workflow Summary API Evidence

Date: 2026-06-20
Branch: codex/openbook-quote-workflow-summary

## Scope

This slice adds a read-only sales quote workflow summary endpoint:

- `GET /sales-quotes/:id/workflow-summary`
- Required permission: `salesInvoices.view`, matching the existing quote read surface.
- Runtime behavior: reads a tenant-scoped sales quote and its generated PDF archive records, then returns derived lifecycle, conversion, generated-document, available-action, and blocked-action metadata.

## Clean-Room And Reuse Check

- No OpenBook source code was copied in this slice.
- The implementation is based on LedgerByte-owned sales quote, generated-document, permission, and Prisma model surfaces.
- The endpoint does not create public quote links, hosted portals, email sends, payment/provider calls, or compliance submissions.
- The endpoint does not mutate quote status, convert quotes, generate PDFs, archive PDFs, or write audit logs.

## Guardrails

- Tenant scope is enforced through `where: { id, organizationId }` for the quote lookup.
- Generated document lookup is scoped by `organizationId`, `sourceType: "SalesQuote"`, `sourceId`, and `DocumentType.SALES_QUOTE`.
- Storage provider values are reported only as archive metadata for existing generated-document records.
- No storage-provider production-readiness claim is made.
- No ZATCA, UAE, Peppol, ASP, provider, or compliance production claim is added.

## Files

- `apps/api/src/sales-quotes/sales-quote.service.ts`
- `apps/api/src/sales-quotes/sales-quote.controller.ts`
- `apps/api/src/sales-quotes/sales-quote-rules.spec.ts`
- `apps/api/src/sales-quotes/sales-quote.controller.spec.ts`

## Focused Checks

Passed locally:

- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- sales-quote-rules.spec.ts sales-quote.controller.spec.ts`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm verify:openbooks-clean-room`
- `git diff --check`

## Skipped Checks

Full monorepo verification is intentionally skipped for this narrow API slice unless a focused check exposes shared breakage.
