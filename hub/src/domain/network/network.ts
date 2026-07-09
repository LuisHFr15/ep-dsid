import { randomUUID } from "node:crypto";

export type AccessMode = "private" | "public";
export type UpdateMode = "centralized" | "collaborative";

export interface Network {
  id: string;
  title: string;
  description: string;
  tags: string[];
  ownerId: string;
  accessMode: AccessMode;
  updateMode: UpdateMode;
  activeFileId: string | null;
  createdAt: string;
}

export interface CreateNetworkInput {
  title: string;
  description: string;
  tags?: string[];
  ownerId: string;
  accessMode: AccessMode;
  updateMode: UpdateMode;
}

export function createNetwork(input: CreateNetworkInput): Network {
  return {
    id: randomUUID(),
    title: input.title,
    description: input.description,
    tags: input.tags ?? [],
    ownerId: input.ownerId,
    accessMode: input.accessMode,
    updateMode: input.updateMode,
    activeFileId: null,
    createdAt: new Date().toISOString(),
  };
}
