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
