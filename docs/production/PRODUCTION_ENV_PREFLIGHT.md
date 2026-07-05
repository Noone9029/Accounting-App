# Production Environment Preflight

This preflight adds a local/read-only production environment posture check for LedgerByte.

It does not replace the approved deployment process, hosted migration process, or production secret-store review.

## Command

```bash
corepack pnpm production:env-preflight -- --json
```

For a production-like profile, run it only inside an approved target environment or with synthetic local values:

```bash
corepack pnpm production:env-preflight -- --json --strict
```

## Safety Contract

- No network calls.
- No database connections.
- No hosted mutations.
- No hosted migrations.
- No provider calls.
- No `security:cleanup -- --execute`.
- No file writes.
- No secret values printed.

The script reads selected environment values only to classify whether production-like settings are present and safe. Output includes variable names and status messages only, not values, hosts, database names, passwords, tokens, or connection strings.

## Checks

- `JWT_SECRET` is present, not a placeholder, and meets the production minimum length.
- `CORS_ORIGIN` is present, HTTPS-only, not wildcard-all, and not localhost for production-like profiles.
- Auth cookie settings do not explicitly disable secure cookies, and `SameSite=None` requires secure cookies.
- `NEXT_PUBLIC_API_URL`, when present, is HTTPS and not localhost for production-like profiles.
- `DATABASE_URL` is a valid Postgres URL and not local for production-like profiles.
- `DIRECT_URL`, when present, is a valid Postgres URL and is not identical to `DATABASE_URL`.
- Root `security:cleanup`, `security:cleanup:dry-run`, and `security:cleanup:execute` scripts are present and point at the expected commands.

## Boundaries

A passing local preflight does not prove live provider-side environment values unless the command is run inside the approved target environment. Hosted migrations must still run only through the approved deployment process. Production cleanup execute mode must still follow `docs/SECURITY_MAINTENANCE_RUNBOOK.md` and owner approval.

## Remaining Production Work

- Hosted migrations through the approved deployment process.
- Production secret-store verification without printing values.
- CORS and cookie domain confirmation for the final web/API topology.
- Production cleanup dry-run review before any execute-mode scheduling.
- Monitoring/logging provider setup.
- Hosted backup/PITR and restore proof.
- Rollback and manual browser smoke evidence.
