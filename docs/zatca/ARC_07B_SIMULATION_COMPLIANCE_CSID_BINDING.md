# ARC-07B-07A Simulation compliance-CSID execution binding

Status: **READY FOR FRESH ONE-SHOT OWNER APPROVAL / NO EXECUTION**

This change adds one local operator boundary for a future, synthetic-only FATOORA Simulation compliance-CSID onboarding request. It is not a ZATCA onboarding result and cannot be reached through the NestJS runtime, a customer API, Prisma, or the deprecated sandbox adapter.

## Bound sequence

The dedicated CLI verifies clean `origin/main`, the checksum-pinned contract and execution packet, the `COMPLIANCE_CSID_ONBOARDING` stage, synthetic identity metadata, local DPAPI custody, and the exact Simulation target. It then atomically consumes an external one-shot approval record, reruns non-secret preflight, reads a six-digit OTP only through the existing hidden TTY boundary, sends one HTTPS request at most, parses one bounded response, and stores credential material only through sandbox DPAPI custody.

The external approval record is not created by this implementation. A later record must carry the exact phrase, main SHA, contract SHA, packet SHA, stage, synthetic identity references, a one-request budget, and a fresh expiry. Only its SHA-256 may be returned as metadata. Any ambiguous transport result returns `UNCERTAIN_REQUIRES_FRESH_APPROVAL`; there is no automatic retry.

## Local proof

The test matrix has 26 required cases: accepted credential, definitive error outcomes, timeout/reset/redirect/content-type boundaries, malformed and duplicate JSON, oversized and missing credential fields, certificate-key mismatch, atomic custody rollback, approval expiry/replay/hash drift, production target substitution, proxy configuration, and a second request attempt.

The accepted path uses a literal `127.0.0.1` fake server with synthetic inputs. Test-only dependency injection maps the reviewed request to the literal loopback client while preserving the production transport's exact-host, DNS, TLS, no-proxy, no-redirect, bounded-body, and single-attempt guards. The proof records zero external DNS lookups, zero external sockets, zero ZATCA calls, no OTP read, no credential body retention, no Prisma mutation, and successful cleanup.

## Explicit non-claims

- No real ZATCA hostname, API, portal, OTP, CSID, compliance document, production-CSID, clearance, or reporting request occurred.
- No credential, certificate, token, secret, CSR body, request body, or response body is committed or retained as evidence.
- The normal runtime adapter remains disabled; this is CLI-only and Simulation-only.
- This does not claim sandbox onboarding, ZATCA approval, production certificate trust, KMS/HSM custody, production compliance, or customer-data handling.

The next possible action is a later, standalone owner approval bound to the merged revision and current hashes. This phase must not reuse any earlier approval.
