# OpenBook MIT Source Intake

Date: 2026-06-20

Status: `BASELINE_RECORDED`

## Source Snapshot

- Upstream repository: `https://github.com/muhammad-fiaz/OpenBook`
- Audited commit: `437406a81e34eeee8c5e7022e2d3211ad2ecf149`
- License: MIT
- Local audit path used for this slice: `E:\Work\Temp\openbook-audit`

The upstream README describes OpenBook as a self-hosted personal accounting and finance application for individuals and small businesses, with invoicing, expenses, reporting, products, clients, team management, authentication, and PDF generation.

## Adoption Inventory

OpenBook areas worth evaluating in later small LedgerByte-native slices:

- Global search and command palette.
- Navigation, app shell, quick actions, and dashboard cards.
- Invoice, quote, product/service catalog, public invoice, and PDF workflow ideas.
- AR aging, cash flow, revenue trend, top customer, top product/service, and dashboard report coverage.
- Payment reminder, notification, team invite, and organization-switching UX.
- Data-management settings, export/import planning, project/time tracking, and custom-field ideas.

## Guardrails

- Use small attributed MIT chunks only when they are isolated and reviewable.
- Prefer LedgerByte-native implementation for accounting, permissions, audit, tenant isolation, fiscal periods, and mutation boundaries.
- Do not port OpenBook Prisma schema, server actions, auth model, or reporting calculations directly into LedgerByte.
- Do not add provider, storage, ZATCA, UAE, Peppol, ASP, hosted-service, or production-compliance claims.
- Do not perform hosted mutations or production-provider work.

## Result Of This Slice

This slice records license/source intake and updates guardrails only. It does not add runtime features, dependencies, migrations, APIs, UI, copied production source, hosted behavior, provider behavior, storage behavior, or compliance behavior.

## Next Recommended Slice

Implement the roadmap's global search and command palette slice as a separate PR after this policy PR is merged. That PR should use LedgerByte's existing route registry, tenant/permission filters, and current API surfaces.
