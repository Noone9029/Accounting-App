# Fixed-asset GL reconciliation

The fixed-asset reconciliation report groups the register’s cost, accumulated depreciation, and carrying values by mapped account and compares those totals with posted journal-line balances. It also compares posted depreciation movement totals with depreciation schedule postings. Every row exposes register amount, GL amount, difference, and a reconciled flag.

Differences are review evidence, not a reason to silently adjust data. The accounting-close readiness check blocks a period when mappings are inactive, active assets lack schedules, depreciation remains unposted, runs are open or failed, or carrying value is below salvage.
