import { randomUUID } from "node:crypto";

export interface FileVersion {
  networkId: string;
  fileId: string;
  versionId: string;
  parentVersionId: string | null;
  infoHash: string;
  magnet: string | null;
  filename: string;
  size: number | null;
  lamportTs: number;
  authorId: string;
  createdAt: string;
}

export interface CreateFileVersionInput {
  networkId: string;
  fileId: string;
  parentVersionId: string | null;
  infoHash: string;
  magnet?: string | null;
  filename: string;
  size?: number | null;
  lamportTs: number;
  authorId: string;
}

export function createFileVersion(input: CreateFileVersionInput): FileVersion {
  return {
    networkId: input.networkId,
    fileId: input.fileId,
    versionId: randomUUID(),
    parentVersionId: input.parentVersionId,
    infoHash: input.infoHash,
    magnet: input.magnet ?? null,
    filename: input.filename,
    size: input.size ?? null,
    lamportTs: input.lamportTs,
    authorId: input.authorId,
    createdAt: new Date().toISOString(),
  };
}
