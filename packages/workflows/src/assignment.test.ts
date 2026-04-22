import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAssignment } from "./assignment.js";
import type { WorkflowRuleShape } from "./types.js";

const leakRule: WorkflowRuleShape = {
  id: "r1",
  name: "leaks to field team",
  isActive: true,
  triggerType: "CASE_CREATED",
  conditions: { serviceType: "leak_repair" },
  actions: { assignTeamId: "team-field" },
};

const urgentRule: WorkflowRuleShape = {
  id: "r2",
  name: "urgent to on-call",
  isActive: true,
  triggerType: "CASE_CREATED",
  conditions: { priority: "URGENT" },
  actions: { assignUserId: "user-oncall" },
};

test("first matching rule wins", () => {
  const out = evaluateAssignment(
    { serviceType: "leak_repair", priority: "URGENT" },
    [leakRule, urgentRule],
  );
  assert.deepEqual(out, { assignTeamId: "team-field" });
});

test("later rule applies when earlier one skipped", () => {
  const out = evaluateAssignment(
    { serviceType: "boiler_service", priority: "URGENT" },
    [leakRule, urgentRule],
  );
  assert.deepEqual(out, { assignUserId: "user-oncall" });
});

test("inactive rules are skipped", () => {
  const out = evaluateAssignment(
    { serviceType: "leak_repair", priority: "MEDIUM" },
    [{ ...leakRule, isActive: false }],
  );
  assert.equal(out, null);
});

test("no rules = no assignment", () => {
  assert.equal(evaluateAssignment({ serviceType: null, priority: "MEDIUM" }, []), null);
});
