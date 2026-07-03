import { MemoryStore } from "../../infrastructure/memory/memory-store";

export class ListFiles {
  constructor(private readonly store: MemoryStore) {}

  execute() {
    return Array.from(this.store.files.values());
  }
}