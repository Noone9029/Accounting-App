import { runSimulationComplianceCsidCli, SimulationComplianceCsidCliError } from "../src/zatca/simulation-compliance-csid/simulation-compliance-csid-cli";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  try {
    const result = await runSimulationComplianceCsidCli({ argv, cwd: process.cwd(), terminal: { input: process.stdin, output: process.stdout } });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = error instanceof SimulationComplianceCsidCliError ? error.code : "CLI_EXECUTION_REJECTED";
    process.stderr.write(`${JSON.stringify({ status: "SIMULATION_COMPLIANCE_CSID_BLOCKED", safeErrorCodes: [code], networkCallsMade: false })}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
