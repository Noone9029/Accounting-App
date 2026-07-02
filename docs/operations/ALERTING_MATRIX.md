# Alerting Matrix

Status: draft
Date: 2026-07-02

| Signal | Warning | Critical | Notes |
| --- | --- | --- | --- |
| API health | intermittent failures | sustained non-200 readiness | Include deployment SHA. |
| Web health | login route slow/failing | app shell unavailable | Preview first, production later. |
| database readiness | connection pool pressure | no DB connectivity | Avoid printing connection strings. |
| Redis/queue readiness | queue lag rising | queue unavailable | Only active once queues are deployed. |
| email outbox | retries increasing | failed email spike | No real email sending changes in this PR. |
| failed email rate | >5% rolling window | >20% or complaints | Requires provider evidence. |
| backup readiness | stale evidence | missing backup evidence | Hosted proof pending. |
| restore evidence age | older than target RTO review | no restore drill | Hosted restore pending. |
| storage readiness | config incomplete | private object access failure | Provider proof pending. |
| ZATCA status | sandbox blocked | live behavior enabled unexpectedly | ZATCA remains controlled/disabled unless approved. |
| UAE ASP status | provider disabled | network call attempted unexpectedly | Any real ASP call is a critical breach pre-access. |
| error logs | error burst | repeated 5xx/customer data risk | Correlate with deployment SHA. |
| support inbox | aging SEV-2 | SEV-1 unacknowledged | Manual process until tool selected. |
