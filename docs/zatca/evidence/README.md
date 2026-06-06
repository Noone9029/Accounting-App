# ZATCA SDK Validation Evidence

This directory is for metadata-only local/no-network SDK validation evidence.

Allowed here:

- Sanitized JSON evidence produced by `corepack pnpm zatca:sdk-validate-local`.
- Fixture IDs, run IDs, timestamps, Java version labels, SDK presence/version labels, safe warning/error codes, and blocker summaries.

Forbidden here:

- XML bodies.
- Signed XML bodies.
- QR payload bodies.
- Private keys.
- OTPs.
- CSID token or secret material.
- API credentials, auth tokens, and headers.
- Full ZATCA request/response bodies.
- Production customer data.

Evidence in this directory does not prove production ZATCA compliance and must not be used as a production submission artifact.

## 2026-06-06 Generated Fixture Evidence

`generated-xml-fixture-validation-20260606.json` records metadata-only local SDK validation for:

- `ledgerbyte-generated-standard-invoice`
- `ledgerbyte-generated-credit-note`

The evidence file records Java/SDK version labels, fixture IDs, validation status, redaction flags, and no-network/production-disabled flags only. It does not include XML bodies, QR payload bodies, customer/vendor payloads, private keys, certificates, OTPs, CSID material, tokens, headers, raw request/response bodies, or unsafe SDK stdout/stderr.

This evidence proves only that sanitized local LedgerByte fixture XML can be generated and passed through the local official SDK wrapper with Java 11.0.26. It is not signing, CSID onboarding, clearance/reporting, PDF/A-3, or production compliance.
