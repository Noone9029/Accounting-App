# ZATCA Manual OTP Capture Approval Gate

Date: 2026-06-11

Branch: `codex/zatca-manual-otp-capture-approval-gate`

Starting main commit: `122657b2 Update handoff after ZATCA checklist merge`

Status: documentation and static guard only. Real ZATCA production compliance remains disabled.

## Purpose

This gate defines the manual OTP capture approval boundary for future sandbox-only ZATCA work after sandbox access confirmation. It is metadata-only and human-operated only.

This gate does not authorize request body creation, real sandbox network requests, response processing, response custody, CSID requests, signing, clearance/reporting, PDF-A3, or production compliance claims.

## Human-Only OTP Capture Boundary

Only an authorized human operator may capture an OTP manually outside Codex, outside automation, and outside repository tooling.

Codex must never capture, view, store, paste, transform, validate, screenshot, log, or transmit OTP values.

Codex must never log in to the ZATCA sandbox portal, inspect authenticated portal content, or handle portal/session secrets.

## Exact Approval Phrase

Use this exact phrase only for future metadata-only human confirmation:

```text
I confirm that an authorized human operator handled ZATCA sandbox OTP capture manually, no OTP value was shared with Codex, and this approval is metadata only. No request body creation, no ZATCA network call, no response processing, no response custody, no CSID request, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.
```

This phrase does not authorize execution. It only allows the static guard to recognize metadata-only approval while keeping execution blocked.

## Metadata-Only Evidence Format

Only the following safe evidence fields are allowed:

- `sandbox access confirmed: yes/no`
- `human operator role confirmed: yes/no`
- `OTP flow visible: yes/no`
- `OTP obtained manually: yes/no`
- `OTP value stored: no`
- `OTP value shared with Codex: no`
- `CSID requested: no`
- `ZATCA network call made: no`
- `request body created: no`
- `response body processed: no`

Safe metadata may also include:

- approval timestamp
- operator role only
- environment label `sandbox only`
- blocker summary
- next required approval boundary

## Forbidden Fields

Do not record or paste any of the following:

- OTP value
- credentials
- cookies
- session data
- auth headers
- CSID
- tokens
- certificates
- private keys
- CSR body
- request body
- response body
- signed XML
- QR payload
- customer/vendor data

## Safety Assertions

The manual OTP capture approval gate must keep these assertions true:

- `OTP value stored: no`
- `OTP value shared with Codex: no`
- `CSID requested: no`
- `ZATCA network call made: no`
- `request body created: no`
- `response body processed: no`
- `signing enabled: no`
- `clearance/reporting enabled: no`
- `PDF-A3 enabled: no`
- `production compliance claimed: no`

## Explicit Blocker Statuses

The current safe statuses are:

- `MANUAL_OTP_CAPTURE_APPROVAL_BLOCKED`
- `MANUAL_OTP_CAPTURE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `MANUAL_OTP_CAPTURE_APPROVAL_POLICY_BLOCKED`

Even when the exact approval phrase is recognized, execution remains blocked.

## Approval Ladder

Future work must remain in this order:

1. sandbox access confirmation
2. manual OTP capture approval metadata
3. request body creation approval
4. real sandbox network request approval
5. response processing approval
6. response custody approval
7. sandbox CSID storage by approved custody provider

## Abort Conditions

Stop immediately if any of the following would happen:

- Codex capture of OTP values
- OTP value storage anywhere in repo evidence
- OTP value sharing with Codex
- CSID request execution
- ZATCA network calls
- request body creation
- response body processing
- signing
- clearance/reporting
- PDF-A3 enablement
- production compliance claim
- exposure of credentials, cookies, session data, auth headers, tokens, certificates, private keys, CSR body, request body, response body, signed XML, QR payload, or customer/vendor data

## Current Blockers

- Manual OTP capture approval remains metadata-only.
- OTP entry into LedgerByte remains blocked.
- Request body creation remains blocked.
- Real sandbox network request execution remains blocked.
- Response processing remains blocked.
- Response custody remains blocked.
- Sandbox CSID storage by an approved custody provider remains blocked.
- Signing remains blocked.
- Clearance/reporting remains blocked.
- PDF-A3 remains blocked.
- Production compliance remains disabled and not claimed.

## Recommended Next Prompt

`ZATCA sandbox request body creation approval gate`
