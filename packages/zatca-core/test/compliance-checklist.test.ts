import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ZATCA_CHECKLIST_CATEGORIES,
  ZATCA_CHECKLIST_RISK_LEVELS,
  ZATCA_CHECKLIST_STATUSES,
  ZATCA_PHASE_2_CHECKLIST,
} from "../src/compliance-checklist.ts";

describe("ZATCA Phase 2 checklist", () => {
  it("uses only valid statuses and risk levels", () => {
    const statuses = new Set<string>(ZATCA_CHECKLIST_STATUSES);
    const risks = new Set<string>(ZATCA_CHECKLIST_RISK_LEVELS);

    for (const item of ZATCA_PHASE_2_CHECKLIST) {
      assert.equal(statuses.has(item.status), true, `${item.id} has a valid status`);
      assert.equal(risks.has(item.riskLevel), true, `${item.id} has a valid risk level`);
    }
  });

  it("has required fields and valid categories for every item", () => {
    const categories = new Set<string>(ZATCA_CHECKLIST_CATEGORIES);

    for (const item of ZATCA_PHASE_2_CHECKLIST) {
      assert.notEqual(item.id.trim(), "", "id is required");
      assert.equal(categories.has(item.category), true, `${item.id} has a valid category`);
      assert.notEqual(item.title.trim(), "", `${item.id} has a title`);
      assert.notEqual(item.description.trim(), "", `${item.id} has a description`);
      assert.equal(item.codeReferences.length > 0, true, `${item.id} has code references`);
    }
  });

  it("does not contain duplicate checklist ids", () => {
    const ids = ZATCA_PHASE_2_CHECKLIST.map((item) => item.id);
    assert.deepEqual(ids, [...new Set(ids)]);
  });
});
