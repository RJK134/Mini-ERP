import { test } from "node:test";
import assert from "node:assert/strict";
import { heuristicExtraction } from "./extractor.js";

test("heuristicExtraction flags an urgent leak with a postcode", () => {
  const r = heuristicExtraction(
    "URGENT: kitchen tap leaking badly, we're in SW1A 1AA, please send someone ASAP",
  );
  assert.equal(r.priority, "URGENT");
  assert.equal(r.serviceType, "leak_repair");
  assert.equal(r.locationText, "SW1A 1AA");
  assert.ok(!r.missingFields.includes("address_or_postcode"));
});

test("heuristicExtraction flags a boiler service with missing postcode + window", () => {
  const r = heuristicExtraction(
    "Hello, I'd like to book my annual boiler service. Please let me know what dates you have.",
  );
  assert.equal(r.serviceType, "boiler_service");
  assert.ok(r.missingFields.includes("address_or_postcode"));
});

test("heuristicExtraction defaults to MEDIUM for neutral text", () => {
  const r = heuristicExtraction("Hi team, could you give me a quote please?");
  assert.equal(r.priority, "MEDIUM");
});

test("heuristicExtraction confidence is bounded", () => {
  const r = heuristicExtraction("anything");
  assert.ok(r.confidence >= 0 && r.confidence <= 1);
});
