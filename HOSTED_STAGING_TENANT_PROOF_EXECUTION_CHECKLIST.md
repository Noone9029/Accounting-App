# Hosted Staging Tenant Proof Execution Checklist

Status: `OWNER FILL REQUIRED - DO NOT EXECUTE UNTIL ALL CHECKS PASS`

Use this checklist immediately before running the hosted staging tenant read-only proof. Every box must be checked by the owner or execution lead. If any check cannot be completed, stop and do not run the hosted probe.

## Packet Completeness

- [ ] `HOSTED_STAGING_TENANT_PROOF_PACKET.md` is complete.
- [ ] Approval reference is present.
- [ ] Staging URL is present.
- [ ] Proof-run ID is present and unique.
- [ ] Synthetic tenant A ID is present.
- [ ] Synthetic tenant B ID is present.
- [ ] Synthetic tenant A and tenant B IDs are distinct.
- [ ] Synthetic user/auth method is documented.
- [ ] Bearer token env var name is `LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN`.
- [ ] Bearer token is supplied out of band and is not written to git, docs, chat, command history, or final reports.
- [ ] Evidence owner is present.
- [ ] Rollback/contact owner is present.
- [ ] Evidence destination is present.

## URL And Data Safety

- [ ] URL is explicitly staging, beta, sandbox, test, or dedicated proof.
- [ ] URL is not production or production-looking.
- [ ] URL is not customer-data-bearing.
- [ ] Customer-data exclusion is confirmed.
- [ ] Synthetic data only is confirmed.
- [ ] The token/user has tenant A read permissions for auth, dashboard, search, and reports.
- [ ] The token/user has no active membership in tenant B.

## Method And Endpoint Limits

- [ ] The approved endpoint list contains only `GET` requests.
- [ ] The approved endpoint list exactly matches the current read-only harness checks:
  - `GET /auth/me`
  - `GET /dashboard/summary` for tenant A
  - `GET /search?query=LB-TENANT-PROOF:<proof-run-id>` for tenant A
  - `GET /reports/profit-and-loss?from=2026-01-01&to=2026-12-31` for tenant A
  - `GET /dashboard/summary` for tenant B with the tenant A token, expecting `403`
- [ ] No `POST`, `PATCH`, `PUT`, or `DELETE` request is approved.
- [ ] No endpoint outside the approved list is approved.
- [ ] No export, PDF, attachment body, document body, invoice body, report body, or provider payload is approved for capture.

## Forbidden Operation Confirmation

- [ ] No hosted migrations are allowed.
- [ ] No hosted mutations are allowed.
- [ ] No seed/reset/delete/truncate/purge operation is allowed.
- [ ] No `security:cleanup -- --execute` or other cleanup execute mode is allowed.
- [ ] No broad cleanup is allowed.
- [ ] No Supabase, Vercel, deployment, or production mutation command is allowed.
- [ ] No provider/storage API call is allowed.
- [ ] No signed URL generation is allowed.
- [ ] No email, payment, bank-feed, ZATCA, Peppol, or ASP call is allowed.

## Environment Gates

- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT=staging` is approved.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL` is set to the approved staging URL.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID` is set to the approved proof-run ID.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID` is set to the approved synthetic tenant A ID.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID` is set to the approved synthetic tenant B ID.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN` is set out of band and not printed.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1` is explicitly approved.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1` is explicitly approved.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW` is unset.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_PRODUCTION_READONLY_ALLOW` is unset.
- [ ] `LEDGERBYTE_HOSTED_TENANT_PROOF_PRODUCTION_OVERRIDE` is unset.

## Preflight Checks

- [ ] Worktree is clean before execution.
- [ ] `apps/web/next-env.d.ts` has no generated churn.
- [ ] Local verification for the proof branch has passed.
- [ ] Targeted secret scan on packet/checklist/evidence files has no real secrets.
- [ ] The packet validator passes without network access.
- [ ] No `.env`, token, database URL, service-role key, cookie, auth header, customer data, document body, attachment body, signed XML, QR payload, or provider payload is staged or committed.

## Execution Command

Run only this command after every previous check is complete:

```powershell
corepack pnpm tenant-isolation:proof -- --mode staging-read-only-probe --environment staging --proof-run-id $env:LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID --base-url $env:LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL
```

Do not add flags. Do not use `staging-synthetic-proof`. Do not set mutation allow.

## Evidence Sanitization

- [ ] Evidence contains only commit SHA, proof-run ID, target classification, safe host, check IDs, HTTP statuses, and pass/fail results.
- [ ] Evidence confirms `mutationAttempted=false`.
- [ ] Evidence confirms `responseBodyCaptured=false`.
- [ ] Evidence confirms hosted migrations were not run.
- [ ] Evidence confirms hosted mutations were not run.
- [ ] Evidence confirms cleanup execute was not run.
- [ ] Evidence confirms provider/storage APIs were not called.
- [ ] Evidence confirms signed URLs were not generated.
- [ ] Evidence confirms no customer data was used.
- [ ] Evidence does not contain tokens, cookies, auth headers, database URLs, service-role keys, storage credentials, response bodies, customer data, signed XML, QR payloads, private keys, provider payloads, or full screenshots/logs exposing forbidden data.

## Stop Conditions

Stop immediately if:

- [ ] Any packet value is missing.
- [ ] The URL is unsafe, production-looking, customer-data-bearing, or not clearly staging/beta/sandbox/test/proof.
- [ ] The bearer token is missing.
- [ ] The bearer token is printed, pasted, logged, staged, or committed.
- [ ] Tenant A and tenant B IDs are equal.
- [ ] Tenant B non-membership is not confirmed.
- [ ] Any endpoint is not `GET`.
- [ ] Any mutation method is suggested or attempted.
- [ ] Any hosted migration is suggested or attempted.
- [ ] Cleanup execute is suggested or attempted.
- [ ] A provider/storage API call is suggested or attempted.
- [ ] The harness reports `safety=refused`.
- [ ] The harness reports `productionLooking=true`.
- [ ] Any tenant A read returns `401`, `403`, `404`, or `5xx`.
- [ ] Tenant B dashboard returns `2xx` or otherwise succeeds with the tenant A token.
- [ ] Evidence includes secrets, response bodies, or customer data.

## Post-Run Cleanup

- [ ] Clear all `LEDGERBYTE_HOSTED_TENANT_PROOF_*` environment variables.
- [ ] Run a targeted secret scan on any evidence files before sharing.
- [ ] Confirm no hosted migrations, hosted mutations, cleanup execute, provider/storage API calls, signed URLs, or customer-data access occurred.
- [ ] Hand off any refusal or cross-tenant success to the rollback/contact owner.
