# Email provider setup boundary

This arc is local/mock-only. The default mock provider is deterministic and does not contact SMTP, a relay, or a customer mailbox. Queue endpoints are safe to exercise in tests and local UI review because provider execution occurs only when the retry worker is invoked explicitly.

Production-like SMTP configuration is not enabled or proven by this implementation. A future provider rollout must separately establish secret handling, sender/domain verification, bounce and complaint webhooks, retry monitoring, suppression operations, attachment retention, and production smoke evidence. Do not place SMTP credentials, customer addresses, provider responses, or PDF bytes in source control, logs, `EmailOutbox` history responses, or screenshots.

For local development, use the repository's mock provider and the existing `EMAIL_FROM` fallback. Use disposable local PostgreSQL only for worker-race tests. Never point these tests at hosted databases or production credentials.
