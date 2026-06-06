# ZATCA Audit Evidence Standard

Date: 2026-06-06

Product posture: LedgerByte is controlled beta/user-testing only. ZATCA production compliance is not enabled.

This standard defines what ZATCA readiness evidence may be stored and what must not be stored or logged in ordinary application logs.

## Allowed Evidence

The following metadata may be stored when it is tenant-scoped, environment-tagged, and not paired with secret material:

- Internal invoice ID.
- Invoice number.
- Invoice UUID.
- Invoice hash.
- Previous invoice hash.
- XML hash.
- Validation status.
- SDK validation status.
- Signing status as readiness, blocked, not implemented, failed, or successful metadata.
- Clearance/reporting status as readiness, blocked, not implemented, failed, or successful metadata.
- ZATCA request ID where safe.
- ZATCA status code where safe.
- Response status metadata, not full body.
- Timestamp.
- Environment.
- EGS profile ID.
- EGS unit ID.
- Certificate metadata such as serial number, subject, issuer, expiry date, thumbprint, and environment.
- QR metadata such as generation status and hash where safe.
- Operator/user ID for approved sensitive actions.
- Approval status, approval timestamp, and reviewer ID.
- Redacted command or validation run labels.

## Forbidden In Ordinary Logs And Readiness Responses

The following must not be stored, logged, returned, exported, printed, or captured in screenshots as ordinary evidence:

- Private keys.
- OTPs.
- CSID secret material.
- Binary security tokens.
- Auth tokens.
- API credentials.
- Signed XML bodies unless explicitly approved secure storage exists.
- QR payload bodies if sensitive.
- Full API request bodies.
- Full API response bodies.
- Customer-sensitive payloads.
- Request headers.
- Authorization headers.
- Raw certificates if the storage policy has not approved certificate body retention.
- CSR bodies when not needed for a specific approved download or review flow.

## Environment Tagging

Every future ZATCA evidence record must include an environment:

- LOCAL_MOCK
- LOCAL_SDK
- SANDBOX
- SIMULATION
- PRODUCTION

Evidence must not be copied between environments without a new evidence record and an explicit reason.

## Redaction Standard

Evidence producers must:

- Redact before writing logs or audit metadata.
- Prefer IDs, hashes, statuses, and timestamps.
- Persist certificate metadata, not private keys.
- Persist request ID/status, not full HTTP body.
- Persist command labels, not secrets or file contents.
- Use short hash previews in UI where full hashes are not needed.

## Retention And Access

Future production evidence must define:

- Retention period.
- Legal/tax retention review.
- Immutable storage requirement if applicable.
- Access role.
- Export process.
- Deletion/supersession process.
- Restore evidence.

Current sprint does not implement immutable evidence storage or signed XML body persistence.

## Audit Event Content

Sensitive ZATCA lifecycle events should record:

- Event type.
- Organization ID.
- Actor ID.
- Environment.
- EGS profile/unit ID.
- Invoice ID when applicable.
- Metadata IDs, status, and timestamps.
- Approval status and reviewer metadata when applicable.

Sensitive ZATCA lifecycle events must not record:

- OTP value.
- Private key.
- CSID secret.
- Auth header.
- Full request/response body.
- Full signed XML body.

## Current Sprint Boundary

This sprint documents evidence rules and extends readiness metadata only. It does not add real network calls, signing, CSID onboarding, PDF/A-3, signed artifact body storage, or production compliance behavior.
