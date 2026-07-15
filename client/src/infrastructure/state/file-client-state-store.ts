import { readFile, rm, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { ClientState } from "../../domain/client/client-state.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"

const DEFAULT_STATE_FILE_PATH = fileURLToPath(
  new URL("../../../.client-state.json", import.meta.url)
)

export class FileClientStateStore implements ClientStateStore {
  constructor(private readonly filePath: string = DEFAULT_STATE_FILE_PATH) {}

  async load(): Promise<ClientState | null> {
    try {
      const raw = await readFile(this.filePath, "utf-8")
      const parsed = JSON.parse(raw) as ClientState

      return parsed
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError.code === "ENOENT") {
        return null
      }

      throw error
    }
  }

  async save(state: ClientState): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf-8")
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true })
  }
}