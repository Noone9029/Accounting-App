# Beta Onboarding Message Template

Date: 2026-07-01

Status: Template only. Do not send without owner approval.

## First Login

1. Open `<TEST_URL>`.
2. Use the credential or invite link provided through the approved private channel.
3. Confirm you are in the assigned test organization: `<TEST_ORG>`.
4. Confirm your assigned role: `<ASSIGNED_ROLE>`.
5. Stop immediately if you can see another organization, unexpected sensitive data, or a production-readiness claim.

## Walkthrough Route Order

Follow the assigned script in this order unless support tells you otherwise:

1. Login.
2. Dashboard.
3. Sales invoices.
4. Quotes.
5. Customers.
6. Suppliers.
7. Purchase bills.
8. Bank accounts and reconciliation history.
9. Inventory/items.
10. Reports.
11. Documents.
12. Settings, storage, and compliance readiness.
13. Setup/readiness pages.
14. Feedback form.

## What To Test

- Navigation clarity.
- Whether status, restrictions, and disabled states are understandable.
- Whether workflows match your accounting or operator expectations.
- Whether tables, forms, reports, statements, and documents are easy to inspect using demo/test data.
- Whether any wording seems to overclaim production readiness.

## What Not To Click Or Do

- Do not enter production data.
- Do not upload raw files or real documents.
- Do not send emails, collect payments, call providers, request CSIDs, submit tax/compliance data, or trigger bank/provider actions.
- Do not run destructive actions, seed/reset/delete flows, storage operations, signed URL operations, migrations, backup/restore, or compliance submissions.
- Do not share passwords, invite links, reset links, tokens, cookies, auth headers, database URLs, API keys, signed XML, QR payloads, raw bank files, PDF bodies, or attachment bodies.

## Reporting Bugs

Use the feedback form with:

- Route.
- Role.
- Browser and device.
- Expected behavior.
- Actual behavior.
- Reproduction steps.
- Impact.
- Redacted screenshot or video link if helpful.

## Screenshot Rules

- Redact names, emails, phone numbers, document numbers, bank details, financial details, tokens, URLs containing secrets, reset links, invite links, and any real business data.
- Do not upload screenshots that contain passwords, cookies, headers, database URLs, API keys, raw files, signed XML, QR payloads, PDF bodies, or attachment bodies.

## Severity Definitions

- Blocker: stops workflow or risks data, trust, security, privacy, tenant isolation, or compliance misunderstanding.
- High: core workflow is confusing, visibly broken, or likely to damage trust.
- Medium: workflow can continue with support or workaround.
- Low: polish or clarity issue that does not block completion.

## Access End

Access ends on `<ACCESS_END_DATE>`. Access may be revoked earlier if the beta is paused, the test window ends, or restrictions are violated.
