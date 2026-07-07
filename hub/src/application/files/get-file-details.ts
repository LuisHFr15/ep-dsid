import { MemoryStore } from "../../infrastructure/memory/memory-store";

export class GetFileDetails {
  constructor(private readonly store: MemoryStore) {}

  execute(file_id: string) {
    const file = this.store.files.get(file_id);

    if (!file) {
      return null;
    }

    const currentVersion = this.store.versions.get(file.current_version_id);

    if (!currentVersion) {
      return {
        ...file,
        current_version: null,
      };
    }

    return {
      ...file,
      current_version: currentVersion,
    };
  }
}