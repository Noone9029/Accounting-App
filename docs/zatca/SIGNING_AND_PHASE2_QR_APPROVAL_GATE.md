# ZATCA Signing And Phase 2 QR Approval Gate

Date: 2026-06-11

Branch: `codex/zatca-signing-phase2-qr-approval-gate`

Starting main commit: `ce2489a5 Merge pull request #14 from Noone9029/codex/zatca-sandbox-csid-storage-approval-gate`

Status: documentation and static guard only. Real ZATCA production compliance remains disabled.

## Purpose

This gate defines the metadata-only approval boundary for future signing and Phase 2 QR work. It is metadata-only and execution-blocked.

This lane does not authorize signing execution, Phase 2 QR generation, signed XML generation, signature generation, private-key use, certificate use, CSID use, token or secret use, SDK signing command execution, ZATCA network calls, clearance/reporting, PDF-A3 generation, invoice/accounting/customer data mutation, or production compliance claims.

## Signing And Phase 2 QR Boundary

Only a future separately approved sandbox-only or local-only lane may attempt signing or Phase 2 QR planning, and that later lane must still remain blocked until its own execution path is implemented and verified.

Codex must never execute signing, generate a Phase 2 QR payload, generate signed XML, generate signatures, invoke SDK signing commands, call ZATCA, or mutate invoice/accounting/customer data in this lane.

Codex must never read, print, persist, transmit, export, screenshot, or otherwise handle real private-key material, certificate body material, CSID material, token material, secret material, signed XML, QR payloads, request bodies, response bodies, auth headers, cookies, or customer/vendor/invoice body material in this lane.

No signing execution is authorized in this lane.

No Phase 2 QR generation is authorized in this lane.

No signed XML or signature generation is authorized in this lane.

No private key, certificate, CSID, token, or secret use is authorized in this lane.

No SDK signing command execution is authorized in this lane.

No ZATCA network call is authorized in this lane.

## Exact Approval Phrase

Use this exact phrase only for future metadata-only approval recognition:

```text
I approve ZATCA signing and Phase 2 QR planning only. No signing execution, no Phase 2 QR generation, no signed XML generation, no signature generation, no private key use, no certificate use, no CSID use, no token or secret use, no SDK signing command execution, no ZATCA network call, no clearance, no reporting, no PDF-A3, no invoice or accounting mutation, no customer-data mutation, and no production compliance are authorized.
```

This phrase does not authorize execution. It only allows the static guard to recognize metadata-only approval while keeping execution blocked.

## Metadata-Only Evidence Format

Only the following safe evidence fields are allowed:

- `signing approval phrase recognized: yes/no`
- `Phase 2 QR approval phrase recognized: yes/no`
- `signing executed: no`
- `QR generated: no`
- `signed XML generated: no`
- `signature generated: no`
- `private key used: no`
- `certificate used: no`
- `CSID used: no`
- `ZATCA network call: no`
- `clearance/reporting: no`
- `PDF-A3: no`
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
- signature value
- QR payload
- auth header
- cookie
- portal session data
- taxpayer/customer/vendor data
- invoice payload/body
- production credential
- endpoint credential or API key

## Safety Assertions

The signing and Phase 2 QR approval gate must keep these assertions true:

- `signing approval phrase recognized: yes/no`
- `Phase 2 QR approval phrase recognized: yes/no`
- `signing executed: no`
- `QR generated: no`
- `signed XML generated: no`
- `signature generated: no`
- `private key used: no`
- `certificate used: no`
- `CSID used: no`
- `ZATCA network call: no`
- `clearance/reporting: no`
- `PDF-A3: no`
- `production compliance: no`

No signing execution is authorized in this lane.

No Phase 2 QR generation is authorized in this lane.

No signed XML or signature generation is authorized in this lane.

No private key, certificate, CSID, token, or secret use is authorized in this lane.

No SDK signing command execution is authorized in this lane.

No ZATCA network call is authorized in this lane.

No clearance/reporting is authorized in this lane.

No PDF-A3 generation is authorized in this lane.

No invoice, accounting, or customer data is mutated in this lane.

Production compliance remains disabled and not claimed.

## Explicit Blocker Statuses

The current safe statuses are:

- `SIGNING_PHASE2_QR_APPROVAL_BLOCKED`
- `SIGNING_PHASE2_QR_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `SIGNING_PHASE2_QR_APPROVAL_POLICY_BLOCKED`

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

## Abort Conditions

Stop immediately if any of the following would happen:

- actual signing execution
- actual Phase 2 QR generation
- actual signed XML or signature generation
- actual private-key, certificate, CSID, token, or secret use
- SDK signing command execution
- actual ZATCA network calls
- actual clearance/reporting
- actual PDF-A3 generation
- mutation of invoice, accounting, or customer data
- exposure of signed XML, QR payloads, auth headers, cookies, request bodies, response bodies, production credentials, or any secret payload
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
- No signing execution is permitted in this lane.
- No Phase 2 QR generation is permitted in this lane.
- No signed XML or signature generation is permitted in this lane.
- No private-key, certificate, CSID, token, or secret use is permitted in this lane.
- No SDK signing command execution is permitted in this lane.
- No ZATCA network call is permitted in this lane.
- Clearance/reporting remains blocked.
- PDF-A3 remains blocked.
- Production compliance remains disabled and not claimed.

## Recommended Next Prompt

`ZATCA clearance reporting approval gate`
