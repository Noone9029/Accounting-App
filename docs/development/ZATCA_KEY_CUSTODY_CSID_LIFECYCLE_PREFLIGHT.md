# ZATCA Key Custody And CSID Lifecycle Preflight

Date: 2026-06-07
Branch inspected: `codex/dev-12-generated-documents-storage-retention`
Latest commit inspected: `a0942d3a Finalize graphify generated output decision`

## Scope

This is a design and safety-gate preflight only. It does not implement signing, request OTPs, request compliance CSIDs, request production CSIDs, call ZATCA, create production credentials, generate real signing keys, run migrations, change provider/env configuration, deploy, run E2E/smoke/browser flows, export/download/PDF outputs, or mutate runtime data.

LedgerByte remains controlled beta/user-testing only. Vercel and Supabase remain beta/user-testing/staging only. Real ZATCA production compliance is not enabled.

## Repository Cleanliness

Preflight reconciliation showed:

- Branch: `codex/dev-12-generated-documents-storage-retention`
- Latest commit: `a0942d3a Finalize graphify generated output decision`
- Regular `git status --short`: clean
- Scoped ignored status: `graphify-out/` and `apps/graphify-out/` remain ignored generated output.
- `git diff --stat`: no tracked diff
- `git diff --name-status`: no tracked diff
- `git diff --check`: clean

## Files And Areas Inspected

Primary files and areas inspected:

- `CODEX_HANDOFF.md`
- `docs/zatca/**` including key custody, CSID, SDK validation, local dummy signing, sandbox onboarding, audit evidence, invoice eligibility, PDF/A-3, QR, XML, and gap docs
- `docs/development/**ZATCA**`
- `docs/development/**SDK**`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/REMAINING_ROADMAP.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/PROJECT_AUDIT.md`
- `docs/production/**`
- `packages/zatca-core/**`
- `apps/api/src/zatca/**`
- `apps/web/src/app/(app)/settings/zatca/**`
- `apps/api/prisma/schema.prisma`
- `package.json`

Notable inventory:

- `docs/zatca`: 68 files
- `packages/zatca-core`: 42 files
- `apps/api/src/zatca`: 37 files
- `apps/web/src/app/(app)/settings/zatca`: 2 files
- Root `prisma/schema.prisma`: not present; active schema is `apps/api/prisma/schema.prisma`

Read-only external terminology sanity check:

- ZATCA public developer/documentation material uses compliance CSID and production CSID concepts for onboarding, and includes QR, XML, and PDF/A-3 references. This preflight uses those only as terminology context; the repository remains the source of truth for current implementation state, and no compliance claim is made.

## Current ZATCA Readiness State

### Settings And Readiness UI

Current settings UI exists at `apps/web/src/app/(app)/settings/zatca/page.tsx` with test coverage in `page.test.tsx`.

Observed UI posture:

- Shows preparation-only ZATCA gates.
- Explicitly says production compliance is not enabled.
- Shows local/no-network SDK validation readiness.
- Shows key custody, CSR, sandbox CSID plan, CSID custody, signed artifact storage, Phase 2 QR, PDF/A-3, clearance/reporting, and production-compliance blockers.
- Does not display private keys, certificate bodies, CSID token/secret bodies, OTPs, signed XML bodies, QR payload bodies, auth headers, or raw ZATCA payload bodies.

### API And Service Surface

Current API/service surface includes planning and readiness endpoints for:

- ZATCA profile and EGS units.
- CSR field planning, sanitized CSR config previews, CSR config reviews, and local CSR dry-run/generation gates.
- Compliance CSID request plans and dry-runs.
- CSID custody provider readiness/configuration plans.
- Metadata-only compliance CSID custody records.
- Signed artifact storage policy/evidence plans.
- Invoice ZATCA readiness, local XML generation, local signing dry-run, signed XML validation dry-run, and blocked clearance/reporting endpoints.

Important current boundaries:

- `ZATCA_ENABLE_REAL_NETWORK` defaults to `false`.
- `ZATCA_SDK_EXECUTION_ENABLED` defaults to `false`.
- `ZATCA_HASH_MODE` defaults to `local`.
- `ZATCA_SANDBOX_BASE_URL` and `ZATCA_PRODUCTION_BASE_URL` are blank in examples.
- The real sandbox HTTP adapter for compliance CSID still throws before any network execution.
- The custody provider factory returns a disabled provider at runtime.
- Mocked KMS/secrets-manager provider classes exist for contract tests only, not real provider use.

### Invoice Eligibility Matrix

`docs/zatca/ZATCA_INVOICE_ELIGIBILITY_MATRIX.md` says:

- Sales invoices are ZATCA-relevant candidates only after finalization and local XML readiness.
- Credit/debit notes remain mapping/review work.
- Drafts, quotes, delivery notes, purchase documents, receipts, reports, and payments must not be submitted as ZATCA invoices.
- Real signing, clearance/reporting, and PDF/A-3 are not allowed.

### SDK Validation Pipeline

Current SDK readiness is local/no-network only:

- Package scripts include no-network planning/test wrappers such as `zatca:sdk-ci-readiness`, `zatca:sdk-validate-local`, `zatca:local-signed-xml-plan`, `zatca:local-dummy-signing-dry-run`, `zatca:sandbox-csid-preflight`, `zatca:csid-response-custody-guard`, and `zatca:sandbox-adapter-no-network-contract`.
- Evidence docs record SDK validation and local dummy-material signing outcomes as metadata-only.
- Evidence files inspected by key only include `networkCallsMade=false` and `productionComplianceEnabled=false` style fields.
- Existing docs warn that SDK references are local/ignored and CI readiness is blocked until SDK acquisition/reference policy is approved.

### Local Dummy Signing Evidence

`docs/zatca/LOCAL_DUMMY_SIGNING_EXECUTION_RESULTS.md` and `docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md` record a local dummy-material SDK experiment only.

What the evidence supports:

- Repo-local official SDK tooling can process sanitized generated fixtures through local dummy sign, QR, and signed validation stages under Java 11.
- No ZATCA network calls were made.
- Evidence is metadata-only.
- Temp output cleanup succeeded.

What the evidence does not support:

- Production signing.
- Production Phase 2 QR correctness.
- Compliance CSID or production CSID lifecycle.
- Certificate lifecycle readiness.
- Clearance/reporting readiness.
- PDF/A-3 readiness.
- Signed artifact storage readiness.
- ZATCA compliance.

### Generated XML Fixtures

`packages/zatca-core/fixtures/**` contains local fixtures and expected XML snapshots, and `docs/zatca/evidence/generated-xml-fixture-validation-20260606.json` exists as metadata-only evidence. This preflight did not print or inspect XML bodies.

Current docs indicate:

- Local standard generated XML has had successful local SDK validation in prior evidence.
- Simplified invoice gaps remain tied to signing/certificate/Phase 2 QR.
- Generated XML fixtures remain local readiness evidence, not production evidence.

### Key And Certificate Storage Assumptions

Current Prisma schema includes useful metadata models, but also legacy raw-body-capable fields:

- `ZatcaEgsUnit.csrPem`
- `ZatcaEgsUnit.privateKeyPem`
- `ZatcaEgsUnit.complianceCsidPem`
- `ZatcaEgsUnit.productionCsidPem`

The schema already carries a TODO warning that production private keys must use secrets manager/KMS rather than database storage.

Current metadata-only custody model:

- `ZatcaComplianceCsidCustodyRecord` stores request ids, certificate request ids, boolean presence flags, storage mode placeholders, expiry/renewal metadata, status, approver/revoker references, and `productionCompliance=false`.
- It does not store token bodies, secret bodies, certificate bodies, private keys, OTPs, CSR bodies, signed XML bodies, QR payload bodies, or production credentials.

### Environment Separation

Current docs and examples separate:

- Local planning and local SDK validation.
- Sandbox/simulation planning.
- Production as blocked.

Production foundation docs reinforce that current Vercel/Supabase is beta/user-testing only, production hosting/secrets/KMS/database/runtime role are not finalized, and ZATCA production behavior remains behind a separate gate.

### Audit Evidence Format

`docs/zatca/ZATCA_AUDIT_EVIDENCE_STANDARD.md` defines metadata-only evidence and forbids ordinary logs/readiness responses from including OTPs, CSID secret material, private keys, raw certificates without approved policy, request/response bodies, signed XML bodies, QR payload bodies, auth headers, and customer/vendor payload bodies.

### Sandbox Onboarding Runbook

`docs/zatca/SANDBOX_CSID_ONBOARDING_RUNBOOK.md`, `SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md`, `CSID_RESPONSE_CUSTODY_RESULTS.md`, and `SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md` show the sandbox flow remains blocked:

- OTP requested: false.
- Compliance CSID requested: false.
- Production CSID requested: false.
- Sandbox adapter executed: false.
- Network calls made: false.
- Request body created: false.
- Response body processed: false.
- DB writes attempted: false.
- Secret/body exposure: false.

## Current Assumptions

- Tenant/org scoping is mandatory for any ZATCA credential or metadata.
- EGS units are the natural operational boundary for CSR, CSID, hash chain, certificate, and signing state.
- Local dummy SDK materials must never be promoted into sandbox or production credentials.
- Existing raw PEM-capable fields are legacy local-development fields and must be quarantined before real onboarding.
- Production private keys must not be generated or stored by normal application code or normal application tables.
- Real CSID response material must be captured only by an approved custody provider.
- Production hosting/secrets/KMS and object storage decisions are still planning-only and must not be assumed available.

## Key Custody Risks

- Legacy DB fields can hold raw CSR/private-key/CSID PEM bodies and are not acceptable for real production material.
- Current provider boundary is disabled; no real KMS, HSM, secrets manager, or external signing implementation exists.
- Mocked KMS/secrets-manager tests validate contracts only; they do not prove provider readiness.
- No production private-key generation boundary exists.
- No production signing service boundary exists.
- No certificate serial/issuer/fingerprint/expiry model is fully separated from raw certificate bodies.
- No rotation, revocation, renewal, decommissioning, break-glass, or incident-response workflow is implemented.
- No provider access review, audit log review, or tenant key scoping proof exists.
- No backup/restore policy exists for custody references versus sensitive bodies.

## CSID Lifecycle Risks

- Current lifecycle states are too coarse for a full CSID lifecycle. Existing `ZatcaRegistrationStatus` covers `NOT_CONFIGURED`, `DRAFT`, `READY_FOR_CSR`, `OTP_REQUIRED`, `CERTIFICATE_ISSUED`, `ACTIVE`, and `SUSPENDED`, but does not distinguish compliance CSID active, production CSID pending/active, rotation, revocation, disabled, or error states.
- Compliance CSID and production CSID need separate metadata models and approval gates.
- OTP handling is not implemented and must remain ephemeral.
- Compliance CSID response body handling is blocked until custody provider approval.
- Production CSID lifecycle is not modeled beyond legacy fields.
- Certificate renewal, revocation, expiry monitoring, and rotation alerts are not implemented.
- Sandbox success must not unlock production signing.
- Failure/retry and idempotency behavior for CSID, signing, clearance, and reporting are not production-designed.

## Proposed Architecture Options

### Option A: External KMS/HSM Or Signing Service For Production

Use an external custody/signing boundary for production private keys. LedgerByte stores metadata, references, fingerprints, status, expiry, and audit evidence only.

Pros:

- Best fit for production private-key custody.
- Avoids raw private-key body exposure to application tables and normal API paths.
- Supports rotation, revocation, and audit separation.

Cons:

- Requires provider decision, access policy, signing API contract, cost review, operational ownership, and incident runbook.

### Option B: Secrets Manager For Sandbox CSID Token/Secret/Certificate Custody

Use an approved non-production secrets manager to store sandbox compliance CSID response material. LedgerByte stores only redacted references and metadata.

Pros:

- Good stepping stone for sandbox response custody.
- Fits existing metadata-only custody record direction.

Cons:

- Not sufficient as final production private-key signing custody by itself unless security review explicitly accepts it.
- Requires careful rotation/revoke/access-review process.

### Option C: Encrypted Database Body Storage

Use application-managed encryption and DB storage for sensitive CSID/certificate bodies.

Pros:

- Operationally simpler.

Cons:

- Higher leakage blast radius.
- Harder to justify for production private keys.
- Should remain rejected for production private keys and at most be considered as a temporary sandbox-only fallback after explicit security approval.

### Option D: Approved Third-Party E-Invoicing Provider

Delegate CSID/signing/submission custody to a provider.

Pros:

- May reduce internal compliance burden.
- May simplify production operations if provider has strong custody and ZATCA support.

Cons:

- Requires vendor due diligence, data-sharing review, integration, cost, support, and lock-in analysis.

## Recommended Architecture

Use a metadata-only LedgerByte database plus external custody boundary:

- Normal DB stores only safe metadata: organization id, EGS id, environment, lifecycle state, provider type, redacted provider reference, request id, certificate request id, certificate serial/issuer/thumbprint/fingerprint, issue/expiry dates, renewal/revocation flags, approval ids, audit event ids, status history, blocker codes, and redaction flags.
- Production private keys use KMS/HSM/external signing or an equivalent signing boundary. Raw production private-key bodies never enter normal app tables, logs, evidence docs, tests, UI, or API responses.
- Sandbox compliance CSID token/secret/certificate material may use a separately approved secrets-manager/KMS provider after fake-client contract tests and redaction tests pass.
- Existing `ZatcaEgsUnit.privateKeyPem`, `complianceCsidPem`, and `productionCsidPem` must be treated as local/dev legacy fields and blocked from real material.
- Add explicit lifecycle state metadata separate from current coarse registration status.
- Keep all real onboarding/network execution disabled by default and guarded by exact approval phrases, environment flags, role permissions, custody readiness, and no-body evidence checks.

## Non-Negotiable Safety Boundaries

- No OTP in chat, docs, logs, telemetry, tests, UI state, URL params, persisted DB fields, or audit diffs.
- No CSID token/secret/certificate body in normal app tables or ordinary logs.
- No raw private key in normal app tables, API responses, UI, tests, docs, evidence, or generated artifacts.
- No signed XML body, QR payload body, request body, response body, base64 invoice payload, customer/vendor data, bank data, document/PDF body, auth header, cookie, DB URL, service-role key, provider payload, or email body in evidence or logs.
- No real ZATCA network call without a dedicated approved sandbox execution lane.
- No production CSID, production signing, clearance/reporting, or PDF/A-3 until separate gates pass.
- No production-readiness or ZATCA-compliance claims from local SDK, dummy signing, mock CSID, or sandbox planning.

## Data And Secrets That Must Never Be Logged

- OTP values.
- Raw CSR bodies.
- Private-key PEM/DER/body.
- Certificate PEM/body when not explicitly governed by approved custody.
- CSID token/binarySecurityToken bodies.
- CSID secret bodies.
- Authorization, bearer, basic auth, cookies, and provider credentials.
- Request/response bodies to or from ZATCA.
- Signed XML bodies.
- QR payload bodies.
- Base64 invoice payloads.
- Generated document, PDF, attachment, customer, vendor, bank, or email bodies.
- DB URLs, service-role keys, object-storage access keys, KMS key material, or provider payload bodies.

## Required Database And Schema Considerations

Design only, not executed:

- Add a dedicated ZATCA custody/lifecycle metadata model instead of expanding raw body fields.
- Add lifecycle states such as `NOT_CONFIGURED`, `CSR_PENDING`, `OTP_REQUIRED`, `COMPLIANCE_CSID_ACTIVE`, `PRODUCTION_CSID_PENDING`, `PRODUCTION_CSID_ACTIVE`, `ROTATION_REQUIRED`, `REVOKED`, `DISABLED`, and `ERROR`.
- Add environment-specific uniqueness constraints for organization, EGS, environment, and active credential state.
- Add certificate metadata fields: serial, issuer, subject, thumbprint/fingerprint, issuedAt, expiresAt, renewalDueAt, revokedAt, revokedById.
- Add provider metadata: custodyProvider, providerReferenceRedacted, providerReferenceHash, providerRegionRedacted, keyAliasRedacted, accessPolicyVersion, approvalId, auditEventId.
- Preserve `ZatcaComplianceCsidCustodyRecord` as metadata-only or evolve it into separate compliance and production lifecycle records.
- Quarantine legacy PEM-capable fields by preventing future real-material writes and adding migration notes before any real sandbox use.
- Backfill existing local/dev values only as unsafe presence booleans or `LEGACY_LOCAL_BODY_PRESENT_REQUIRES_REVIEW`, not by copying bodies.

## Required API And Service Boundaries

Design only, not executed:

- `ZatcaCredentialCustodyProvider` interface with disabled runtime implementation by default.
- Separate provider methods for sandbox compliance token/secret/certificate references and production signing operations.
- No method returns raw secret/certificate/private-key bodies to services above the custody boundary.
- Read-only custody readiness endpoint that returns booleans, blockers, and redacted references only.
- Metadata-only lifecycle endpoints for state, approvals, revocation, rotation due, and audit references.
- Ephemeral OTP submission path only in a later approved sandbox lane; it must validate format, never persist, never echo, and expire immediately after request attempt.
- CSID request execution service must require environment `SANDBOX`, custody readiness, approved CSR review, exact approval phrase, no production credentials, no body logging, idempotency key, and redacted evidence capture.
- Production CSID request service remains absent/blocked until sandbox evidence and specialist review exist.
- Signing service must be separate from CSID onboarding and must depend on approved custody/signing boundary.
- Clearance/reporting service must be separate from signing and must use signed artifact metadata only after signed artifact storage is approved.

## Required UI And Admin Boundaries

Design only, not executed:

- Continue showing preparation-only warnings.
- Show lifecycle state, environment, expiry, rotation due, revocation state, provider type, redacted reference, and blocker list.
- Do not show or download OTP, CSR bodies, private keys, certificate bodies, CSID tokens/secrets, signed XML bodies, QR payload bodies, auth headers, or request/response bodies.
- Require privileged roles and explicit confirmation for any future approval or revocation action.
- Separate sandbox controls from production controls.
- Production controls should remain disabled with visible blockers until production gate artifacts exist.
- UI copy must continue to avoid production compliance claims.

## Test Strategy

Safe tests to plan for the implementation lane:

- Unit tests for lifecycle state transitions and invalid transitions.
- Unit tests for redaction and unsafe key/value rejection.
- DTO validation tests for OTP, lifecycle actions, custody metadata, and approval requests.
- Provider contract tests with fake secrets-manager/KMS/HSM clients only.
- No-network adapter contract tests proving no HTTP, DB writes, env value output, body output, signing, clearance/reporting, or PDF/A-3.
- API tests for metadata-only responses and tenant/org scoping.
- UI tests confirming blocked state, no secret display, and production-claim safety.
- Static scans over staged diffs for forbidden body markers.

Tests not appropriate for the next foundation lane:

- Real ZATCA network calls.
- Real OTP or CSID request tests.
- Real provider/KMS/HSM calls.
- Full E2E or smoke.
- Browser login/audit-writing flows.
- PDF/export/download generation.
- Production checks.

## Migration Strategy

Design only, not executed:

1. Draft schema migration for metadata-only lifecycle/custody tables.
2. Run Prisma/schema static checks and local test generation only after explicit implementation approval.
3. Do not run migrations against hosted/shared/live data.
4. Add a dry-run migration review doc before any execution.
5. Treat existing legacy PEM fields as local/dev unsafe sources; do not copy bodies into new tables.
6. Backfill only metadata booleans, hashes/fingerprints where derived without exposing bodies, and review-required flags.
7. Keep rollback path documented before any DB mutation.

## Rollout Strategy

1. Implement metadata-only schema and service interfaces behind disabled defaults.
2. Add API readiness endpoints and fake provider contract tests.
3. Update settings UI to show lifecycle/custody status only.
4. Run targeted API/UI tests and no-network ZATCA guard tests.
5. Require security review before any fake provider becomes a real provider.
6. Require sandbox-only approval before OTP capture or CSID request execution.
7. Require separate specialist/legal/accounting/security review before production CSID, production signing, clearance/reporting, PDF/A-3, or production claims.

## Open Questions

- Which production custody provider will be accepted: cloud KMS/HSM, external signing service, or approved third-party e-invoicing provider?
- Is a secrets manager acceptable for sandbox compliance CSID token/secret/certificate bodies, or must sandbox also use KMS/HSM-style custody?
- Should production signing use remote signing only, or can app workers receive one-time signing handles without key body exposure?
- What is the official certificate expiry/renewal/revocation metadata shape to store after sandbox responses are safely received?
- What role/persona can approve OTP capture, custody provider activation, CSID requests, and revocation?
- What is the retention policy for metadata-only custody evidence, signed artifact metadata, and future signed XML bodies?
- What monitoring is required for certificate expiry, failed signing, rejected clearance/reporting, retry exhaustion, and suspicious custody access?
- Should LedgerByte build direct ZATCA integration or evaluate an approved third-party e-invoicing provider before production claims?

## Exact Approval Phrase For Next Lane

The exact approval phrase required before implementation begins is:

`I approve LedgerByte ZATCA key custody and CSID lifecycle foundation implementation: metadata-only schema/API/UI groundwork only; no real OTP, no real CSID, no real ZATCA network, no real private keys, no real secrets, no signing, no clearance/reporting, no PDF/A-3, no production credentials, and no production compliance claim.`

## Recommended Next Prompt

`LedgerByte implement ZATCA key custody and CSID lifecycle foundation`
