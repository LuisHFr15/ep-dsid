import { readFile, rm, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { PresenceRuntimeState } from "../../domain/presence-runtime/presence-runtime-state.js"
import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"

const DEFAULT_PRESENCE_FILE_PATH = fileURLToPath(
  new URL("../../../.client-presence.json", import.meta.url)
)

export class FilePresenceRuntimeStore implements PresenceRuntimeStore {
  constructor(private readonly filePath: string = DEFAULT_PRESENCE_FILE_PATH) {}

  async load(): Promise<PresenceRuntimeState | null> {
    try {
      const raw = await readFile(this.filePath, "utf-8")
      return JSON.parse(raw) as PresenceRuntimeState
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError.code === "ENOENT") {
        return null
      }

      throw error
    }
  }

  async save(state: PresenceRuntimeState): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf-8")
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true })
  }
}