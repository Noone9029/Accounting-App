# Controlled Beta Tester Profile

Date: 2026-07-01

Status: Controlled-beta preparation. No tester has been invited by this document.

## Ideal First Cohort

The first cohort should be 3 to 5 approved testers:

- 1 internal product/support reviewer.
- 1 accountant or bookkeeper reviewer.
- 1 friendly SME owner willing to use demo data.
- 1 operator who can evaluate day-to-day workflow clarity.
- Optional: 1 technical/browser reviewer for device, privacy, and screenshot handling.

## Allowed First Testers

- Friendly testers.
- Internal testers.
- Accountant reviewers.
- SME owners willing to test demo data.
- Operators who understand this is not production software.

## Not Allowed Yet

- Real paying customers.
- Public signup users.
- Customers needing production ZATCA compliance.
- Customers needing UAE ASP, Peppol, or live compliance.
- Customers needing live bank feeds.
- Customers needing real payment collection.
- Customers needing production email delivery.
- Customers entering sensitive production financial data.

## Required Expectations

Every tester must:

- Accept that LedgerByte is controlled beta only.
- Use only assigned beta accounts and organizations.
- Use test/demo data unless a separate written approval allows otherwise.
- Follow the walkthrough script.
- Report bugs, confusing copy, trust concerns, and workflow blockers.
- Redact screenshots/videos before sharing.
- Stop testing if they see secrets, real customer-sensitive data, or cross-organization data.

## Accounting Knowledge Level

The first cohort should include mixed perspectives:

- At least one accountant/bookkeeper who can judge terminology, reports, ledgers, statements, VAT/ZATCA wording, and reconciliation trust.
- At least one SME owner/operator who can judge first-use clarity without deep accounting assumptions.
- Internal reviewers should understand current product restrictions and avoid overclaiming readiness.

## Region and Business Assumptions

Use testers who can evaluate GCC/Saudi/UAE-oriented accounting workflows while understanding that:

- Saudi/ZATCA production compliance is not enabled.
- UAE/Peppol/ASP production integration is not connected.
- Current compliance surfaces are readiness and review surfaces, not live filing or provider execution.
- Beta review may use generic demo businesses and sample VAT/compliance labels only.

## Device and Browser Requirements

Recommended:

- Current Chrome, Edge, or Safari.
- Desktop or laptop for the full walkthrough.
- One tablet or mobile quick pass if the tester can provide it.
- Screenshots or videos only after redaction.

Do not require testers to install browser extensions, local developer tooling, database clients, Supabase clients, Vercel tooling, or provider SDKs.

## Data Restrictions

Testers must not enter or upload:

- Real production invoices, bills, statements, payroll, contracts, IDs, tax filings, signed XML, QR payloads, or provider credentials.
- Raw bank exports unless explicitly sanitized and approved.
- Real customer, supplier, employee, bank, or tax authority data.
- Passwords, tokens, cookies, API keys, database URLs, auth headers, reset links, or invite tokens.

## Support Expectations

The support owner must provide:

- A private support channel placeholder before invites.
- A named triage owner before invites.
- A beta window start and end date.
- A response expectation for blocker/high/medium/low issues.
- A revocation path before access is granted.

## Feedback Commitment

Each tester should commit to:

- Completing one assigned walkthrough script.
- Reporting at least three confusing points and three useful points if they finish without blockers.
- Filing each issue with route, role, browser/device, expected behavior, actual behavior, reproduction steps, impact, and redacted screenshot/video link if available.
