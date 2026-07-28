# ARC-07B-06G stage-aware preflight

Date: 2026-07-28
Status: **LOCAL STAGE MODEL AND CSR ORACLES PROVEN / NETWORK EXECUTION DISALLOWED**

## Scope

ARC-07B-06G replaces the circular onboarding gate that required a compliance certificate before requesting one. It is an internal, metadata-only, no-network preflight. It adds no controller, DTO, public HTTP API, Prisma migration, SDK invocation, credential resolution, or customer request path.

The command requires an explicit stage:

```text
corepack pnpm zatca:sandbox-execution-preflight -- --execution-stage COMPLIANCE_CSID_ONBOARDING --strict --no-network --json
```

Missing or unsupported stages, missing `--strict`, and missing `--no-network` are unsafe invocations and return exit code `2`. A valid static stage returns `0` even while dynamic execution gates are deliberately false. A static contract, custody, CSR, packet, or evidence failure returns `1`.

## Stage table

| Stage | Independent stage requirements |
| --- | --- |
| `COMPLIANCE_CSID_ONBOARDING` | LedgerByte local CSR proof, official SDK CSR oracle, confirmed secure OTP boundary, and compliance-certificate receive custody. An existing certificate is not required. |
| `COMPLIANCE_DOCUMENTS` | Present, valid, key-matched compliance credential. OTP is not required. |
| `SANDBOX_PRODUCTION_CSID` | Present, valid, key-matched compliance credential; complete six-document compliance matrix; and production-credential receive custody. An existing production credential is not required. |
| `CLEARANCE` | Present, valid, key-matched Simulation production credential. OTP is not required. |
| `REPORTING` | Present, valid, key-matched Simulation production credential. OTP is not required. |

`requestSequenceReady` contains static, stage-specific evidence only. `approvalPresent`, `otpAvailable`, and `networkEnabled` affect only `executionAllowed`.

## Target and custody binding

- The preflight consumes the structured schema-v2 contract validator result. It does not parse Markdown to establish endpoint or contract truth.
- An unset target uses the reviewed exact Simulation base. A supplied target must match it byte-for-byte.
- The reviewed production `/core` base, Developer Portal `/developer-portal` base, and every other substitution fail closed.
- The DPAPI provider retains its internal `SANDBOX` label. Metadata maps only the contract-validated `FATOORA_SIMULATION` identity to that label.
- A disposable synthetic Windows CurrentUser DPAPI proof covered token, secret, and certificate store, fixed-purpose constant-time comparison, revoke, delete, and cleanup. DPAPI and ACL subprocesses use canonical absolute System32 binaries, a scrubbed environment, bounded binary I/O, confirmed close after termination requests, and ciphertext/plaintext inequality. The proof records `networkIsolationProven: false`; it does not claim an OS-enforced network sandbox. No secret body or local path is retained.

## Current onboarding result

| Check | Result |
| --- | --- |
| `officialContractComplete` / `sandboxTargetVerified` | `true` / `true` |
| `credentialProviderReady` / `signingKeyReady` | `true` / `true` |
| `certificateReceiveCustodyReady` | `true` |
| `complianceCertificatePresent` | `false` — expected before onboarding |
| `csrLocalProofReady` / `csrTier2SdkReady` / `csrReady` | `true` / `true` / `true` |
| `secureOtpInputReady` / `otpAvailable` | `true` / `false` |
| `approvalPresent` / `networkEnabled` / `networkCallsMade` | `false` / `false` / `false` |
| `requestSequenceReady` / `executionAllowed` | `true` / `false` |

The ARC-07B-06H official SDK Simulation CSR oracle passed locally. The SDK generated its own synthetic Simulation key and CSR; LedgerByte independently inspected that artifact and moved the SDK-generated key through disposable DPAPI custody. The SDK did not validate the separate 06C LedgerByte CSR, and no equality between the 06C and 06H CSR/key pairs is claimed.

The 06H proof is accepted only with exact SDK JAR/configuration and five-component JDK checksum pins, live read-only handle leases, Windows-token-SID ACLs, a self-tested canonical-workspace write/delete boundary, plaintext-key removal before custody re-derivation, abort-on-lease-loss, confirmed child/helper termination escalation, and complete expected-artifact cleanup. An unconfirmed process termination or an unexpected preserved workspace entry cannot produce `csrTier2SdkReady: true`.

Static onboarding readiness is now complete without requiring a compliance certificate to exist before it can be requested. A fresh human-controlled OTP, standalone owner approval, and network enablement remain dynamic blockers, so `executionAllowed` remains false.

## Non-claims

No OTP was requested or accepted. No ZATCA hostname was contacted. No CSID, compliance document, production credential, clearance, or reporting operation was attempted. No credential or certificate was supplied to, inspected by, requested by, or received by the 06G lane. No hosted resource or persistent issuance state was mutated. This is not ZATCA approval, sandbox onboarding, production certificate trust, KMS/HSM custody, or a production-compliance claim.
