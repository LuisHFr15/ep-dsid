import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"

export class Logout {
  constructor(
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore,
    private readonly presenceRuntimeStore: PresenceRuntimeStore
  ) {}

  async execute(): Promise<void> {
    await Promise.all([
      this.sessionStore.clear(),
      this.clientStateStore.clear(),
      this.presenceRuntimeStore.clear()
    ])
  }
}