import { test } from "node:test";
import assert from "node:assert/strict";
import { CaseStatus } from "@ops-hub/db";
import { allowedTransitions, canTransition, timestampsFor } from "./state-machine.js";

test("canTransition rejects self-loops", () => {
  assert.equal(canTransition(CaseStatus.NEW, CaseStatus.NEW), false);
});

test("canTransition allows the happy path", () => {
  const path: CaseStatus[] = [
    CaseStatus.NEW, CaseStatus.TRIAGE, CaseStatus.QUALIFIED,
    CaseStatus.SCHEDULED, CaseStatus.ACTIVE, CaseStatus.COMPLETED, CaseStatus.CLOSED,
  ];
  for (let i = 0; i < path.length - 1; i++) {
    assert.equal(canTransition(path[i]!, path[i + 1]!), true, `${path[i]} → ${path[i + 1]}`);
  }
});

test("canTransition rejects jumping from NEW straight to ACTIVE", () => {
  assert.equal(canTransition(CaseStatus.NEW, CaseStatus.ACTIVE), false);
});

test("CLOSED is terminal", () => {
  assert.deepEqual(allowedTransitions(CaseStatus.CLOSED), []);
});

test("timestampsFor does not stamp closedAt for COMPLETED", () => {
  assert.deepEqual(timestampsFor(CaseStatus.COMPLETED), { closedAt: null });
});

test("timestampsFor clears closedAt when returning to ACTIVE", () => {
  assert.deepEqual(timestampsFor(CaseStatus.ACTIVE), { closedAt: null });
});
