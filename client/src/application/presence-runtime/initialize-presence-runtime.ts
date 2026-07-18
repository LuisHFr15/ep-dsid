import { randomUUID } from "node:crypto"
import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import {
  PresenceRuntimeNetworkState,
  PresenceRuntimeState
} from "../../domain/presence-runtime/presence-runtime-state.js"
import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"

export type InitializePresenceRuntimeInput = {
  intervalMs?: number
}

export class InitializePresenceRuntime {
  constructor(
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore,
    private readonly presenceRuntimeStore: PresenceRuntimeStore
  ) {}

  async execute(input: InitializePresenceRuntimeInput = {}): Promise<PresenceRuntimeState> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    const clientState = await this.clientStateStore.load()

    if (!clientState) {
      throw new Error("Estado local não encontrado. Rode: client:init")
    }

    const previousPresence = await this.presenceRuntimeStore.load()

    const networks: Record<string, PresenceRuntimeNetworkState> = {}

    for (const network of clientState.networks) {
      const previousNetworkState = previousPresence?.networks[network.id]

      networks[network.id] = {
        online: previousNetworkState?.online ?? true,
        lastHeartbeatAt: previousNetworkState?.lastHeartbeatAt ?? null,
        lastActivePeers: previousNetworkState?.lastActivePeers ?? null,
        lastError: previousNetworkState?.lastError ?? null
      }
    }

    const state: PresenceRuntimeState = {
      globalOnline: previousPresence?.globalOnline ?? true,
      defaultHeartbeatIntervalMs:
        input.intervalMs ??
        previousPresence?.defaultHeartbeatIntervalMs ??
        10000,
      peerId: previousPresence?.peerId ?? randomUUID(),
      networks,
      updatedAt: new Date().toISOString()
    }

    await this.presenceRuntimeStore.save(state)

    return state
  }
}