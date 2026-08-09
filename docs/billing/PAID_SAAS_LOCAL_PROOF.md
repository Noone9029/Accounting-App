# Paid SaaS local lifecycle proof

Status: **PAID-SAAS ARC: MERGED / PROVEN LOCAL**

This is a bounded, synthetic-only proof of the LedgerByte subscription
foundation. It runs five end-to-end proof flows against a fresh disposable
PostgreSQL 16 container on loopback, uses `FakeBillingProvider`, and removes
the proof data and container in `finally`. It is not a Stripe, hosted,
production, legal, tax, ZATCA, or UAE compliance proof.

## Command

```powershell
corepack pnpm paid-saas:local-proof -- --strict --json
```

The command refuses an ambient non-disabled billing provider or enforcement
mode, Stripe credentials, public catalog mode, or sellable compliance plans.
Its proof child process alone uses `FAKE` and `ENFORCE`; committed runtime
defaults remain `DISABLED`.

## Proven local contracts

- Controlled-beta remains accessible with no billing record in disabled mode.
- Explicit trial transition is durable, replay-safe, and rejects changed
  correlation reuse.
- Synthetic fake checkout reservation is tenant-scoped and unique under a
  concurrent race; the proof fixture, rather than a client, owns its provider
  references, price mapping, and return-route key.
- Signed fake webhook metadata is normalized without retaining raw payloads;
  duplicate, changed-payload, stale, and out-of-order delivery are safe.
- Synthetic monthly activation, scheduled Growth change, payment-failure grace,
  grace-expiry read-only suspension, entitlement decisions, and cross-tenant
  denials are exercised against the real schema.
- Billing rows are cleaned before container teardown; no tenant journal,
  payment, invoice, VAT, ZATCA, or UAE record is created.

## Explicit non-claims

- No Stripe request, DNS resolution, SDK, key, webhook secret, object, session,
  customer, subscription, price, payment method, or charge is used.
- No external network, hosted database, Vercel, Supabase, AWS, email, DNS, or
  secret mutation occurs.
- Public prices, live collection, production billing, production enforcement,
  compliance-plan sellability, ZATCA execution, and UAE operations remain off.
- The focused component tests cover the billing and plans states, including an
  RTL container. Browser E2E is not claimed: this proof does not start a
  browser or a hosted/local web-server fixture.

The clean-main proof ran at merge commit
`08d63565cc8ef72f89102c0fed6f1fa2e9cfac7d` and emitted
`MERGED_PROVEN_LOCAL`.
