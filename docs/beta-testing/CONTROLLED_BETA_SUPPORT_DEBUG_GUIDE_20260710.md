# LedgerByte Controlled Beta Support And Debug Guide

Date: 2026-07-10

Status: safe support procedure for hosted user-testing/beta

This guide covers non-destructive diagnosis only. Support must not request secrets, mutate hosted data, run migrations, change Vercel/Supabase configuration, enable providers, or trigger financial/compliance actions without a separate approved remediation plan.

## First Response

1. Confirm the report concerns `ledgerbyte-web-test.vercel.app` or `ledgerbyte-api-test.vercel.app`, not production.
2. Ask for route, timestamp with timezone, browser/device, assigned beta organization, user action, expected result, and actual result.
3. Ask whether testing can continue safely and whether another organization's data, wrong totals, secret exposure, or a live-provider/compliance claim is involved.
4. Assign severity using [CONTROLLED_BETA_ISSUE_TRIAGE_TEMPLATE_20260710.md](./CONTROLLED_BETA_ISSUE_TRIAGE_TEMPLATE_20260710.md).

## Ask For A Request ID

Request IDs are support references, not authentication credentials.

- Ask the tester to copy the reference/request ID shown in a safe error panel, if present.
- If browser developer tools are allowed, ask them to open Network, select the failed API request, and copy only the `x-request-id` response-header value plus route, status, and timestamp.
- Do not ask for the request body, Cookie header, Authorization header, access token, CSRF token, or full exported HAR file.
- If no request ID is available, use route plus exact timestamp/timezone to locate the request.

## Check Vercel Logs Safely

Use the Vercel dashboard for project `ledgerbyte-api-test` and filter around the reported timestamp, route, status, and request ID. Use project `ledgerbyte-web-test` only for web runtime/build issues.

Read-only CLI inspection may be used from an authenticated operator workstation:

```powershell
corepack pnpm dlx vercel inspect ledgerbyte-api-test.vercel.app --scope ahmad-khalid-s-projects
corepack pnpm dlx vercel logs ledgerbyte-api-test.vercel.app --scope ahmad-khalid-s-projects
```

- Record safe metadata only: request ID, timestamp, method, route, status, duration, module/action, and authenticated organization/user IDs when policy allows.
- Do not paste complete log events into public issues.
- Do not print or record environment values, database URLs, JWTs, cookies, provider signatures, OCR/document payloads, PDFs, XML, email bodies, bank data, or storage credentials.

## Safe Diagnostic Order

1. Confirm API `/`, `/health`, and `/readiness` status without recording response secrets or tenant data.
2. Confirm the web home and login pages load.
3. Reproduce only with the approved smoke account or a disposable beta account in the assigned test organization.
4. Prefer GET/read-only reproduction. Do not create, finalize, pay, send, import, release, submit, or delete records during support diagnosis.
5. Correlate the request ID with structured API logs.
6. Escalate before any hosted mutation or configuration change.

## What Support Must Not Collect

- Passwords, password hashes, reset links, invitation tokens, JWTs, cookies, CSRF tokens, authorization headers, API keys, provider secrets, database URLs, or storage credentials.
- Raw bank statements, payroll, IDs, contracts, real invoices/receipts, private PDFs, attachments, document bodies, email bodies, provider payloads, signed XML, QR payloads, or unredacted exports.
- Screenshots showing real customer/supplier names, email addresses, phone numbers, tax identifiers, bank details, document numbers, or financial records.
- Full browser profiles, unrestricted HAR files, database dumps, `.env` files, or Vercel/Supabase configuration exports.

If sensitive material is submitted, stop sharing it, restrict access, follow the incident-response process, and retain only sanitized metadata needed for triage.

## Immediate Escalation

Escalate and pause the affected beta workflow for:

- suspected cross-tenant access;
- secret or private-data exposure;
- incorrect accounting totals, balances, postings, tax, or reconciliation state;
- database readiness failure;
- access revocation failure;
- unexpected live provider, money-movement, storage, email, webhook, ZATCA, UAE compliance, or authority-submission behavior;
- repeated login/session failure affecting the cohort.

Do not promise production readiness, recovery, compliance, provider availability, or a resolution time that has not been approved.
