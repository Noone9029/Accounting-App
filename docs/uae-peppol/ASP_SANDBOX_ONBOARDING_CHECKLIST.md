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

## Pre-Access Package Gates

Before any future sandbox URL or credential is introduced, keep these local package gates passing:

- official/readiness serializer mode tests prove readiness XML is not treated as provider-submittable output.
- disabled provider tests prove `BLOCKED_NO_ASP` and no network.
- mock provider tests prove deterministic local IDs and `_MOCK` statuses only.
- webhook tests use fake local secrets, timestamp freshness, duplicate rejection, and redacted normalized payloads.
- error-normalization tests prove no raw request/response body, token, or secret is returned.

If a provider asks for a status, evidence artifact, endpoint URL, certificate, or secret format that is not covered by these local contracts, update the package tests before enabling any integration path.

## UAE-PRE-ASP-ADAPTER-03 Pre-Access Package Gates

Before any future sandbox URL, credential, or provider envelope is introduced, these additional local gates must remain true:

- draft invoice and draft credit-note helpers return `productionCompliance: false` and `aspSubmissionReady: false`.
- draft validators return stable structured errors/warnings without throwing for normal validation failures.
- serializer boundary metadata distinguishes readiness XML, official draft payloads, blocked provider submission, and production-compliant eInvoices.
- disabled provider submission of official drafts returns `BLOCKED_NO_ASP`.
- mock provider output uses only `_MOCK` statuses and remains local-only.

The absence of complete official reference files and provider-specific docs remains a no-go for real ASP onboarding.
