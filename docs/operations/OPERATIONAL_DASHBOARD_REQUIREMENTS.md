# Operational Dashboard Requirements

Status: requirements only
Date: 2026-07-02

## Dashboard Panels

| Panel | Required fields |
| --- | --- |
| API health | version, SHA, readiness status, database status, last check. |
| Web health | deployment SHA, route smoke status, login page status. |
| Database | migration head, connection mode, runtime role class, pool errors. |
| Email | queued, failed, retrying, suppressed, provider disabled/enabled. |
| Backup/restore | latest backup evidence, latest restore drill, evidence age. |
| Storage | provider, bucket configured, signed URL configured, proof status. |
| Compliance | ZATCA mode, UAE ASP provider mode, no-network status, blocked claims. |
| Jobs/queues | queue depth, failed jobs, oldest job age. |
| Support | open issues by severity, response age, incident links. |

## Data Safety

Dashboard data must use aggregated status and identifiers only. It must not expose secrets, private document bodies, customer invoice contents, or provider credentials.
