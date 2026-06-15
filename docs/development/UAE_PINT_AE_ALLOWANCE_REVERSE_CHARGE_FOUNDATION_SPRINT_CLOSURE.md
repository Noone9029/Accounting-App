# UAE PINT-AE Allowance And Reverse-Charge Foundation Sprint Closure

Date: 2026-06-16

## Scope

This sprint adds package-local UAE PINT-AE allowance/discount modeling and reverse-charge blocked-scenario proof in `@ledgerbyte/uae-peppol-pint-ae`.

It remains controlled beta/user-testing only. It is local UAE PINT-AE XML generation and validation only. It is not real ASP validation, not real ASP submission, not FTA reporting, not real Peppol transmission, not certification evidence, not legal compliance evidence, and not a production UAE compliance claim.

## What Changed

- Added document-level and line-level allowance input types.
- Added package-local document allowance XML using `cac:AllowanceCharge`, `cbc:ChargeIndicator=false`, reason text, allowance amount, optional base amount, tax category, tax rate, VAT tax scheme, and `cbc:AllowanceTotalAmount`.
- Added package-local line allowance XML using `cac:AllowanceCharge`, `cbc:ChargeIndicator=false`, reason text, allowance amount, and optional base amount.
- Added allowance validation for amount presence, non-negative amount, allowance-vs-base/subtotal limits, missing reason, unsupported reason code, line taxable amount calculations, document subtotal calculations, and payable total calculations.
- Added positive fixtures for document-level discount/allowance and line-level discount/allowance invoices.
- Added negative fixtures for allowance exceeds subtotal/base, negative allowance, missing allowance reason, unsupported allowance reason code, and reverse-charge blocked due official mapping.
- Updated local QA summary metadata so official-document blockers and provider-required-later blockers are separate.

## Package Only

Allowance/discount support is serializer-fixture-level only in the UAE package.

This sprint does not add API fields, UI controls, database migrations, invoice accounting behavior, credit-note accounting behavior, posting changes, finalization changes, VAT report changes, provider payload mappings, or provider submissions.

## Reverse Charge Status

Reverse-charge invoice XML remains blocked.

The package now accepts an explicit `reverseCharge` signal only to return `REVERSE_CHARGE_TRANSACTION_FLAG_OFFICIAL_MAPPING_REQUIRED` with source `official-doc-required`. It does not serialize guessed transaction flags, VAT category behavior, tax exemption reasons, or provider-specific payloads.

## Source Backing

- OpenPeppol PINT-AE v1.0.1 invoice syntax binding identifies document-level allowances as `cac:AllowanceCharge` with `cbc:ChargeIndicator=false`, reason/reason-code fields, amount/base amount, and document-level tax category/rate fields.
- The same syntax binding identifies invoice line allowances as line-level `cac:AllowanceCharge` with `cbc:ChargeIndicator=false`, reason/reason-code fields, amount, and base amount.
- OpenPeppol PINT-AE documentation references VAT reverse charge category `AE`, but this branch does not encode reverse-charge XML because the package does not yet have a complete source-backed reverse-charge transaction flag and VAT-category serialization contract.

## Still Blocked

- Provider-specific payload contract.
- Provider sandbox docs.
- Provider credentials.
- Non-confidential provider response evidence.
- Commercial/security terms.
- Source-backed allowance reason-code mapping.
- Reverse-charge XML serialization.
- Real ASP validation.
- Real ASP submission.
- FTA reporting.
- Real Peppol transmission.
- Production archive/retention guarantees.
- Production UAE compliance claim.

## Safety Boundary

- No real ASP calls.
- No real ASP submission.
- No FTA reporting.
- No real Peppol transmission.
- No production Peppol claim.
- No "FTA certified", "Peppol certified", "official UAE provider", or "accredited ASP" claim by LedgerByte.
- No ZATCA production behavior.
- No hosted/customer-data mutation.
- No Vercel/Supabase changes.
- No production infrastructure commands.
- Accounting finalization remains separate from compliance delivery state.

ZATCA remains parked and blocked by default.

## Verification

Required verification for this branch includes the UAE package tests/typecheck, targeted API/web tests, API/web typechecks, `verify:diff`, `verify:ci:local`, and whitespace checks.

Skipped by design: `db:migrate`, seed/reset/delete, smoke, E2E, deployed checks, real ASP calls, real ZATCA calls, real email, Vercel/Supabase changes, and production infrastructure commands.

## Next Recommended Arc

UAE ASP provider sandbox evidence review
