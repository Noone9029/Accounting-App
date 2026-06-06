# ZATCA Preparation and Key Custody Sprint Closure

Date: 2026-06-06

Product: LedgerByte

Sprint: ZATCA Preparation and Key Custody Sprint

Status: Closed for preparation/readiness scope.

## Summary

This sprint starts the ZATCA production-readiness track by documenting environment separation, key custody, invoice eligibility, audit evidence, sandbox onboarding, and official SDK validation readiness. It also extends the existing read-only ZATCA readiness endpoint and settings UI with preparation-gate metadata.

LedgerByte remains controlled beta/user-testing only. Production ZATCA compliance is not enabled.

## Documents Created

- `docs/zatca/ZATCA_ENVIRONMENT_SEPARATION_POLICY.md`
- `docs/zatca/ZATCA_KEY_CUSTODY_DECISION_DRAFT.md`
- `docs/zatca/ZATCA_INVOICE_ELIGIBILITY_MATRIX.md`
- `docs/zatca/ZATCA_AUDIT_EVIDENCE_STANDARD.md`
- `docs/zatca/SANDBOX_CSID_ONBOARDING_RUNBOOK.md`
- `docs/zatca/OFFICIAL_SDK_VALIDATION_READINESS.md`

## Documents Updated

- `docs/IMPLEMENTATION_STATUS.md`
- `docs/REMAINING_ROADMAP.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/zatca/README.md`
- `docs/zatca/OFFICIAL_IMPLEMENTATION_MAP.md`
- `docs/zatca/API_INTEGRATION_CHECKLIST.md`
- `docs/zatca/SECURITY_KEY_MANAGEMENT_CHECKLIST.md`

## Readiness API Changes

The existing read-only ZATCA readiness response now exposes preparation metadata:

- `environmentPolicyDocumented: true`
- `keyCustodyDecisionDocumented: true`
- `invoiceEligibilityDocumented: true`
- `auditEvidenceStandardDocumented: true`
- `sandboxOnboardingRunbookDocumented: true`
- `sdkValidationReadinessDocumented: true`
- `productionComplianceEnabled: false`
- `realNetworkCallsEnabled: false`
- `signingEnabled: false`
- `clearanceReportingEnabled: false`
- `pdfA3Enabled: false`

No mutation endpoint was added.

## Readiness UI Changes

The ZATCA settings page now shows:

- A preparation-only status message: `ZATCA production compliance is not enabled. This workspace tracks preparation gates only.`
- Read-only preparation cards for environment separation, key custody decision, invoice eligibility matrix, audit evidence standard, sandbox onboarding, SDK validation, signing, clearance/reporting, PDF/A-3, production compliance claim, and real network calls.

The UI still states that signing, CSID requests, clearance/reporting, network submission, PDF/A-3, and production compliance are not enabled.

## Invoice Eligibility

The eligibility matrix records:

- Finalized sales invoices and finalized credit notes are the primary current ZATCA candidates.
- Draft invoices are not submitted.
- Quotes, recurring templates, delivery notes, collection cases, customer payment receipts, customer refunds, and sales inventory returns are not e-invoices by themselves.
- Debit notes require future document-model and accountant/tax/ZATCA specialist review.

## Key Custody

Key custody remains a draft decision. The preferred production direction is KMS/HSM or equivalent custody, subject to security, accountant, tax, ZATCA specialist, and operations review.

No real KMS, HSM, secrets-manager integration, real private key generation, or real private key storage was implemented.

## Environment Separation

The environment policy defines local mock/readiness, local SDK validation, sandbox, simulation, and production boundaries.

Production remains blocked until security, accountant, tax, ZATCA specialist, and production operations gates pass.

## Audit Evidence

The audit evidence standard allows metadata such as invoice IDs, invoice numbers, UUIDs, hashes, statuses, timestamps, environment, EGS IDs, request/status metadata, and certificate metadata.

It forbids ordinary storage/logging of private keys, OTPs, CSID secrets, binary security tokens, auth tokens, API credentials, full headers, full request/response bodies, signed XML bodies without approved secure storage, QR payload bodies if sensitive, and customer-sensitive payloads.

## SDK Validation Readiness

The SDK readiness document keeps validation local/no-network only and records Java, SDK path, fixture, wrapper, evidence, CI, artifact retention, and blocker expectations.

No real network validation was run.

## Sandbox Onboarding

The sandbox onboarding runbook documents who may obtain an OTP, where OTP entry must happen in a future approved flow, expiry/redaction rules, required flags, required approvals, evidence to capture, rollback, and forbidden actions.

No OTP was requested, entered, stored, logged, or submitted.

## Explicitly Not Executed

- No real ZATCA network calls.
- No OTP request or OTP submission.
- No compliance CSID request.
- No production CSID request.
- No real private key generation.
- No real private key storage.
- No production signing.
- No clearance or reporting.
- No PDF/A-3 creation.
- No invoice submission jobs.
- No retry queue.
- No production hosting, Vercel/Supabase environment changes, RLS/runtime role changes, object-storage migration, backup/restore, hosted smoke, deployed E2E, seed/reset/delete, or Prisma migrate reset.
- No OS shutdown, restart, sleep, hibernate, logout, lock-screen, or power command.

## Validation

- `corepack pnpm --filter @ledgerbyte/api test -- zatca-rules.spec.ts --runInBand` passed: 1 suite, 99 tests.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=settings/zatca/page.test.tsx` from `apps/web` passed: 1 suite, 1 test.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `git diff --check` passed with line-ending warnings only and no whitespace errors.
- `corepack pnpm --filter @ledgerbyte/web typecheck` remains blocked by unrelated untracked marketing work:
  - `apps/web/src/app/marketing.test.tsx:35`
  - `apps/web/src/app/marketing.test.tsx:65`
  - `HomePage` is still typed as `() => void`.

## Security Boundary

This sprint does not expose secrets. The readiness response reports booleans and status metadata only, and the targeted API test confirms private key material is not returned.

## Remaining ZATCA Blockers

- Final key custody decision.
- KMS/HSM or equivalent implementation.
- Sandbox OTP access and approved OTP entry flow.
- Sandbox compliance CSID onboarding.
- Production CSID lifecycle.
- Signed XML.
- Phase 2 QR.
- Clearance.
- Reporting.
- PDF/A-3.
- Error/retry queue.
- Signed artifact secure storage and retention.
- Accountant, tax, ZATCA specialist, security, and production operations review.
- Repeatable SDK CI.

## Recommended Next Sprint

ZATCA Sandbox Key Custody and OTP Gate Design Sprint:

- Finalize sandbox key custody architecture.
- Add a non-executing OTP entry/security design.
- Add sandbox CSID request/response contract tests with mocked HTTP only.
- Add metadata-only audit events for future OTP/CSID lifecycle.
- Keep real network calls, real OTP submission, real CSID requests, production signing, clearance/reporting, PDF/A-3, and production compliance disabled.
