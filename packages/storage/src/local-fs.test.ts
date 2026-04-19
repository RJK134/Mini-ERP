import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalFsStorage } from "./adapters/local-fs.js";
import { storageKeyFor } from "./key.js";

test("local fs storage round-trips bytes and content-type", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "ops-hub-test-"));
  const store = new LocalFsStorage(root);
  const key = storageKeyFor({ tenantId: "t1", inboundItemId: "i1", fileName: "Hello World.txt" });
  const body = Buffer.from("hello", "utf-8");

  await store.put({ key, body, contentType: "text/plain" });
  const out = await store.get(key);

  assert.equal(out.body.toString("utf-8"), "hello");
  assert.equal(out.contentType, "text/plain");
  assert.equal(out.size, 5);
});

test("storageKeyFor sanitises filenames", () => {
  const key = storageKeyFor({ tenantId: "t1", inboundItemId: "i1", fileName: "../etc/passwd" });
  assert.ok(!key.includes(".."), "keys must not contain ..");
  assert.match(key, /^t1\/i1\//);
});
