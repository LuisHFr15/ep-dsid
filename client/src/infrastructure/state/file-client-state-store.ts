import { ClientState } from "../../domain/client/client-state.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import {
  readJsonFile,
  removeFileIfExists,
  writeJsonFile
} from "../filesystem/json-file.js"

export class FileClientStateStore implements ClientStateStore {
  constructor(
    private readonly filePath: string
  ) {}

  async load(): Promise<ClientState | null> {
    return readJsonFile<ClientState>(this.filePath)
  }

  async save(state: ClientState): Promise<void> {
    await writeJsonFile(this.filePath, state)
  }

  async clear(): Promise<void> {
    await removeFileIfExists(this.filePath)
  }
}