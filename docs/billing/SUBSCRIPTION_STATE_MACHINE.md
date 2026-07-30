# Subscription State Machine and Safe Access Policy

Status: normative local-domain contract. Lifecycle implementation, worker execution, and enforcement remain future PRs.

## Normalized states

| State | Meaning | Access mode when enforcement applies |
| --- | --- | --- |
| `PENDING` | Subscription setup/check-out intent exists but no verified trial or active entitlement state exists | `BILLING_ONLY` |
| `TRIALING` | Explicit trial is active until its recorded end | `FULL` for selected trial entitlements |
| `ACTIVE` | Verified local active subscription state | `FULL` |
| `GRACE` | Verified payment failure with an unexpired policy deadline | `FULL` or explicitly bounded mode defined by policy; v1 local policy uses full selected entitlements |
| `SUSPENDED` | Grace expired or verified terminal loss of service | `READ_ONLY` plus `BILLING_ONLY` routes |
| `CANCEL_AT_PERIOD_END` | Valid cancellation scheduled; paid/trial period has not ended | `FULL` until current period end |
| `CANCELED` | Period ended after cancellation or verified terminal cancellation | `READ_ONLY` plus `BILLING_ONLY` routes |

`FULL`, `READ_ONLY`, and `BILLING_ONLY` are access modes, not provider statuses. Provider statuses must be normalized at the provider boundary and never used directly as authorization decisions.

## Allowed transitions

| From | Event | To | Required evidence |
| --- | --- | --- | --- |
| none | explicit, idempotent trial activation | `TRIALING` | selected active plan version, allowed trial policy, organization ownership |
| `PENDING` | verified provider/local activation | `ACTIVE` | canonical normalized subscription state |
| `TRIALING` | verified paid activation | `ACTIVE` | canonical normalized subscription state |
| `TRIALING` | trial ends without valid activation | `SUSPENDED` or `CANCELED` according to explicit policy | current time and policy version |
| `ACTIVE` | verified payment failure | `GRACE` | policy-derived grace deadline |
| `GRACE` | verified successful recovery before deadline | `ACTIVE` | canonical normalized subscription state |
| `GRACE` | idempotent grace-expiry job after deadline | `SUSPENDED` | transactional deadline check |
| `ACTIVE` or `TRIALING` | cancellation request | `CANCEL_AT_PERIOD_END` | valid current period and policy |
| `CANCEL_AT_PERIOD_END` | reactivation before period end | `ACTIVE` or prior verified active state | provider/local canonical state |
| `CANCEL_AT_PERIOD_END` | period end | `CANCELED` | current period end and canonical state |
| `SUSPENDED` or `CANCELED` | verified new/reinstated subscription | `ACTIVE` | reconciled provider/local state and valid plan version |

All other transitions, including terminal contradictions and backwards state changes from stale events, are rejected and safely audit logged. Repeated valid commands return the established result rather than creating another transition.

## Ordering, idempotency, and outage rules

- A provider event carries provider creation/update ordering metadata and a unique provider event ID.
- Duplicate event IDs are ignored idempotently.
- Events older than the recorded provider update timestamp cannot roll state, plan, period, or cancellation fields backward.
- Out-of-order events trigger canonical reconciliation when required; unverified/uncertain provider results do not grant access.
- State and lifecycle-event persistence are transactional. Concurrent cancellation, reactivation, grace expiry, plan change, and webhook work must use an optimistic version/conditional update or serializable database transaction.
- Provider unavailability preserves the last verified local active/grace/cancel-at-period-end state until explicit reconciliation or policy expiry. It never creates a new paid entitlement.

## Default local policy contract

This is a configurable local-test policy, not an approved commercial, legal, tax, or refund policy.

| Policy | Local default behavior |
| --- | --- |
| Upgrade | Immediate after verified provider/local confirmation; provider proration only where a later provider adapter supports it |
| Downgrade | Schedule at period end |
| Monthly to annual | Explicit confirmed change; schedule or apply only under the provider policy |
| Annual to monthly | Schedule at period end |
| Cancellation | Period end by default |
| Reactivation | Valid only before final cancellation and after verified state |
| Payment failure | Enter `GRACE` with a configuration-supplied local test duration |
| Grace expiry | Enter `SUSPENDED` read-only mode |
| Data deletion | Never a subscription transition |

The grace duration must be injected/configured in local tests and recorded with the policy version; it must not be represented as settled commercial truth until owner/legal approval.

## Suspension and read-only policy

A suspended or canceled organization retains login, billing settings, status, support information, legitimate data access, read-only accounting records, and approved read-only export/request surfaces. It must retain safe cancellation/reactivation paths where valid.

It must not create or modify accounting transactions, finalize documents, generate recurring transactions, invite members, upload files, send emails, execute provider actions, perform ZATCA/UAE operations, or run mutating background jobs. The enforcement service must be server-side; hiding buttons is insufficient.

No suspension transition deletes accounting data, documents, audit logs, attachments, invoices, or subscriptions. Retention/deletion rules are a separate legal-review workflow.

## Required lifecycle proofs

Later PRs must prove duplicate/stale transition rejection; period-end cancellation access; grace-to-read-only suspension; retained billing/read access; valid reactivation; cross-tenant denial; no accounting side effects; and concurrency safety for lifecycle workers and plan changes.
