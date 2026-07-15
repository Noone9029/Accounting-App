# Fixed-asset depreciation policy

The MVP uses monthly straight-line depreciation only. The first schedule line is the first day of the calendar month after the in-service date. Each line is rounded to four decimal places and the final line uses the exact residual required to reach the salvage floor. No line may reduce carrying value below salvage.

Runs are idempotent by tenant and review key. Preview creates draft run evidence without posting. Review claims the run version; post claims every asset version and creates grouped expense/accumulated-depreciation journal lines. Reverse is available only for a posted run with no later depreciation movement and restores schedule and asset balances inside one serializable transaction.
