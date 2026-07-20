# ARC-07B fake sandbox lifecycle proof

## Scope

ARC-07B-05 exercises a test-only sandbox lifecycle over an ephemeral literal-loopback HTTP listener. It is not an official ZATCA endpoint, does not resolve a ZATCA hostname, and cannot use credentials, OTPs, XML, QR payloads, or raw provider responses.

## Transport boundary

The server binds only to `127.0.0.1` on an OS-selected port. The client permits only literal `http://127.0.0.1` targets and rejects external hosts, `localhost`, `::1`, non-loopback IP literals, and URLs containing userinfo. It uses a route allowlist, a POST-only server handler, bounded request/response sizes, JSON content-type checking, and `redirect: "error"`.

The test suite exercises fourteen transport outcomes: accepted, warning, business rejection, authentication rejection, rate-limit, server error, malformed, wrong-content-type, oversized, truncated, redirect, empty response, request timeout, and a connection reset after the request reached the listener. Unsafe or uncertain outcomes produce bounded safe codes and an `UNCERTAIN` transaction state; they never expose bodies.

## Transaction semantics

- Reservation, attempt creation, acceptance, rejection, uncertainty, and cleanup use the ARC-07B-04 Prisma state service.
- Exact replay returns the existing logical state only when all immutable submission fields match. A changed source identity payload, signed-artifact or canonical hash, UUID/type, operation, or credential/key/certificate identifier returns a safe conflict before transport.
- An explicit uncertain retry checks immutable artifact identity and reuses the existing state and ICV. It may transition to accepted, rejected, or remain uncertain. Concurrent exact retries are guarded by the test-only lifecycle singleton: one caller owns the loopback provider call and the other receives `RETRY_IN_PROGRESS`.
- Accepted states alone form the proof-local PIH chain. Existing `ZatcaEgsUnit.lastIcv` and `lastInvoiceHash` are never updated.
- Credential metadata preflight rejects expired, revoked, incomplete, mismatched, legacy-PEM-dependent, and production-looking references before reservation or HTTP.

## Disposable PostgreSQL proof

The opt-in integration suite ran against a freshly created loopback-only Docker PostgreSQL 16 container. All 110 migrations were applied. Its six cases proved serializable ICV allocation, concurrent exact replay, tenant-scoped state access, immutable retry identity reuse, accepted PIH progression, ordered concurrent retry ownership, and cleanup. The harness removed the container in `finally`; no synthetic rows remained.

## Verification boundary

Proxy environment variables were present during the loopback transport test; the literal-loopback client still reached only its `127.0.0.1` listener. The server reports zero external DNS lookups, non-loopback sockets, and followed redirects. This is a local fake-sandbox proof, not an authenticated sandbox test.

## Non-claims

This evidence does not claim official sandbox contract correctness, CSID onboarding, ZATCA acceptance, production certificate trust, custody readiness, production compliance, or any authenticated network execution.
