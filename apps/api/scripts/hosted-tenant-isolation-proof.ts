import {
  createHostedTenantIsolationProofOptionsFromCli,
  createHostedTenantIsolationProofPlan,
  executeHostedTenantReadOnlyProbe,
  formatHostedTenantIsolationProofSummary,
} from "../src/hosted-tenant-isolation-proof";

async function main() {
  const options = createHostedTenantIsolationProofOptionsFromCli(process.argv.slice(2), process.env);
  const plan = createHostedTenantIsolationProofPlan(options);

  console.error(formatHostedTenantIsolationProofSummary(plan));

  if (plan.safety === "refused") {
    console.log(JSON.stringify(plan, null, 2));
    process.exitCode = 1;
    return;
  }

  if (plan.mode === "staging-read-only-probe") {
    const readOnlyProbe = await executeHostedTenantReadOnlyProbe(options);
    console.log(JSON.stringify({ plan, readOnlyProbe }, null, 2));
    if (!readOnlyProbe.passed) {
      process.exitCode = 1;
    }
    return;
  }

  console.log(JSON.stringify(plan, null, 2));
}

void main().catch(() => {
  console.error("Hosted tenant isolation proof failed before a sanitized result could be produced.");
  process.exitCode = 1;
});
