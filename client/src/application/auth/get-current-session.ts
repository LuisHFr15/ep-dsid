import { Session } from "../../domain/auth/session.js"
import { SessionStore } from "../../domain/auth/session-store.js"

export class GetCurrentSession {
  constructor(private readonly sessionStore: SessionStore) {}

  async execute(): Promise<Session | null> {
    return this.sessionStore.load()
  }
}