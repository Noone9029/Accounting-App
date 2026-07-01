# Controlled Beta Launch Packet

Date: 2026-07-01

Status: Prepared for owner review. No real tester invite was sent, no production launch was performed, and no hosted system was mutated by this packet.

## Decision

LedgerByte is `GO with restrictions` for a small controlled beta of 3 to 5 approved testers after owner approval.

## Test Environment

- Web test URL: `https://ledgerbyte-web-test.vercel.app`
- API test URL: `https://ledgerbyte-api-test.vercel.app`
- Supabase test project: `xynelbjqcmbgtscfmmzv`
- Data posture: seeded demo/test data only.

This is a user-testing environment, not production.

## Launch Packet Answers

| Question | Answer |
| --- | --- |
| Who can test? | 3 to 5 approved friendly, internal, accountant/bookkeeper, SME owner, or operator testers. |
| What are they allowed to do? | Log in, inspect assigned routes, follow owner/accountant scripts, use demo/test data, and report feedback. |
| What must they not do? | Do not use production data, send real emails, collect payments, run provider/compliance/storage/banking mutations, or rely on beta output for official accounting/tax/legal/audit use. |
| How do they log in? | Use `/login` on the web test URL with credentials provided separately through an approved private channel. |
| What routes/workflows should they test? | Dashboard, sales invoices, quotes, customers, suppliers, purchase bills, bank accounts, reconciliation history, items, reports, documents, settings, storage, compliance, setup, and security/settings placeholder honesty. |
| What features are real? | Controlled login, assigned test org access, route inspection, demo/test workflow review, feedback capture, triage, support, access, and revocation process. |
| What features are limited? | Accounting workflows, reports, statements, ledgers, PDFs, documents, banking, storage, and compliance are review/readiness surfaces for beta feedback only. |
| What is not production-ready? | Public launch, paid plans, production tax filing, ZATCA/UAE/Peppol/ASP, real providers, live bank feeds, real payments, production email, object storage, signed URLs, and sensitive production data handling. |
| How is feedback captured? | Use `BETA_FEEDBACK_FORM_TEMPLATE.md`, with redacted screenshots/videos only. |
| How are issues triaged? | Use `BETA_ISSUE_TRIAGE_RUNBOOK.md` severity and SLA definitions. |
| What counts as blocker/high/medium/low? | Blocker risks workflow/data/trust/security/compliance; high is core workflow confusion or visible breakage; medium has workaround; low is polish. |
| Who handles support? | `<CONTROLLED_BETA_SUPPORT_OWNER>` and `<CONTROLLED_BETA_TRIAGE_OWNER>` placeholders must be replaced before invites. |
| How is access revoked? | Use `BETA_ACCESS_REVOCATION_CHECKLIST.md`; suspend/disable access, preserve redacted evidence, and verify no production data was entered. |
| When can beta expand? | Only after blocker count is 0, high issues are 0 or owner-accepted with workaround, revocation works, support capacity is confirmed, and owner approval is recorded. |
| When must beta stop? | Stop for blockers, security/privacy concerns, production-claim wording, prohibited data entry, failed revocation, support failure, or owner withdrawal. |

## Packet Index

- [Launch plan](CONTROLLED_BETA_LAUNCH_01_PLAN.md)
- [Tester profile](CONTROLLED_BETA_TESTER_PROFILE.md)
- [Restrictions](CONTROLLED_BETA_RESTRICTIONS.md)
- [Acknowledgement template](BETA_TESTER_ACKNOWLEDGEMENT_TEMPLATE.md)
- [Onboarding guide](TESTER_ONBOARDING_GUIDE.md)
- [Walkthrough script](CONTROLLED_BETA_WALKTHROUGH_SCRIPT.md)
- [Feedback form](BETA_FEEDBACK_FORM_TEMPLATE.md)
- [Issue triage runbook](BETA_ISSUE_TRIAGE_RUNBOOK.md)
- [Access checklist](BETA_ACCESS_CHECKLIST.md)
- [Revocation checklist](BETA_ACCESS_REVOCATION_CHECKLIST.md)
- [Go/no-go checklist](CONTROLLED_BETA_GO_NO_GO_CHECKLIST.md)

## Evidence Links

- [BETA_FIX_01_PLAN.md](BETA_FIX_01_PLAN.md)
- [BETA_FIX_01_RESULTS.md](BETA_FIX_01_RESULTS.md)
- [BETA_FIX_01_VISUAL_SHARD_PLAN.md](BETA_FIX_01_VISUAL_SHARD_PLAN.md)
- [BETA_FIX_01_LIVE_ENVIRONMENT_CHECK.md](BETA_FIX_01_LIVE_ENVIRONMENT_CHECK.md)
- [BETA_FIX_01_LIVE_WALKTHROUGH_RESULTS.md](BETA_FIX_01_LIVE_WALKTHROUGH_RESULTS.md)
- [BETA_WALKTHROUGH_ISSUE_LOG.md](BETA_WALKTHROUGH_ISSUE_LOG.md)
- [REDESIGNED_FRONTEND_BETA_WALKTHROUGH.md](REDESIGNED_FRONTEND_BETA_WALKTHROUGH.md)
- [../PRODUCT_READINESS_SCORECARD.md](../PRODUCT_READINESS_SCORECARD.md)

## Known Limitations

- Public/marketing/auth desktop/tablet/mobile visual fixture depth remains thinner than authenticated route coverage.
- Test environment is not production.
- No paid SaaS launch.
- No production compliance launch.
- No real provider access or ASP access.
- No object-storage or signed-URL production proof.
- No live bank feeds.
- No real payment collection.
- No production customer email sending guarantee.
- No official accounting, legal, tax, audit, filing, or compliance reliance.

## Next Required Approval

Before inviting testers, the owner must approve:

- Tester list.
- Support contact.
- Triage owner.
- Beta window.
- Access roles.
- Data restrictions.
- Acknowledgement use.
- Revocation owner.

Next recommended goal: `CONTROLLED-BETA-PROVISION-01`.
