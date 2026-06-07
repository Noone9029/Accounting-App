# ZATCA API Integration Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Keep real network calls disabled by default.
- Verify sandbox, simulation, and production base URLs from official documentation.
- Verify authentication headers, CSID usage, request IDs, content types, and timeout/retry guidance.
- Verify compliance CSID request/response fields before mapping real OTP onboarding.
- Verify compliance-check request/response shape for required invoice samples.
- Verify clearance request/response shape for standard invoices.
- Verify reporting request/response shape for simplified invoices.
- Map official error codes to retryable, user-actionable, and terminal classes.
- Add fixture-based tests before setting `ZATCA_ENABLE_REAL_NETWORK=true` in any controlled sandbox.

Open blockers: real OTP, valid sandbox credentials, official endpoint URLs, official payload samples, official error semantics.

## 2026-06-06 Preparation Gates

- Environment separation is documented in `ZATCA_ENVIRONMENT_SEPARATION_POLICY.md`.
- Current document eligibility is documented in `ZATCA_INVOICE_ELIGIBILITY_MATRIX.md`.
- Sandbox onboarding is documented in `SANDBOX_CSID_ONBOARDING_RUNBOOK.md`, but OTP and CSID execution remain blocked.
- Audit evidence rules are documented in `ZATCA_AUDIT_EVIDENCE_STANDARD.md`.
- Local/no-network SDK validation is repeatable through `corepack pnpm zatca:sdk-validate-local -- --all --no-network --json`.
- Fixture IDs are documented in `ZATCA_SDK_FIXTURE_REGISTRY.md`.
- Metadata-only evidence fields are documented in `ZATCA_SDK_VALIDATION_EVIDENCE_FORMAT.md`.
- The readiness endpoint/UI may expose preparation booleans, but those booleans are read-only and do not enable network calls.
- `productionComplianceEnabled`, `realNetworkCallsEnabled`, `signingEnabled`, `clearanceReportingEnabled`, and `pdfA3Enabled` must remain false until separate approved implementation sprints.

## Reference-backed source files

- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`

Use `OFFICIAL_IMPLEMENTATION_MAP.md` before changing adapter paths or payloads. These files identify endpoint shapes, but base URLs, credentials, headers, and sandbox behavior still need manual confirmation before any real network enablement.
