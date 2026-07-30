# Billing Provider Decision and Stripe Readiness Boundary

Status: provider-neutral architecture selected. No merchant eligibility, provider account, credential, Stripe SDK integration, provider request, test object, payment collection, or live mode is approved.

## Decision

LedgerByte will build a dedicated SaaS billing-provider boundary. The default provider is `DisabledBillingProvider`. A deterministic `FakeBillingProvider` will support local proof. A `StripeBillingProvider` may be added only as a network-disabled adapter; it cannot become an authorization boundary and must remain `IMPLEMENTED_DISABLED / PROVIDER_ELIGIBILITY_PENDING` until eligibility and test-mode gates are satisfied.

The existing tenant customer-payment/payment-link groundwork is not this boundary and must not be reused as a subscription implementation.

## Required provider interface

The domain-facing contract will expose only provider-neutral methods:

```text
createCheckoutSession
createCustomerPortalSession
retrieveSubscription
cancelAtPeriodEnd
reactivateSubscription
schedulePlanChange
listInvoiceMetadata
verifyWebhook
normalizeWebhookEvent
reconcileSubscription
```

Provider adapters receive only server-selected billing account, approved catalog mapping, server idempotency key, safe metadata references, and allowlisted return-route key. They do not accept a client-provided provider customer ID, price ID, organization ID, arbitrary return URL, raw persisted event body, or secret.

## Adapter rules

| Adapter | Required state | Network behavior | Purpose |
| --- | --- | --- | --- |
| `DisabledBillingProvider` | default | no calls | Returns deterministic disabled/blocked result; preserves controlled beta in disabled enforcement mode |
| `FakeBillingProvider` | local-only | no external calls | Deterministic synthetic checkout, portal, subscription, invoice metadata, event ordering, failure, and recovery proof |
| `StripeBillingProvider` | optional later implementation | disabled by default | Prepared Stripe Billing, Checkout, Customer Portal, reconciliation, and signature-verification boundary; no test/live request before explicit approval |

The Stripe design must use Stripe Billing subscriptions, Checkout Sessions in subscription mode, Stripe Prices rather than deprecated Plan objects, and Customer Portal sessions. It must not use manual PaymentIntent renewal loops, Stripe Connect, marketplace behavior, LedgerByte card handling, or automatic Stripe Tax before legal/tax approval.

## Stripe source and eligibility gate

Before any Stripe package is added or updated, the implementing PR must re-verify the current official Stripe Billing, Checkout, Customer Portal, webhook-signing, SDK, and API-version documentation from Stripe's official documentation. It must record the selected SDK/API versions and direct official sources in the implementation evidence.

Merchant eligibility is currently **unconfirmed**. It requires an explicit LedgerByte merchant legal entity, operating country/jurisdiction, provider-account eligibility, commercial terms, tax/invoice treatment, and owner decision. Eligibility must never be inferred from a user's residence. This blocker does not prevent the provider-neutral and fake-provider local work.

## Webhook boundary

If a Stripe adapter is implemented, the webhook endpoint is public and has no ordinary session authentication. It must:

1. Require the expected content type and bounded raw body before parsing.
2. Verify Stripe signature before normalization or persistence.
3. Persist only a unique provider event ID, safe type, payload hash, normalized object references, processing status/attempts/timestamps, and safe error code.
4. Never log or persist raw body, signature, webhook secret, authorization data, customer payload, payment data, or unbounded invoice body.
5. Process duplicate, stale, and out-of-order events idempotently through the existing queue/outbox/worker architecture.
6. Reconcile canonical subscription state where an event alone is insufficient. An unchecked event payload never grants entitlements.
7. Use durable ingestion, deterministic local processor/runner, and an operator-review/dead-letter state through the existing worker boundary; it must not create a second queue system.

Required modeled event families are checkout completion, subscription create/update/delete, invoice paid/payment failure/payment action required, and trial-ending notice. Their exact provider event names and versions must be confirmed against the official Stripe documentation when the disabled adapter is implemented.

## Checkout and portal policy

Checkout and portal preparation use organization-derived customer mappings, reviewed active catalog prices, server-generated idempotency, and fixed allowlisted LedgerByte return routes. LedgerByte must not build a card form. In local phases, provider preparation may return disabled/fake results only; it may not contact Stripe or expose production prices.

## Legal, tax, and operational blockers

The following remain external decisions and are not satisfied by this ARC: approved merchant entity; provider account/eligibility; real price catalog; terms; privacy policy; cancellation/refund policy; tax treatment; support process; production email; monitoring/alerting; hosted backup/restore proof; production worker platform; secret custody; and paid-launch go/no-go.

## Future test-mode gate

No Stripe request is permitted during PAID-SAAS-01 through PAID-SAAS-07. The later standalone owner phrase `APPROVE LEDGERBYTE STRIPE TEST-MODE BILLING EXECUTION` is required before any bounded synthetic Stripe test operation. Before that action, PAID-SAAS-07 must prepare `docs/billing/STRIPE_TEST_MODE_EXECUTION_PACKET.md` with the main SHA, selected SDK/API versions, eligibility status, test-mode confirmation, synthetic object plan/counts, cleanup, test-clock and webhook plan, return-route allowlist, evidence paths, stop conditions, and no-live-mode proof.

Production billing remains outside this ARC and requires its separate explicit activation gate.
