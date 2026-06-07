# Sandbox CSID Onboarding Runbook

Date: 2026-06-06

Status: Not executable in this sprint. This runbook defines the required gate before any sandbox CSID onboarding command is allowed.

LedgerByte is controlled beta/user-testing only. ZATCA production compliance is not enabled.

## Purpose

Prepare a controlled process for future sandbox CSID onboarding without requesting an OTP, submitting an OTP, requesting a real CSID, or calling the ZATCA network in this sprint.

## Required Approvals Before Execution

Sandbox onboarding must not run until all of these are approved:

- Security owner approves key custody and redaction.
- ZATCA specialist approves sandbox endpoint and onboarding steps.
- Tax/accountant reviewer approves invoice eligibility assumptions.
- Product owner approves controlled beta messaging.
- Production operations owner approves evidence capture and rollback.

## Who Obtains OTP

The OTP must be obtained only by an authorized business/admin operator through the official ZATCA portal or official process.

Developers must not ask the user for an OTP in chat. OTP entry must happen only in a secure approved UI or command prompt designed for that purpose.

## OTP Entry And Expiry

Future OTP handling must define:

- Where OTP is entered.
- Who may enter it.
- Expiry window.
- Retry rules.
- Failure handling.
- Redaction behavior.

OTP must never be:

- Stored in the database.
- Logged.
- Returned by an API.
- Committed to source control.
- Captured in screenshots.
- Sent through ordinary support or chat messages.

## Required Environment Flags

Future execution must require explicit sandbox-only flags. At minimum:

- Adapter mode must be sandbox-specific.
- Real network calls must be explicitly enabled for sandbox.
- Sandbox base URL must be configured.
- Production base URL must not be used.
- Production credentials must not be present in the sandbox execution context.
- The compliance CSID request gate must be explicitly enabled.

The current default remains disabled and mock/local only.

## Required Key Custody Decision

Before sandbox onboarding:

- Sandbox key custody path must be selected.
- Sandbox key material must not be stored in ordinary logs.
- Production key custody design must be drafted, even if sandbox uses a separate temporary custody model.
- Private key export/display rules must be documented.

## Evidence To Capture

Capture metadata only:

- Environment: SANDBOX.
- EGS unit ID.
- CSR config review ID.
- Operator ID.
- Approval IDs.
- Request timestamp.
- Safe request ID/status where available.
- Response status metadata.
- Certificate metadata where approved.
- Validation result.
- Blocking or failure reason.

Do not capture:

- OTP.
- Private key.
- CSID secret.
- Binary security token body.
- Full request/response body.
- Full headers.
- Customer-sensitive invoice payloads.

## Execution Outline For Future Sprint

1. Confirm approvals are complete.
2. Confirm environment flags are sandbox-only.
3. Confirm no production credentials are loaded.
4. Confirm CSR config review is approved.
5. Confirm key custody is ready for sandbox.
6. Enter OTP through the approved secure flow.
7. Submit sandbox compliance CSID request.
8. Store metadata-only evidence.
9. Verify no secrets appear in logs, API responses, or UI.
10. Record pass/fail evidence and blockers.

## Rollback And Cleanup

If sandbox onboarding fails:

- Mark the EGS unit status as blocked or review-required.
- Revoke or supersede unsafe metadata-only evidence if needed.
- Do not delete audit evidence without a retention-approved process.
- Remove temporary files containing sensitive material.
- Rotate or revoke sandbox material if exposure is suspected.

## What Not To Do

- Do not request OTP in chat.
- Do not run CSID commands in this sprint.
- Do not use production credentials.
- Do not call production endpoints.
- Do not persist secret bodies.
- Do not log headers.
- Do not treat sandbox success as production compliance.
- Do not enable clearance/reporting from sandbox onboarding alone.

## Current Sprint Boundary

No OTP was requested. No CSID command was run. No real ZATCA network call was made. No real private key was generated or stored.
