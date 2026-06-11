# ZATCA Sandbox Access Confirmation Checklist

## 1. Purpose
* Confirm ZATCA sandbox access readiness safely.
* Confirm access only as metadata.
* Do not perform OTP capture, CSID request execution, request-body creation, response-body processing, signing, clearance/reporting, PDF-A-3, or production compliance work.

## 2. Sandbox URL
**Reference-only URL:** https://sandbox.zatca.gov.sa/IntegrationSandbox

**WARNING:** Antigravity, Codex, OpenClaw, and any other agent must not log in.

## 3. Human Operator Checklist
* `sandboxPortalReachable`: [ ]
* `sandboxAccessConfirmed`: [ ]
* `operatorAuthorized`: [ ]
* `organizationContextConfirmed`: [ ]
* `sandboxEnvironmentConfirmed`: [ ]
* `otpFlowVisible`: [ ]
* `csidRequestFlowVisible`: [ ]
* `missingRoleOrPermission`: [ ]
* `blockerSummary`: [ ]
* `checkedAt`: [ ]
* `checkedByRoleOnly`: [ ]
* `nextRequiredApprovalBoundary`: [ ]

## 4. Forbidden Material
**DO NOT** record or paste any of the following:
* usernames/passwords
* OTP values
* CSID values
* portal cookies/session data
* auth headers
* tokens
* binary security tokens
* secrets
* private keys
* raw CSRs
* certificate bodies
* request bodies
* response bodies
* provider payloads
* signed XML
* QR payloads
* screenshots with sensitive values
* taxpayer/customer/vendor/bank data

## 5. Safe Evidence Template
Copy and use the following template to provide metadata-only evidence:

```text
- date: 
- operator role: 
- environment checked: 
- sandbox access confirmed: [yes/no]
- OTP flow visible: [yes/no]
- CSID request flow visible: [yes/no]
- blockers: 
- next approval needed: 
- notes without secrets: 
```

## 6. Abort Conditions
**STOP IMMEDIATELY IF:**
* portal appears to be production, not sandbox
* OTP is displayed or generated before approval
* CSID/token/certificate/private-key material is displayed
* a screenshot would reveal sensitive values
* operator sees real taxpayer/customer/vendor/bank data
* operator is unsure whether the environment is sandbox
* request/response bodies would need to be copied
* any secret would need to be pasted into chat, docs, logs, commits, or tools

## 7. Next Approval Boundary
The next lane may only begin after sandbox access is confirmed as metadata.

**Next Lane:** LedgerByte prepare manual OTP capture approval checklist.
