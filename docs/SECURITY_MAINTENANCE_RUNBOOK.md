# Security Maintenance Runbook

Date: 2026-07-04

This runbook covers the `security:cleanup` maintenance command for LedgerByte auth-security records. It is an operational procedure only. It does not add a public route, hosted migration, long-running worker, or automatic production mutation.

## Purpose

`security:cleanup` removes stale security records that are no longer needed for active authentication or login throttling:

- Expired or revoked `AuthSession` rows after a conservative retention window.
- Stale `LoginRateLimit` rows after the throttle window and retention window have both elapsed.

The command prints aggregate counts only. It must not print raw JWTs, cookies, `jti` values, passwords, raw emails, raw IPs, database URLs, or secrets.

## Records Preserved

The cleanup must preserve:

- Active, unexpired auth sessions.
- Recently revoked sessions still inside the revoked-session retention window.
- Recently expired sessions still inside the expired-session retention window.
- Login throttle rows inside the active throttle window.
- Currently locked login throttle rows.
- Recently updated login throttle rows still inside cleanup retention.

## Commands

Help:

```bash
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --help
```

Dry-run, default and safe:

```bash
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run
```

Execute, explicit mutation mode:

```bash
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --execute
```

Optional batch size:

```bash
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run --batch-size=500
```

Root helpers are also available:

```bash
corepack pnpm security:cleanup
corepack pnpm security:cleanup:dry-run
corepack pnpm security:cleanup:execute
```

`security:cleanup` and `security:cleanup:dry-run` are dry-run paths unless `--execute` is passed to the underlying API script. Use `security:cleanup:execute` only after the dry-run review steps below pass.

## Environment

Required runtime variables:

- `DATABASE_URL`: API runtime database connection string.
- `DIRECT_URL`: direct Prisma database URL when running Prisma CLI or migrations. The cleanup command itself uses normal runtime Prisma access through `DATABASE_URL`.
- `JWT_SECRET`: required by the auth module in non-development environments.

Cleanup tuning variables:

- `AUTH_SESSION_CLEANUP_EXPIRED_RETENTION_DAYS`: default `30`.
- `AUTH_SESSION_CLEANUP_REVOKED_RETENTION_DAYS`: default `30`.
- `LOGIN_RATE_LIMIT_CLEANUP_RETENTION_DAYS`: default `7`.
- `SECURITY_CLEANUP_BATCH_SIZE`: default `500`.

Invalid or missing positive-integer cleanup values fall back to conservative defaults. Do not use zero-day retention in production unless a separate security and operations review approves it.

## Dry-Run-First Procedure

1. Confirm the target environment and database are the intended environment.
2. Confirm no local shell history, logs, docs, or issue text include connection strings or secrets.
3. Run help output first:

   ```bash
   corepack pnpm --filter @ledgerbyte/api security:cleanup -- --help
   ```

4. Run dry-run:

   ```bash
   corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run
   ```

5. Review aggregate counts:
   - `AuthSession eligible`
   - `AuthSession eligibleByReason`
   - `LoginRateLimit eligible`
   - `deleted` counts must be `0` in dry-run mode.
6. If counts are unexpectedly high, stop and investigate retention settings, system time, database target, and recent auth activity.
7. Record the command outcome counts in the operational log. Do not copy connection strings, tokens, cookies, emails, IPs, or row identifiers.

Initial production use must be dry-run only.

## Execute Procedure

Run execute only after dry-run counts are reviewed and approved by the responsible operator:

```bash
corepack pnpm --filter @ledgerbyte/api security:cleanup -- --execute
```

Execution checklist:

- Dry-run was run against the same target shortly before execute.
- Dry-run counts were reviewed and accepted.
- The target database is not an accidental developer, staging, or production mix-up.
- Retention variables are present or intentionally left at defaults.
- A backup/PITR posture exists for the target environment.
- No hosted migration or seed/reset command is being run as part of this cleanup.
- The operator is running from the deployment platform or approved operations environment, not casually from a developer machine.

Execute mode deletes only eligible rows by ID batches. It does not delete active sessions or current throttle rows when configured with the default logic.

## Suggested Schedule

No scheduler configuration is committed in this branch because the repository has Vercel deployment configs and manual/PR GitHub workflows, but no established safe production maintenance scheduler pattern.

Suggested future schedule:

- Daily or weekly dry-run is safe once a production operations scheduler exists.
- Execute can be daily or weekly only after dry-run counts are monitored and the schedule is approved.
- Execute scheduling should run through the deployment platform or an approved operations runner with managed secrets, not from a developer workstation.

If a future scheduler is added, start with dry-run only and make execute mode opt-in through a separate approved change.

## After Running

Check:

- Exit code is `0`.
- Output includes only aggregate counts.
- Dry-run deleted counts are `0`.
- Execute deleted counts are not higher than the reviewed eligible counts.
- API login still works.
- Logout still revokes the current session.
- Recent failed-login throttling still works.
- Error logs do not contain secrets or raw identifiers.

## Stop And Rollback

Stop immediately if:

- The command points at the wrong environment.
- Counts are unexpectedly high.
- Output contains sensitive values.
- The database is unavailable or migrations appear out of sync.
- Login, logout, or throttling behavior degrades after execution.

Rollback options:

- Do not rerun execute mode.
- Disable any external scheduler that invoked the command.
- Restore from approved database backup/PITR if business impact requires it.
- Ask users to sign in again if stale auth sessions were removed more aggressively than intended.
- File an incident note with command mode, aggregate counts, environment label, timestamp, and operator. Do not include secrets or raw record identifiers.

## Troubleshooting

Local Postgres not reachable:

```text
Can't reach database server at `localhost:5432`
```

Use one of these fixes:

- Start local infrastructure:

  ```bash
  docker compose -f infra/docker-compose.yml up
  ```

- Confirm `DATABASE_URL` host, port, username, password, and database name.
- Confirm local migrations have been applied before expecting cleanup counts.
- For hosted targets, run only from the approved operations environment with managed secrets.

Other failures:

- Unknown flags should fail non-zero before the app context starts.
- Invalid `--batch-size` values should fail non-zero.
- Prisma connection failures should fail non-zero and print a sanitized error.
- Do not paste database URLs into tickets or logs when asking for help.

## Scheduler Decision For This Branch

Scheduler config was intentionally skipped. The inspected repo has:

- Vercel app configs without `crons`.
- GitHub workflows for PR verification and manually dispatched deployed E2E, not recurring maintenance.
- Local Docker Compose for development infrastructure only.

Adding a new scheduler framework or automatic hosted mutation from this branch would widen scope and create operational risk. The next scheduler step should be a separate production-operations task that starts with scheduled dry-run only.
