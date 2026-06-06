# Official SDK Validation Readiness

Date: 2026-06-06

Product posture: LedgerByte is controlled beta/user-testing only. ZATCA production compliance is not enabled.

This document defines local no-network readiness for official SDK validation. It does not enable real ZATCA calls, CSID onboarding, signing with production credentials, clearance, reporting, PDF/A-3, or production compliance.

## Java Version

Expected Java range:

- Java 11 through Java 14 for the official SDK flow used by LedgerByte local validation.

Known local note:

- Prior local evidence used Java 11 successfully.
- Default Java 17 was not suitable for the observed SDK path.

Do not commit machine-specific Java paths.

## Local SDK Path

Expected local source:

- `reference/zatca-einvoicing-sdk-*` when present.
- `reference/zatca-docs` when present for official documentation cross-checks.

Rules:

- SDK files remain local references unless explicitly approved for repository storage.
- Paths with spaces may require a temporary no-space work directory.
- Do not store credentials in SDK folders.

## Fixtures

Expected fixture types:

- Official sample invoices from the SDK package.
- LedgerByte generated XML fixtures from finalized local test invoices.
- Hash-chain fixtures when SDK hash mode is explicitly tested.

Fixture rules:

- Use demo/local data only.
- Do not use production tenant data.
- Do not include production credentials.
- Label fixture environment and source.

## Command Wrapper

The repeatable command wrapper is:

```bash
corepack pnpm zatca:sdk-validate-local -- --all --no-network --json
```

The wrapper:

- Run no-network SDK validation only.
- Use a configured timeout.
- Record command intent and result metadata.
- Avoid printing secrets or full customer payloads.
- Avoid printing XML bodies, QR payload bodies, private keys, tokens, or headers.
- Produce safe blockers when Java, the SDK, or a fixture is missing.

Current scripts and endpoints are readiness/local validation utilities only. They must not be treated as ZATCA submission.

Supported fixture IDs are documented in `ZATCA_SDK_FIXTURE_REGISTRY.md`. Evidence fields are documented in `ZATCA_SDK_VALIDATION_EVIDENCE_FORMAT.md`.

## No-Network Validation Mode

Allowed:

- XML schema and SDK validation where the official SDK supports local validation.
- Local hash comparison.
- Local readiness checks.

Forbidden:

- ZATCA API calls.
- OTP submission.
- CSID request.
- Clearance.
- Reporting.
- Production signing.

## Evidence

Allowed evidence:

- SDK readiness flags.
- Java version.
- SDK path presence.
- Fixture name.
- Validation status.
- Timestamp.
- Error/warning code and summary.
- Environment label.
- Redaction booleans showing XML, QR payload, private key, token/header, network, signing, clearance/reporting, PDF/A-3, and production compliance remain false.

Forbidden evidence:

- Private keys.
- OTPs.
- CSID secret material.
- Auth headers.
- Full signed XML body unless approved secure storage exists.
- Full API request or response bodies.

## CI Feasibility

CI use remains a future decision because it requires:

- Stable SDK dependency acquisition.
- Compatible Java runtime.
- Deterministic fixture set.
- No-network guarantee.
- Artifact retention policy.
- Secret-free logs.

CI must not run real ZATCA network calls.

## 2026-06-06 SDK CI Readiness Guard

`corepack pnpm zatca:sdk-ci-readiness -- --plan --no-network --json` now inspects CI readiness metadata only. It does not run SDK validation by default, write evidence, call ZATCA, sign XML, request OTP/CSID, clear/report, create PDF/A-3, deploy, migrate, seed, reset, delete, or send email.

Current guard result: `CI_BLOCKED_MISSING_SDK_REFERENCE`.

Observed blockers:

- The SDK reference exists locally under `reference/`, but `reference/` is ignored and the SDK app/config files are not available from a fresh repository checkout.
- Default Java is OpenJDK `17.0.16`, which is outside the official SDK range `>=11 <15`.
- CI artifact retention/redaction approval is not recorded.

Local validation remains available only when a developer supplies a Java 11-14 binary through `ZATCA_SDK_JAVA_BIN` and uses local ignored official references. PR CI remains non-ZATCA until the SDK reference/acquisition and artifact retention policies are approved.

## Artifact Retention

Current readiness:

- Local validation artifacts may be temporary.
- Pass/fail metadata can be documented.

Future production readiness requires:

- Retention decision.
- Secure storage decision.
- Restore proof.
- Redaction proof.
- Support access rules.

## Known Blockers

- Production signing is not implemented.
- CSID onboarding is not implemented.
- PDF/A-3 is not implemented.
- Repeatable Java/SDK CI execution is not yet approved.
- Key custody is draft only.
- Signed artifact body persistence is blocked until secure storage controls are approved.

## Current Sprint Boundary

This sprint makes SDK validation repeatable or safely blocked through a local/no-network wrapper and metadata-only evidence format. It does not run real network validation, modify signing behavior, generate real keys, request CSIDs, clear/report invoices, or create PDF/A-3.

## 2026-06-06 Generated XML Fixture Validation Readiness

The generated-fixture layer adds deterministic sanitized local XML snapshots for a standard sales invoice and a standard credit note:

- `packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml`
- `packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml`

The wrapper now supports targeted validation for:

```bash
corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-generated-standard-invoice --no-network --json
corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-generated-credit-note --no-network --json
```

Default Java 17 remains unsupported by the SDK requirement of Java 11 through Java 14. Local validation can use an explicit compatible binary through `ZATCA_SDK_JAVA_BIN` without changing global Java or committing machine-specific paths. On this workstation, Java 11.0.26 was available and the generated fixtures passed local/no-network SDK validation. Docker was checked but not used because the explicit Java 11 path and isolated temporary SDK launcher workspace were sufficient.

Read-only readiness metadata now includes generated fixture statuses, latest generated fixture evidence status, runtime blocker text when present, `noNetworkOnly=true`, and `productionCompliance=false`. These fields are preparation indicators only and must not be presented as ZATCA compliance, production readiness, signing, clearance/reporting, or PDF/A-3 evidence.
