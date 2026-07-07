import crypto from "crypto";
import {
  FileVisibility,
  MemoryStore,
} from "../../infrastructure/memory/memory-store";

type AnnounceFileInput = {
  title: string;
  description?: string;
  visibility: FileVisibility;
  magnet_uri: string;
  info_hash: string;
  owner_id?: string;
};

export class AnnounceFile {
  constructor(private readonly store: MemoryStore) {}

  execute(input: AnnounceFileInput) {
    const file_id = crypto.randomUUID();
    const version_id = crypto.randomUUID();
    const now = new Date().toISOString();

    const file = {
      file_id,
      title: input.title,
      description: input.description,
      owner_id: input.owner_id ?? "dev-user",
      current_version_id: version_id,
      visibility: input.visibility,
      created_at: now,
    };

    const version = {
      version_id,
      file_id,
      parent_version_id: undefined,
      file_info_hash: input.info_hash,
      magnet_uri: input.magnet_uri,
      lamport_ts: 1,
      author_id: input.owner_id ?? "dev-user",
      created_at: now,
    };

    this.store.files.set(file_id, file);
    this.store.versions.set(version_id, version);

    return {
      file_id,
      version_id,
    };
  }
}