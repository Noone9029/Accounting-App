import { createHostedTenantIsolationProofPlanFromCli } from "../src/hosted-tenant-isolation-proof";

const plan = createHostedTenantIsolationProofPlanFromCli(process.argv.slice(2), process.env);

console.log(JSON.stringify(plan, null, 2));

if (plan.safety === "refused") {
  process.exitCode = 1;
}
