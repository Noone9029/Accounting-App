# LedgerByte Launch Gate Checklist

Planning date: 2026-05-22

Status values:

- `done`: Evidence exists and the gate is satisfied for the named stage.
- `partial`: Some groundwork exists, but more proof or implementation is required.
- `blocked`: Required dependency is unavailable or intentionally deferred.
- `not started`: No meaningful implementation or review exists yet.
- `not required for this stage`: The gate is not required for the named stage, but may be required later.

Current practical stage: controlled beta/user-testing. Vercel is beta/user-testing only, not final production hosting. LedgerByte is not production-launched, and real ZATCA production compliance is not enabled.

## 2026-06-12 Production Trust Foundation Audit Note

- `docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md` and `corepack pnpm production:trust-foundation-gate -- --json --strict` now provide a non-mutating static honesty gate for production-trust posture.
- A strict result of `PRODUCTION_TRUST_FOUNDATION_GATE_PASSED_WITH_BLOCKERS` means the repo is explicit about current blockers. It does not mean any paid-private-beta or public-production gate below has passed.

## Controlled Beta Gate

| Gate | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Core accounting MVP workflows exist | done | AR, AP, banking, reports, documents, roles, audit logs, and inventory workflows are implemented at MVP/partial depth. | Keep scope limited and collect feedback. |
| Beta environment boundary documented | done | Beta testing guide and access management state Vercel is user-testing only. | Keep wording visible in new beta docs. |
| Beta access workflow dry-run | done | Beta access dry run verified mock invite, role changes, suspension/reactivation/suspension for a dummy tester. | Invite real selected testers manually and revoke after testing. |
| Beta feedback intake kit | done | Feedback form, triage guide, and issue templates exist. | Collect completed feedback; current intake has no findings. |
| Accountant review packet | partial | Packet, checklist, findings template, and sample output index exist. | Qualified accountant review findings are still pending. |
| Full smoke | blocked | Narrow deployed phases exist; full smoke remains intentionally pending. | Run only when target environment and credentials are approved. |
| Full E2E | blocked | Manual deployed E2E runbook exists. | Run only against safe non-production data with approved credentials. |
| ZATCA production compliance | not required for this stage | Beta docs state no real ZATCA production compliance. | Keep claims disabled. |
| Real customer data | not required for this stage | Beta guidance requires dummy/test data unless explicitly approved. | Keep beta data policy enforced. |

## Paid Private Beta Gate

| Gate | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Pricing and plan boundaries | not started | No plan model or paid packaging exists. | Define paid private beta plan, limits, and billing model. |
| Billing workflow | not started | No subscription or manual billing process exists. | Decide manual invoicing vs payment provider test/live path. |
| Support workflow | partial | Beta access and triage docs exist. | Add support intake, severity, response targets, and escalation. |
| Production foundation roadmap | done | `PRODUCTION_FOUNDATION_ROADMAP.md`, gap matrix, and launch gates exist. | Convert roadmap items into owned implementation tasks. |
| Hosting decision | blocked | Vercel is documented as beta/user-testing only. | Select paid private beta hosting posture and rollback plan. |
| Database runtime role | blocked | Least-privilege runtime role is designed but not cut over. | Establish safe env mutation path, then validate runtime role. |
| Hosted backup/PITR proof | blocked | Local restore-count drill exists. | Prove hosted database backup/PITR in non-production. |
| Object storage proof | blocked | S3-compatible adapter is feature-flagged groundwork. | Validate real non-production bucket and restore proof. |
| Email production path | partial | SMTP adapter and monitoring evidence groundwork exist. | Validate non-production relay, provider webhook, scheduler, and monitoring. |
| Accountant review | blocked | Packet exists. | Complete review and resolve blocker/high findings. |
| Legal documents | not started | No ToS/privacy/customer policy package exists. | Draft legal package for review. |

## Public Production Gate

| Gate | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Final hosting architecture | blocked | Current Vercel deployment is user-testing only. | Approve production hosting, worker runtime, object storage, rollback, and monitoring. |
| Production database security | blocked | API-layer tenancy exists; Data API grants mitigated in user-testing; RLS/runtime role incomplete. | Runtime role, migration credential split, Data API/RLS strategy, tenant isolation verification. |
| Monitoring and alerting | not started | Health/readiness endpoints and runbooks exist. | Add uptime, API errors, workers, email, backups, storage, and support alerts. |
| Incident response | not started | Deployment troubleshooting docs exist. | Add severity, ownership, rollback, customer communication, and postmortem process. |
| Backup/restore proof | blocked | Local non-production restore-count evidence exists. | Hosted DB/PITR and object-storage restore drills with sanitized evidence. |
| Production email operations | blocked | Mock/local default and opt-in SMTP groundwork exist. | Provider validation, signed webhooks, scheduler, suppression, alerts, invoice/statement sends. |
| Billing/legal | not started | No subscription/billing/legal package exists. | Plans, payments, ToS, Privacy Policy, retention/deletion, refund/cancellation. |
| Product QA | partial | Visual regression and route docs exist. | Real beta feedback, full smoke, full E2E, mobile QA, PDF/accountant review. |
| Security review | blocked | Some redaction and permission controls exist. | MFA/session hardening, runtime DB role, RLS/Data API strategy, secrets/KMS, external review. |
| ZATCA production compliance | blocked | Local/mock/scaffold only. | Pass separate ZATCA compliance gate before any claim. |

## ZATCA-Compliance Gate

| Gate | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Official local references inventoried | done | ZATCA docs and SDK reference maps exist. | Keep updated when official docs change. |
| SDK validation groundwork | partial | Official samples and local generated XML validation paths exist. | Repeatable CI/Docker Java 11-14 path still needed. |
| FATOORA sandbox OTP | blocked | No real OTP/sandbox access is available in repo evidence. | Obtain authorized sandbox access and OTP. |
| Compliance CSID flow | blocked | Mock CSID and custody planning exist. | Implement sandbox-only real flow after key custody is approved. |
| Signing | blocked | Signing plan exists; no signing is implemented. | Implement SDK-verified signing after custody and hash validation. |
| Phase 2 QR | blocked | Basic local QR groundwork exists. | Add cryptographic QR tags after signing/certificate work. |
| Clearance/reporting | blocked | Safe blocked endpoints exist. | Implement sandbox clearance/reporting after signing and CSID. |
| PDF/A-3 | blocked | Planning/checklists exist. | Embed signed XML after signing is stable. |
| Error/retry queue | not started | Retry needs are documented only. | Add queue-backed ZATCA job lifecycle and monitoring. |
| Production compliance claim | blocked | Docs explicitly say compliance is not enabled. | Require sandbox evidence, specialist review, security review, accountant/tax review, and wording approval. |

## Security Gate

| Gate | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Backend permission guards | done | Shared permission strings, guards, and frontend gating exist. | Continue coverage as modules grow. |
| MFA/session controls | not started | Auth uses JWT; no MFA/advanced sessions. | Add MFA, refresh/session policy, invalidation, abuse monitoring. |
| Runtime DB role | blocked | Plan exists; not created due safe env mutation gap. | Create/validate least-privilege runtime role. |
| RLS/Data API strategy | blocked | User-testing grants mitigated; RLS disabled. | Disable Data API or design/test policies. |
| Secrets/KMS | blocked | Redaction exists; ZATCA custody planning disabled. | Choose provider and enforce rotation/access policies. |
| Attachment scanning | not started | Upload/download exists. | Add malware scanning path before broad production uploads. |
| External security review | not started | No external review recorded. | Schedule before public launch. |

## Backup/Restore Gate

| Gate | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Local DB restore drill | done | Local non-production restore-count evidence exists. | Keep as baseline only. |
| Hosted DB backup proof | blocked | No hosted PITR proof recorded. | Verify provider backup/PITR in non-production. |
| Hosted DB restore drill | blocked | No hosted restore drill proof recorded. | Restore non-production snapshot and verify metadata counts. |
| Object-storage backup proof | blocked | No real bucket validation. | Validate object backup/restore with non-production bucket. |
| RPO/RTO review | blocked | Evidence type exists; business review missing. | Define and approve recovery objectives. |
| Backup monitoring | not started | Planning only. | Add alerts for failed backups and stale restore evidence. |

## Monitoring/Support Gate

| Gate | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Web/API uptime checks | not started | Health/readiness endpoints exist. | Add external uptime monitors and alert routing. |
| API error monitoring | not started | No production monitoring stack chosen. | Choose stack and redaction policy. |
| Worker monitoring | not started | Workers are not production-wired. | Add queue dashboards, heartbeats, and dead-letter alerts. |
| Email delivery monitoring | partial | Monitoring evidence model exists. | Connect provider events and external alerts. |
| Support intake | partial | Beta triage docs exist. | Create paid support process, SLAs, and escalation. |
| Status page | not started | No decision recorded. | Decide public status page versus private beta status notes. |

## Billing/Legal Gate

| Gate | Status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Subscription plans | not started | Roadmap mentions SaaS business layer. | Define plans, limits, usage counters, and trial policy. |
| Payment provider | not started | No billing integration. | Choose provider or manual billing path. |
| Tenant provisioning | partial | Organization and invite flows exist. | Add paid onboarding/provisioning runbook. |
| Terms of Service | not started | No legal package. | Draft and review with counsel. |
| Privacy Policy | not started | No legal package. | Draft and review with counsel. |
| Retention/deletion policy | blocked | Audit/storage retention groundwork exists. | Legal/accounting review required; do not guess periods. |
| Cancellation/refund policy | not started | No billing policy exists. | Define before charging customers. |
