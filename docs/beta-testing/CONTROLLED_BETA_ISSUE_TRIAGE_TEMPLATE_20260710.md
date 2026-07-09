# LedgerByte Controlled Beta Issue Triage Template

Date: 2026-07-10

Use this template for every beta issue. Remove secrets and private data before submission. Do not paste passwords, tokens, cookies, authorization headers, database URLs, API keys, raw documents, provider payloads, signed XML, or unredacted financial/customer data.

## Safety Check

- [ ] Test/beta environment only
- [ ] Screenshot or recording is redacted
- [ ] Logs contain no secrets, cookies, authorization data, private payloads, or document bodies
- [ ] Organization/tenant is identified by approved test label or ID only

## Classification

- Severity: Blocker / High / Medium / Low
- Category: Access / Tenant scope / Accounting / Workflow / Report / Document / Import-export / Provider-readiness / Compliance wording / Performance / UI
- Blocks controlled beta: Yes / No
- Stop affected workflow: Yes / No

## Context

- Route or page:
- Date, time, and timezone:
- Browser, version, device, and viewport:
- Assigned beta tenant/organization:
- User role:
- Request ID or support reference, if available:

## Reproduction

- User action immediately before the issue:
- Steps:
  1.
  2.
  3.
- Frequency: Always / Intermittent / Once

## Result

- Expected result:
- Actual result:
- Can testing continue safely: Yes / No

## Sanitized Evidence

- Redacted screenshot or recording reference:
- Redacted log reference:
- Request ID source: error panel / response header / Vercel log / unavailable
- Additional notes:

## Triage Decision

- Confirmed severity:
- Owner:
- Accounting/security/compliance escalation required: Yes / No
- Workaround safe for beta: Yes / No / None
- Resolution or follow-up PR:
