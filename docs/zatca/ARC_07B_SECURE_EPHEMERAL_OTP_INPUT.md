# ARC-07B-06D Secure Ephemeral OTP Input Boundary

Status: LOCAL BOUNDARY READY / OFFICIAL FORMAT CONFIRMED / NO OTP OR APPROVAL

`corepack pnpm zatca:sandbox-otp-input -- --stdin-secure` is the only supported local command shape. It accepts no OTP argument, environment value, JSON file, clipboard file, or non-interactive source. The command still fails before reading stdin unless the standalone owner approval and strict execution gates are present. ARC-07B-06F resolves only the official format evidence.

When a future reviewed execution context supplies every remaining gate, the boundary uses raw-mode TTY input. It writes only a generic prompt and newline; entered bytes are not echoed. The input is held as a `Buffer`, supplied to one callback only, zeroed after callback success or failure, and the operation is disposed so it cannot be replayed. The API never returns the value.

The boundary emits only bounded error codes. It does not log, persist, audit, return, or add OTP data to Prisma or evidence. Tests use synthetic values only; this document and its JSON evidence contain none.

## Current gate posture

| Gate | Result |
| --- | --- |
| TTY non-echo mechanism implemented | `true` |
| One-shot callback-scoped buffer | `true` |
| Argument/environment/file input accepted | `false` |
| Owner approval active | `false` |
| Strict execution preflight implemented | `true` |
| Official OTP format checksum-backed | `true`: exactly six ASCII digits |
| Official OTP validity | `PT1H`: one hour |
| OTP available or requested | `false` |
| Secure OTP input mechanism ready | `true` |
| Sandbox execution allowed | `false` |

The final row remains false. The official OTP format and the secure input mechanism do not provide an OTP, owner approval, certificate custody, the Tier-2 CSR oracle, or permission to make a request. The authenticated source references are metadata-only in [official-sandbox-contracts.json](evidence/arc-07b/official-sandbox-contracts.json); no document body or secret is committed.

No ZATCA DNS/HTTP request, OTP request, CSID request, clearance, reporting, customer-data use, or hosted mutation occurred while implementing this boundary.
