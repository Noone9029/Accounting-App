# DEV-08H AP Email Output Boundary Preflight

## Purpose And Scope

- Task: `DEV-08H Part 28: AP email output boundary preflight`.
- Latest commit inspected: `468df795 Verify DEV-08H AP output duplicate generation`.
- Runtime mutation performed: no.
- Email enqueued or sent: no.
- Provider called: no.
- Marker: `DEV08H-AP-20260528T000000`.

## Modules Inspected

- API AP output families:
  - `apps/api/src/purchase-orders`
  - `apps/api/src/purchase-bills`
  - `apps/api/src/supplier-payments`
  - `apps/api/src/supplier-refunds`
  - `apps/api/src/purchase-debit-notes`
  - `apps/api/src/cash-expenses`
  - `apps/api/src/generated-documents`
- API email module:
  - `apps/api/src/email/email.controller.ts`
  - `apps/api/src/email/email.service.ts`
  - `apps/api/src/email/email-provider.ts`
  - `apps/api/src/email/mock-email.provider.ts`
  - `apps/api/src/email/smtp-email.provider.ts`
  - `apps/api/prisma/schema.prisma`
- Web email surface:
  - `apps/web/src/app/(app)/settings/email-outbox/page.tsx`
  - `apps/web/src/lib/email.ts`
  - `apps/web/src/lib/permissions.ts`

## Boundary Findings

- AP document controllers and services expose PDF data, PDF stream/archive, and generated-document archive/download behavior, but no email/send/outbox action for AP documents.
- `EmailTemplateType` currently contains only `ORGANIZATION_INVITE`, `PASSWORD_RESET`, and `TEST_EMAIL`.
- `EmailMessage` and `EmailOutbox` store subject/body metadata only; there is no generated-document attachment field or AP source reference field.
- The generic `POST /email/test-send` path is not an AP document email path and would not attach or reference a generated AP document.
- Mock email provider has no real external send behavior, but using it here would only create a generic test email, not an AP output boundary check.
- SMTP disabled mode can avoid real sends, but it is still not an AP generated-document outbox path.
- Retry and provider-event paths are email operations for existing outbox rows, not safe AP document email creation paths.

## Current Local Counts

- Selected DEV-08H generated-document rows for AP outputs: `7`, including the duplicate purchase-order archive row from Part 26.
- Marker email outbox rows: `0`.
- Marker email provider events: `0`.
- Existing local email outbox template groups are non-AP only: `TEST_EMAIL`, `ORGANIZATION_INVITE`, and `PASSWORD_RESET`.

## Decision

- Safe local AP outbox-only/dry-run path found: no.
- Part 29 mutation should not be run, even though the approval phrase was provided up front, because the prompt requires Part 29 only if Part 28 proves a safe AP outbox-only path.
- Do not invent an AP email mutation path by using generic test email, direct table inserts, or provider retry machinery.
- Generated document attachment bodies must remain out of logs and out of email diagnostic summaries until a real AP email feature exists with an explicit redaction and attachment policy.

## Exact Next Prompt Title

`DEV-08H Part 30: AP output PDF archive email closure`
