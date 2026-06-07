# ZATCA Sandbox Adapter Mock-to-Real Boundary Runbook

## Scope

This runbook describes the safe static-only boundary check between mock, disabled, and sandbox adapter paths. It does not authorize real adapter execution.

## Operator checklist

1. Confirm the latest pushed commit and working tree.
2. Confirm required ZATCA guard docs and scripts exist.
3. Confirm no unrelated dirty files are staged.
4. Run the boundary check with `--no-network` and `--static-only`.
5. Review metadata-only output.
6. Confirm all runtime side-effect flags remain false.
7. Record blockers without copying secrets, env values, request bodies, response bodies, or source snippets.

## Safe command shape

Placeholder command:

```bash
corepack pnpm zatca:sandbox-adapter-boundary-check -- --plan --no-network --json --static-only
```

No command in this runbook should include OTP values, CSID material, auth headers, env values, request bodies, response bodies, certificate bodies, or private-key bodies.

## Static boundary checklist

- Sandbox adapter file found.
- Disabled adapter file found.
- Mock adapter file found.
- Adapter interface shape found.
- Mock-only boundary detected.
- Disabled fail-closed boundary detected.
- Sandbox risk path detected by counts only.
- Env gate references detected by name only.
- Custody dependency detected by file presence and safe keywords only.

## No-network checklist

- `--no-network` is present.
- Network modules are not imported by the guard.
- Sandbox adapter module is not imported or executed.
- Mock adapter module is not imported or executed.
- DB modules are not imported.
- Child-process modules are not imported by the guard.

## Request/response boundary checklist

- Request body created: false.
- Response body processed: false.
- Request body persisted: false.
- Response body persisted: false.
- Request/response body printed: false.
- Source snippets printed: false.

## Custody checklist

- Custody provider source exists.
- Metadata custody model exists.
- Custody provider approval remains false until a future custody implementation sprint.
- Legacy raw PEM-capable fields remain blockers.
- Real CSID response material must not enter normal app tables.

## Env and redaction checklist

- Env presence only, booleans only.
- Env values exposed: false.
- OTP requested: false.
- Secret/body exposure: false.
- Auth header printed: false.
- Token/certificate/private-key body exposed: false.

## Abort conditions

Abort and do not proceed if:

- `--no-network` is absent.
- A required adapter file is missing.
- The disabled fail-closed adapter cannot be detected.
- The mock-only boundary cannot be detected.
- Output contains env values, OTPs, tokens, secrets, auth headers, request bodies, response bodies, certificate bodies, or private-key bodies.
- Any command attempts network, DB connection, DB write, adapter execution, request body creation, or response body processing.

## Evidence fields to collect

- Command run.
- Status observed.
- Adapter file booleans.
- Boundary booleans.
- Side-effect flags.
- Blockers.
- Warnings.
- Next prompt.

## Fields forbidden from evidence

- Real URLs.
- OTP values.
- CSID material.
- Tokens.
- Secrets.
- Auth headers.
- Env values.
- Request bodies.
- Response bodies.
- Certificate bodies.
- Private-key bodies.

## Failure behavior

The guard fails closed for missing `--no-network` and for fatal missing boundary files. Execution-readiness blockers are expected and must remain documented until future approval gates are completed.

## Next stage

`ZATCA sandbox adapter no-network contract tests`
