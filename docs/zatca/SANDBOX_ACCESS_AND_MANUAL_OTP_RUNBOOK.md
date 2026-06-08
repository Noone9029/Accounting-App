# ZATCA Sandbox Access And Manual OTP Runbook

Date: 2026-06-08

Branch: `codex/zatca-sandbox-access-otp-runbook`

Starting main commit: `2f40904929081271b150eb2189928d0490e20507 Merge PR #5: ZATCA sandbox CSID execution approval gate`

Sandbox portal reference only: `https://sandbox.zatca.gov.sa/IntegrationSandbox`

## Status And Scope

This runbook prepares a safe, human-operated ZATCA sandbox access and manual OTP capture boundary for LedgerByte controlled beta/user-testing only. It is documentation and static metadata checking only.

Real ZATCA production compliance is not enabled. This runbook does not authorize Codex, automation, browser tooling, app code, scripts, tests, CI, or operators to request a CSID, capture an OTP into LedgerByte, call ZATCA, create request bodies, process response bodies, store secrets, sign XML, run clearance/reporting, create PDF-A-3 artifacts, or claim production compliance.

## Manual Access Steps

Only an authorized human operator may perform these steps, outside Codex and outside the repository:

1. Open the ZATCA sandbox portal manually in a normal human-controlled browser.
2. Confirm the portal URL used is the sandbox reference URL, not a production portal or production endpoint.
3. Confirm sandbox/developer access exists for the operator.
4. Confirm the operator role is appropriate for sandbox/developer onboarding.
5. Identify where OTP or CSID onboarding starts, without requesting a CSID and without entering or sharing an OTP with Codex.
6. Record metadata-only status in repo documentation or an issue/PR comment if needed.
7. Close the portal session when the manual check is complete.

Codex must not log in to the portal, automate the browser, inspect authenticated portal pages, request or capture OTP values, request CSID values, call ZATCA, or process portal data.

## Manual OTP Handling Policy

- OTP must be captured only by the authorized human operator.
- OTP must never be committed, logged, pasted into chat, included in docs, included in PR descriptions, shown in screenshots, or provided to Codex.
- OTP entry into the app requires a future explicit approval lane.
- OTP must be treated as short-lived secret material.
- OTP evidence must be metadata-only, such as `OTP obtained manually: yes/no`; it must never include the OTP value.
- Manual OTP capture approval is not granted by this runbook.
- Any OTP entered into a future app flow must be scoped to sandbox only and must follow a separate approval gate for request-body creation, real sandbox network request execution, response-body processing, and response custody.

## Forbidden Data

The following must never be pasted into chat, logs, docs, commits, screenshots, Codex, issue comments, PR bodies, audit evidence, test fixtures, or local guard output:

- login credentials
- OTP values
- CSID values
- binary security tokens
- secrets
- certificates
- private keys
- CSR bodies
- request bodies
- response bodies
- auth headers
- cookies
- portal session data
- raw private keys
- raw certificates
- raw CSRs
- binary security token bodies
- CSID secret bodies
- tokens
- signed XML
- QR payloads
- provider payloads
- customer/vendor data
- bank account data
- email bodies
- production credentials

## Safe Metadata

Only metadata like the following may be recorded:

- sandbox access confirmed: yes/no
- operator role confirmed: yes/no
- portal URL used
- date/time of manual check
- environment: sandbox only
- whether OTP flow is visible: yes/no
- whether CSID request flow is visible: yes/no
- blocker list
- next required approval boundary
- OTP obtained manually: yes/no
- OTP value recorded: no
- CSID requested: no
- ZATCA network call made by LedgerByte/Codex: no
- request body created: no
- response body processed: no

## Screenshots Policy

Screenshots are discouraged for sandbox portal evidence. If a screenshot is unavoidable for human review, it must remain outside the repo unless it is fully scrubbed and metadata-only.

A screenshot must not contain login credentials, OTP values, CSID values, binary security tokens, secrets, certificates, private keys, CSR bodies, request bodies, response bodies, auth headers, cookies, portal session data, personal data, customer/vendor data, bank account data, or production identifiers.

Do not commit screenshots of authenticated portal pages. Prefer text evidence with safe metadata fields.

## Evidence Policy

Evidence for this lane is metadata-only. Evidence may record statuses, booleans, dates, environment labels, blocker names, and next approval boundaries. Evidence must not contain any secret, portal session material, raw body, request body, response body, token, certificate body, private-key body, CSR body, OTP value, CSID value, signed XML, QR payload, provider payload, customer/vendor data, bank account data, email body, or production credential.

Evidence should explicitly state:

- sandbox portal login by Codex: no
- OTP captured by Codex: no
- OTP value stored: no
- CSID requested: no
- ZATCA network call made: no
- request body created: no
- response body processed: no
- signing enabled: no
- clearance/reporting enabled: no
- PDF-A-3 enabled: no
- production compliance claimed: no

## Human Operator Checklist

- [ ] Operator is authorized for ZATCA sandbox/developer access.
- [ ] Operator used only the sandbox portal reference URL.
- [ ] Operator did not use Codex, chat, scripts, CI, or browser automation to log in.
- [ ] Sandbox access confirmed: yes/no.
- [ ] Operator role confirmed: yes/no.
- [ ] OTP flow visible: yes/no.
- [ ] CSID request flow visible: yes/no.
- [ ] OTP obtained manually: yes/no.
- [ ] OTP value recorded in evidence: no.
- [ ] CSID requested: no.
- [ ] ZATCA network call made by LedgerByte/Codex: no.
- [ ] Request body created: no.
- [ ] Response body processed: no.
- [ ] Screenshot committed: no.
- [ ] Blockers recorded as metadata only.
- [ ] Next required approval boundary recorded.

## Approval Ladder Before Execution

Future work must proceed through separate approval lanes in this order:

1. sandbox access confirmed
2. manual OTP capture approved
3. request body creation approved
4. real sandbox network request approved
5. response body processing approved
6. response custody approved
7. sandbox CSID stored by approved custody provider

Each approval lane must be scoped to sandbox only, must preserve metadata-only evidence until the explicit body/custody lane allows otherwise, and must keep production compliance disabled.

## Rollback And Abort Conditions

Abort the manual check immediately if any of these occur:

- The portal redirects to a production environment.
- The operator cannot confirm sandbox/developer access.
- The operator role is unclear or unauthorized.
- The flow asks the operator to paste an OTP into chat, docs, Codex, logs, screenshots, or commits.
- The flow requires CSID request execution before approval.
- The flow exposes CSID values, binary security tokens, secrets, certificates, private keys, CSR bodies, request bodies, response bodies, auth headers, cookies, or portal session data.
- Evidence cannot be kept metadata-only.
- A screenshot would include forbidden data.
- Any production credential, production CSID, production endpoint, production signing, clearance/reporting, PDF-A-3, or production compliance claim appears in scope.

If forbidden data is exposed, stop the lane, remove the exposed material from any controllable local draft before commit, do not push it, and escalate as a secret/material exposure incident.

## Remaining Blockers

- Manual sandbox access must be confirmed by a human operator.
- Manual OTP capture approval remains blocked.
- OTP entry into LedgerByte remains blocked.
- Request body creation remains blocked.
- Real sandbox network request execution remains blocked.
- Response body processing remains blocked.
- Response custody remains blocked.
- Sandbox CSID storage by an approved custody provider remains blocked.
- Real custody provider approval remains blocked.
- KMS/HSM or approved managed-secret boundary remains blocked.
- Legacy PEM/payload-capable fields remain blockers.
- Signing and Phase 2 QR remain blocked.
- Clearance/reporting remains blocked.
- PDF-A-3 remains blocked.
- Production CSID lifecycle remains blocked.
- Production compliance remains disabled and not claimed.
- Official/legal/accounting/ZATCA specialist review remains required.

## Recommended Next Lane

`LedgerByte approve and merge ZATCA sandbox access OTP runbook PR.`
