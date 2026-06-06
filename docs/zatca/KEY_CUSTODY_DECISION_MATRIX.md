# ZATCA Key Custody Decision Matrix

Date: 2026-06-06

This matrix compares private-key, certificate, and CSID custody options for LedgerByte. It is a design document only. No key was generated, no CSID was requested, no OTP was requested, no ZATCA network call was made, and no signing behavior was enabled.

## 2026-06-06 Sandbox CSID Preflight Update

`SANDBOX_CSID_PREFLIGHT_GUARD.md` and `SANDBOX_CSID_PREFLIGHT_RESULTS.md` now record the no-network sandbox CSID readiness preflight. The result is `PREFLIGHT_BLOCKED` because key custody and CSID response custody remain unapproved, the real sandbox adapter is disabled, OTP and CSID request approval are missing, and production signing remains disabled.

This reinforces the matrix recommendation: raw DB PEM and env-var custody are not production-acceptable; secrets manager is only a possible controlled non-production/sandbox interim; production private-key custody should move toward KMS/HSM/external signing or an equivalent non-exportable signing boundary.

## 2026-06-06 Sandbox OTP/CSID Approval Plan Update

`SANDBOX_OTP_CSID_APPROVAL_PLAN.md`, `SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`, and `SANDBOX_OTP_CSID_APPROVAL_RESULTS.md` now document planning-only approval phrase recognition. The observed status is `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`; this does not approve OTP capture, compliance CSID request execution, sandbox adapter execution, response body custody, signing, clearance/reporting, PDF-A3, or production compliance.

| Option | Appropriate environments | Allowed for production? | Private key exposure risk | Auditability | Rotation support | Operational complexity | Recommended status | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Raw DB PEM storage | None for production; legacy local/mock fields only until removed | No | Critical | Weak | Weak | Low implementation effort, high security cost | Rejected | Ordinary DB text fields can expose key bodies through DB access, backups, logs, debugging, and accidental API selection. Existing `ZatcaEgsUnit.privateKeyPem`, `complianceCsidPem`, and `productionCsidPem` must not be treated as production custody. |
| Encrypted DB storage | Possible controlled non-production experiments only after security approval | Not recommended | High to medium, depending on key management | Medium if envelope encryption and access logging are real | Medium | Medium | Blocked for production private keys | Encryption helps at rest but application code still handles decrypted bodies. It may be considered later for some certificate/token custody, not as the preferred production private-key signing boundary. |
| Environment variable storage | Local developer experiments or deployment wiring placeholders only | No | High | Weak | Weak | Low | Rejected for signing custody | Env vars are easy to leak through process inspection, crash reports, logs, shell history, deployment UIs, and broad operator access. They are not sufficient for production signing keys or CSID secrets. |
| Cloud secrets manager | Sandbox/non-production CSID token/secret/certificate custody after approval; possible interim for non-production | Not sufficient alone for production signing unless separately accepted by security/ZATCA review | Medium because app may retrieve secret bodies | Good if provider logs and access policy are configured | Good | Medium | Possible interim for non-production/sandbox | Useful for binary security token, CSID secret, and certificate body custody in sandbox if body access is tightly controlled. Production private-key signing should still prefer non-exportable signing custody. |
| KMS-backed signing | Sandbox and production signing once XML signing adapter is proven | Preferred if provider supports required signing behavior without private-key export | Low if key is non-exportable | Strong | Strong | Medium to high | Preferred production direction | Application stores key references and asks the custody provider to sign. Private key body does not enter ordinary app tables, logs, or API responses. |
| HSM or external signing service | High-assurance production, regulated signing operations, larger tenants | Yes, preferred where operationally feasible | Lowest if key is generated/held in HSM or equivalent service | Strong | Strong | High | Preferred high-assurance direction | Best fit for production signing custody when non-exportability, dual control, strong audit, and incident response are required. More operational work, but safer than body storage. |
| Local dummy SDK material only | Local no-network SDK validation and approved temp-only dummy experiments | No | Low for production only because it must never be production material; high confusion risk if mislabeled | Medium as metadata-only local evidence | Not applicable | Low | Test-only | SDK `Data/Certificates` files are dummy/test material. They may support local fixture processing evidence, but must never become tenant credentials, sandbox credentials, production credentials, or compliance proof. |

## Recommendation

LedgerByte should use KMS-backed signing, HSM, or an external signing service as the production direction. The application database should store only metadata: provider type, redacted reference, certificate serial/thumbprint, issue/expiry dates, environment, EGS linkage, status, approval metadata, and blocker evidence.

Secrets manager may be useful as an interim sandbox custody layer for compliance CSID token/secret/certificate material, but only after a separate approval gate, redaction tests, access policy review, and no-body evidence rules are implemented.

Raw DB PEM storage, environment-variable custody, and SDK dummy material are not production-acceptable. Existing legacy PEM-capable fields must remain local/mock only until replaced by a metadata/custody migration.

## Minimum Production Acceptance Criteria

- Production private key body is never stored in normal DB tables.
- Production private key body is never returned by API, UI, logs, telemetry, audit diffs, exports, docs, or evidence.
- Signing happens through KMS/HSM/external signing or an equivalent approved boundary.
- CSID token/secret/certificate bodies are handled only by approved custody.
- Certificate issue/expiry/renewal/revocation metadata is modeled.
- Dual-control or equivalent approval exists for production signing enablement, rotation, revocation, and incident disablement.
- Signed artifact storage, clearance/reporting, PDF-A3, retry/error queue, monitoring, legal/accounting/ZATCA specialist review, and production operations gates are complete.
