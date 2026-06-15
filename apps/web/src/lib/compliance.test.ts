import { complianceStatusLabel } from "./compliance";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("compliance helpers", () => {
  it("formats compliance status labels", () => {
    expect(complianceStatusLabel("READY_FOR_VALIDATION")).toBe("Ready For Validation");
  });

  it("keeps UAE ASP documentation copy from making certification or accreditation claims", () => {
    const workspaceRoot = process.cwd().replace(/[\\/]apps[\\/]web$/, "");
    const docs = [
      "docs/uae-peppol/README.md",
      "docs/development/UAE_DISABLED_ASP_CONNECTOR_CONTRACTS_SPRINT_CLOSURE.md",
      "docs/IMPLEMENTATION_STATUS.md",
      "docs/REMAINING_ROADMAP.md",
      "docs/PRODUCT_READINESS_SCORECARD.md",
    ]
      .map((file) => readFileSync(resolve(workspaceRoot, file), "utf8"))
      .join("\n");

    expect(docs).not.toMatch(/LedgerByte\s+(is|as|provides)\s+FTA certified/i);
    expect(docs).not.toMatch(/LedgerByte\s+(is|as|provides)\s+Peppol certified/i);
    expect(docs).not.toMatch(/LedgerByte\s+(is|as|provides)\s+an?\s+official UAE provider/i);
    expect(docs).not.toMatch(/LedgerByte\s+(is|as|provides)\s+an?\s+accredited ASP/i);
    expect(docs).toMatch(/Do not claim/i);
    expect(docs).toMatch(/No real ASP calls/i);
    expect(docs).toMatch(/No FTA reporting/i);
  });
});
