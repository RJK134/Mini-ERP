import os from "node:os";
import path from "node:path";
import { LocalFsStorage } from "./adapters/local-fs.js";
import { S3Storage } from "./adapters/s3.js";
import type { ObjectStorage } from "./types.js";

let cached: ObjectStorage | undefined;

// Reads STORAGE_DRIVER ("s3" | "local"), defaulting to local in dev/test.
// Returns a singleton so app code doesn't reinstantiate per request.
export function getStorage(): ObjectStorage {
  if (cached) return cached;

  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  if (driver === "s3") {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("S3 storage requested but S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY missing");
    }
    cached = new S3Storage({
      bucket,
      accessKeyId,
      secretAccessKey,
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      ...(process.env.S3_REGION ? { region: process.env.S3_REGION } : {}),
    });
    return cached;
  }

  const root = process.env.STORAGE_LOCAL_DIR ?? path.join(os.tmpdir(), "ops-hub-storage");
  cached = new LocalFsStorage(root);
  return cached;
}

export function resetStorageForTests(replacement?: ObjectStorage): void {
  cached = replacement;
}
