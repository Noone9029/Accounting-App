# Stripe test-mode execution packet

Status: **NOT APPROVED / NOT EXECUTED**

This packet prepares a future test-mode exercise. It does not authorize a
Stripe request, account action, Checkout page, Customer Portal session, test
clock, webhook endpoint, product, price, customer, or payment.

## Baseline

- Exact `origin/main` baseline when this packet was prepared:
  `f3245a3631ec65a10cf7019c15919beff45aa1ff`.
- LedgerByte billing provider default: `DISABLED`.
- Live collection: `false`.
- Production billing: `false`.
- Merchant eligibility: `PENDING_OWNER_EVIDENCE`.

## Official-source review (2026-07-30)

- Stripe’s [subscription guide](https://docs.stripe.com/billing/subscriptions/build-subscriptions?api-integration=checkout&payment-ui=elements)
  describes Checkout Sessions with `mode=subscription` and Price IDs.
- Stripe’s [Customer Portal guide](https://docs.stripe.com/customer-management/integrate-customer-portal)
  describes on-demand portal sessions and webhook-driven subscription updates.
- Stripe’s [webhook guidance](https://docs.stripe.com/webhooks?lang=node) requires
  verifying the untouched raw body before parsing.
- Stripe’s [SDK/version policy](https://docs.stripe.com/sdks/versioning?lang=node)
  and [Node SDK releases](https://github.com/stripe/stripe-node/releases) must
  be re-verified immediately before any execution. The current local adapter
  intentionally installs no Stripe SDK and pins no API version because the
  official pages showed version information from different publication points.
- Stripe’s [global availability](https://stripe.com/global) is not evidence that
  LedgerByte’s legal entity is eligible. Owner-supplied legal entity, supported
  country/region, account, tax, and banking evidence remain required.

## Future execution inventory and limits

- Synthetic plan keys only: `STARTER`, `GROWTH`; no public catalog wording or
  real prices.
- Maximum objects until a new owner packet narrows the scope: two synthetic
  customers, two Products, four Prices, two Checkout Sessions, two portal
  sessions, one test clock, and eight webhook deliveries.
- Return URL allowlist: LedgerByte-controlled test routes only, represented by
  server-side route keys rather than caller-provided URLs.
- Webhook endpoint: explicit test-only public endpoint, secret held outside
  source control and never pasted into chat or logs.
- Evidence: bounded IDs/hashes and redacted test output only; never raw webhook
  bodies, secrets, cards, payment methods, or provider customer payloads.

## Required preflight before any test-mode action

1. Receive the exact standalone owner approval phrase:
   `APPROVE LEDGERBYTE STRIPE TEST-MODE BILLING EXECUTION`.
2. Re-fetch main and verify this packet’s baseline or update it through review.
3. Verify a Stripe **test** key, no live key, and a synthetic-only account scope.
4. Confirm merchant-entity eligibility from Stripe and the LedgerByte owner.
5. Choose and record one supported Node SDK and API version from then-current
   official sources.
6. Confirm secret custody, public endpoint identity, return-route allowlist,
   bounded request count, test-clock plan, cleanup/archive plan, and stop
   conditions.
7. Keep `liveCollectionEnabled=false` and `productionBillingEnabled=false`.

## Stop conditions

Stop without a provider call if merchant eligibility, test-mode identity,
secret custody, public endpoint control, synthetic-data scope, or explicit
approval is missing. Stop immediately on any live key, production account,
unknown provider object, unsafe redirect, raw-body logging, signature failure,
or evidence that could affect a customer or tenant accounting record.

## Cleanup and archive plan

Archive only bounded identifiers and safe outcomes. After owner-approved test
execution, cancel/archive the synthetic subscriptions and test clock according
to the approved plan; do not delete required audit evidence and do not touch
customer or production records.
