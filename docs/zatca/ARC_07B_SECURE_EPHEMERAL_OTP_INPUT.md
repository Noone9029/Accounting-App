# ARC-07B-06D Secure Ephemeral OTP Input Boundary

Status: LOCAL BOUNDARY IMPLEMENTED / EXECUTION FORMAT NOT YET OFFICIALLY CONFIRMED

`corepack pnpm zatca:sandbox-otp-input -- --stdin-secure` is the only supported local command shape. It accepts no OTP argument, environment value, JSON file, clipboard file, or non-interactive source. The command currently fails before reading stdin because the standalone owner approval, strict preflight, and checksum-backed official OTP-format evidence are deliberately absent.

When a future reviewed execution context supplies all three gates, the boundary uses raw-mode TTY input. It writes only a generic prompt and newline; entered bytes are not echoed. The input is held as a `Buffer`, supplied to one callback only, zeroed after callback success or failure, and the operation is disposed so it cannot be replayed. The API never returns the value.

The boundary emits only bounded error codes. It does not log, persist, audit, return, or add OTP data to Prisma or evidence. Tests use synthetic values only; this document and its JSON evidence contain none.

## Current gate posture

| Gate | Result |
| --- | --- |
| TTY non-echo mechanism implemented | `true` |
| One-shot callback-scoped buffer | `true` |
| Argument/environment/file input accepted | `false` |
| Owner approval active | `false` |
| Strict execution preflight active | `false` |
| Official OTP format checksum-backed | `false` |
| OTP available or requested | `false` |
| Secure OTP input ready for real sandbox execution | `false` |

The final row is intentionally false: ARC-07B-06A records that the current authenticated Developer Portal Swagger/OpenAPI material is the missing official authority for executable sandbox contract fields. This boundary must not infer an actual OTP format from existing code or historical material.

No ZATCA DNS/HTTP request, OTP request, CSID request, clearance, reporting, customer-data use, or hosted mutation occurred while implementing this boundary.
