import { Priority } from "@ops-hub/db";

export interface AssignmentConditions {
  serviceType?: string;
  priority?: Priority;
}

export interface AssignmentActions {
  assignTeamId?: string;
  assignUserId?: string;
}

export interface WorkflowRuleShape {
  id: string;
  name: string;
  isActive: boolean;
  triggerType: "CASE_CREATED" | "CASE_UPDATED";
  conditions: AssignmentConditions;
  actions: AssignmentActions;
}

export interface CaseInput {
  serviceType: string | null;
  priority: Priority;
}
