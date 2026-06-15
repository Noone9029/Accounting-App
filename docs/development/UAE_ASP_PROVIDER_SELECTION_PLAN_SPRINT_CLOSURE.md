# UAE ASP Provider Selection Plan Sprint Closure

Date: 2026-06-15

## Summary

Documented the provider-selection research, scoring matrix, sandbox contract plan, and outreach template for a future UAE ASP integration. This sprint does not implement a real provider, add credentials, add executable base URLs, make network calls, mutate hosted data, or change production infrastructure.

LedgerByte remains controlled beta/user-testing only and UAE Peppol/PINT-AE readiness only. The future ASP is expected to handle final Peppol/PINT-AE validation, Peppol transmission/exchange, buyer delivery, and FTA reporting.

## Files Changed

- `docs/uae-peppol/UAE_ASP_PROVIDER_SELECTION_MATRIX.md`
- `docs/uae-peppol/UAE_ASP_SANDBOX_CONTRACT_PLAN.md`
- `docs/uae-peppol/UAE_ASP_PROVIDER_OUTREACH_TEMPLATE.md`
- `docs/development/UAE_ASP_PROVIDER_SELECTION_PLAN_SPRINT_CLOSURE.md`
- `CODEX_HANDOFF.md`
- `BUG_AUDIT.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/REMAINING_ROADMAP.md`
- `docs/uae-peppol/README.md`

## Sources Reviewed

- UAE MoF Electronic Invoicing Guidelines.
- UAE MoF pre-approved eInvoicing service providers list.
- UAE MoF Accreditation of eInvoicing Service Providers page.
- OpenPeppol BIS Billing 3.0.
- OpenPeppol PINT-AE v1.0.1 and UAE 2025-Q2 document specifications.
- OpenPeppol eDelivery / AS4 documentation as background only.
- Provider-primary or provider-adjacent pages for Complyance, ClearTax, EDICOM, Comarch, Taxilla, Pagero / Thomson Reuters, Storecove, Sovos, OpenText, and TronStride / Aigentrix.

## Provider Shortlist

Recommended first outreach order:

1. Complyance
2. ClearTax
3. Taxilla
4. EDICOM
5. Pagero / Thomson Reuters
6. Comarch
7. TronStride / Aigentrix
8. Storecove
9. Sovos
10. OpenText

## Recommendation

Start outreach with the most API-friendly MoF-listed providers first. Do not implement a real provider until sandbox docs and commercial terms are reviewed.

## Known Blockers

- No provider has been commercially selected.
- No sandbox docs have been contractually received.
- No sandbox credentials have been approved or stored.
- No legal/accountant/provider review has approved public claims.
- Pricing is mostly not public / requires sales quote.
- Storecove, Sovos, and OpenText were not found on the current MoF UAE pre-approved list in this review.
- Public API evidence is uneven; several MoF-listed providers are sales-gated.

## Next Recommended Arc

Collect provider responses using the outreach template, then create a follow-up sandbox-contract evidence branch for the best first provider response. That future branch should still be no-network and fixture-first unless the user explicitly approves a real sandbox call.

## Safety Statement

No real ASP calls, real ASP submission, FTA reporting, real Peppol transmission, production Peppol claim, FTA certified claim, Peppol certified claim, official UAE provider claim, accredited ASP claim by LedgerByte, ZATCA production behavior, hosted/customer-data mutation, Vercel/Supabase change, or production infrastructure command was added.
