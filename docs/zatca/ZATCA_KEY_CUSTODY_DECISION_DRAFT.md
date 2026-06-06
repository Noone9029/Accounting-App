# ZATCA Key Custody Decision Draft

Date: 2026-06-06

Status: Draft decision record for review. No real key custody integration is implemented in this sprint.

LedgerByte is controlled beta/user-testing only. ZATCA production compliance is not enabled.

## 2026-06-06 Reconciliation Update

This draft is superseded for current planning by `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md` and `KEY_CUSTODY_DECISION_MATRIX.md`. It remains historical context for the original custody decision options.

Current recommendation: KMS/HSM/external signing or equivalent custody for production private keys. Secrets manager may be considered only as a controlled interim for non-production/sandbox CSID token, secret, and certificate custody after explicit approval. Raw DB PEM storage and environment-variable storage are not production-acceptable.

## 2026-06-06 Sandbox CSID Preflight Guard Update

`SANDBOX_CSID_PREFLIGHT_GUARD.md` and `SANDBOX_CSID_PREFLIGHT_RESULTS.md` now show the local sandbox CSID preflight result: `PREFLIGHT_BLOCKED`.

The preflight reinforces this draft's decision boundary. A future sandbox approval path still needs approved key custody, approved CSID response custody, explicit OTP handling approval, explicit compliance CSID request approval, and a still-disabled real sandbox adapter.

## Decision To Be Made

Before any real CSID, signing, clearance, reporting, PDF/A-3, or production ZATCA behavior is implemented, LedgerByte must choose and implement a private-key and certificate custody model that is acceptable to security, accountant, tax, ZATCA specialist, and production operations reviewers.

## Options

### Cloud KMS Or HSM

Description:

- Private key is generated or imported into a managed KMS/HSM-capable service.
- Signing operations occur through the custody provider or an approved signing adapter.
- Application services never receive raw production private key material.

Benefits:

- Strong audit trail and access controls.
- Key export can be disabled where supported.
- Rotation and revocation workflows are more enforceable.
- Better fit for production ZATCA custody.

Risks and blockers:

- Provider choice, tenancy model, region, cost, and operational access must be approved.
- The signing adapter must be tested against ZATCA XML signing requirements.
- Break-glass access must be designed without exposing raw key material.

### Secrets Manager With Encrypted Key Material

Description:

- Private key or CSID secret material is stored in a secrets manager.
- Application retrieves the secret only in tightly controlled signing flows.

Benefits:

- Easier implementation than KMS/HSM signing.
- Rotation and access logging are possible.

Risks and blockers:

- Raw private key may enter application memory.
- Stronger logging, memory handling, and access controls are required.
- Less preferred than non-exportable KMS/HSM for production private keys.

### Encrypted Database Storage

Description:

- Key material is stored in the application database with encryption.

Current decision:

- Not approved for production private keys.
- Existing development placeholder PEM storage must remain local/mock only and must not be treated as production custody.

Risks:

- Application database compromise can expose key material.
- Audit and rotation are harder.
- Easy to accidentally log or return sensitive fields.

### Local Development Files

Description:

- Temporary local files are used only for local SDK validation or development placeholders.

Current decision:

- Allowed only for non-production local validation and mock readiness.
- Must not be committed.
- Must not contain production keys.
- Must not be printed in logs or terminal output.

## Environment-Specific Custody

### Local Dev

Allowed:

- Mock placeholders.
- Temporary non-production files required for local validation.
- Metadata-only readiness indicators such as `hasPrivateKey`.

Forbidden:

- Real private key generation for production.
- Real CSID secret storage.
- Printing or returning private keys, OTPs, binary security tokens, or auth headers.

### Sandbox

Required before use:

- Approved sandbox operator.
- Approved sandbox key custody path.
- Explicit environment flag for sandbox onboarding.
- OTP handling runbook.
- Evidence redaction standard.

Allowed after approval:

- Sandbox-only key material and sandbox-only CSID/certificate metadata.
- Redacted sandbox evidence.

Forbidden:

- Production credentials.
- Production private keys.
- Treating sandbox key custody as production custody.

### Production

Required:

- Approved KMS/HSM or equivalent custody decision.
- Non-export or controlled-export policy.
- Least-privilege service access.
- Dual-control or equivalent approval for sensitive lifecycle actions.
- Rotation, revocation, and emergency access runbooks.
- Audit evidence for certificate lifecycle without exposing key material.

Forbidden:

- Raw production private key in ordinary database text fields.
- Raw production private key in logs, API responses, CSVs, PDFs, screenshots, or support tickets.
- Production signing before CSID lifecycle, audit evidence, artifact storage, and operations gates pass.

## Certificate And CSID Lifecycle

Future implementation must model:

- CSR generation source and review.
- OTP request owner and approver.
- Compliance CSID request result metadata.
- Production CSID request result metadata.
- Certificate serial, issuer, subject, environment, issue date, expiry date, thumbprint, and status.
- Renewal window and renewal reminders.
- Revocation trigger, approver, evidence, and recovery path.
- Decommissioning when an EGS unit is retired.

## Rotation

Rotation must define:

- Trigger events: expiry, compromise suspicion, operator change, provider change, EGS replacement, or policy interval.
- Approval path.
- Cutover plan.
- Evidence required before and after rotation.
- How old certificates are retained as metadata only.
- How previous invoice hash continuity is protected.

## Revocation

Revocation must define:

- Who can trigger emergency revocation.
- How revocation is approved and recorded.
- How affected EGS units are blocked.
- How invoice submission is paused.
- How tenants are notified in a controlled manner.
- How support can verify revocation without seeing secrets.

## Emergency Access

Emergency access must:

- Be time-bounded.
- Require approval and audit evidence.
- Avoid exposing raw key material where possible.
- Produce metadata-only evidence.
- Include post-incident review and access removal.

## Access Model

Potential roles:

- Security owner: approves custody architecture and access model.
- ZATCA specialist: validates regulatory and SDK implications.
- Tax/accountant reviewer: approves invoice eligibility and accounting boundary.
- Production operator: executes approved runbooks.
- Developer: may operate local/mock readiness and local SDK validation only.

No role should be able to print, export, or store production private keys outside approved custody.

## Must Never Be Logged

- Private keys.
- OTPs.
- CSID secrets.
- Binary security tokens.
- API credentials.
- Auth tokens.
- Request headers containing credentials.
- Full signed XML bodies unless separately approved secure storage exists.
- QR payload bodies if sensitive.
- Full ZATCA API request or response bodies.

## Current Sprint Boundary

This sprint creates the decision draft only. It does not implement KMS, HSM, secrets-manager integration, real key generation, real key storage, signing, CSID onboarding, clearance, reporting, PDF/A-3, or production compliance.
