import { Priority } from "@ops-hub/db";

// First-response SLA in minutes.
const SLA_MINUTES: Record<Priority, number> = {
  LOW: 60 * 24,
  MEDIUM: 60 * 8,
  HIGH: 60 * 2,
  URGENT: 30,
};

export function slaFor(priority: Priority): number {
  return SLA_MINUTES[priority];
}

export function isOverdue(createdAt: Date, priority: Priority, now: Date = new Date()): boolean {
  const deadline = createdAt.getTime() + slaFor(priority) * 60 * 1000;
  return now.getTime() > deadline;
}
