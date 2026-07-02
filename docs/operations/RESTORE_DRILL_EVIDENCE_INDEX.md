# Restore Drill Evidence Index

Status: evidence index
Date: 2026-07-02

| Evidence item | Scope | Status | Notes |
| --- | --- | --- | --- |
| `scripts/backup-restore-proof-harness.cjs` | Local/mock | Existing | Safe synthetic harness; does not prove hosted PITR. |
| `corepack pnpm backup:restore-proof` | Local/mock command | Available | Should be run before launch gates; output must be archived per run. |
| Hosted database PITR restore | Supabase/hosted DB | Blocked | Requires target project/credential/maintenance window and separate restored database. |
| Object storage restore | Future bucket | Blocked | Requires provider selection and test bucket. |
| Generated document archive restore | DB/object metadata | Partial | Needs hash/count comparison and legal retention review. |

## Evidence Capture Requirements

Every future restore drill record must include:

- date/time
- source environment
- restored target environment
- migration head
- row-count sample set
- checksum/hash sample set
- readiness/smoke command results
- RPO/RTO observed values
- operator
- explicit statement of no production data mutation

Do not record a drill as verified without command output and target environment identifiers.
