"use strict";
const fs = require("node:fs");
const { appSpec } = require("../../.do/app-spec.cjs");
const gates = ["legalRegionReview", "accountantReview", "runtimeRole", "tenantIsolation", "databaseRestore", "objectRestore", "emailDelivery", "billingLifecycle", "loadTest", "rollback"];
function inspectTemplate(spec = appSpec) {
  const problems = [];
  if (spec.region !== "fra") problems.push("Unexpected region; review residency and budget again.");
  const routes = spec.ingress?.rules ?? [];
  const localeRoute = routes.findIndex((route) => route.match?.path?.prefix === "/api/locale" && route.component?.name === "web" && route.component?.preserve_path_prefix === true);
  const apiRoute = routes.findIndex((route) => route.match?.path?.prefix === "/api");
  if (localeRoute < 0 || localeRoute > apiRoute) problems.push("Next locale route must precede /api and preserve its prefix.");
  if (!routes.some((route) => route.match?.path?.prefix === "/api" && route.component?.name === "api" && route.component?.preserve_path_prefix === false)) problems.push("Same-origin API routing must strip /api.");
  for (const component of [...spec.services, ...spec.workers]) {
    if (component.github?.deploy_on_push !== false || component.instance_count !== 1 || component.autoscaling) problems.push(`${component.name}: unreviewed automatic deployment or scaling.`);
    const values = Object.fromEntries(component.envs.map((item) => [item.key, item.value]));
    if ("DIRECT_URL" in values) problems.push(`${component.name}: migration credential in runtime.`);
    if (component.name === "web" && component.envs.some((item) => item.type === "SECRET")) problems.push("Browser build must not receive backend secrets.");
    if (component.name !== "web" && (values.AUTH_COOKIE_SAME_SITE !== "lax" || values.AUTH_COOKIE_SECURE !== "true")) problems.push(`${component.name}: cookie security changed.`);
    if (values.LEDGERBYTE_SELF_SERVICE_ENABLED === "true" && values.BILLING_ENFORCEMENT_MODE !== "ENFORCE") problems.push(`${component.name}: self-service requires billing enforcement.`);
    if (component.envs.some((item) => item.type === "SECRET" && item.value && item.value !== "${database.DATABASE_URL}")) problems.push(`${component.name}: secret value included in template.`);
  }
  return problems;
}
function inspectEvidence(evidence, expectedRevision, now = new Date()) {
  const blockers = [];
  if (!/^[a-f0-9]{40}$/i.test(expectedRevision ?? "") || evidence?.sourceRevision !== expectedRevision) blockers.push("Evidence must bind the exact release commit.");
  for (const gate of gates) {
    const item = evidence?.checks?.[gate];
    const age = now.getTime() - Date.parse(item?.verifiedAt ?? "");
    if (item?.status !== "PASS" || typeof item?.reference !== "string" || item.reference.trim().length < 3 || !Number.isFinite(age) || age < 0 || age > 30 * 24 * 60 * 60 * 1000) blockers.push(`${gate}: missing, failed, or stale evidence reference.`);
    if (!["legalRegionReview", "accountantReview"].includes(gate) && item?.scope !== "hosted-non-production") blockers.push(`${gate}: local/mock proof cannot establish hosted readiness.`);
  }
  return blockers;
}
module.exports = { inspectTemplate, inspectEvidence, gates };
if (require.main === module) {
  try {
    const evidenceArg = process.argv.indexOf("--evidence");
    const revisionArg = process.argv.indexOf("--revision");
    const evidence = evidenceArg >= 0 ? JSON.parse(fs.readFileSync(process.argv[evidenceArg + 1], "utf8")) : {};
    const blockers = [...inspectTemplate(), ...inspectEvidence(evidence, revisionArg >= 0 ? process.argv[revisionArg + 1] : undefined)];
    console.log(JSON.stringify({ status: blockers.length ? "BLOCKED" : "EVIDENCE_REFERENCES_COMPLETE", blockers,
      deploymentExecuted: false, evidenceIndependentlyVerified: false, liveProviderEnabled: false }, null, 2));
    process.exitCode = blockers.length ? 1 : 0;
  } catch { console.error("Preflight input is invalid; no deployment or provider action was attempted."); process.exitCode = 1; }
}
