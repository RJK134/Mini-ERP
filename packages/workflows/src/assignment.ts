import type { AssignmentActions, CaseInput, WorkflowRuleShape } from "./types.js";

export function evaluateAssignment(
  caseInput: CaseInput,
  rules: WorkflowRuleShape[],
): AssignmentActions | null {
  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (rule.triggerType !== "CASE_CREATED") continue;

    const { serviceType, priority } = rule.conditions;
    if (serviceType && serviceType !== caseInput.serviceType) continue;
    if (priority && priority !== caseInput.priority) continue;

    return rule.actions;
  }
  return null;
}
