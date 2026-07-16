# Email provider setup boundary

SME-DOCUMENT-DELIVERY-03 remains local/mock-only. The deterministic mock provider covers supplier purchase orders, purchase debit notes, supplier-payment remittances, and supplier statements as well as the existing customer document templates. It does not contact SMTP, a relay, or any customer/supplier mailbox. Queue endpoints are safe to exercise in tests and local UI review because provider execution occurs only when the retry worker is invoked explicitly.

Production-like SMTP configuration is not enabled or proven by this implementation. A future provider rollout must separately establish secret handling, sender/domain verification, bounce and complaint webhooks, retry monitoring, suppression operations, attachment retention, and production smoke evidence. Do not place SMTP credentials, customer addresses, provider responses, or PDF bytes in source control, logs, `EmailOutbox` history responses, or screenshots.

For local development, use the repository's mock provider and the existing `EMAIL_FROM` fallback. Use disposable local PostgreSQL only for worker-race tests. Never point these tests at hosted databases or production credentials.

Supplier queue routes and UI history are therefore delivery orchestration evidence only: `QUEUED` and `SENT_MOCK` do not prove mailbox delivery. The supplier-statement race test must report one claim winner, one mock send, one verified attachment, one winning-token final update, and complete cleanup; when local PostgreSQL is unavailable, the fixture remains skipped and the production/provider boundary remains unclaimed.
