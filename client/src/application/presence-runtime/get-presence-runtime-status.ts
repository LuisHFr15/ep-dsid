import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import {
  PresenceRuntimeStatus
} from "../../domain/presence-runtime/presence-runtime-state.js"
import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"

export class GetPresenceRuntimeStatus {
  constructor(
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore,
    private readonly presenceRuntimeStore: PresenceRuntimeStore
  ) {}

  async execute(): Promise<PresenceRuntimeStatus> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    const clientState = await this.clientStateStore.load()

    if (!clientState) {
      throw new Error("Estado local não encontrado. Rode: client:init")
    }

    const presence = await this.presenceRuntimeStore.load()

    if (!presence) {
      throw new Error("Estado de presença não encontrado. Rode: client:start ou presence:online-all")
    }

    return {
      user: session.user,
      globalOnline: presence.globalOnline,
      peerId: presence.peerId,
      defaultHeartbeatIntervalMs: presence.defaultHeartbeatIntervalMs,
      updatedAt: presence.updatedAt,
      networks: clientState.networks.map((network, index) => {
        const networkPresence = presence.networks[network.id]

        return {
          index: index + 1,
          networkId: network.id,
          networkTitle: network.title,
          online: networkPresence?.online ?? false,
          lastHeartbeatAt: networkPresence?.lastHeartbeatAt ?? null,
          lastActivePeers: networkPresence?.lastActivePeers ?? null,
          lastShouldActivateFallback: networkPresence?.lastShouldActivateFallback ?? null,
          lastError: networkPresence?.lastError ?? null
        }
      })
    }
  }
}