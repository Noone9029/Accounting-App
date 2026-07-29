import { classifyComplianceCsidStatus, parseSimulationComplianceCsidCliArguments, runSimulationComplianceCsidCli, SimulationComplianceCsidCliError } from "./simulation-compliance-csid-cli";

describe("Simulation compliance-CSID operator CLI", () => {
  const valid = ["--execute-once", "--approval-file", "E:\\external\\approval.json", "--identity-file", "E:\\external\\identity.json", "--custody-directory", "E:\\external\\custody", "--stdin-secure", "--metadata-json"];

  it("accepts only the explicit one-shot local operator invocation", () => {
    expect(parseSimulationComplianceCsidCliArguments(valid)).toEqual({ executeOnce: true, stdinSecure: true, metadataJson: true, approvalFile: "E:\\external\\approval.json", identityFile: "E:\\external\\identity.json", custodyDirectory: "E:\\external\\custody" });
  });

  it.each([
    ["an OTP argument", [...valid, "--otp=123456"]],
    ["a duplicate approval file", [...valid, "--approval-file", "E:\\external\\second.json"]],
    ["a missing hidden TTY flag", valid.filter((value) => value !== "--stdin-secure")],
    ["a relative identity path", valid.map((value) => value === "E:\\external\\identity.json" ? "identity.json" : value)],
    ["a network approval path", valid.map((value) => value === "E:\\external\\approval.json" ? "\\\\server\\share\\approval.json" : value)],
  ])("rejects %s before any terminal input", (_name, argv) => {
    expect(() => parseSimulationComplianceCsidCliArguments(argv)).toThrow(SimulationComplianceCsidCliError);
  });

  it.each([
    [400, "CSID_RESPONSE_REQUEST_REJECTED"],
    [401, "CSID_RESPONSE_AUTHENTICATION_REJECTED"],
    [406, "CSID_RESPONSE_NOT_ACCEPTABLE"],
    [409, "CSID_RESPONSE_DUPLICATE_REJECTED"],
    [422, "CSID_RESPONSE_BUSINESS_REJECTED"],
    [429, "CSID_RESPONSE_RATE_LIMIT_REJECTED"],
    [503, "CSID_RESPONSE_SERVER_REJECTED"],
    [418, "CSID_RESPONSE_UNEXPECTED_STATUS"],
  ])("maps HTTP %i to the defined safe outcome %s", (status, expected) => {
    expect(classifyComplianceCsidStatus(status)).toBe(expected);
  });

  it("rejects an OTP environment value before it can reach the hidden TTY boundary", async () => {
    await expect(runSimulationComplianceCsidCli({ argv: valid, cwd: process.cwd(), terminal: { input: process.stdin, output: process.stdout }, environment: { ZATCA_ENABLE_REAL_NETWORK: "true", ZATCA_OTP: "123456" } })).rejects.toMatchObject({ code: "CLI_NETWORK_GATE_REJECTED" });
  });

  it("rejects a production-looking process before it can resolve custody or a target", async () => {
    await expect(runSimulationComplianceCsidCli({ argv: valid, cwd: process.cwd(), terminal: { input: process.stdin, output: process.stdout }, environment: { ZATCA_ENABLE_REAL_NETWORK: "true", APP_ENV: "PRODUCTION" } })).rejects.toMatchObject({ code: "CLI_ENVIRONMENT_REJECTED" });
  });
});
