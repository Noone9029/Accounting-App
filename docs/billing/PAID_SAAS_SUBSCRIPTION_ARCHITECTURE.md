# Paid SaaS Subscription Architecture

Status: architecture contract designed; no billing schema, provider call, collection, or enforcement is implemented by this document.

## Purpose

This contract defines LedgerByte's future commercial billing domain: an SME organization paying LedgerByte for a subscription. It is deliberately separate from accounting records belonging to that SME.

The locally safe target is a provider-neutral, tenant-safe foundation. It does not authorize production billing, live collection, tax treatment, legal terms, Stripe eligibility, ZATCA operations, or UAE operations.

## Current code audit and separation boundary

The existing `apps/api/src/payments/` module is **not** the SaaS subscription domain. It supports an organization creating a disabled/readiness-only Stripe payment link for its own finalized `SalesInvoice`; it uses `PaymentProviderConfig`, `InvoicePaymentLink`, and `PaymentProviderEvent` records. The associated routes are `/payments/provider-readiness`, `/payments/provider-events/stripe`, and `/sales-invoices/:id/payment-link`.

| Concern | Existing tenant-customer payment groundwork | New LedgerByte SaaS billing domain |
| --- | --- | --- |
| Payer | The tenant's customer | The tenant organization |
| Business purpose | Collect a tenant-issued sales invoice | Purchase access to LedgerByte |
| Accounting effect | May be associated with AR/payment workflows | Never creates a tenant invoice, payment, allocation, journal, VAT entry, ZATCA event, or UAE event |
| Provider configuration | Tenant payment-link readiness | LedgerByte merchant billing provider mapping |
| Authorization result | A customer payment workflow | Local subscription state plus entitlement decision |
| Reuse rule | Must remain independently safe | May reuse only generic low-level transport utilities after review; it must not reuse these models, routes, events, or service semantics |

Future SaaS billing code belongs in a dedicated billing domain and must use separate model names, audit event names, permissions, routes, and worker handlers. Subscription activity must never be posted automatically into a tenant ledger.

## Non-negotiable architecture

1. Entitlement keys are code-defined and validated against a closed registry.
2. Plans, immutable plan versions, prices, entitlement snapshots, subscriptions, and safe provider mappings are durable tenant-scoped data.
3. Provider IDs are mappings, never LedgerByte's domain identity or authorization source.
4. A subscription permanently references the plan version selected at activation. Benefit changes require a new version; activated versions cannot be edited.
5. Authorization is based on LedgerByte's durable normalized subscription state. Provider events update that state transactionally and idempotently; an unchecked provider payload never grants access.
6. Provider outages preserve the last verified active state according to policy; uncertain results do not grant new access.
7. Billing enforcement starts `DISABLED`. Missing billing records preserve controlled-beta access while it remains disabled.
8. A paid plan cannot bypass permission, tenant ownership, lifecycle, limit, operational-readiness, or country-compliance gates.

The final capability predicate is:

```text
permission
AND active organization ownership
AND entitlement
AND normalized subscription lifecycle state
AND bounded limit/usage result
AND operational-readiness state
AND country-compliance readiness
```

## Proposed durable domain

Exact Prisma names will follow current schema conventions in PAID-SAAS-02. The following responsibility boundaries are required.

| Concept | Required responsibility and integrity rule |
| --- | --- |
| `BillingPlan` | Stable plan key, internal description, display metadata, lifecycle status, public visibility, and sellability. A plan key is stable; it is not a provider product ID. |
| `BillingPlanVersion` | Monotonic immutable version per plan with effective/retired timestamps and a durable entitlement snapshot. Activated versions reject mutation. |
| `BillingPrice` | Price-to-plan-version mapping with interval, currency, amount in minor units, provider mapping, active state, and test/live classification. Provider product/price IDs are unique within provider and environment. |
| `PlanEntitlement` | Validated key/value snapshot attached to a plan version. Only registry keys and type-compatible values persist. |
| `OrganizationBillingAccount` | One provider-neutral billing account identity per organization/provider, provider customer mapping, safe billing-email metadata, lifecycle status, timestamps, and explicit enforcement exemption. |
| `OrganizationSubscription` | One durable active/current subscription record per organization/provider account with plan-version reference, normalized state, interval, trial/period/grace/cancellation timestamps, provider update timestamp, reconciliation timestamp, and optimistic version. |
| `SubscriptionScheduledChange` | Auditable requested target plan/version, effective date, reason, and status. Downgrades and interval reductions schedule at period end by default. |
| `BillingProviderCustomer` | Safe provider customer reference mapping. It must not contain provider payloads, payment-method data, or secrets. |
| `BillingCheckoutAttempt` | Server-created idempotency key, selected reviewed catalog price, safe return-route key, attempt state, and safe provider session reference. Changed-payload retries conflict. |
| `BillingWebhookEvent` | Provider event ID uniqueness, type, payload hash, object references, processing status, attempts, timestamps, and safe error code only. |
| `BillingInvoiceReference` | Bounded provider invoice metadata/reference for customer-facing status; not an accounting invoice or raw invoice payload. |
| `BillingLifecycleEvent` | Append-only local transition/audit evidence including prior/next normalized state, reason code, correlation ID, actor category, and bounded metadata. |

All organization-owned records require `organizationId` indexing and tenant-qualified reads. Unique constraints must prevent duplicate provider customer mappings, duplicate provider event IDs, duplicate active/current subscriptions, and duplicate provider price mappings. Transitions, checkout attempts, seat reservations, scheduled changes, and webhook processing require serializable transactions or an equivalent database locking/conditional-update strategy.

## Authorization and enforcement modes

| Mode | Required behavior |
| --- | --- |
| `DISABLED` (default) | Preserve controlled-beta behavior. No organization is blocked, checkout/provider execution is disabled, and missing billing state is compatible with existing access. |
| `OBSERVE` | Calculate decisions and record safe bounded telemetry. Return an observe-only result but do not block. |
| `ENFORCE` | Apply server-side billing/lifecycle/limit restrictions. This can only be enabled by a later reviewed hosted rollout; it is not enabled by a code merge. |

Every entitlement result must use one of `ALLOW`, `ALLOW_OBSERVE_ONLY`, `DENY_PLAN`, `DENY_LIMIT`, `DENY_BILLING_STATE`, `DENY_OPERATIONAL_READINESS`, `DENY_TENANT`, or `DENY_PERMISSION`. Safe metadata is limited to organization reference, entitlement key, decision, enforcement mode, normalized state, bounded limit/usage values, and correlation ID. It must exclude user identifiers, billing email, tax identifiers, provider payloads, and secrets.

## Tenant lifecycle and compatibility

Existing organizations are never backfilled, charged, or silently placed on trial. Explicit provisioning/activation is idempotent and records the selected plan version, optional trial, owner association, billing account, and audit event.

- In `DISABLED`, a missing billing account behaves as existing controlled beta.
- In `OBSERVE`, it records a non-blocking setup-required decision.
- In `ENFORCE`, it requires explicit subscription onboarding or a reviewed exemption.

Cancellation does not delete accounting data. Organization deletion, retention, and deletion/export obligations are a later legal-review workflow and are not subscription processing.

## Security, audit, and worker rules

- Do not persist card data, payment method secrets, provider API keys, webhook secrets, authorization headers, raw Checkout/webhook bodies, complete provider customer records, or unbounded invoice payloads.
- Use the existing audit-log and queue/outbox/worker boundary; do not create a second queue system.
- Webhook ingestion is public only when a provider adapter exists, uses bounded raw-body verification before parsing, and stores only hashed/normalized metadata after verification.
- Duplicates are idempotent; stale and out-of-order events cannot roll a subscription backward. Uncertain events grant nothing.
- Subscription lifecycle processing never mutates tenant accounting, ZATCA, UAE, email, attachment-upload, or document-finalization state as a side effect.

## Implementation map

| PR | Scope | Explicitly excluded |
| --- | --- | --- |
| PAID-SAAS-01 | This contract, catalog, state machine, provider decision | Runtime/schema/provider calls |
| PAID-SAAS-02 | Additive schema, migration, registry, synthetic catalog fixtures | Backfill, hosted migration, enforcement |
| PAID-SAAS-03 | Central entitlement service and disabled/observe/enforce decisions | Provider network and public billing |
| PAID-SAAS-04 | Transactional lifecycle, grace/read-only suspension, local jobs | Data deletion and accounting posting |
| PAID-SAAS-05 | Disabled/fake/disabled-Stripe provider boundary and webhook handling | Stripe network, credentials, test objects |
| PAID-SAAS-06 | Tenant billing APIs and accessible Arabic-compatible UI | Card form, production prices, provider execution |
| PAID-SAAS-07 | Disposable-local PostgreSQL fake-provider proof and status closure | Hosted mutation or live collection |

## Acceptance invariants for later implementation

1. No entitlement is granted before an explicit valid trial or verified local active state.
2. A paid plan does not unlock unavailable KSA or UAE compliance operations.
3. Suspension is read-only and billing-accessible; it never deletes data.
4. Every billing read/mutation is tenant-scoped and role/permission checked.
5. Every state mutation is idempotent, concurrency-safe, and audit logged.
6. No SaaS billing flow creates accounting records in the tenant's books.
