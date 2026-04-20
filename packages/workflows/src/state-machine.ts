import { CaseStatus } from "@ops-hub/db";

// Case lifecycle graph. Keep intentionally narrow — the v1 product only needs
// a linear-ish happy path plus a couple of escape hatches.
const ALLOWED_TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  [CaseStatus.NEW]: [CaseStatus.TRIAGE, CaseStatus.AWAITING_INFO, CaseStatus.CLOSED],
  [CaseStatus.TRIAGE]: [CaseStatus.AWAITING_INFO, CaseStatus.QUALIFIED, CaseStatus.CLOSED],
  [CaseStatus.AWAITING_INFO]: [CaseStatus.TRIAGE, CaseStatus.QUALIFIED, CaseStatus.CLOSED],
  [CaseStatus.QUALIFIED]: [CaseStatus.SCHEDULED, CaseStatus.AWAITING_INFO, CaseStatus.CLOSED],
  [CaseStatus.SCHEDULED]: [CaseStatus.ACTIVE, CaseStatus.QUALIFIED, CaseStatus.CLOSED],
  [CaseStatus.ACTIVE]: [CaseStatus.COMPLETED, CaseStatus.SCHEDULED, CaseStatus.CLOSED],
  [CaseStatus.COMPLETED]: [CaseStatus.CLOSED, CaseStatus.ACTIVE],
  [CaseStatus.CLOSED]: [],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  if (from === to) return false;
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function allowedTransitions(from: CaseStatus): readonly CaseStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

type TransitionTimestamps = {
  qualifiedAt?: Date;
  scheduledAt?: Date;
  closedAt?: Date | null;
};

// Side-effect timestamps that get stamped when entering specific states.
export function timestampsFor(to: CaseStatus): TransitionTimestamps {
  const now = new Date();
  switch (to) {
    case CaseStatus.QUALIFIED:
      return { qualifiedAt: now };
    case CaseStatus.SCHEDULED:
      return { scheduledAt: now };
    case CaseStatus.ACTIVE:
    case CaseStatus.COMPLETED:
      return { closedAt: null };
    case CaseStatus.CLOSED:
      return { closedAt: now };
    default:
      return {};
  }
}
