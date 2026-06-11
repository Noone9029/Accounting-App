# ZATCA Sandbox Request Body Creation Approval Gate

Date: 2026-06-11

Branch: `codex/zatca-request-body-creation-approval-gate`

Base branch: `codex/zatca-manual-otp-capture-approval-gate`

Base commit: `5f1b2c0b Add ZATCA manual OTP capture approval gate`

Status: documentation and static guard only. Real ZATCA production compliance remains disabled.

## Purpose

This gate defines the planning and approval boundary for future sandbox request body creation only. It is metadata-only and execution-blocked.

This lane does not authorize actual request body creation, OTP capture, OTP entry, CSID requests, sandbox network calls, response processing, response custody, signing, clearance/reporting, PDF-A3, or production compliance claims.

## Request Body Creation Boundary

Only a future separately approved sandbox-only lane may attempt request body creation, and that later lane must still remain blocked until its own execution gate is implemented and verified.

Codex must never create, render, print, persist, transform, validate, screenshot, transmit, or log a real ZATCA request body in this lane.

Codex must never include a real OTP value, CSID, CSR body, private key, certificate body, token, secret, taxpayer data, customer/vendor data, invoice body, or portal/session material in docs, tests, guard output, or evidence.

## Exact Approval Phrase

Use this exact phrase only for future metadata-only approval recognition:

```text
I approve ZATCA sandbox request body creation planning only. No real OTP, no CSID request, no CSR body, no private key, no certificate, no token or secret, no taxpayer/customer/vendor data, no invoice body, no ZATCA network call, no response processing, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.
```

This phrase does not authorize execution. It only allows the static guard to recognize metadata-only approval while keeping execution blocked.

## Metadata-Only Evidence Format

Only the following safe evidence fields are allowed:

- `sandbox access confirmed: yes/no`
- `manual OTP capture approval metadata recognized: yes/no`
- `request body creation approval phrase recognized: yes/no`
- `request body created: no`
- `real OTP included: no`
- `CSID requested: no`
- `ZATCA network call made: no`
- `response body processed: no`
- `signing enabled: no`
- `clearance/reporting enabled: no`
- `PDF-A3 enabled: no`
- `production compliance claimed: no`
- `next approval boundary`

Safe metadata may also include:

- approval timestamp
- operator role only
- environment label `sandbox only`
- blocker summary
- stacked-branch or PR reference

## Forbidden Evidence And Body Fields

Do not record, print, paste, or persist any of the following:

- OTP value
- CSID
- binary security token
- secret
- private key
- certificate body
- CSR body
- request body
- response body
- signed XML
- QR payload
- auth header
- cookie
- portal session data
- taxpayer/customer/vendor data
- invoice payload/body
- production credential

## Safety Assertions

The sandbox request body creation approval gate must keep these assertions true:

- `request body created: no`
- `real OTP included: no`
- `CSID requested: no`
- `ZATCA network call made: no`
- `response body processed: no`
- `signing enabled: no`
- `clearance/reporting enabled: no`
- `PDF-A3 enabled: no`
- `production compliance claimed: no`

No actual request body creation is authorized in this lane.

Request body creation remains blocked pending a separate future execution lane.

Real sandbox network request execution remains blocked.

## Explicit Blocker Statuses

The current safe statuses are:

- `REQUEST_BODY_CREATION_APPROVAL_BLOCKED`
- `REQUEST_BODY_CREATION_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `REQUEST_BODY_CREATION_APPROVAL_POLICY_BLOCKED`

Even when the exact approval phrase is recognized, execution remains blocked.

## Approval Ladder

Future work must remain in this order:

1. sandbox access confirmation
2. manual OTP capture approval metadata
3. request body creation approval metadata
4. real sandbox network request approval
5. response processing approval
6. response custody approval
7. sandbox CSID storage by approved custody provider

## Abort Conditions

Stop immediately if any of the following would happen:

- actual request body creation
- OTP inclusion of any kind
- CSID request execution
- CSR body inclusion
- private key inclusion
- certificate inclusion
- token or secret inclusion
- taxpayer/customer/vendor data inclusion
- invoice payload/body inclusion
- ZATCA network call
- response body processing
- signing
- clearance/reporting
- PDF-A3 enablement
- production compliance claim
- exposure of auth headers, cookies, session data, signed XML, QR payloads, or production credentials

## Current Blockers

- Manual OTP capture remains metadata-only and outside Codex.
- Request body creation approval remains metadata-only.
- No actual request body is permitted in this lane.
- Real sandbox network request execution remains blocked.
- Response processing remains blocked.
- Response custody remains blocked.
- Sandbox CSID storage by an approved custody provider remains blocked.
- Signing remains blocked.
- Clearance/reporting remains blocked.
- PDF-A3 remains blocked.
- Production compliance remains disabled and not claimed.

## Recommended Next Prompt

`ZATCA sandbox network request approval gate`
