# Vercel Git Deployment Controls

## Purpose

LedgerByte disables automatic Vercel Git deployments for `main` and `codex/**` branches through repo-local Vercel configuration.

This is a deployment-control setting only. It does not change runtime app behavior, provider behavior, storage behavior, compliance posture, hosted data, or production readiness status.

## Configured Branches

The committed Vercel project configs contain:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": false,
      "codex/**": false
    }
  }
}
```

This is present in:

- `vercel.json`
- `apps/api/vercel.json`
- `apps/web/vercel.json`

The setting prevents Vercel Git integration auto-deployments for pushes and merges targeting those branch patterns. It does not remove or disable manual Vercel deployment commands when an authorized operator intentionally runs them.

## Branch Protection

GitHub branch protection must not require Vercel status contexts while automatic Vercel deployments are disabled for protected branches or Codex working branches.

If Vercel contexts remain required after auto-deploy is disabled, PRs can become permanently blocked because Vercel may not create the required deployment status for the disabled branch pattern.

Required contexts should be limited to non-mutating repository verification checks, security checks, and other checks that still run without automatic Vercel deployments.

## Guardrails

- Do not re-enable automatic deployment for `main` or `codex/**` without an explicit approval.
- Do not treat disabled auto-deploy as production hosting proof.
- Do not use this config as approval for hosted migrations, provider calls, storage mutation, compliance submission, or production readiness claims.
