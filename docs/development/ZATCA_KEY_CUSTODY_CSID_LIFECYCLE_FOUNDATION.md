# ZATCA Key Custody CSID Lifecycle Foundation

Date: 2026-06-07

Branch: `codex/dev-12-generated-documents-storage-retention`

Starting commit: `84486e5a Document ZATCA key custody CSID lifecycle preflight`

Preflight reference: `docs/development/ZATCA_KEY_CUSTODY_CSID_LIFECYCLE_PREFLIGHT.md`

## Scope

Implemented the first metadata-only ZATCA key custody and CSID lifecycle foundation.

This lane added safe schema/API/UI groundwork only. It did not request OTPs, request CSIDs, call ZATCA, generate or store real private keys, store raw certificates or CSRs, sign invoices, run clearance/reporting, generate PDF/A-3, change provider or environment configuration, deploy, or claim production compliance.

## Implementation Summary

- Added `ZatcaCredentialLifecycleStatus` lifecycle states for `NOT_CONFIGURED`, `CSR_PENDING`, `OTP_REQUIRED`, `COMPLIANCE_CSID_PENDING`, `COMPLIANCE_CSID_ACTIVE`, `PRODUCTION_CSID_PENDING`, `PRODUCTION_CSID_ACTIVE`, `ROTATION_REQUIRED`, `REVOKED`, `DISABLED`, and `ERROR`.
- Added `ZatcaCredentialCustodyProviderType` values for `NONE`, `EXTERNAL_KMS`, `EXTERNAL_HSM`, `MANAGED_SECRET_REFERENCE`, and `DUMMY_LOCAL`.
- Added `ZatcaCredentialLifecycle` metadata-only model and additive migration artifact.
- Added guarded ZATCA API endpoints for reading foundation metadata, reading EGS lifecycle metadata, metadata-only upsert, disable, and revoke.
- Added validation that rejects unsafe payload fields and values such as raw keys, PEM bodies, certificate bodies, CSR bodies, OTPs, tokens, secrets, provider payloads, signed XML, QR payloads, and request/response bodies.
- Added safe audit event mapping for lifecycle metadata upsert, disable, and revoke actions.
- Updated the ZATCA settings UI to display read-only lifecycle metadata and blocked capabilities.

## Files Changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260607110000_zatca_key_custody_csid_lifecycle_foundation/migration.sql`
- `apps/api/src/audit-log/audit-events.ts`
- `apps/api/src/zatca/zatca.controller.ts`
- `apps/api/src/zatca/zatca.service.ts`
- `apps/api/src/zatca/dto/update-zatca-credential-lifecycle.dto.ts`
- `apps/api/src/zatca/dto/zatca-credential-lifecycle-action.dto.ts`
- `apps/api/src/zatca/zatca-credential-lifecycle.spec.ts`
- `apps/web/src/app/(app)/settings/zatca/page.tsx`
- `apps/web/src/app/(app)/settings/zatca/page.test.tsx`
- `apps/web/src/lib/types.ts`
- `apps/web/src/lib/zatca.ts`

## Safety Boundaries Preserved

- No real OTP.
- No real CSID.
- No real ZATCA network.
- No real private-key generation or storage.
- No raw private keys, raw certificates, raw CSRs, tokens, secrets, signed XML, QR payloads, provider payloads, request bodies, or response bodies stored or returned.
- No signing.
- No clearance/reporting.
- No PDF/A-3.
- No production credentials.
- No production compliance claim.
- No migrations applied to any database.
- No deploys or provider/environment changes.

## Verification

- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca-credential-lifecycle` from `apps/api`: passed, 4 tests.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=zatca` from `apps/api`: passed, 12 suites / 209 tests.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=settings/zatca` from `apps/web`: passed, 1 test.
- `corepack pnpm --filter @ledgerbyte/api typecheck`: passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck`: passed.
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json parse ok')"`: passed.
- `git diff --check`: clean except LF-to-CRLF working-copy warnings.

## Migration Handling

An additive Prisma migration artifact was created only. It was not applied to any database. The migration creates metadata-only enums and a metadata-only lifecycle table; it does not add body-storage columns for secrets, keys, certificates, CSRs, XML, QR payloads, or provider payloads.

## Remaining Blockers

- Real custody provider selection and approval.
- External KMS/HSM or equivalent signing boundary design and implementation.
- Safe CSR generation boundary for real materials.
- OTP capture and approval workflow.
- Compliance CSID request execution approval.
- Production CSID lifecycle approval.
- Certificate renewal, rotation, revocation, and incident procedures.
- Signing, Phase 2 QR, clearance/reporting, PDF/A-3, and signed artifact storage remain blocked.
- Official/legal/accounting review and production readiness remain open.

## Next Prompt

`LedgerByte verify ZATCA key custody and CSID lifecycle foundation evidence`
