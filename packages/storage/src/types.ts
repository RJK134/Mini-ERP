export interface PutInput {
  key: string;
  body: Buffer;
  contentType?: string;
}

export interface GetResult {
  body: Buffer;
  contentType?: string | undefined;
  size: number;
}

export interface ObjectStorage {
  put(input: PutInput): Promise<void>;
  get(key: string): Promise<GetResult>;
}
