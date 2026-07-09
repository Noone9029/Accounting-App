# Public API v1 Readiness

LedgerByte public API v1 is readiness groundwork only. It does not enable public unauthenticated access, production API keys, OAuth clients, live provider calls, hosted mutations, money movement, ZATCA submission, or UAE compliance execution.

## Status Labels

- Disabled: default state. No public API product access is enabled.
- Internal Only: authenticated LedgerByte routes only; no external developer access is approved.
- Ready for Local Proof: safe local/test proof routes can exercise conventions.
- Needs Production Approval: production rollout requires rate-limit, auth, support, and operational approval.

## Versioning

- Base path: `/public-api/v1`
- Readiness route: `GET /public-api/v1/readiness`
- Proof pagination route: `GET /public-api/v1/pagination-proof`
- Proof idempotency route: `POST /public-api/v1/idempotency-proof`

All current v1 routes remain authenticated and admin-gated. They are not public unauthenticated endpoints.

## Pagination Standard

Selected public API v1 list responses should use this shape:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 0,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Default `pageSize` is 25. Maximum `pageSize` is 100.

## Error Standard

API errors use the existing safe error response pattern and include `requestId`. Production responses must not expose stack traces, authorization headers, cookies, JWTs, provider secrets, raw provider payloads, attachment bodies, PDFs, XML, or full private payloads.

## Idempotency

The current implementation proves idempotency for one safe route only:

- Header: `Idempotency-Key`
- Route: `POST /public-api/v1/idempotency-proof`
- Storage: hashed key, request hash, safe response summary, status code, requestId
- Not stored: raw idempotency key, raw authorization material, business payload body, provider payloads, or secrets

Reusing a key with the same payload replays the stored response. Reusing a key with a different payload is rejected.

## Rate Limit Readiness

Public API v1 is disabled by default. In production-like modes, enabling `LEDGERBYTE_PUBLIC_API_ENABLED=true` requires both:

- `LEDGERBYTE_PUBLIC_API_RATE_LIMIT_ENABLED=true`
- `LEDGERBYTE_PUBLIC_API_RATE_LIMIT_STRATEGY=<approved strategy name>`

This is a fail-closed readiness gate only. It does not install a production edge limiter by itself.

## API Keys And OAuth

API keys and OAuth are placeholders only:

- `LEDGERBYTE_PUBLIC_API_KEYS_ENABLED` must remain false in production-like modes.
- `LEDGERBYTE_PUBLIC_API_OAUTH_ENABLED` must remain false in production-like modes.
- No production API keys or OAuth clients are issued by this groundwork.
