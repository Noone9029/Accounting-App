# ZATCA Sandbox CSID Storage Approval Gate

Date: 2026-06-11

Branch: `codex/zatca-sandbox-csid-storage-approval-gate`

Starting main commit: `db8f058c Merge pull request #13 from Noone9029/codex/zatca-sandbox-response-custody-approval-gate`

Status: documentation and static guard only. Real ZATCA production compliance remains disabled.

## Purpose

This gate defines the metadata-only approval boundary for future sandbox CSID storage by an approved custody provider. It is metadata-only and execution-blocked.

This lane does not authorize actual CSID storage, token storage, secret storage, certificate storage, private-key storage, CSR storage, request body creation, sandbox network execution, adapter execution, response processing, response custody, custody provider execution, signing, clearance/reporting, PDF-A3, or production compliance claims.

## Sandbox CSID Storage Boundary

Only a future separately approved sandbox-only lane may attempt CSID storage planning, and that later lane must still remain blocked until its own execution path is implemented and verified.

Codex must never store, persist, encrypt, decrypt, transmit, export, print, log, screenshot, document, or otherwise handle real CSID material in this lane.

Codex must never store a real CSID, binary security token, CSID secret, certificate body, private key, CSR body, request body, response body, or response-derived payload in this lane.

Codex must never execute a custody provider, secret manager, KMS path, HSM path, database write path, object-storage write path, backup path, logging path, docs write path, screenshot path, sandbox adapter, or HTTP client in this lane.

Codex must never include a real OTP value, CSID, binary security token, CSID secret, certificate body, private key, CSR body, taxpayer/customer/vendor data, invoice body, request body, response body, signed XML, QR payload, auth header, cookie, portal/session material, production credential, provider credential, or endpoint credential/API key in docs, tests, guard output, or evidence.

No CSID storage is authorized in this lane.

No binary security token, CSID secret, certificate, private key, or CSR storage is authorized in this lane.

No response body processing or response custody is authorized in this lane.

## Exact Approval Phrase

Use this exact phrase only for future metadata-only approval recognition:

```text
I approve ZATCA sandbox CSID storage planning only. No real OTP, no CSID request, no request body creation, no sandbox network request execution, no adapter execution, no response body processing, no response custody, no custody provider execution, no CSID storage, no binary security token storage, no CSID secret storage, no certificate storage, no private key storage, no CSR storage, no database write, no secret manager write, no KMS write, no HSM write, no object storage write, no backup write, no log write, no docs write, no screenshots, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.
```

This phrase does not authorize execution. It only allows the static guard to recognize metadata-only approval while keeping execution blocked.

## Metadata-Only Evidence Format

Only the following safe evidence fields are allowed:

- `approval phrase recognized: yes/no`
- `custody provider selected: yes/no`
- `custody provider approved: yes/no`
- `custody provider executed: no`
- `CSID stored: no`
- `binary security token stored: no`
- `CSID secret stored: no`
- `certificate stored: no`
- `private key stored: no`
- `CSR stored: no`
- `database write executed: no`
- `secret manager write executed: no`
- `KMS write executed: no`
- `HSM write executed: no`
- `object storage write executed: no`
- `backup write executed: no`
- `network request executed: no`
- `adapter executed: no`
- `request body created: no`
- `response body processed: no`
- `response custody stored: no`
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

Do not record, print, paste, persist, or screenshot any of the following:

- OTP value
- CSID
- binary security token
- CSID secret
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
- provider credential
- endpoint credential or API key
- secret-manager payload
- database payload
- KMS payload
- HSM payload
- object-storage payload
- backup payload

## Safety Assertions

The sandbox CSID storage approval gate must keep these assertions true:

- `approval phrase recognized: yes/no`
- `custody provider selected: yes/no`
- `custody provider approved: yes/no`
- `custody provider executed: no`
- `CSID stored: no`
- `binary security token stored: no`
- `CSID secret stored: no`
- `certificate stored: no`
- `private key stored: no`
- `CSR stored: no`
- `database write executed: no`
- `secret manager write executed: no`
- `KMS write executed: no`
- `HSM write executed: no`
- `object storage write executed: no`
- `backup write executed: no`
- `network request executed: no`
- `adapter executed: no`
- `request body created: no`
- `response body processed: no`
- `response custody stored: no`
- `real OTP included: no`
- `CSID requested: no`
- `signing enabled: no`
- `clearance/reporting enabled: no`
- `PDF-A3 enabled: no`
- `production compliance claimed: no`

No CSID storage is authorized in this lane.

No binary security token, CSID secret, certificate, private key, or CSR storage is authorized in this lane.

No custody provider execution is authorized in this lane.

No database, secret-manager, KMS, HSM, object-storage, backup, log, docs, or screenshot writes are authorized in this lane.

No response body processing or response custody is authorized in this lane.

Sandbox network request execution remains blocked in this lane.

Adapter execution remains blocked in this lane.

Request body creation remains blocked in this lane.

Production compliance remains disabled and not claimed.

## Explicit Blocker Statuses

The current safe statuses are:

- `SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED`
- `SANDBOX_CSID_STORAGE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `SANDBOX_CSID_STORAGE_APPROVAL_POLICY_BLOCKED`

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

- actual CSID storage
- actual binary security token, secret, certificate, private-key, or CSR storage
- custody provider execution of any kind
- database write, secret-manager write, KMS write, HSM write, object-storage write, backup write, log write, docs write, or screenshot write of any kind
- actual sandbox network request execution
- adapter execution of any kind
- actual request body creation
- response body processing or response custody of any kind
- OTP inclusion of any kind
- CSID request execution
- signed XML inclusion
- QR payload inclusion
- production compliance claim
- exposure of auth headers, cookies, session data, production credentials, provider credentials, endpoint credentials/API keys, or any secret payload
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
- Sandbox CSID storage by an approved custody provider remains metadata-only.
- No CSID storage is permitted in this lane.
- No custody provider execution is permitted in this lane.
- No database, secret-manager, KMS, HSM, object-storage, backup, log, docs, or screenshot writes are permitted in this lane.
- Signing remains blocked.
- Clearance/reporting remains blocked.
- PDF-A3 remains blocked.
- Production compliance remains disabled and not claimed.

## Recommended Next Prompt

`ZATCA signing and Phase 2 QR approval gate`
