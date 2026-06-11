# ZATCA PDF-A3 Approval Gate

Date: 2026-06-11

Branch: `codex/zatca-pdf-a3-approval-gate`

Starting main commit: `edc306e6 Merge pull request #16 from Noone9029/codex/zatca-clearance-reporting-approval-gate`

Status: documentation and static guard only. Real ZATCA production compliance remains disabled.

## Purpose

This gate defines the metadata-only approval boundary for future ZATCA PDF-A3 invoice archive work. It is metadata-only and execution-blocked.

This lane does not authorize PDF-A3 generation, XML generation, XML attachment, signed XML embedding, invoice archive file creation, invoice PDF body handling, XML body handling, PDF library invocation, file persistence, database writes, document-store writes, object-storage writes, archive writes, backup writes, signing, QR generation, ZATCA network calls, clearance/reporting, invoice/accounting/customer data mutation, or production compliance claims.

## PDF-A3 Boundary

Only a future separately approved sandbox-only or production-readiness lane may attempt PDF-A3 planning, and that later lane must still remain blocked until its own execution path is implemented and verified.

Codex must never generate PDF-A3, generate or attach XML, embed signed XML, create invoice archive files, read invoice PDF bodies, read XML bodies, write invoice PDF bodies, write XML bodies, call PDF libraries for artifact generation, persist files, call ZATCA, execute signing, generate QR, run clearance/reporting, or mutate invoice/accounting/customer data in this lane.

Codex must never read, print, persist, transmit, export, screenshot, or otherwise handle real invoice PDF bodies, XML bodies, signed XML, QR payloads, request bodies, response bodies, auth headers, cookies, customer/vendor/invoice body material, object-storage payloads, document-store payloads, archive payloads, or backup payloads in this lane.

No PDF-A3 generation is authorized in this lane.

No XML embedding or signed XML embedding is authorized in this lane.

No invoice archive file creation or file persistence is authorized in this lane.

No invoice PDF or XML body handling is authorized in this lane.

No PDF library invocation, object-storage write, database write, or document-store write is authorized in this lane.

## Exact Approval Phrase

Use this exact phrase only for future metadata-only approval recognition:

```text
I approve ZATCA PDF-A3 planning only. No PDF-A3 generation, no XML generation, no XML attachment, no signed XML embedding, no invoice archive creation, no invoice PDF body handling, no XML body handling, no PDF library invocation, no file persistence, no object-storage write, no database or document-store write, no signing, no QR generation, no ZATCA network call, no clearance, no reporting, no invoice or accounting mutation, no customer-data read, and no production compliance are authorized.
```

This phrase does not authorize execution. It only allows the static guard to recognize metadata-only approval while keeping execution blocked.

## Metadata-Only Evidence Format

Only the following safe evidence fields are allowed:

- `PDF-A3 approval phrase recognized: yes/no`
- `PDF-A3 generated: no`
- `XML embedded: no`
- `signed XML embedded: no`
- `file persisted: no`
- `object storage write: no`
- `DB/document write: no`
- `invoice/customer data read: no`
- `ZATCA network call: no`
- `clearance/reporting: no`
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
- invoice PDF body
- XML body
- signed XML
- QR payload
- auth header
- cookie
- portal session data
- taxpayer/customer/vendor data
- invoice payload/body
- object-storage payload
- database payload
- document-store payload
- archive payload
- backup payload
- production credential
- endpoint credential or API key

## Safety Assertions

The PDF-A3 approval gate must keep these assertions true:

- `PDF-A3 approval phrase recognized: yes/no`
- `PDF-A3 generated: no`
- `XML embedded: no`
- `signed XML embedded: no`
- `file persisted: no`
- `object storage write: no`
- `DB/document write: no`
- `invoice/customer data read: no`
- `ZATCA network call: no`
- `clearance/reporting: no`
- `production compliance: no`

No PDF-A3 generation is authorized in this lane.

No XML embedding or signed XML embedding is authorized in this lane.

No invoice archive file creation or file persistence is authorized in this lane.

No invoice PDF or XML body handling is authorized in this lane.

No PDF library invocation, object-storage write, database write, or document-store write is authorized in this lane.

No signing, QR generation, ZATCA network call, or clearance/reporting is authorized in this lane.

No invoice, accounting, or customer data is mutated or read in this lane.

Production compliance remains disabled and not claimed.

## Explicit Blocker Statuses

The current safe statuses are:

- `PDF_A3_APPROVAL_BLOCKED`
- `PDF_A3_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `PDF_A3_APPROVAL_POLICY_BLOCKED`

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
11. production compliance launch gate

## Abort Conditions

Stop immediately if any of the following would happen:

- actual PDF-A3 generation
- actual XML generation, XML attachment, or signed XML embedding
- actual invoice archive creation
- actual invoice PDF or XML body handling
- actual PDF library invocation for artifact generation
- actual file persistence, object-storage write, database write, document-store write, archive write, or backup write
- actual signing or QR generation
- actual ZATCA network calls
- actual clearance/reporting
- mutation or readout of invoice, accounting, or customer data
- exposure of invoice PDF bodies, XML bodies, signed XML, QR payloads, auth headers, cookies, production credentials, or any secret payload
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
- PDF-A3 approval remains metadata-only.
- No PDF-A3 generation is permitted in this lane.
- No XML embedding or signed XML embedding is permitted in this lane.
- No invoice archive file creation or file persistence is permitted in this lane.
- No invoice PDF or XML body handling is permitted in this lane.
- No PDF library invocation, object-storage write, database write, or document-store write is permitted in this lane.
- No signing, QR generation, ZATCA network call, or clearance/reporting is permitted in this lane.
- Production compliance remains disabled and not claimed.

## Recommended Next Prompt

`ZATCA production compliance launch gate`
