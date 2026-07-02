# ASP Sandbox Onboarding Checklist

Status: future checklist
Date: 2026-07-02

Do not start this checklist until ASP access is available and approved.

## Provider Intake

- provider name
- legal entity and contract owner
- sandbox URL and documentation
- authentication method
- webhook signing method
- idempotency rules
- retry/error code rules
- evidence download/retention rules
- certification/accreditation claims allowed by provider

## Security Review

- credentials stored only in secret manager
- no credentials in docs, git, logs, screenshots, or support tickets
- webhook signatures verified
- replay protection enabled
- provider URLs allowlisted per environment
- test secrets distinct from production secrets

## Go/No-Go

Go requires successful sandbox validation, contract tests, evidence capture, support runbook, legal review, and conservative UI wording. No-go if any provider behavior is undocumented or requires unreviewed production credentials.
