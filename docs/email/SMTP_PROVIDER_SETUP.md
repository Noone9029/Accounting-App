# SMTP Provider Setup

Audit date: 2026-05-16

LedgerByte supports an opt-in SMTP adapter for transactional emails. The default provider remains `mock`, so local development, tests, and smoke runs do not require SMTP credentials and do not send real email.

## Provider Modes

- `EMAIL_PROVIDER=mock`: default. Records email in `EmailOutbox` with `SENT_MOCK`; no external send.
- `EMAIL_PROVIDER=smtp-disabled`: no-send mode for readiness review. Test sends create safe failed outbox records instead of connecting to SMTP.
- `EMAIL_PROVIDER=smtp`: real SMTP send mode. Requires complete SMTP configuration.

## Required Env Vars For SMTP

```bash
EMAIL_PROVIDER=smtp
EMAIL_FROM="no-reply@example.com"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="smtp-user"
SMTP_PASSWORD="smtp-password"
SMTP_SECURE="false"
```

Never commit real SMTP credentials. `SMTP_PASSWORD` is not returned by readiness APIs and must not be logged.

## Testing Safely

Use a sandbox SMTP service such as Mailtrap, Resend SMTP, or another provider test mailbox before using production sender domains. Verify:

- `GET /email/readiness` shows `ready: true` and `realSendingEnabled: true`.
- `POST /email/test-send` creates an `EmailOutbox` record with `SENT_PROVIDER`.
- The provider message id is stored when the SMTP relay returns one.
- Failed sends store a safe failure summary without credentials.

## Current Limitations

- No background queue or scheduled retry worker.
- No bounce, complaint, suppression-list, or webhook handling.
- No DKIM/SPF/DMARC validation workflow.
- No invoice/statement email sending yet.
- Mock remains the default and should remain active for tests/smoke.
