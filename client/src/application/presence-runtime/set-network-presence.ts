import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { PresenceRuntimeState } from "../../domain/presence-runtime/presence-runtime-state.js"
import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"
import { InitializePresenceRuntime } from "./initialize-presence-runtime.js"
import { resolveNetworkRef } from "../client/select-network.js"

export type SetNetworkPresenceInput = {
  networkRef: string
  online: boolean
}

export class SetNetworkPresence {
  constructor(
    private readonly clientStateStore: ClientStateStore,
    private readonly presenceRuntimeStore: PresenceRuntimeStore,
    private readonly initializePresenceRuntime: InitializePresenceRuntime
  ) {}

  async execute(input: SetNetworkPresenceInput): Promise<PresenceRuntimeState> {
    const clientState = await this.clientStateStore.load()

    if (!clientState) {
      throw new Error("Estado local não encontrado. Rode: client:init")
    }

    let presence = await this.presenceRuntimeStore.load()

    if (!presence) {
      presence = await this.initializePresenceRuntime.execute()
    }

    const network = resolveNetworkRef(input.networkRef, clientState.networks)

    if (!presence.networks[network.id]) {
      presence.networks[network.id] = {
        online: input.online,
        lastHeartbeatAt: null,
        lastActivePeers: null,
        lastError: null
      }
    } else {
      presence.networks[network.id].online = input.online
    }

    presence.updatedAt = new Date().toISOString()

    await this.presenceRuntimeStore.save(presence)

    return presence
  }
}