# Sales Invoice Document Title Policy

Date: 2026-06-04

Status: Decision pending accountant, tax, and product review

## Purpose

This policy records the open Sales Invoice document-title decision for LedgerByte controlled beta. It does not change PDF titles, generated-document labels, tax treatment, ZATCA behavior, or posting behavior.

Default current recommendation: keep conservative `Sales Invoice` wording for controlled beta unless accountant and tax review approve a conditional tax-invoice policy.

## Option 1: `Sales Invoice`

When it applies:

- Controlled beta and general Sales/AR workflows where LedgerByte should avoid unsupported tax-invoice, official filing, ZATCA, or PDF/A-3 claims.
- Organizations that have not had their VAT/tax-registration, invoice-content, and ZATCA posture reviewed for production use.

Risks:

- Some VAT-registered users or reviewers may expect customer-facing invoices to use `Tax Invoice` when local tax requirements are satisfied.
- The title may be conservative for cases where all tax-invoice conditions are later met.

Accountant decision needed:

- Confirm whether `Sales Invoice` is acceptable for beta sample review and non-production accountant walkthroughs.
- Identify whether any customer-facing or VAT-registered use case requires `Tax Invoice`.

Tax/VAT review needed:

- Confirm whether conservative `Sales Invoice` wording avoids overclaiming during controlled beta.
- Define what fields, tax-registration conditions, and document controls are required before any `Tax Invoice` wording is allowed.

ZATCA wording risk:

- Lowest risk. This option does not imply ZATCA clearance, reporting, production CSID use, PDF/A-3, or official e-invoice compliance.

Implementation impact:

- No product change if current wording remains `Sales Invoice`.
- Tests and generated-document labels should continue to assert no unsupported ZATCA, PDF/A-3, or official filing claims.

Recommended current beta posture:

- Recommended until accountant/tax review approves a more specific policy.

## Option 2: `Tax Invoice`

When it applies:

- Only if accountant/tax review decides the invoice output meets the requirements for a tax invoice in the target operating jurisdiction.
- Only if product policy accepts the compliance implications of using a tax-invoice title.

Risks:

- High risk if applied broadly before tax and ZATCA readiness decisions are complete.
- Could imply official tax treatment, ZATCA readiness, or production compliance that LedgerByte does not currently claim.
- Could be unsafe for no-tax or incomplete-tax-profile invoices.

Accountant decision needed:

- Explicit approval that `Tax Invoice` is correct for the reviewed invoice samples and supported customer scenarios.
- Define whether the title applies globally or only to specific organizations/invoices.

Tax/VAT review needed:

- Confirm tax-registration requirements, invoice mandatory fields, tax-mode constraints, and jurisdiction-specific wording.
- Confirm whether no-tax and non-VAT scenarios must avoid this title.

ZATCA wording risk:

- High. The title can be read as a compliance claim unless the UI and PDF clearly avoid clearance/reporting/PDF/A-3 claims and the product has a reviewed ZATCA posture.

Implementation impact:

- Would require PDF, generated-document, UI, tests, and likely organization-level document-setting policy updates.
- Should not be implemented from wording preference alone.

Recommended current beta posture:

- Not recommended as the default title without explicit accountant/tax approval and product decision.

## Option 3: Conditional `Tax Invoice`

When it applies:

- Only when VAT/tax registration, invoice tax mode, organization profile, customer profile, document fields, and any required compliance conditions are satisfied.
- Invoices that do not meet those conditions keep `Sales Invoice` or another approved conservative title.

Risks:

- Requires precise eligibility rules; vague rules can create inconsistent titles.
- Could still overclaim if ZATCA readiness, VAT registration, or mandatory fields are incomplete.
- Users may not understand why similar invoices have different titles.

Accountant decision needed:

- Define the exact business and accounting conditions for using `Tax Invoice`.
- Confirm fallback title and explanatory text for invoices that do not qualify.

Tax/VAT review needed:

- Define eligible tax modes, required registration fields, mandatory invoice content, and exceptions.
- Confirm whether draft invoices can ever show `Tax Invoice` or whether the title is finalization-only.

ZATCA wording risk:

- Medium to high. Conditional logic can reduce overclaiming, but it must still avoid implying clearance, reporting, PDF/A-3, production CSID, or official submission.

Implementation impact:

- Requires policy fields or deterministic eligibility logic, frontend/PDF/archive label updates, fixture updates, and targeted tests.
- May require migration or settings changes if title selection becomes organization-specific.

Recommended current beta posture:

- Best long-term candidate if tax/accountant review supplies explicit eligibility rules.
- Defer implementation until the rules are recorded as concrete findings or decisions.

## Option 4: Keep Current Title With Safe Subtitle

When it applies:

- Controlled beta cases where the title remains conservative but users need more context.
- Example posture: title `Sales Invoice`, subtitle such as `Operational invoice record; official tax-invoice wording pending accountant/tax review`.

Risks:

- Subtitle can clutter PDF output if overused.
- Poorly worded subtitles may confuse customers or imply a compliance limitation in customer-facing documents.

Accountant decision needed:

- Confirm whether a subtitle improves clarity or should remain internal-only.
- Decide where the subtitle appears: UI only, PDF only, or accountant-review samples only.

Tax/VAT review needed:

- Confirm subtitle wording does not conflict with local invoice presentation expectations.
- Confirm it does not imply official VAT filing, ZATCA submission, or compliance.

ZATCA wording risk:

- Low to medium depending on subtitle wording.
- Any subtitle must explicitly avoid production ZATCA claims unless a separate ZATCA review approves them.

Implementation impact:

- Small if limited to helper text.
- Moderate if PDF templates and generated-document tests are updated.

Recommended current beta posture:

- Acceptable as a future safe wording enhancement only if accountant/product review requests it.

## Decision Needed

Before changing invoice document titles, record a concrete decision that answers:

- Should the default title remain `Sales Invoice` for controlled beta?
- If `Tax Invoice` is allowed, what exact eligibility rules apply?
- Are draft invoices eligible for any tax-invoice title?
- Does title selection depend on organization VAT registration, customer tax profile, tax mode, finalization status, or ZATCA status?
- What UI/PDF helper text is approved?
- What tests must prove unsupported claims are absent?

## Current Policy Outcome

No invoice PDF or UI title change is approved by this document.

The current safe beta posture is:

- keep conservative `Sales Invoice` wording
- avoid `Tax Invoice` unless accountant/tax review approves explicit conditions
- avoid claims of official VAT filing, ZATCA clearance/reporting, production compliance, PDF/A-3, real email sending, payment links, or payment gateway behavior
- treat this as a pending product/accountant/tax decision rather than an implemented finding
