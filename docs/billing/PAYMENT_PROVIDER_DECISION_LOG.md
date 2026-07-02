# Payment Provider Decision Log

Status: no provider selected
Date: 2026-07-02

| Provider | Status | Notes |
| --- | --- | --- |
| Stripe | candidate | Strong SaaS billing fit; requires tax, invoices, webhook, and secret management review. |
| Paddle/Lemon Squeezy/Merchant of record | candidate | Could reduce merchant/tax burden; commercial terms need review. |
| Manual invoices | candidate for early paid beta | Operationally simple but does not scale; requires clear collections process. |

## Decision Criteria

- UAE/Pakistan/business jurisdiction support.
- SaaS subscription support.
- Tax invoice/receipt support.
- Webhook security.
- Refund/cancellation workflow.
- Data processing/subprocessor review.
- Secret management and auditability.

No integration is approved in this PR.
