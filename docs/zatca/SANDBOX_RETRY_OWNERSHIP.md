# Durable sandbox retry ownership

The local sandbox lifecycle previously used a process-local set to exclude concurrent retries. Separate application instances could each send the same uncertain submission. The lifecycle now commits an atomic tenant-scoped claim before calling its literal-loopback client. It reuses the existing `ZatcaSandboxSubmissionState.reservationToken` and `RESERVED` state; no schema or production EGS chain changes are required.

The claim compares the exact immutable artifact identity, organization, state, and previous reservation token. A reserved `sandbox-retry:` token excludes another claimant. Completion requires that exact owner token and rotates it, so an old worker cannot overwrite a later attempt. A reserved retry cannot be deleted through `releaseReservation`. Source-identity replay also binds the EGS, proof run, and invoice-metadata reference.

Database persistence errors after a transport result leave the claim reserved. They are not reclassified as transport failures, and no timeout silently reclaims ownership. Operators must stop the previous worker and reconcile what happened before considering recovery.

The internal `recoverAbandonedRetry` method has no HTTP endpoint or scheduler. It requires tenant/state scope, the current owner token, explicit confirmation that the previous worker stopped, a review reference, and at least 15 minutes since the claim changed. It rotates the token and records an ordered metadata-only attempt with `SANDBOX_RETRY_OWNER_RECOVERY`, `UNCERTAIN`, and `NOT_RETRYABLE`. Only the review-reference hash is stored. It never declares the document accepted, rejected, or safe to resend. A subsequent synthetic retry must still be explicitly invoked with the same immutable document identity.

Focused coverage lives in the submission-state unit/integration suites and the fake-lifecycle suite. The disposable PostgreSQL suite covers separate application instances, one loopback call, restart persistence, wrong-tenant recovery denial, and stale-owner fencing. Tests are run by the coordinating task under the repository resource limits; this document itself records no unexecuted test as passed.

This foundation applies only to synthetic sandbox state and literal-loopback transport. Real Simulation onboarding, the six-document matrix, clearance/reporting behavior, production credential custody, production issuance integration, and external accounting/compliance review remain separate requirements. There is no real ZATCA network call, new key material, production issuance, or compliance claim here.
