# ZATCA Clearance Reporting Approval Gate

Date: 2026-06-11

Branch: `codex/zatca-clearance-reporting-approval-gate`

Starting main commit: `154bbf82 Merge pull request #15 from Noone9029/codex/zatca-signing-phase2-qr-approval-gate`

Status: documentation and static guard only. Real ZATCA production compliance remains disabled.

## Purpose

This gate defines the metadata-only approval boundary for future ZATCA clearance and reporting work. It is metadata-only and execution-blocked.

This lane does not authorize clearance execution, reporting execution, invoice submission, credit-note submission, debit-note submission, ZATCA API calls, API request body creation, API response body processing, CSID use, token or secret use, certificate or private-key use, signed XML use, Phase 2 QR use, PDF-A3 generation, invoice/accounting/customer data mutation, clearance/reporting payload storage, or production compliance claims.

## Clearance Reporting Boundary

Only a future separately approved sandbox-only or production-readiness lane may attempt clearance or reporting planning, and that later lane must still remain blocked until its own execution path is implemented and verified.

Codex must never execute clearance, execute reporting, submit invoices, submit credit notes, submit debit notes, call ZATCA APIs, create API request bodies, process API response bodies, sign XML, generate Phase 2 QR payloads, generate PDF-A3, or mutate invoice/accounting/customer data in this lane.

Codex must never read, print, persist, transmit, export, screenshot, or otherwise handle real CSID material, token material, secret material, certificate body material, private-key material, request bodies, response bodies, signed XML, QR payloads, auth headers, cookies, customer/vendor/invoice body material, or clearance/reporting payloads in this lane.

No clearance execution is authorized in this lane.

No reporting execution is authorized in this lane.

No invoice or note submission is authorized in this lane.

No ZATCA API call is authorized in this lane.

No request body creation or response body processing is authorized in this lane.

No CSID, token, secret, certificate, or private-key use is authorized in this lane.

No signed XML use, QR use, or PDF-A3 generation is authorized in this lane.

## Exact Approval Phrase

Use this exact phrase only for future metadata-only approval recognition:

```text
I approve ZATCA clearance and reporting planning only. No clearance execution, no reporting execution, no invoice submission, no credit note submission, no debit note submission, no ZATCA API call, no request body creation, no response body processing, no CSID use, no token or secret use, no certificate or private key use, no signed XML use, no QR use, no PDF-A3, no invoice or accounting mutation, no customer-data mutation, no payload storage, and no production compliance are authorized.
```

This phrase does not authorize execution. It only allows the static guard to recognize metadata-only approval while keeping execution blocked.

## Metadata-Only Evidence Format

Only the following safe evidence fields are allowed:

- `clearance approval phrase recognized: yes/no`
- `reporting approval phrase recognized: yes/no`
- `clearance executed: no`
- `reporting executed: no`
- `invoice submitted: no`
- `note submitted: no`
- `ZATCA network call: no`
- `request body created: no`
- `response body processed: no`
- `CSID used: no`
- `token/secret/certificate/private key used: no`
- `signed XML used: no`
- `QR used: no`
- `PDF-A3 created: no`
- `production compliance: no`
- `next boundary`

Safe metadata may also include:

- approval timestamp
- operator role only
- environment label
- blocker summary
- branch or PR reference

## Forbidden Evidence And Body Fields

Do not record, print, paste, persist, or screenshot any of the following:

- OTP value
- CSID
- binary security token
- token
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
- clearance payload
- reporting payload
- production credential
- endpoint credential or API key

## Safety Assertions

The clearance/reporting approval gate must keep these assertions true:

- `clearance approval phrase recognized: yes/no`
- `reporting approval phrase recognized: yes/no`
- `clearance executed: no`
- `reporting executed: no`
- `invoice submitted: no`
- `note submitted: no`
- `ZATCA network call: no`
- `request body created: no`
- `response body processed: no`
- `CSID used: no`
- `token/secret/certificate/private key used: no`
- `signed XML used: no`
- `QR used: no`
- `PDF-A3 created: no`
- `production compliance: no`

No clearance execution is authorized in this lane.

No reporting execution is authorized in this lane.

No invoice or note submission is authorized in this lane.

No ZATCA API call is authorized in this lane.

No request body creation or response body processing is authorized in this lane.

No CSID, token, secret, certificate, or private-key use is authorized in this lane.

No signed XML use, QR use, or PDF-A3 generation is authorized in this lane.

No invoice, accounting, or customer data is mutated in this lane.

No clearance/reporting payload is stored in this lane.

Production compliance remains disabled and not claimed.

## Explicit Blocker Statuses

The current safe statuses are:

- `CLEARANCE_REPORTING_APPROVAL_BLOCKED`
- `CLEARANCE_REPORTING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `CLEARANCE_REPORTING_APPROVAL_POLICY_BLOCKED`

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
8. signing and Phase 2 QR approval metadata
9. clearance reporting approval metadata
10. PDF-A3 approval metadata

## Abort Conditions

Stop immediately if any of the following would happen:

- actual clearance execution
- actual reporting execution
- actual invoice, credit-note, or debit-note submission
- actual ZATCA API calls
- actual request body creation
- actual response body processing
- actual CSID, token, secret, certificate, or private-key use
- actual signed XML use, QR use, or PDF-A3 generation
- storage of clearance/reporting payloads
- mutation of invoice, accounting, or customer data
- exposure of request bodies, response bodies, signed XML, QR payloads, auth headers, cookies, production credentials, or any secret payload
- production compliance claim

## Current Blockers

- Sandbox access confirmation remains metadata-only.
- Manual OTP capture approval remains metadata-only.
- Request body creation approval remains metadata-only.
- Sandbox network request approval remains metadata-only.
- Response processing approval remains metadata-only.
- Response custody approval remains metadata-only.
- Sandbox CSID storage approval remains metadata-only.
- Signing and Phase 2 QR approval remains metadata-only.
- Clearance/reporting approval remains metadata-only.
- No clearance execution is permitted in this lane.
- No reporting execution is permitted in this lane.
- No invoice or note submission is permitted in this lane.
- No ZATCA API call is permitted in this lane.
- No request body creation or response body processing is permitted in this lane.
- No CSID, token, secret, certificate, or private-key use is permitted in this lane.
- No signed XML use, QR use, or PDF-A3 generation is permitted in this lane.
- Production compliance remains disabled and not claimed.

## Recommended Next Prompt

`ZATCA PDF-A3 approval gate`
