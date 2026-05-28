# DEV-08J Source PDF Permission Policy Hardening Evidence

## Scope

- Task: `DEV-08J Part 29: approved local source PDF permission policy hardening`.
- Approval phrase status: received exactly.
- Runtime data mutation performed: no.
- Output generation/download performed: no.

## Code Changes

- Added `apps/api/src/generated-documents/generated-document-permissions.ts`.
- AP source PDF stream and explicit generation routes now keep their source `*.view` guard and additionally assert `generatedDocuments.download` before rendering/archiving output:
  - purchase orders
  - purchase bills
  - supplier payments
  - supplier refunds
  - purchase debit notes
  - cash expenses
- AP detail pages now hide source PDF buttons unless `generatedDocuments.download` is present.
- `pdf-data` routes remain source-view read-only and unchanged.
- Generated-document archive download behavior remains separate and unchanged.

## Tests

- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/generated-documents/generated-document-permissions.spec.ts` passed: `3` tests.
- `corepack pnpm --filter @ledgerbyte/web exec jest --config jest.config.cjs --testPathPatterns=bills.*page.test.tsx` passed: `3` tests.
- `corepack pnpm --filter @ledgerbyte/web exec jest --config jest.config.cjs --testPathPatterns=debit-notes.*page.test.tsx` passed: `3` tests.
- `corepack pnpm --filter @ledgerbyte/web exec jest --config jest.config.cjs --testPathPatterns=supplier-payments.*page.test.tsx` passed: `4` tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.

## Known Unrelated Verification Blockers

- `corepack pnpm --filter @ledgerbyte/web test` failed on pre-existing/unrelated untracked web work: `src/app/marketing.test.tsx`, `src/lib/permissions.test.ts`, and `src/lib/permission-matrix.test.ts`.
- `corepack pnpm --filter @ledgerbyte/web typecheck` failed on the same unrelated `src/app/marketing.test.tsx` issue.

No production/beta/customer data, real email, real ZATCA, migration, seed/reset/delete, deploy, provider setting, or environment change was performed.
