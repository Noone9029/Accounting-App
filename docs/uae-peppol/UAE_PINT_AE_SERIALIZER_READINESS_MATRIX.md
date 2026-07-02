# UAE PINT-AE Serializer Readiness Matrix

Status: local official-draft readiness, not production compliance
Date: 2026-07-02

This matrix tracks what LedgerByte can model locally before real UAE ASP access. The repository does not contain a complete official PINT-AE reference pack, provider envelope specification, ASP webhook specification, or official conformance evidence. Missing official sources are treated as blockers, not guessed rules.

| Requirement area | Official source file/doc if available | Current implementation | Current tests | Readiness status | Production claim allowed | Follow-up |
|---|---|---|---|---|---|---|
| CustomizationID | Existing package constants | Official identifier helper and official draft metadata use the current repo constant. | Identifier and draft metadata tests. | implemented-local | no | Recheck against official reference pack before provider work. |
| ProfileID | Existing package constants | Official profile helper and official draft metadata use the current repo constant. | Identifier and draft metadata tests. | implemented-local | no | Recheck against official reference pack before provider work. |
| Endpoint scheme 0235 | Existing package constants | `validateUaeEndpointScheme` and draft party validators require scheme/value when endpoints are required. | Endpoint helper and missing endpoint tests. | implemented-local | no | Confirm exact official endpoint rules from reference pack. |
| Seller endpoint | Existing package validators | Supplier draft party validation requires endpoint id. | Draft party validation tests. | implemented-local | no | Add official samples when available. |
| Buyer endpoint | Existing package validators | Buyer draft party validation requires endpoint id. | Missing buyer endpoint fixture and draft party validation tests. | implemented-local | no | Add official samples when available. |
| Seller TRN/TIN | Existing package validators | Draft tax-registration validation requires TRN or TIN. | Draft tax-registration tests. | implemented-local | no | Confirm official scheme-specific registration rules. |
| Buyer TRN/TIN | Existing package validators | Draft tax-registration validation requires TRN or TIN. | Draft tax-registration tests. | implemented-local | no | Confirm official scheme-specific registration rules. |
| Seller address | Existing package validators | Draft address validation requires address line 1 and country code. | Missing seller address and draft address tests. | implemented-local | no | Confirm full official address cardinality. |
| Buyer address | Existing package validators | Draft address validation requires address line 1 and country code. | Draft party/address tests. | implemented-local | no | Confirm full official address cardinality. |
| Invoice type code | Existing package serializer/rules | Commercial/tax invoice type handling remains local serializer logic. | Type-code and fixture-suite tests. | partially implemented | no | Verify all UAE invoice type variants from official reference. |
| Credit note type code | Existing package serializer/rules | Credit-note type handling remains local serializer logic. | Credit-note serializer tests. | partially implemented | no | Verify all UAE credit-note variants from official reference. |
| Credit note original invoice reference | Existing package validators and draft validators | Draft credit-note validation requires original invoice reference. | Missing reference tests. | implemented-local | no | Confirm official billing-reference structure in reference pack. |
| Credit note reason | Existing package validators and draft validators | Draft credit-note validation requires reason. | Missing reason tests. | implemented-local | no | Confirm official reason/note rules in reference pack. |
| No negative invoice | Existing package validators and draft validators | Draft invoice validation rejects negative payable total. | Negative invoice tests. | implemented-local | no | Confirm handling of allowances/adjustments separately. |
| Tax categories | Existing package line model | Tax category is carried on lines where present, but full code-list enforcement is not complete. | Fixture-suite coverage only. | documented gap | no | Add source-backed UAE tax category code-list validation. |
| Tax totals | Local draft validators | Draft tax totals must match document tax total. | Tax mismatch tests. | implemented-local | no | Add official category/subtotal structures after reference review. |
| Line totals | Local draft validators | Line total must match taxable amount plus tax amount. | Line mismatch tests. | implemented-local | no | Extend for allowances/charges once official rules are available. |
| Payment means/payment due date | Local draft model | Draft payment terms carry currency and optional due date; payment means remains placeholder metadata only. | Draft model test. | partially implemented | no | Add source-backed payment means code list. |
| Currency | Existing package document model | Currency is required and propagated into draft payment terms/tax totals. | Existing validation and draft model tests. | implemented-local | no | Confirm official multi-currency rules. |
| Predefined endpoints | Existing package constants | Local predefined scenarios are mapped where repo-backed. | Predefined endpoint scenario tests. | implemented-local | no | Confirm exact official scenario set. |
| Deemed supply/export/not-subject scenarios | Existing package constants/fixtures | Local scenarios remain source-backed only where already committed. | Scenario fixture suite and metadata tests. | partially implemented | no | Fill missing mappings only from official references. |
| Business process metadata | Existing package helper plus draft validator | Draft metadata carries official identifiers and emits `UAE_OFFICIAL_REFERENCE_NOT_VERIFIED`. | Business-process warning tests. | partially implemented | no | Replace warning only after official reference pack and conformance evidence exist. |
| Evidence/archive metadata | Docs only | Evidence/retention mapping exists; no body storage or immutable archive proof. | Docs review and clean-room scans. | documented gap | no | Complete storage/retention proof in separate approved goal. |
| Provider envelope | No provider docs in repo | Provider submission remains blocked. | Provider blocked behavior tests. | blocked by ASP/provider docs | no | Add provider-envelope contract skeleton only after docs are available. |
| Webhook statuses | Local fake/mock helpers only | Fake local webhook helpers and mock statuses exist; real provider statuses are not emitted by disabled/mock paths. | Fake webhook and provider status tests. | partially implemented | no | Add provider-specific webhook contract tests after docs. |
| FTA tax data reporting | No official/provider docs in repo | Not implemented and not enabled. | Safety scans and status docs. | blocked by official reference | no | Require official/provider reporting evidence before any implementation. |

## Current Boundary

- Readiness XML and official draft payloads are allowed local artifacts.
- Provider submission payloads remain blocked.
- Production-compliant eInvoices remain blocked.
- All current serializer and validator outputs keep `productionCompliance=false`, `networkReady=false`, and `aspSubmissionReady=false`.
