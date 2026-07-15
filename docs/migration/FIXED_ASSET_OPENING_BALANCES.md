# Fixed-asset opening balances

Opening balances are imported through the existing local CSV migration toolkit using `FIXED_ASSET_OPENING_BALANCES`. The template requires name, active category code, opening-balance account code, acquisition and in-service dates, cost, and useful life. Salvage, accumulated depreciation, and reason are optional fields with explicit defaults.

The API creates a tenant-scoped preview with row-level errors and resolved reference evidence. Commit requires reviewed confirmation, revalidates the same tenant references and normalized evidence inside a serializable transaction, then creates active fixed assets, posted opening-balance journals, source links, movements, and audit records. It does not upload to a provider or claim hosted-production migration proof.
