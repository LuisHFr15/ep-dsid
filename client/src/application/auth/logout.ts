import { SessionStore } from "../../domain/auth/session-store.js"

export class Logout {
  constructor(private readonly sessionStore: SessionStore) {}

  async execute(): Promise<void> {
    await this.sessionStore.clear()
  }
}