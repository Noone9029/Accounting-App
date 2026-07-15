# Fixed-asset capitalization policy

Capitalization is limited to manual reviewed acquisitions and exact purchase-bill-line evidence. A purchase bill must be finalized, its journal must be posted, and the selected line must match the posted journal by tenant-owned bill, account, and exact taxable base amount. The bill itself is never mutated.

Manual capitalization requires a reviewed fixed-asset draft, an open fiscal period, an active category, an active posting offset account, and a balanced acquisition journal. Duplicate source links are rejected. Opening balances use the migration toolkit’s preview/review/commit workflow and post one opening-balance journal with cost, accumulated depreciation, and offset lines.

No cash-expense capitalization, partial-line capitalization, silent category reclassification, or hosted-provider mutation is implied by this MVP.
