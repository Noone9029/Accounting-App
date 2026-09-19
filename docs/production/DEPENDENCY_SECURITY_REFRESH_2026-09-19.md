# Dependency security refresh — 2026-09-19

The initial production dependency audit reported 2 critical, 20 high, 10 moderate and 1 low advisory findings across 410 dependencies. The source evidence is `.dev-logs/dependency-audit-raw.txt` and `.dev-logs/production-audit.log`. These are advisory counts, not confirmed exploitability counts. Manifest preparation alone does not clear the gate: the coordinating bounded install must update the lockfile, followed by a fresh audit and compatibility checks.

After the bounded dependency refresh, `.dev-logs/production-audit.log` reports **0 critical and 0 high** findings and a passing production dependency gate. This gate does not report that every severity is zero. Local compatibility tests, fresh-database proofs, API/web regression suites, builds and the rebuilt English/Arabic browser journey passed; exact counts and evidence are in [the launch record](SAUDI_LAUNCH_IMPLEMENTATION.md). Container and hosted validation remain required before promotion.

## Exact changes and evidence

| Package / dependency path | Previously resolved | Selected target | Advisory and scope |
| --- | --- | --- | --- |
| `apps/web > next` | 16.2.12 | 16.3.3 | Maintainer fixes for [Windows-hosted RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) and [AVIF image optimization RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4). Both affect Next 16 before 16.3.3. |
| `next > sharp` | 0.35.3 | 0.35.4 | [libheif vulnerability advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), patched at 0.35.4. Keep the existing Next image optimization compatibility regression. |
| `read-excel-file > @xmldom/xmldom` | 0.9.10 | 0.9.12 | Covers the audit's parser/serialization findings, including [malformed XML parsing complexity](https://github.com/xmldom/xmldom/security/advisories/GHSA-93r5-fhx6-vmg9). The bank statement XLSX parser imports `read-excel-file/universal`. |
| `apps/api > nodemailer` | 9.0.1 | 9.1.1 | [Address parser denial of service](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-2x7j-588g-ccc2) is fixed in 9.1.0; 9.1.1 also fixes the [legacy resolveContent access-control bypass](https://github.com/advisories/GHSA-8m3c-c648-2xjj). Provider enablement remains unchanged. |
| `@nestjs/platform-express > multer` | 2.2.0 | 2.3.0 | [Multipart field denial of service](https://github.com/expressjs/multer/security/advisories/GHSA-wc9g-mqfw-jrwm), plus the audit's aborted-upload/array-index/size-limit findings. This is a transitive minor update, not a Nest upgrade. |
| `next > styled-jsx > @babel/core > @babel/helper-compilation-targets > browserslist` | 4.28.2 | 4.28.7 | [Unbounded cache growth](https://github.com/browserslist/browserslist/security/advisories/GHSA-c83g-rgw3-j3cx) and the audit's custom-stats finding are patched in 4.28.7. |
| `@nestjs/swagger > js-yaml` | 4.3.1 | 4.3.2 | [Empty merge-source CPU exhaustion](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh). Updates the existing workspace override. |
| `next > postcss` | 8.5.18 | 8.5.23 | [Source-map file access advisory](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp). Next 16.3.3 itself specifies exactly 8.5.23; leaving the old override would force it backward. Web's direct development version is aligned. |
| `express > qs` | 6.15.2 | 6.16.0 | [Attacker-controlled isBuffer failure](https://github.com/ljharb/qs/security/advisories/GHSA-4mjr-xmp4-gh2g) and bracket/comma array-limit bypass. Updates the existing override within major 6. |
| `next / browserslist > baseline-browser-mapping` | 2.10.43 / 2.10.27 | 2.11.0 | [Invalid-input process termination](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv), patched at 2.11.0. Both upstream semver ranges accept the selected version. |
| `@prisma/client > prisma > @prisma/config > deepmerge-ts` | 7.1.5 | 8.0.0, only beneath `@prisma/config@6.19.3` | [Recursive object graph stack exhaustion](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). This is the only major-version override and requires the specific compatibility proof below. |

The published [Next 16.3.3 package manifest](https://registry.npmjs.org/next/16.3.3) accepts the existing React 19 range and Node >=20.9.0; verified Node 22 satisfies it. The [Sharp 0.35.4 manifest](https://registry.npmjs.org/sharp/0.35.4) retains CommonJS and ESM entrypoints and the same Node minimum. The selected transitive versions' published engine ranges all accept Node 22. Direct Next/Nodemailer versions and workspace overrides use exact versions to keep this refresh narrow.

## Scoped Prisma compatibility

Installed `@prisma/config@6.19.3` imports only the named `deepmerge` export and passes it to c12 as the configuration merger (`dist/index.js`, `loadConfigTsOrJs`). It does not use renamed TypeScript helper types or `deepmergeInto`. The repository currently uses `package.json#prisma`, without custom `prisma.config.*` files or Map-based configuration values.

[Deepmerge 8 release notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0) document changed deep Map merging, helper type names and `deepmergeInto` mutation semantics. Those changes do not affect the observed call, while circular-reference handling fixes the reported crash. Its [published manifest](https://registry.npmjs.org/deepmerge-ts/8.0.0) retains both import and require entrypoints and supports Node >=16. This is a compatibility inference for this consumer, not a claim that all v7 callers can upgrade unchanged. Reassess the override when changing Prisma versions or introducing Map-based config.

`scripts/prisma-config-compatibility.test.cjs` checks the versions actually resolved from Prisma's dependency graph, loads a synthetic config through Prisma's real c12 loader, preserves nested schema/migration values, merges circular records, and proves `__proto__`/`constructor` payloads cannot mutate inherited/global prototypes. It uses no credentials, provider calls or database connection; temporary config files stay within a verified generated directory. The library may preserve special names as own data properties, so the safety assertion is against prototype mutation rather than arbitrary key rejection.

## Required verification

Run all commands serially inside `scripts/run-resource-bounded.py`; test files use the repository's bounded Node test runner. Do not run a second heavy operation concurrently.

1. Refresh dependencies and the lockfile, then run the production dependency audit again. Keep unresolved findings visible; no audit suppression or allowlist was added.
2. Run `scripts/next-sharp-compatibility.test.cjs` and `scripts/prisma-config-compatibility.test.cjs` through `scripts/run-bounded-node-tests.cjs`.
3. Generate Prisma, migrate a fresh disposable local database, and run existing billing/inventory/auth proofs. This checks the actual Prisma CLI path as well as the isolated loader.
4. Rebuild API and web, run relevant email/XLSX parser tests and the local EN/AR self-service browser proof. Provider sends remain disabled.

Docker image builds and hosted ingress/recovery/provider checks remain separate release prerequisites. This dependency refresh does not establish production or regulatory readiness.
