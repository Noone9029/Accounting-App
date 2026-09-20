# Beta dependency and Vercel build repair

This narrow repair starts from main `90e0eaa4`. It carries the reviewed dependency selections from `f2be4ff4` without its inventory, self-service, Stripe integration, or migrations. It does not promote the Saudi launch branch.

The selected exact versions are Next 16.3.3, Nodemailer 9.1.1, PostCSS 8.5.23, Sharp 0.35.4, xmldom 0.9.12, browserslist 4.28.7, baseline-browser-mapping 2.11.0, js-yaml 4.3.2, multer 2.3.0, and qs 6.16.0. Existing Babel/body-parser/nanoid overrides remain unchanged. The deepmerge-ts 8.0.0 override is restricted to `@prisma/config@6.19.3`; its real config-loader, circular-record and prototype-safety regression is included. The existing Next image optimizer regression now checks Sharp 0.35.4.

The previous branch's audit and compatibility results are provenance, not evidence for this checkout. The coordinating task must regenerate the lockfile, run a fresh production dependency audit and compatibility checks, then build API/web and exercise the actual beta preview. No new audit result is claimed by this note.

The existing API Vercel project remains rooted at the repository root. Its install requires `VERCEL=1` and `LEDGERBYTE_DEPLOY_TARGET=api`; postinstall builds all five runtime workspace packages, generates Prisma, and builds Nest. The missing UAE package is now included. The explicit build step verifies `apps/api/dist/apps/api/api/index.js` and resolves every runtime workspace entrypoint, without falling back to the generic monorepo build. The root `api/index.js` wrapper and API route configuration remain in place. Prisma generation does not apply migrations or seed data.

The existing web Vercel project remains rooted at `apps/web`. Its install uses the workspace lockfile and its build selects only `@ledgerbyte/web`. Git auto-deployment controls remain unchanged. The `vercel.api.json` and `vercel.web.json` CLI alternatives match these commands; they do not change the provider project roots.

Builds use one workspace at a time, one Next worker, a 4-GiB Node heap cap and one libuv worker. Install lifecycle concurrency is one. These limits complement, rather than replace, an aggregate host ceiling of 20 GiB and half the available logical CPUs. Local verification remains inside the coordinating task's bounded process job. Confirm the remote builder's allocation before deploying; no application-side heap flag is an OS process-tree memory limit.

Run `scripts/vercel-postinstall.test.cjs`, `scripts/next-sharp-compatibility.test.cjs`, and `scripts/prisma-config-compatibility.test.cjs` with Node's `--test-concurrency=1` inside that bounded job. The postinstall regression uses fake process execution and validates missing-package failure without building, contacting a provider, or accessing a database.
