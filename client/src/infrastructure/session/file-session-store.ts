import { readFile, rm, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { Session } from "../../domain/auth/session.js"
import { SessionStore } from "../../domain/auth/session-store.js"

const DEFAULT_SESSION_FILE_PATH = fileURLToPath(
  new URL("../../../.client-session.json", import.meta.url)
)

export class FileSessionStore implements SessionStore {
  constructor(private readonly filePath: string = DEFAULT_SESSION_FILE_PATH) {}

  async load(): Promise<Session | null> {
    try {
      const raw = await readFile(this.filePath, "utf-8")
      const parsed = JSON.parse(raw) as Partial<Session>

      if (!parsed.user || !parsed.jwt) {
        return null
      }

      return {
        user: parsed.user,
        jwt: parsed.jwt
      }
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError.code === "ENOENT") {
        return null
      }

      throw error
    }
  }

  async save(session: Session): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(session, null, 2), "utf-8")
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true })
  }
}