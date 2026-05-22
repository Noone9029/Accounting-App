# LedgerByte Codex Handoff

## Latest Commit Inspected

- `5d6bc7b Create production implementation backlog`

## Current PROD-A1 Objective

- Prepare `PROD-A1 Final hosting ADR` by inventorying final production hosting requirements before drafting the ADR.
- The next pass should compare final production hosting options separately from the current Vercel user-testing deployment.
- Keep the first PROD-A1 pass docs-only: requirements inventory, constraints, open questions, and ADR inputs only.

## Current Vercel Posture

- Vercel is the current beta/user-testing and staging path only.
- Do not treat Vercel as accepted final production hosting.
- Current user-testing targets are `ledgerbyte-api-test` and `ledgerbyte-web-test`, backed by Supabase Postgres for testing.
- Any final production hosting decision must account for API runtime fit, background workers, queues, logs, rollback, secrets, storage, database connectivity, cost, support, and operational load.

## Known Blockers

- `ADR-001 Final production hosting provider` is still pending.
- Production database provider and least-privilege Prisma runtime role decisions remain unresolved.
- Supabase RLS/Data API strategy remains unresolved; current user-testing mitigation is not a production launch posture.
- Backup/PITR proof, restore drill, object storage policy, monitoring stack, secrets management, incident/support process, billing/legal ownership, and ZATCA production strategy remain open production-foundation work.
- Full deployed smoke and full deployed E2E are not current production launch gates until a safe approved non-production target and credential/data policy are defined.
- Real ZATCA production compliance is not enabled; CSID, signing, clearance/reporting, PDF/A-3, real ZATCA network calls, production credentials, and production compliance claims remain blocked.

## Forbidden Actions For Next PROD-A1 Thread

- Do not change app code.
- Do not deploy, provision, migrate, seed, reset, delete, or change environment variables.
- Do not change Supabase RLS, runtime DB roles, Vercel settings, ZATCA behavior, emails, accounting logic, or customer data.
- Do not create the ADR until the hosting requirements inventory is complete.
- Do not research the web unless the user explicitly widens scope.
- Do not touch unrelated web/marketing worktree changes.

## Next Thread Prompt

`PROD-A1 Part 1: hosting requirements inventory`
