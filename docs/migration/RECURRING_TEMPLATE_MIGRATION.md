# Recurring Template Migration

The database change is additive. It creates generalized tenant-scoped template, normalized line, run, and expense-proposal records; it does not drop the legacy recurring-invoice tables or rewrite generated documents.

The legacy recurring-invoice backfill maps deterministically valid records to `SALES_INVOICE`, preserves schedule fields and identifiers where safe, records migration provenance, and fails on unmappable accounting references. Legacy routes remain served by a compatibility adapter. Historical invoice/run evidence is preserved rather than fabricated.

CSV migration-toolkit support covers recurring sales, purchase, expense-proposal, and balanced journal templates. Each row receives preview errors for duplicate names, invalid schedules/timezones, missing tenant references, dimensions, currency, and FX evidence. A commit requires explicit reviewed commit confirmation, claims the job once, and performs authoritative revalidation in the same serializable transaction as draft creation.

The importer never activates imported templates. It creates one draft template per row; journal rows carry primary and counter accounts so the normal balance validation remains authoritative. Template and run exports are tenant-scoped, CSV-injection protected, and capped at 10,000 rows.

Deploy only after a logical backup attempt and remote-migration preflight prove that the expected recurring migrations are the only missing migrations. Hosted rollout is limited to the approved burner project and is not backup, PITR, restore, RPO, RTO, or production proof.
