# Stripe test-mode execution packet

Status: **BLOCKED BEFORE PROVIDER EXECUTION**

The standalone authorization `APPROVE LEDGERBYTE STRIPE TEST-MODE BILLING
EXECUTION` was received on 2026-08-09. It authorizes only the bounded,
synthetic, Stripe **test-mode** exercise described here. It does not satisfy
merchant eligibility, secret custody, test-account identity, or public
endpoint-control requirements. No Stripe request has been made.

## Verified baseline and hard boundaries

- `origin/main` at preflight: `3266b977534359ab0743972cb56ec54524a4ebdf`.
- LedgerByte subscription provider implementation: architecture-only Stripe
  adapter; all provider methods remain disabled and make no network calls.
- LedgerByte default billing provider: `DISABLED`.
- `liveCollectionEnabled`: `false`.
- `productionBillingEnabled`: `false`.
- Provider requests, objects, Checkout pages, portal sessions, test clocks, and
  webhook deliveries performed by this ARC: `0`.
- Tenant accounting, ZATCA, UAE, database, deployment, and hosted-configuration
  mutations performed by this ARC: `0`.

## Official-source review (2026-08-09)

The implementation candidate is **not installed** while the gates below remain
open. If all gates pass in a later reviewed revision, the candidate selection is
the current stable `stripe` Node SDK `22.4.0`, paired with the current stable
Stripe API version `2026-07-29.dahlia`.

- Stripe's [Node SDK releases](https://github.com/stripe/stripe-node/releases)
  identified `v22.4.0` as the latest stable release at review time, with API
  version `2026-07-29.dahlia`.
- Stripe's [API versioning guidance](https://docs.stripe.com/api/versioning)
  identifies `2026-07-29.dahlia` as the current version and explains that an
  endpoint's API version must be selected deliberately.
- Stripe's [subscription Checkout guide](https://docs.stripe.com/payments/subscriptions)
  requires a recurring Price and `mode=subscription`.
- Stripe's [Customer Portal guide](https://docs.stripe.com/customer-management/integrate-customer-portal)
  requires an authenticated server-side portal-session creation with a customer
  and controlled return URL.
- Stripe's [webhook guidance](https://docs.stripe.com/webhooks?lang=node)
  requires verification against the untouched raw body and endpoint-specific
  signing secret before parsing.
- Stripe's [test-clock guide](https://docs.stripe.com/billing/testing/test-clocks/api-advanced-usage?dashboard-or-api=api&locale=en-GB)
  permits deterministic subscription lifecycle tests in a sandbox only.

## Bounded future test inventory

Only after every preflight check passes, this exercise may use synthetic
`STARTER` and `GROWTH` plan keys, with these maximums: two synthetic customers,
two Products, four recurring Prices, two Checkout Sessions, two portal sessions,
one test clock, and eight webhook deliveries. Return URLs remain server-derived
`billing` or `plans` routes; callers never provide URLs.

Cleanup must cancel/archive synthetic subscriptions and remove the test clock
after evidence is recorded. Evidence may contain bounded provider identifiers,
hashes, and safe outcomes only. It must never contain a secret, raw webhook
body, card/payment-method data, customer payload, or redirect URL token.

## Preflight result

| Required condition | Result | Evidence / consequence |
| --- | --- | --- |
| Standalone owner authorization | Pass | Received 2026-08-09. |
| Current-main packet baseline | Pass | This packet is based on `3266b977534359ab0743972cb56ec54524a4ebdf`. |
| Stripe test-account identity | Blocked | No credential was available to perform an account read; test mode cannot be established. |
| No live key | Blocked | No Stripe key is loaded in the process, user, or machine environment; that absence does not prove an external vault contains no live key. A secure mechanism must positively reject `sk_live_` before use. |
| Synthetic-only scope | Planned, not proven | Limits and keys are bounded above; no provider account was available to inspect or create synthetic objects. |
| Merchant legal-entity/provider eligibility | Blocked | Still `PENDING_OWNER_EVIDENCE`; Stripe availability is not merchant eligibility. |
| Secret custody | Blocked | No approved private test-key/webhook-secret mechanism is configured in this worktree, this process, or repository Actions secret metadata. |
| Public test endpoint identity and control | Blocked | Documented test API health and readiness checks returned HTTP 500 on 2026-08-09; endpoint configuration and signing-secret control were not established. |
| Production billing disabled | Code-level pass | The committed adapter remains non-networking and reports disabled checkout, portal, and webhook ingress. Hosted state is not asserted while its readiness endpoint fails. |
| SDK/API reviewed | Pass, installation deferred | Stable candidates and direct official sources are recorded above. |

The bounded preflight evidence is recorded in
`docs/billing/evidence/stripe-test-mode-preflight-2026-08-09.json`.

## Stop conditions

Stop without a provider call if merchant eligibility, test-mode identity, secret
custody, public-endpoint control, synthetic-only scope, or owner authorization
is absent. Stop immediately if a credential starts with `sk_live_`, an account
or object is not demonstrably test-only, a redirect is outside the allowlist,
signature verification fails, raw data would be logged/persisted, or any action
could affect a tenant accounting record.

## Required owner-provided inputs before resuming provider execution

1. LedgerByte legal entity, operating jurisdiction, Stripe account identity,
   and confirmation of Stripe merchant eligibility for the proposed test scope.
2. A private, test-only credential mechanism that exposes a restricted
   `sk_test_` key and matching `whsec_` only to the execution process, never to
   source control, chat, or logs; it must reject any `sk_live_` key.
3. The LedgerByte-controlled public **test** API deployment identity, its
   healthy readiness proof, and confirmation that `/billing/webhooks/stripe`
   is mapped to the matching test webhook secret.
4. The approved synthetic Product/Price creation or reuse plan, including
   confirmation that it is isolated from live catalog and customer data.

Until these are supplied and independently verified, the correct status remains
**BLOCKED BEFORE PROVIDER EXECUTION** rather than a Stripe test-mode proof.
