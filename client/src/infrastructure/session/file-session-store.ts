import { Session } from "../../domain/auth/./session.js"
import { SessionStore } from "../../domain/auth/session-store.js"
import {
  readJsonFile,
  removeFileIfExists,
  writeJsonFile
} from "../filesystem/json-file.js"

export class FileSessionStore implements SessionStore {
  constructor(
    private readonly filePath: string
  ) {}

  async load(): Promise<Session | null> {
    const session =
      await readJsonFile<Session>(this.filePath)

    if (!session) {
      return null
    }

    validateSession(session)

    return session
  }

  async save(session: Session): Promise<void> {
    validateSession(session)

    await writeJsonFile(this.filePath, session)
  }

  async clear(): Promise<void> {
    await removeFileIfExists(this.filePath)
  }
}

function validateSession(
  session: Session
): void {
  if (
    !session.userId ||
    !session.user ||
    !session.jwt
  ) {
    throw new Error(
      "Arquivo de sessão inválido: userId, user e jwt são obrigatórios"
    )
  }
}