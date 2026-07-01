# CONTROLLED-BETA-LAUNCH-01 Plan

Date: 2026-07-01

Branch: `codex/controlled-beta-launch-01`

Baseline inspected: `7ad87c5730db9dd1082dc71214567805722b260c`

## Current Baseline

LedgerByte has passed the redesigned frontend and beta evidence gates needed for a small controlled beta. PR #215 closed the remaining beta evidence blockers:

- Visual evidence blocker closed with 1,077/1,077 required Playwright visual tests passing by direct specs or documented splits.
- Live walkthrough blocker closed with 23/23 non-mutating checks passing against the deployed Vercel/Supabase test stack.
- API readiness returned `database: ok`, login worked, shell controls worked, seeded reconciliation history loaded, and core route families loaded.
- Remaining issue count is blocker 0, high 0, medium 0, low 1 for public/marketing/auth visual fixture depth.

## Current Test Environment

Use this environment for controlled beta preparation only:

- Web test URL: `https://ledgerbyte-web-test.vercel.app`
- API test URL: `https://ledgerbyte-api-test.vercel.app`
- Supabase test project: `xynelbjqcmbgtscfmmzv`
- Review database: seeded demo/test data only.

Do not treat this environment as production. Do not mutate Supabase production, Vercel environment variables, hosted migrations, or non-disposable data as part of this launch packet.

## Decision

Current decision: `GO with restrictions` for controlled beta.

This decision allows preparation for inviting 3 to 5 approved testers after owner approval. It does not approve public launch, production launch, paid SaaS launch, compliance launch, or production data use.

## Launch Scope

The first controlled beta is limited to:

- 3 to 5 approved friendly, internal, accountant, SME owner, or operator testers.
- Test/demo data in the hosted user-testing environment.
- Guided read/inspect workflows and tightly scoped beta scripts.
- Structured feedback, screenshots, and issue triage.
- Manual support and manual access revocation.

## Real, Limited, and Not Production-Ready Features

Real for controlled beta review:

- Login and assigned organization access in the test environment.
- Dashboard, sales, quotes, customers, suppliers, purchases, banking/reconciliation review, inventory, reports, documents, settings, storage readiness, compliance readiness, setup, and security/settings route inspection.
- Demo/test data walkthroughs.
- Feedback capture, issue triage, access checklist, revocation checklist, and go/no-go process.

Limited in controlled beta:

- Accounting workflows are for guided beta review only, not official close or audit reliance.
- Reports, statements, ledgers, PDFs, and document archive surfaces are for review only.
- Banking is manual/test-data review only.
- Compliance, storage, and provider surfaces are readiness/status surfaces only.

Explicitly not production-ready:

- Public launch, paid SaaS launch, production tax filing, production ZATCA, production UAE/Peppol/ASP, real provider access, live bank feeds, real payment collection, production email guarantee, production object-storage proof, production signed-URL proof, production backup/restore proof, and sensitive production data handling.

## Launch Exclusions

This beta does not include:

- Public signup or public launch.
- Paid plans, subscriptions, billing, or payment collection.
- Production ZATCA compliance, UAE compliance, Peppol certification, or ASP connectivity.
- Real provider submissions, real ASP submissions, CSID requests, OTP handling, tax-authority submission, clearance, reporting, or PDF/A-3 reliance.
- Live bank feeds, bank aggregation, or automatic reconciliation claims.
- Production object-storage proof or signed-URL proof.
- Real customer email delivery guarantees.
- Production accounting, legal, audit, or tax filing reliance.

## Target Tester Profile

Invite only testers who understand the product is controlled beta software:

- Friendly testers who can give candid workflow feedback.
- Internal reviewers.
- Accountant/bookkeeper reviewers.
- SME owners willing to test demo data.
- Operators who understand the system is not production-ready.

Do not invite paying customers, public signup users, or users who require production compliance, live bank feeds, real payment collection, production email delivery, or sensitive production financial data entry.

## Safety Rules

- Use only assigned beta accounts and organizations.
- Share credentials or invite links only through an approved private channel; do not commit them to docs.
- Use test/demo data unless a separate written data policy approves otherwise.
- Do not upload raw bank statements, IDs, contracts, payroll, production tax documents, signed XML, QR payloads, or attachment bodies.
- Do not click destructive, provider, payment, email-send, storage-migration, backup/restore, ZATCA, UAE, Peppol, ASP, seed/reset/delete, or compliance-submission actions.
- Report confusing or unsafe wording immediately.

## Required Docs

- [CONTROLLED_BETA_TESTER_PROFILE.md](CONTROLLED_BETA_TESTER_PROFILE.md)
- [CONTROLLED_BETA_RESTRICTIONS.md](CONTROLLED_BETA_RESTRICTIONS.md)
- [BETA_TESTER_ACKNOWLEDGEMENT_TEMPLATE.md](BETA_TESTER_ACKNOWLEDGEMENT_TEMPLATE.md)
- [TESTER_ONBOARDING_GUIDE.md](TESTER_ONBOARDING_GUIDE.md)
- [CONTROLLED_BETA_WALKTHROUGH_SCRIPT.md](CONTROLLED_BETA_WALKTHROUGH_SCRIPT.md)
- [BETA_FEEDBACK_FORM_TEMPLATE.md](BETA_FEEDBACK_FORM_TEMPLATE.md)
- [BETA_ISSUE_TRIAGE_RUNBOOK.md](BETA_ISSUE_TRIAGE_RUNBOOK.md)
- [BETA_ACCESS_CHECKLIST.md](BETA_ACCESS_CHECKLIST.md)
- [BETA_ACCESS_REVOCATION_CHECKLIST.md](BETA_ACCESS_REVOCATION_CHECKLIST.md)
- [CONTROLLED_BETA_GO_NO_GO_CHECKLIST.md](CONTROLLED_BETA_GO_NO_GO_CHECKLIST.md)
- [CONTROLLED_BETA_LAUNCH_PACKET.md](CONTROLLED_BETA_LAUNCH_PACKET.md)

## Exact Launch Gates

| Gate | Required evidence | Current status |
| --- | --- | --- |
| Evidence gate | PR #215 beta evidence blockers closed | Pass |
| Tester scope gate | 3 to 5 approved testers only | Pass with restriction |
| Data safety gate | Test/demo data only unless separately approved | Pass with restriction |
| Legal/disclaimer gate | Acknowledgement template prepared, not final legal advice | Pass with restriction |
| Support gate | Manual support owner and escalation path identified before invites | Pass with restriction |
| Access gate | Account, role, org, start, and end date recorded before invite | Pass with restriction |
| Revocation gate | Access suspension/revocation plan ready before invite | Pass with restriction |
| Compliance wording gate | No production compliance/provider/banking/payment/storage claims | Pass with restriction |

## Stop Conditions

Pause or stop the beta if any of these occur:

- A blocker issue appears.
- A security/privacy issue exposes secrets, tokens, tenant data, or cross-organization access.
- A tester enters sensitive production financial data without approval.
- Any screen or doc implies production readiness, ZATCA compliance, UAE compliance, Peppol certification, ASP connectivity, live bank feeds, payment readiness, object-storage readiness, signed-URL readiness, or beta readiness without restrictions.
- A core workflow is visibly broken or materially misleading.
- Access cannot be revoked promptly.
- Support cannot respond within the beta SLA.
- The product owner withdraws approval or the beta window expires.

## Next Step

After this packet is approved, the next goal is `CONTROLLED-BETA-PROVISION-01`: provision approved controlled beta testers and run first real tester onboarding, only after owner approval.
