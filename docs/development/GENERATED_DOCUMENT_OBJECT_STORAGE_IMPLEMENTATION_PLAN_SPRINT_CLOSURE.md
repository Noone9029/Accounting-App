# Generated Document Object Storage Implementation Plan Sprint Closure

Date: 2026-06-19

Branch: `feature/generated-document-object-storage-implementation-plan`

## Scope

This was a production-readiness generated-document object-storage implementation planning pass. It moved from the generated-document object-storage contract to a concrete implementation plan without implementing runtime object storage.

Allowed scope was limited to repo inspection, docs, local-only validator checks, risk register updates, architecture planning, and handoff artifacts.

## Current Generated-Document State

- Generated documents remain DB-backed.
- `GeneratedDocumentService.archivePdf()` writes `storageProvider = "database"`, `contentBase64`, `contentHash`, `sizeBytes`, source metadata, and `organizationId`.
- `GeneratedDocumentService.download()` reads by `{ id, organizationId }` and returns API-mediated PDF bytes from `contentBase64`.
- `GeneratedDocumentController` requires JWT auth, organization context, permission guards, and generated-document permissions.
- Supported source ownership checks run before archive creation for the current supported source delegate list.
- Attachment S3 groundwork exists separately; generated documents do not use the attachment S3 adapter.
- Signed URLs are not implemented.
- `/documents` is the current frontend generated-document archive surface; `/generated-documents` is API-only.
- `apps/api/src/documents` does not exist in this checkout and was skipped as a non-existent path.

## Inventory Summary

Primary API files inspected:

- `apps/api/src/generated-documents/generated-document.service.ts`
- `apps/api/src/generated-documents/generated-document.controller.ts`
- `apps/api/src/generated-documents/generated-document-permissions.ts`
- `apps/api/src/generated-documents/generated-document-rules.spec.ts`
- `apps/api/src/generated-documents/generated-document-permissions.spec.ts`
- `apps/api/src/attachments/attachment-storage.service.ts`
- `apps/api/src/attachments/attachment.service.ts`
- `apps/api/src/storage/storage-provider.ts`
- `apps/api/src/storage/storage-configuration.service.ts`
- `apps/api/src/storage/storage.service.ts`
- `apps/api/src/storage/storage.service.spec.ts`
- `apps/api/src/email/email.service.ts`
- `apps/api/src/compliance-core/compliance-core.service.ts`
- `apps/api/prisma/schema.prisma`

Generated-document archive callers found:

- `apps/api/src/bank-reconciliations/bank-reconciliation.service.ts`
- `apps/api/src/customer-refunds/customer-refund.service.ts`
- `apps/api/src/customer-payments/customer-payment.service.ts`
- `apps/api/src/credit-notes/credit-note.service.ts`
- `apps/api/src/cash-expenses/cash-expense.service.ts`
- `apps/api/src/contacts/contact-ledger.service.ts`
- `apps/api/src/delivery-notes/delivery-note.service.ts`
- `apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts`
- `apps/api/src/purchase-bills/purchase-bill.service.ts`
- `apps/api/src/purchase-orders/purchase-order.service.ts`
- `apps/api/src/reports/reports.service.ts`
- `apps/api/src/sales-invoices/sales-invoice.service.ts`
- `apps/api/src/sales-quotes/sales-quote.service.ts`
- `apps/api/src/supplier-refunds/supplier-refund.service.ts`
- `apps/api/src/supplier-payments/supplier-payment.service.ts`

Primary frontend surfaces inspected:

- `apps/web/src/app/(app)/documents/page.tsx`
- `apps/web/src/lib/pdf-download.ts`
- `apps/web/src/lib/documents.ts`
- `apps/web/src/app/(app)/settings/storage/page.tsx`
- related generated-document download references under sales, purchases, banking, and settings surfaces

Docs and local validator files inspected:

- `scripts/object-storage-proof-validate.cjs`
- `scripts/object-storage-proof-validate.test.cjs`
- `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_CONTRACT.md`
- `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_RISK_REGISTER.md`
- `docs/storage/S3_MIGRATION_PLAN.md`
- `docs/storage/STORAGE_ARCHITECTURE.md`
- `docs/security/SIGNED_URL_OBJECT_STORAGE_PROOF_PLAN.md`
- `docs/security/STORAGE_TENANT_ISOLATION_PROOF_PLAN.md`
- `docs/storage/SIGNED_URL_OBJECT_STORAGE_RISK_REGISTER.md`
- `docs/storage/STORAGE_GENERATED_DOCUMENT_ISOLATION_RISK_REGISTER.md`
- `CODEX_HANDOFF.md`
- `BUG_AUDIT.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/REMAINING_ROADMAP.md`

## Plan Added

New plan:

- `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_IMPLEMENTATION_PLAN.md`

The plan defines:

- current DB-backed implementation
- implementation principles
- Phase A through Phase I rollout sequence
- file-by-file implementation map
- feature flag concepts and disabled defaults
- metadata/schema decision table
- adapter contract
- dual-write and rollback plan
- local test plan
- staging proof plan
- acceptance criteria and explicit non-claims

## Validator Update

The local object-storage proof validator now reports generated-document object-storage implementation-plan guardrails under the generated-document contract output.

Validator coverage added:

- object storage remains disabled by default
- DB-backed fallback remains required
- object key remains anchored by generated document id
- metadata migration is not implemented and requires explicit approval
- database adapter is default
- fake adapter is local-tests-only
- future S3/object adapter is disabled by default
- signed URLs are not required for the initial object-storage implementation
- staging proof requires synthetic tenants and a dedicated bucket
- hosted storage mutation is not allowed by the validator

One local proof-helper bug was fixed: the mock-cycle generated-document object key now includes `generated-document-proof` as the generated-document-id anchor, matching the dry-run and contract key shape.

## Schema Decision

The current schema can represent a minimal object-backed generated-document row through existing `storageProvider`, nullable `storageKey`, `contentHash`, `sizeBytes`, and `contentBase64` fallback fields.

The plan documents likely future metadata needs but does not add them:

- bucket or logical bucket
- retention class
- archive state
- legal hold
- generation version
- source snapshot hash
- object uploaded timestamp
- object verified timestamp

Any migration or Prisma schema change must stop for explicit approval.

## Edition Safety

Edition boundaries were preserved:

- GENERIC remains neutral.
- KSA generated artifacts remain future/gated only.
- UAE generated artifacts remain future/gated only.
- No Generic active KSA/UAE compliance claim was added.
- No UAE/Peppol/PINT-AE active claim was added to KSA output.
- No ZATCA/Fatoora active claim was added to UAE output.

Provider evidence remains unavailable.

## Safety Boundaries Confirmed

- No hosted command was run.
- No hosted/customer data was mutated.
- No hosted object storage was touched.
- No real hosted signed URLs were generated.
- No generated-document migration was run.
- No object-storage implementation rollout was added.
- No Prisma schema change was made.
- No Prisma migration was created.
- No SQL template was applied.
- No RLS rollout was applied.
- No runtime DB role was applied.
- No Supabase command was run.
- No Vercel deploy command was run.
- No production database command was run.
- No seed/reset/delete command was run.
- No real customer document was accessed.
- No ZATCA production work was added.
- No UAE Peppol/PINT-AE/ASP production work was added.
- No real provider, ASP, Peppol, ZATCA, bank-feed, payment-processor, or email call was made.
- No production compliance claim was added.

## Protected State

- Preserved dirty worktree `E:\Accounting App` on `feature/edition-split-preserve-current-changes` remained untouched.
- Safety patch `E:\Repo-Hygiene-Safety\Accounting-App-20260617-192644\primary-country-edition-repo-hygiene-safety-20260617-192644.patch` remained untouched.
- ZATCA `stash@{0}` remained preserved.
- Protected branches `codex/purchase-bill-seeded-uuid-validation` and `codex/wafeq-banking-reconciliation-audit-polish` remained untouched.

## Remaining Blockers

- Approved staging/proof storage credentials.
- Synthetic Tenant A and Tenant B.
- Dedicated staging/proof bucket.
- Hosted object-storage proof.
- Bucket policy proof.
- Generated-document object-storage implementation and proof.
- Real signed URL implementation and proof if URLs are used.
- Metadata/schema migration approval if required.
- Backup/restore proof for metadata and object bodies.
- Retention/legal-hold/malware-scan evidence.
- Observability evidence.
- Owner/legal/accounting/security sign-off.
- UAE ASP/Peppol provider evidence.
- ZATCA production credentials.

## Next Recommended Prompt

`Approve generated-document object storage adapter interface implementation`
