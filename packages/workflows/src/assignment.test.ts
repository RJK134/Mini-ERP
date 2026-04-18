// Basic unit sanity. Wire up vitest in phase-1-intake if you want to run this in CI.
import { evaluateAssignment } from "./assignment.js";
import type { WorkflowRuleShape } from "./types.js";

const rules: WorkflowRuleShape[] = [
  {
    id: "r1",
    name: "Leaks to field team",
    isActive: true,
    triggerType: "CASE_CREATED",
    conditions: { serviceType: "leak_repair" },
    actions: { assignTeamId: "team-field" },
  },
];

function assertEqual(a: unknown, b: unknown, msg: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  }
}

assertEqual(
  evaluateAssignment({ serviceType: "leak_repair", priority: "HIGH" }, rules),
  { assignTeamId: "team-field" },
  "leak_repair should match leak rule",
);

assertEqual(
  evaluateAssignment({ serviceType: "boiler_service", priority: "MEDIUM" }, rules),
  null,
  "boiler_service should not match",
);

console.log("assignment tests ok");
