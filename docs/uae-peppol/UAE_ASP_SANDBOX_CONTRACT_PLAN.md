# UAE ASP Sandbox Contract Plan

Audit date: 2026-06-15

This plan defines what LedgerByte needs before coding a real provider adapter for a future accredited UAE ASP API. It is documentation/planning only. It does not approve network calls, credentials, production endpoints, FTA reporting, Peppol transmission, or real ASP submission.

## Architecture Boundary

LedgerByte remains:

- Bookkeeping/accounting SaaS.
- Data-capture and master-data readiness layer.
- Local UAE Peppol/PINT-AE readiness validator and official local serializer/rule-pack foundation.
- Compliance event and audit-trail system.
- Provider-neutral orchestration layer.

The future ASP must handle:

- Final Peppol/PINT-AE validation.
- Peppol network transmission and exchange.
- Buyer delivery.
- FTA reporting through the UAE model.
- Provider-side evidence, responses, and status events.

Accounting finalization remains separate from compliance delivery state. A finalized invoice or credit note can be ready for ASP submission without being submitted, accepted, reported, or delivered.

Current internal foundation before provider work:

- LedgerByte can generate local official PINT-AE-shaped XML with official `CustomizationID`, `ProfileID`, and endpoint scheme `0235`.
- LedgerByte has completed the source-backed official-code TODO review for commercial invoice type code `380`, predefined endpoint participant identifications, and transaction type flags.
- LedgerByte still does not have real ASP validation, real ASP submission, FTA reporting, Peppol transmission, provider credentials, or provider-specific payload contract evidence.
- Unknown future official values must not be guessed in provider branches.

## Safety Boundary

- Controlled beta/user-testing only.
- UAE Peppol/PINT-AE readiness only.
- No real ASP calls.
- No real ASP validation.
- No real ASP submission.
- No FTA reporting.
- No real Peppol transmission.
- No production Peppol claim.
- No FTA certified, Peppol certified, official UAE provider, or accredited ASP claim by LedgerByte.
- No ZATCA production behavior.
- No hosted/customer-data mutation.
- No Vercel/Supabase changes.
- No production infrastructure commands.

## Required Sandbox Artifacts

Request these artifacts from any provider before implementation:

| Artifact | Required detail | Acceptance bar |
| --- | --- | --- |
| API base URL | Sandbox base URL, production base URL, environment separation, IP allowlist needs | Sandbox URL must not be committed into executable provider code until implementation approval exists. |
| Auth method | API key, OAuth2, mTLS, HMAC, JWT, certificate, scope model, rotation | Secrets must be tenant-safe, revocable, and never returned in API responses. |
| Sandbox credentials | Test account, test tenant, test Peppol participant IDs, credential expiry | Credentials must be stored only after a separate approved secret-management plan. |
| Document submission endpoint | Invoice and credit-note submission contract | Must support idempotency and deterministic duplicate behavior. |
| Validation endpoint | Validation-only API before submission | Must return field-level PINT-AE/Peppol/provider errors. |
| Status endpoint | Polling endpoint and status lifecycle | Must map to LedgerByte provider-neutral states without changing accounting finalization. |
| Webhook docs | Event types, delivery retries, replay, payload shape | Must include submit, accepted, rejected, delivered, reported, inbound, and failure events where supported. |
| Webhook signing method | Signature header, algorithm, timestamp, replay window, secret rotation | Unsigned webhooks are not acceptable for production. |
| Error schema | Validation, transport, duplicate, auth, rate-limit, and FTA/Peppol errors | Must be machine-readable and safe to redact. |
| Sample invoice payload | Accepted and rejected examples | Must include B2B, B2G if relevant, VAT, zero-rated/export, and buyer-not-on-network examples. |
| Sample credit-note payload | Accepted and rejected examples | Must include original-document reference requirements. |
| Sample responses | Accepted, rejected, pending, validation failed, duplicate, unauthorized, rate limited | Must include stable codes and human-readable messages. |
| Evidence download method | Provider receipt, application response, XML, archive, delivery proof | Must separate metadata retrieval from body download. |
| Rate limits | Per tenant, per credential, per document, burst, retry-after | Must support safe backoff and support escalation. |
| Idempotency behavior | Header/key, duplicate windows, idempotent response model | LedgerByte must be able to retry without double submission. |
| Retry policy | Provider retry, customer retry, webhook retry, timeout guidance | Must avoid silent re-posting or double delivery. |
| Production go-live checklist | Provider acceptance criteria, certification steps, support contacts | Must include sandbox-to-production migration process. |

## Expected Provider Contract Terms

Any production contract should explicitly cover:

- Commercial API use permission.
- SaaS/ISV rights for LedgerByte serving multiple customers.
- Reseller or white-label rights if applicable.
- Data processing agreement.
- Data residency and hosting commitments.
- SLA and support terms.
- Incident response and breach-notification terms.
- API/schema/regulatory change-notice period.
- Pricing per tenant, legal entity, document, API call, support tier, and minimum commit.
- Sandbox-to-production migration process.
- Peppol participant onboarding responsibilities.
- Buyer onboarding and buyer delivery support.
- Archive/evidence retention responsibilities.
- Exit, data export, and provider migration rights.
- Audit-log availability and customer-support escalation path.

If pricing is not public, document it as: not public / requires sales quote.

## Provider Technical Contract Shape

LedgerByte should keep a provider-neutral adapter boundary and only implement provider-specific mappings behind it.

Minimum future adapter capabilities:

- `validateDocument`: provider validation-only flow, no accounting mutation.
- `submitDocument`: explicit user-approved submission after validation.
- `getSubmissionStatus`: polling/status refresh.
- `handleWebhook`: signed webhook verification and provider event normalization.
- `downloadEvidence`: metadata-first evidence listing and separately approved body retrieval.
- `listInboundDocuments`: inbound AP discovery if supported.
- `downloadInboundDocument`: separately gated inbound body retrieval.
- `getParticipantStatus`: Peppol participant lookup/onboarding status if supported.

Adapter outputs must never expose:

- API keys.
- Tokens.
- Auth headers.
- Private keys.
- Webhook secrets.
- Raw customer document body unless separately approved.
- Raw provider payloads unless separately approved.

## State Mapping Rules

Provider states must map into the existing compliance lifecycle without changing accounting finalization:

| Provider event | LedgerByte compliance meaning | Accounting impact |
| --- | --- | --- |
| Validation passed | Ready for ASP submission | None |
| Validation failed | Provider validation failed | None |
| Submission accepted for processing | Submitted to ASP | None |
| Submission rejected | Rejected by ASP | None |
| Reported to FTA | Compliance delivery milestone | None |
| Delivered to buyer | Compliance delivery milestone | None |
| Inbound invoice received | AP compliance intake candidate | None until AP workflow explicitly creates accounting document |
| Duplicate submit | Retry/idempotency event | None |
| Provider unavailable | Transport failure | None |

LedgerByte must not silently post, void, reverse, settle, allocate, or change VAT/report math based on provider status.

## Integration Acceptance Criteria Before Coding

Do not code a real adapter until all of these are true:

- Provider is confirmed on the current UAE MoF pre-approved/accredited path or has a documented authorized UAE ASP partnership.
- Provider confirms LedgerByte can integrate as a SaaS/ISV or commercial platform.
- Sandbox API docs are received and reviewed.
- Sandbox credentials are approved for secure storage outside the repo.
- Auth, webhook signing, idempotency, retries, rate limits, errors, evidence, and inbound behavior are documented.
- Commercial pricing is reviewed, or marked not public / requires sales quote with acceptable next step.
- Data residency, DPA, security certifications, incident response, and SLA terms are reviewed.
- Legal/accountant review confirms LedgerByte's wording remains readiness/orchestration only until production approval.
- Provider-specific tests can run with mocked fixtures and no network by default.
- A separate explicit approval exists for any real sandbox network call.
- A rollback and provider-disable plan exists.

## Sandbox Test Plan After Approval

When a provider-specific sandbox branch is approved later, the first implementation should still default to no-network tests:

1. Add provider fixture payload samples from approved docs.
2. Add adapter contract tests using fixture responses only.
3. Add redaction tests for auth, webhook, request, and response metadata.
4. Add disabled-by-default runtime guard tests.
5. Add signed webhook verification tests.
6. Add idempotency/retry mapping tests.
7. Add evidence metadata tests without body persistence.
8. Only after explicit approval, run one minimal sandbox validation request in a separate evidence branch.

## Production Go-Live Checklist

Production must remain blocked until:

- Provider contract is signed.
- Production credentials are provisioned through approved secret management.
- Webhook endpoint exposure is approved and protected.
- Customer data handling and retention policy are approved.
- Legal/accountant review approves public wording and user-facing claims.
- MoF/provider status is re-verified.
- Production incident/support plan exists.
- Provider disable/rollback switch is tested.
- Hosted beta behavior is tested without customer-data leakage.
- LedgerByte docs and UI still avoid FTA certified, Peppol certified, official UAE provider, and accredited ASP claims.

## Final Position

This plan authorizes research and contract-shape documentation only. It does not authorize a provider implementation, real ASP call, real ASP submission, FTA reporting, Peppol transmission, or production compliance claim.
