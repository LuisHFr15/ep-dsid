import { PresenceRuntimeState } from "../../domain/presence-runtime/presence-runtime-state.js"
import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"
import {
  readJsonFile,
  removeFileIfExists,
  writeJsonFile
} from "../filesystem/json-file.js"

export class FilePresenceRuntimeStore implements PresenceRuntimeStore {
  constructor(
    private readonly filePath: string
  ) {}

  async load(): Promise<PresenceRuntimeState | null> {
    return readJsonFile<PresenceRuntimeState>(
      this.filePath
    )
  }

  async save(
    state: PresenceRuntimeState
  ): Promise<void> {
    await writeJsonFile(this.filePath, state)
  }

  async clear(): Promise<void> {
    await removeFileIfExists(this.filePath)
  }
}