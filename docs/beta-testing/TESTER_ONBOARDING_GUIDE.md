# Tester Onboarding Guide

Date: 2026-07-01

Audience: approved controlled beta testers only.

## Welcome

Welcome to the LedgerByte controlled beta. This test is for product feedback with a small approved group. It is not public launch, production launch, paid SaaS launch, or compliance launch.

Use only demo/test data unless the LedgerByte owner gives separate written approval.

## Login URL

Web test URL: `https://ledgerbyte-web-test.vercel.app`

Login route: `/login`

Test credentials are provided separately through an approved private channel. Do not paste credentials, invite links, reset links, tokens, cookies, or screenshots containing them into feedback docs or public tickets.

## Test Account Rules

- Use only your assigned account.
- Use only your assigned organization.
- Do not share passwords.
- Do not invite other users.
- Do not change roles or team membership unless your walkthrough explicitly asks you to inspect those screens without mutating.
- Ask support to revoke or suspend access when testing is complete.

## Browser Requirements

Recommended:

- Current Chrome, Edge, or Safari.
- Desktop/laptop for the main walkthrough.
- Optional tablet/mobile quick pass.

Do not install developer tools, provider SDKs, database clients, Vercel tooling, or Supabase tooling for this beta.

## How To Start

1. Open `https://ledgerbyte-web-test.vercel.app/login`.
2. Log in with credentials provided separately.
3. Confirm you are in the assigned test organization.
4. Open `/dashboard`.
5. Follow the assigned walkthrough script.
6. Record feedback with route, expected result, actual result, severity, and screenshot/video link if available.

## What To Test First

Start with these routes:

- `/login`
- `/dashboard`
- `/sales/invoices`
- `/sales/quotes`
- `/customers`
- `/suppliers`
- `/purchases/bills`
- `/bank-accounts`
- `/bank-accounts/00000000-0000-0000-0000-000000002112/reconciliations`
- `/items`
- `/reports`
- `/documents`
- `/settings`
- `/settings/storage`
- `/settings/compliance`
- `/setup`
- `/settings/security`

## What Not To Click

Do not click or execute actions that would:

- Send real email.
- Collect real payment.
- Submit to ZATCA, UAE, Peppol, ASP, or any tax authority.
- Request CSID or OTP.
- Trigger provider, storage, signed-URL, backup, restore, seed, reset, delete, migration, or destructive behavior.
- Finalize, void, delete, post, import, or upload production data unless your script and owner approval explicitly allow a disposable test-data action.

## How To Report Issues

Use [BETA_FEEDBACK_FORM_TEMPLATE.md](BETA_FEEDBACK_FORM_TEMPLATE.md).

For each issue include:

- Tester name or identifier.
- Tester role.
- Date.
- Device/browser.
- Route.
- Issue title.
- Issue type and severity.
- Expected behavior.
- Actual behavior.
- Screenshot/video link if available.
- Steps to reproduce.
- Business impact.
- Suggested fix.
- Permission role.
- Data sensitivity yes/no.

## Screenshots And Videos

- Redact names, emails, phone numbers, bank references, document numbers, financial details, and anything that looks real.
- Do not include passwords, tokens, cookies, auth headers, database URLs, API keys, invite links, reset links, signed XML, QR payloads, PDF bodies, attachment bodies, or raw bank files.
- Use a link to an approved internal storage location if a screenshot/video is needed.

## Support Contact Placeholder

Support channel: `<CONTROLLED_BETA_SUPPORT_CHANNEL>`

Triage owner: `<CONTROLLED_BETA_TRIAGE_OWNER>`

Escalation owner: `<CONTROLLED_BETA_ESCALATION_OWNER>`

Do not use this placeholder as a real contact until the owner fills it in.

## Escalation Rules

Stop testing and escalate immediately if:

- You cannot log in.
- You see another organization's data.
- You see secrets, tokens, or unredacted sensitive data.
- A workflow appears to risk data loss.
- A page claims production readiness, compliance certification, live bank feeds, payment readiness, provider connectivity, object-storage readiness, or signed-URL readiness.
- You cannot stop or revoke an action you started.

## End Testing Session

1. Finish the current walkthrough step.
2. Save feedback entries.
3. Redact and attach screenshots/videos if needed.
4. Log out.
5. Tell support the session is complete.
6. Confirm whether access should remain active for another scheduled session or be revoked.
