import { test } from "node:test";
import assert from "node:assert/strict";
import { CaseStatus } from "@ops-hub/db";
import { allowedTransitions, canTransition } from "./state-machine.js";

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
