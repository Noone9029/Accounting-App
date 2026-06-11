# ZATCA Sandbox Response Custody Approval Gate

Date: 2026-06-11

Branch: `codex/zatca-sandbox-response-custody-approval-gate`

Starting main commit: `d15884f8 Merge pull request #12 from Noone9029/codex/zatca-sandbox-response-processing-approval-gate`

Status: documentation and static guard only. Real ZATCA production compliance remains disabled.

## Purpose

This gate defines the planning and approval boundary for future sandbox response custody only. It is metadata-only and execution-blocked.

This lane does not authorize request body creation, sandbox network execution, adapter execution, response receipt, response parsing, response transformation, response validation, response sanitization, response hashing, response redaction, response storage, response custody, response summarization, secret-manager writes, database writes, object-storage writes, CSID requests, signing, clearance/reporting, PDF-A3, or production compliance claims.

## Sandbox Response Custody Boundary

Only a future separately approved sandbox-only lane may attempt response custody planning, and that later lane must still remain blocked until its own execution path is implemented and verified.

Codex must never receive, read, inspect, parse, transform, validate, sanitize, hash, redact, summarize, print, persist, encrypt, decrypt, retain, archive, forward, export, backup, restore, screenshot, transmit, or log a real ZATCA sandbox response body in this lane.

Codex must never execute a sandbox adapter, HTTP client path, response processor, custody provider, secret manager, KMS path, database write path, file write path, backup path, or object-storage write path in this lane.

Codex must never create or inspect a real request body in this lane.

Codex must never include a real OTP value, CSID, CSR body, private key, certificate body, token, secret, taxpayer data, customer/vendor data, invoice body, request body, response body, signed XML, QR payload, auth header, cookie, portal/session material, production credential, endpoint credential/API key, response body hash derived from a real body, response summary derived from a real body, secret-manager payload, database payload, object-storage payload, or backup payload in docs, tests, guard output, or evidence.

No response body custody is authorized in this lane.

No response body storage, persistence, encryption, decryption, retention, archive, file write, DB write, secret-manager write, KMS write, object-storage write, backup, restore, forwarding, or export is authorized in this lane.

No response body processing is authorized in this lane.

## Exact Approval Phrase

Use this exact phrase only for future metadata-only approval recognition:

```text
I approve ZATCA sandbox response custody planning only. No real OTP, no CSID request, no request body creation, no sandbox network request execution, no adapter execution, no response body receipt, no response body parsing, no response body transformation, no response body validation, no response body sanitization, no response body hashing, no response body redaction, no response body storage, no response custody, no response summarization, no custody provider execution, no secret manager write, no database write, no object storage write, no backup payload, no CSR body, no private key, no certificate, no token or secret, no taxpayer/customer/vendor data, no invoice body, no signed XML, no QR payload, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.
```

This phrase does not authorize execution. It only allows the static guard to recognize metadata-only approval while keeping execution blocked.

## Metadata-Only Evidence Format

Only the following safe evidence fields are allowed:

- `sandbox access confirmed: yes/no`
- `manual OTP capture approval metadata recognized: yes/no`
- `request body creation approval metadata recognized: yes/no`
- `sandbox network request approval metadata recognized: yes/no`
- `response processing approval metadata recognized: yes/no`
- `response custody approval phrase recognized: yes/no`
- `network request executed: no`
- `adapter executed: no`
- `request body created: no`
- `response body received: no`
- `response body processed: no`
- `response custody stored: no`
- `custody provider approved: yes/no`
- `custody provider executed: no`
- `secret manager write executed: no`
- `database write executed: no`
- `object storage write executed: no`
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
- response body hash derived from real body
- response summary derived from real body
- signed XML
- QR payload
- auth header
- cookie
- portal session data
- taxpayer/customer/vendor data
- invoice payload/body
- production credential
- endpoint credential or API key
- secret-manager payload
- database payload
- object-storage payload
- backup payload

## Safety Assertions

The sandbox response custody approval gate must keep these assertions true:

- `network request executed: no`
- `adapter executed: no`
- `request body created: no`
- `response body received: no`
- `response body processed: no`
- `response custody stored: no`
- `custody provider approved: yes/no`
- `custody provider executed: no`
- `secret manager write executed: no`
- `database write executed: no`
- `object storage write executed: no`
- `real OTP included: no`
- `CSID requested: no`
- `signing enabled: no`
- `clearance/reporting enabled: no`
- `PDF-A3 enabled: no`
- `production compliance claimed: no`

No response body custody is authorized in this lane.

No response body storage or persistence is authorized in this lane.

No response body processing is authorized in this lane.

No response body hashing or summarization is authorized in this lane.

Response custody remains blocked pending a separate future sandbox CSID storage lane.

Sandbox network request execution remains blocked in this lane.

Adapter execution remains blocked in this lane.

Request body creation remains blocked in this lane.

Custody provider execution remains blocked in this lane.

Secret manager writes remain blocked in this lane.

Database writes remain blocked in this lane.

Object storage writes remain blocked in this lane.

Production compliance remains disabled and not claimed.

## Explicit Blocker Statuses

The current safe statuses are:

- `SANDBOX_RESPONSE_CUSTODY_APPROVAL_BLOCKED`
- `SANDBOX_RESPONSE_CUSTODY_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `SANDBOX_RESPONSE_CUSTODY_APPROVAL_POLICY_BLOCKED`

Even when the exact approval phrase is recognized, execution remains blocked.

## Approval Ladder

Future work must remain in this order:

1. sandbox access confirmation
2. manual OTP capture approval metadata
3. request body creation approval metadata
4. real sandbox network request approval metadata
5. response processing approval metadata
6. response custody approval metadata
7. sandbox CSID storage by approved custody provider

## Abort Conditions

Stop immediately if any of the following would happen:

- actual sandbox network request execution
- adapter execution of any kind
- actual request body creation
- response body receipt of any kind
- response body parsing, transformation, validation, sanitization, hashing, redaction, summarization, or processing of any kind
- response custody, response storage, response persistence, response encryption, response decryption, response retention, response archive, response forwarding, or response export of any kind
- custody provider execution of any kind
- secret manager write, database write, object storage write, file write, backup, or restore of any kind
- OTP inclusion of any kind
- CSID request execution
- CSR body inclusion
- private key inclusion
- certificate inclusion
- token or secret inclusion
- taxpayer/customer/vendor data inclusion
- invoice payload/body inclusion
- signed XML inclusion
- QR payload inclusion
- production compliance claim
- exposure of auth headers, cookies, session data, production credentials, endpoint credentials/API keys, response-derived hashes, response-derived summaries, secret-manager payloads, database payloads, object-storage payloads, or backup payloads
- signing
- clearance/reporting
- PDF-A3 enablement

## Current Blockers

- Sandbox access confirmation remains metadata-only.
- Manual OTP capture approval remains metadata-only.
- Request body creation approval remains metadata-only.
- Sandbox network request approval remains metadata-only.
- Response processing approval remains metadata-only.
- Response custody approval remains metadata-only.
- Response body receipt is not permitted in this lane.
- Response body processing is not permitted in this lane.
- Response custody storage is not permitted in this lane.
- Custody provider execution is not permitted in this lane.
- Secret manager writes are not permitted in this lane.
- Database writes are not permitted in this lane.
- Object storage writes are not permitted in this lane.
- Sandbox CSID storage by an approved custody provider remains blocked.
- Signing remains blocked.
- Clearance/reporting remains blocked.
- PDF-A3 remains blocked.
- Production compliance remains disabled and not claimed.

## Recommended Next Prompt

`ZATCA sandbox CSID storage approval gate`
