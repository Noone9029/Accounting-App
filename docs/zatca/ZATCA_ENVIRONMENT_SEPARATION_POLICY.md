# ZATCA Environment Separation Policy

Date: 2026-06-06

Product posture: LedgerByte is controlled beta/user-testing only. ZATCA production compliance is not enabled.

This policy defines the allowed and forbidden behavior for each ZATCA environment before any real CSID, signing, clearance, reporting, PDF/A-3, or production behavior is implemented.

## Environment Summary

| Environment | Purpose | Network calls | Credentials | Data | Key material | Storage |
| --- | --- | --- | --- | --- | --- | --- |
| Local mock/readiness | Product development, readiness screens, mock CSID, local XML/hash/QR metadata | Forbidden | Demo/mock only | Demo or local test data only | No real private keys | Metadata-only local records |
| Local SDK validation | No-network official SDK validation against local/sample XML | Forbidden | No CSID or API credentials | Official samples and local test fixtures | Temporary non-production material only if required by the SDK fixture | Temporary validation artifacts only |
| Sandbox | Future ZATCA sandbox onboarding and validation after approval | Allowed only by explicit sandbox-only gate | Sandbox CSID/certificates only | Non-production test data only | Sandbox keys only under approved custody | Redacted metadata and approved sandbox evidence |
| Simulation | Future pre-production rehearsal if applicable to ZATCA process | Allowed only by explicit simulation gate | Simulation credentials only | Approved non-production simulation data | Simulation keys only under approved custody | Redacted metadata and approved simulation evidence |
| Production | Future live ZATCA compliance execution | Blocked until all gates pass | Production credentials only | Real tenant data only | Production keys in approved KMS/HSM or equivalent custody | Approved secure artifact/evidence storage only |

## Local Mock/Readiness

Allowed:

- Local readiness pages, checklist metadata, and blocked status reporting.
- Local seller profile and EGS metadata.
- Local XML, QR, hash, and previous-invoice-hash scaffolding used for engineering readiness.
- Mock CSID placeholders clearly labeled as not real certificates.
- Metadata-only audit evidence that does not contain secrets, signed XML bodies, API headers, OTPs, or full customer payloads.

Forbidden:

- Real ZATCA network calls.
- OTP entry or OTP submission.
- Compliance CSID or production CSID request.
- Real private key generation, storage, display, or logging.
- Production signing, clearance, reporting, PDF/A-3 creation, or production compliance claims.

## Local SDK Validation

Allowed:

- Official SDK readiness checks.
- No-network validation of official sample invoices and local generated XML fixtures.
- Temporary local files required to run the SDK validation wrapper.
- Pass/fail evidence that records command intent, SDK version/path, Java version, fixture name, timestamp, and redacted result metadata.

Forbidden:

- ZATCA API submission.
- Real CSID onboarding.
- Production signing or production certificate use.
- Persistent signed XML body storage unless a secure signed-artifact policy is separately approved.
- Logging private keys, OTPs, tokens, binary security tokens, secrets, request headers, or full API bodies.

## Sandbox

Allowed only after a sandbox runbook gate is approved:

- Sandbox OTP handling by an authorized operator.
- Sandbox CSID onboarding with sandbox-only flags and sandbox-only credentials.
- Sandbox validation, reporting, or clearance calls only where explicitly implemented and separately approved.
- Redacted metadata evidence for request ID, status code, result status, timestamp, environment, EGS profile ID, and certificate metadata.

Forbidden:

- Production credentials or production key material.
- Production tenant data unless legal, security, accountant, tax, and ZATCA specialist approvals explicitly allow it.
- Logging or storing OTPs, tokens, private keys, CSID secrets, full request/response bodies, or full headers.
- Treating sandbox success as production compliance.

## Simulation

Simulation is not implemented in this sprint. If a simulation environment is introduced later, it must be isolated from sandbox and production with separate credentials, URLs, environment flags, audit tags, and key custody.

Forbidden until implemented:

- Simulation network calls.
- Simulation CSID onboarding.
- Simulation certificate/key storage.
- Simulation clearance/reporting.

## Production

Production is blocked.

Required gates before production can run:

- Security review.
- Accountant review.
- Tax review.
- ZATCA specialist review.
- Production operations review.
- Approved key custody decision and implemented custody controls.
- Approved environment promotion policy.
- Approved audit evidence and signed artifact storage design.
- Approved invoice eligibility and document finalization policy.
- Repeatable local SDK and sandbox evidence.
- Production incident, rollback, revocation, and support runbooks.

Forbidden before all gates pass:

- Production CSID request.
- Production private key generation or storage.
- Production signing.
- Clearance or reporting.
- PDF/A-3 creation.
- Production compliance claims.
- Fake/demo data in production ZATCA flows.

## Audit Evidence Rules

Allowed evidence:

- Environment name.
- Invoice ID and invoice number.
- Invoice UUID.
- Hashes and previous hash values.
- Validation status.
- SDK validation status.
- Signing status as blocked/not implemented/readiness only.
- Clearance/reporting status as blocked/not implemented/readiness only.
- Safe request ID and status metadata when available.
- Timestamp.
- EGS profile ID.
- Certificate metadata such as serial, subject, issuer, expiry, and thumbprint when approved.

Forbidden evidence in ordinary logs:

- Private keys.
- OTPs.
- CSID secret material.
- Auth tokens.
- API credentials.
- Signed XML bodies without approved secure storage.
- QR payload bodies if sensitive.
- Full API request or response bodies.
- Customer-sensitive payloads.
- Headers.

## Redaction Rules

- Redact secrets at source before logging.
- Store hashes, IDs, statuses, and timestamps instead of full bodies.
- Store certificate metadata, not key material.
- Include the environment on every evidence record.
- Do not copy sandbox evidence into production records.
- Do not copy production evidence into local mock records.

## Current Sprint Boundary

This sprint documents separation rules and exposes read-only preparation gates. It does not enable real ZATCA network calls, OTP submission, CSID requests, key generation/storage, signing, clearance, reporting, PDF/A-3, or production compliance.
