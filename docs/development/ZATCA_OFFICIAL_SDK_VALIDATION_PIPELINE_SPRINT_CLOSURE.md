# ZATCA Official SDK Validation Pipeline Sprint Closure

Date: 2026-06-06

Product: LedgerByte

Sprint: Official ZATCA SDK Validation Pipeline Sprint

LedgerByte remains controlled beta/user-testing only. This sprint created a repeatable local/no-network SDK validation pipeline and metadata-only evidence format. It does not enable production ZATCA compliance.

## Documents Created

- `docs/zatca/ZATCA_SDK_FIXTURE_REGISTRY.md`
- `docs/zatca/ZATCA_SDK_VALIDATION_EVIDENCE_FORMAT.md`
- `docs/zatca/evidence/README.md`
- `docs/zatca/evidence/sample-sdk-validation-evidence.json`
- `docs/development/ZATCA_OFFICIAL_SDK_VALIDATION_PIPELINE_SPRINT_CLOSURE.md`

## Command Added

- `corepack pnpm zatca:sdk-validate-local`
- Targeted test command: `corepack pnpm test:zatca-sdk-validate-local`

Supported examples:

```bash
corepack pnpm zatca:sdk-validate-local -- --fixture official-standard-invoice --no-network --json
corepack pnpm zatca:sdk-validate-local -- --fixture official-simplified-invoice --no-network --json
corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-standard-invoice --no-network --json
corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-credit-note --no-network --json
corepack pnpm zatca:sdk-validate-local -- --all --no-network --json
```

## Fixtures Registered

- `official-standard-invoice`
- `official-simplified-invoice`
- `ledgerbyte-standard-invoice`
- `ledgerbyte-credit-note`

The `ledgerbyte-credit-note` fixture is registered as future coverage and currently returns a safe missing-fixture blocker.

## Evidence Format

Evidence is metadata-only and includes:

- `validationRunId`
- `timestamp`
- `environment`
- `sdkPathFound`
- `javaVersion`
- `sdkVersion`
- `fixtureId`
- `fixtureType`
- `invoiceKind`
- `validationMode`
- `passed`
- `warningsCount`
- `errorsCount`
- `safeErrorCodes`
- `safeWarningCodes`
- `hashGenerated`
- `xmlBodyPrinted`
- `qrPayloadPrinted`
- `privateKeyPrinted`
- `networkCallsMade`

Full XML bodies, QR payload bodies, private keys, OTPs, CSID secret material, tokens, headers, full request/response bodies, and customer-sensitive payloads are forbidden.

## Java And SDK Detection

Local command run:

```bash
corepack pnpm zatca:sdk-validate-local -- --all --no-network --json
```

Result:

- SDK found: `true`
- SDK version label: `238-R3.4.8`
- Java detected: `17.0.16`
- Required Java range: `>=11 <15`
- Validation status: safely blocked for all fixtures because Java 17 is outside the official SDK-supported range.
- Network calls made: `false`
- Production compliance enabled: `false`

## Readiness API And UI Changes

The read-only ZATCA readiness summary now includes:

- `sdkValidationPipelineDocumented`
- `sdkValidationCommandAvailable`
- `sdkValidationEvidenceFormatDocumented`
- `officialFixtureRegistryDocumented`
- `latestSdkValidationEvidenceStatus`
- `sdkValidationNoNetworkOnly`

The ZATCA settings page now shows SDK validation pipeline, command, fixture registry, evidence format, no-network mode, and latest SDK evidence cards with safe wording.

## Security And Redaction Behavior

- The wrapper does not print or persist XML bodies.
- The wrapper does not print or persist QR payload bodies.
- The wrapper does not print or persist private keys, tokens, headers, OTPs, CSID secrets, or production credentials.
- Evidence omits full SDK stdout/stderr and keeps safe status/code summaries only.
- `networkCallsMade`, `realNetworkCallsEnabled`, `signingEnabled`, `clearanceReportingEnabled`, `pdfA3Enabled`, and `productionComplianceEnabled` remain false.

## Explicitly Not Implemented

- Real CSID request.
- OTP submission.
- Real private key generation or storage.
- Signing with real keys.
- Clearance.
- Reporting.
- PDF/A-3.
- Retry queue or invoice submission jobs.
- Production compliance claim.
- Production hosting or infrastructure changes.

## Validation Commands

- `corepack pnpm test:zatca-sdk-validate-local` - passed.
- `corepack pnpm --filter @ledgerbyte/api test -- zatca-rules.spec.ts --runInBand` - passed.
- `corepack pnpm --filter @ledgerbyte/zatca-core test` - passed.
- `corepack pnpm exec jest --config jest.config.cjs --runInBand --testPathPatterns=settings/zatca/page.test.tsx` from `apps/web` - passed.
- `corepack pnpm --filter @ledgerbyte/api typecheck` - passed.
- `corepack pnpm zatca:sdk-validate-local -- --all --no-network --json` - safely blocked on Java 17; no network calls.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - failed only on unrelated `apps/web/src/app/marketing.test.tsx` lines 35 and 65.
- `git diff --check` - passed with existing CRLF warnings.

## Marketing Blocker Status

The repo-wide web typecheck remains blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx:35`
- `apps/web/src/app/marketing.test.tsx:65`

This sprint did not touch marketing files.

## OS Power Command Status

No shutdown, restart, sleep, hibernate, lock-screen, logout, or other OS power command was run.

## Remaining Blockers

- Default local Java is `17.0.16`; SDK execution needs Java 11-14 or a pinned/Docker runner.
- `ledgerbyte-credit-note` local XML fixture is not present yet.
- Generated invoice and credit-note fixture validation from local/mock data is not automated yet.
- CI/Docker SDK validation is not implemented.
- Key custody decision is still draft.
- Sandbox OTP and CSID access remain blocked.
- Signed XML, Phase 2 QR, clearance, reporting, PDF/A-3, and production ZATCA compliance remain unimplemented.

## Recommended Next Sprint

ZATCA Local Generated XML Fixture Validation Sprint:

- Pin Java 11-14 or add a Docker SDK runner for local no-network validation.
- Generate sanitized local standard invoice and credit-note XML fixtures from demo data only.
- Validate those fixtures through the wrapper.
- Keep evidence metadata-only.
- Do not request OTP/CSID, sign with production keys, clear/report invoices, create PDF/A-3, or claim production compliance.
