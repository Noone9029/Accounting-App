# LedgerByte Controlled Beta Known Limitations

Date: 2026-07-10

Status: tester-facing limitations for hosted user-testing/beta

LedgerByte is available only for controlled product testing with approved accounts and fictional or sanitized data. These limitations override any screen or message that appears broader.

## Environment And Recovery

- This environment is not production and is not approved for production accounting, audit, filing, legal, or operational reliance.
- Managed Supabase PITR has not been verified.
- A manual logical backup exists, but hosted restore has not been proven.
- Production RPO, RTO, disaster recovery, capacity, monitoring, and incident-response readiness are not proven by beta smoke results.

## Providers And Integrations

- Live Wio and other bank providers are disabled. No live bank feeds, bank aggregation, account connection, payout release, or money movement is available.
- Real payment collection and production payment links are disabled.
- External OCR/document extraction is disabled unless a later approved provider configuration explicitly proves otherwise.
- Real invoice/customer email delivery is disabled by default.
- External webhook delivery is disabled.
- Production object storage, signed-URL operation, retention, legal hold, and object recovery are not proven.
- External telemetry providers are disabled unless separately configured and evidenced.

## Compliance

- ZATCA production compliance is not enabled.
- UAE production e-invoicing, Peppol/ASP connectivity, certification, and authority submission are not enabled.
- No real CSID, OTP, clearance, reporting, signed XML submission, PDF/A-3, or tax-authority operation is available.
- Readiness pages, XML/PDF previews, validation output, and compliance wording are review aids only.

## Accounting And Data Use

- Use fictional or sanitized test data only.
- Beta reports, statements, PDFs, CSV files, report packs, ledgers, and dashboards are not official accounting, tax, audit, or customer-facing records.
- Do not use beta for payroll, real tax filing, production close, legal evidence, or regulated retention.
- Do not upload real bank statements, invoices, receipts, contracts, IDs, payroll files, signed XML, QR payloads, or provider responses.

## Browser And Session Scope

- Normal cookie-based login and authenticated GET/read-only routes passed in the current automated Chromium smoke.
- Browser privacy policies that block cross-site cookies may require a shared-site/custom-domain or same-origin proxy architecture before production use.
- Financial and other mutating workflows were not part of the final deployment smoke and must be tested only through separately approved beta scripts.

## Tester Stop Conditions

Stop the affected workflow and report immediately if:

- another organization or tenant's data is visible;
- a password, token, cookie, authorization header, database URL, API key, or provider secret appears;
- accounting totals or states are contradictory or materially wrong;
- the UI claims a disabled provider, compliance execution, certification, filing, or money movement succeeded;
- a destructive or live-provider action appears enabled unexpectedly.

See [USER_TESTING_FINAL_AUTHENTICATED_SMOKE_20260710.md](../deployment/USER_TESTING_FINAL_AUTHENTICATED_SMOKE_20260710.md) for the bounded deployment evidence.
