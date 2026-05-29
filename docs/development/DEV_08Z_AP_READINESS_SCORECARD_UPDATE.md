# DEV-08Z AP Readiness Scorecard Update

Status: completed readiness documentation update
Date: 2026-05-30
Latest commit inspected: `cbc743ed Document DEV-08 AP production gaps`

## Scope

This document records the DEV-08Z Part 3 readiness update. It reflects that DEV-08 local AP evidence is strong and closed for the DEV-08 scope, while AP is still not production-complete.

This pass was documentation-only. It did not change app code, run runtime mutations, run tests beyond diff checks, deploy, use production/beta/customer data, send real email, run real ZATCA, migrate, seed/reset/delete, or change environment/provider settings.

## Readiness Conclusion

- DEV-08 through DEV-08M are closed as local AP evidence.
- DEV-08Z Part 1 consolidated the local evidence map in [DEV_08Z_AP_LOCAL_EVIDENCE_MAP.md](DEV_08Z_AP_LOCAL_EVIDENCE_MAP.md).
- DEV-08Z Part 2 converted the remaining production gaps into [DEV_08Z_AP_PRODUCTION_GAP_REGISTER.md](DEV_08Z_AP_PRODUCTION_GAP_REGISTER.md).
- Purchases/AP remains a strong local MVP area, but it is not production-complete.
- The Purchases/AP score remains conservative because production, beta, customer-data, real provider email, broad E2E/smoke/full-test, purchase matching, inventory valuation, and advanced receipt/return policy gaps are still open.

## Docs Updated

- [docs/PRODUCT_READINESS_SCORECARD.md](../PRODUCT_READINESS_SCORECARD.md)
- [docs/REMAINING_ROADMAP.md](../REMAINING_ROADMAP.md)
- [docs/PROJECT_AUDIT.md](../PROJECT_AUDIT.md)
- [docs/IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md)
- [BUG_AUDIT.md](../../BUG_AUDIT.md)
- [README.md](../../README.md)
- [CODEX_HANDOFF.md](../../CODEX_HANDOFF.md)

## AP Local Evidence Status

- Local AP state-machine evidence covers purchase bills, supplier payments, debit notes, supplier refunds, purchase orders, cash expenses, inventory-clearing purchase bills, purchase receipts, generated-document output/archive/download paths, AP output permissions, generated-document mock email outbox behavior, fiscal/permission blockers, and cleanup/retention policy.
- The evidence is local-only and marker/fixture scoped.
- It does not prove hosted/beta/production behavior, customer-data behavior, real provider email delivery, real ZATCA behavior, broad AP E2E/smoke/full-test coverage, or accountant/compliance certification.

## Production Caveats

- Linked PO-to-bill receipt reconciliation remains unproven.
- Valuation variance booking, landed cost, purchase returns, serial/batch/bin/location behavior, and broader inventory accounting policy remain future work.
- Real provider AP email delivery, retry scheduling, webhooks, sender-domain policy, monitoring, and support readiness remain unproven.
- Duplicate generated-document rows are currently treated as append-only versioned archive behavior for paid v1; latest/supersession UX remains a product/legal/audit policy task.
- Cleanup execution is not implemented. DEV-08M only approved a local dry-run-only, count-only planner and preserve-by-default policy.
- Broad AP E2E, full smoke, full build, full tests, load/concurrency, deployed/beta verification, production behavior, and customer-data behavior remain outside DEV-08 local evidence.
- Real ZATCA network/signing/clearance/reporting/PDF-A3 behavior remains outside AP local evidence.

## Next Thread

`DEV-08Z Part 4: AP final closure`
