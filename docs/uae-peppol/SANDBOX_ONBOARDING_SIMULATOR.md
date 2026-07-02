# Sandbox Onboarding Simulator

Status: local-only simulator
Date: 2026-07-02

The sandbox onboarding simulator models readiness states without requesting real ASP access, storing credentials, enabling network calls, or approving production compliance.

## Added Package Surface

- `UaeAspSandboxOnboardingState`
- `UaeAspSandboxOnboardingChecklist`
- `UaeAspSandboxOnboardingStep`
- `UaeAspSandboxCredentialRequirement`
- `UaeAspSandboxDocumentRequirement`
- `UaeAspSandboxBlockingReason`
- `buildSandboxOnboardingChecklist`
- `summarizeSandboxOnboardingState`
- `listMissingSandboxPrerequisites`
- `canStartProviderSpecificImplementation`
- `canEnableNetwork`
- `canClaimCompliance`

## State Rules

- Missing docs and credentials returns `SANDBOX_BLOCKED_NO_CREDENTIALS`.
- Docs without credentials returns `SANDBOX_CREDENTIALS_PENDING`.
- Credentials without docs returns `PROVIDER_DOCS_PENDING`.
- Docs plus credentials returns `SANDBOX_READY_FOR_IMPLEMENTATION` for planning only.
- `canEnableNetwork` remains false.
- `canClaimCompliance` remains false.

## Remaining Blockers

Real provider docs, real sandbox credentials, legal/security review, persistent outbox/replay storage, storage retention proof, and official conformance evidence remain required before any real ASP integration.
