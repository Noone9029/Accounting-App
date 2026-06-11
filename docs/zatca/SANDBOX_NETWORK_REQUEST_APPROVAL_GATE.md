# ZATCA Sandbox Network Request Approval Gate

Date: 2026-06-11

Branch: `codex/zatca-sandbox-network-request-approval-gate`

Starting main commit: `feb32ccc Merge pull request #10 from codex/zatca-request-body-creation-approval-gate`

Status: documentation and static guard only. Real ZATCA production compliance remains disabled.

## Purpose

This gate defines the planning and approval boundary for a future real sandbox network request only. It is metadata-only and execution-blocked.

This lane does not authorize request body creation, adapter execution, network execution, response processing, response custody, CSID requests, signing, clearance/reporting, PDF-A3, or production compliance claims.

## Sandbox Network Request Boundary

Only a future separately approved sandbox-only lane may attempt a real sandbox network request, and that later lane must still remain blocked until its own execution path is implemented and verified.

Codex must never execute, submit, transmit, retry, proxy, validate, log, screenshot, or persist a real ZATCA sandbox network request in this lane.

Codex must never execute a sandbox adapter, request body creator, HTTP client path, or response processor in this lane.

Codex must never include a real OTP value, CSID, CSR body, private key, certificate body, token, secret, taxpayer data, customer/vendor data, invoice body, request body, response body, signed XML, QR payload, auth header, cookie, portal/session material, production credential, or endpoint credential/API key in docs, tests, guard output, or evidence.

## Exact Approval Phrase

Use this exact phrase only for future metadata-only approval recognition:

```text
I approve ZATCA sandbox network request planning only. No real OTP, no CSID request, no request body creation, no adapter execution, no real sandbox network request, no response processing, no response custody, no CSR body, no private key, no certificate, no token or secret, no taxpayer/customer/vendor data, no invoice body, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.
```

This phrase does not authorize execution. It only allows the static guard to recognize metadata-only approval while keeping execution blocked.

## Metadata-Only Evidence Format

Only the following safe evidence fields are allowed:

- `sandbox access confirmed: yes/no`
- `manual OTP capture approval metadata recognized: yes/no`
- `request body creation approval metadata recognized: yes/no`
- `sandbox network request approval phrase recognized: yes/no`
- `network request executed: no`
- `adapter executed: no`
- `request body created: no`
- `response body processed: no`
- `real OTP included: no`
- `CSID requested: no`
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
- branch or PR reference

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
- endpoint credential or API key

## Safety Assertions

The sandbox network request approval gate must keep these assertions true:

- `network request executed: no`
- `adapter executed: no`
- `request body created: no`
- `response body processed: no`
- `real OTP included: no`
- `CSID requested: no`
- `signing enabled: no`
- `clearance/reporting enabled: no`
- `PDF-A3 enabled: no`
- `production compliance claimed: no`

No real sandbox network request execution is authorized in this lane.

Network request execution remains blocked pending a separate future execution lane.

Adapter execution remains blocked in this lane.

Request body creation remains blocked in this lane.

Response body processing remains blocked in this lane.

Production compliance remains disabled and not claimed.

## Explicit Blocker Statuses

The current safe statuses are:

- `SANDBOX_NETWORK_REQUEST_APPROVAL_BLOCKED`
- `SANDBOX_NETWORK_REQUEST_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `SANDBOX_NETWORK_REQUEST_APPROVAL_POLICY_BLOCKED`

Even when the exact approval phrase is recognized, execution remains blocked.

## Approval Ladder

Future work must remain in this order:

1. sandbox access confirmation
2. manual OTP capture approval metadata
3. request body creation approval metadata
4. real sandbox network request approval metadata
5. response processing approval
6. response custody approval
7. sandbox CSID storage by approved custody provider

## Abort Conditions

Stop immediately if any of the following would happen:

- actual sandbox network request execution
- adapter execution of any kind
- actual request body creation
- OTP inclusion of any kind
- CSID request execution
- CSR body inclusion
- private key inclusion
- certificate inclusion
- token or secret inclusion
- taxpayer/customer/vendor data inclusion
- invoice payload/body inclusion
- response body processing
- response custody or persistence
- signing
- clearance/reporting
- PDF-A3 enablement
- production compliance claim
- exposure of auth headers, cookies, session data, signed XML, QR payloads, production credentials, or endpoint credentials/API keys

## Current Blockers

- Sandbox access confirmation remains metadata-only.
- Manual OTP capture approval remains metadata-only.
- Request body creation approval remains metadata-only.
- Sandbox network request approval remains metadata-only.
- No real sandbox network request is permitted in this lane.
- No adapter execution is permitted in this lane.
- Response processing remains blocked.
- Response custody remains blocked.
- Sandbox CSID storage by an approved custody provider remains blocked.
- Signing remains blocked.
- Clearance/reporting remains blocked.
- PDF-A3 remains blocked.
- Production compliance remains disabled and not claimed.

## Recommended Next Prompt

`ZATCA sandbox response processing approval gate`
