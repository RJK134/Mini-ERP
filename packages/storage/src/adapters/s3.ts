import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { GetResult, ObjectStorage, PutInput } from "../types.js";

export interface S3StorageConfig {
  bucket: string;
  endpoint?: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export class S3Storage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      region: config.region ?? "us-east-1",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
    });
  }

  async put({ key, body, contentType }: PutInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
    );
  }

  async get(key: string): Promise<GetResult> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!out.Body) throw new Error(`missing body for ${key}`);
    const chunks: Buffer[] = [];
    for await (const chunk of out.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    return {
      body,
      contentType: out.ContentType ?? undefined,
      size: body.byteLength,
    };
  }
}
