import { promises as fs } from "node:fs";
import path from "node:path";
import type { GetResult, ObjectStorage, PutInput } from "../types.js";

// Default driver. Stores attachments under a configurable directory.
// Used in development and tests; in production the worker boots S3Storage.
export class LocalFsStorage implements ObjectStorage {
  constructor(private readonly rootDir: string) {}

  private resolve(key: string): string {
    if (key.includes("..")) throw new Error("invalid storage key");
    return path.join(this.rootDir, key);
  }

  async put({ key, body, contentType }: PutInput): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    if (contentType) {
      await fs.writeFile(full + ".meta", JSON.stringify({ contentType }));
    }
  }

  async get(key: string): Promise<GetResult> {
    const full = this.resolve(key);
    const body = await fs.readFile(full);
    let contentType: string | undefined;
    try {
      const meta = JSON.parse(await fs.readFile(full + ".meta", "utf-8")) as {
        contentType?: string;
      };
      contentType = meta.contentType;
    } catch {
      // no meta file is fine
    }
    return { body, contentType, size: body.byteLength };
  }
}
