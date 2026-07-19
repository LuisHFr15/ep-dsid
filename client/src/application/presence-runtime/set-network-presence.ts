import { PresenceRuntimeState } from "../../domain/presence-runtime/presence-runtime-state.js"
import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"
import { InitializePresenceRuntime } from "./initialize-presence-runtime.js"

export type SetNetworkPresenceInput = {
  networkId: string
  online: boolean
}

export class SetNetworkPresence {
  constructor(
    private readonly presenceRuntimeStore: PresenceRuntimeStore,
    private readonly initializePresenceRuntime: InitializePresenceRuntime
  ) {}

  async execute(input: SetNetworkPresenceInput): Promise<PresenceRuntimeState> {
    let presence = await this.presenceRuntimeStore.load()

    if (!presence) {
      presence = await this.initializePresenceRuntime.execute()
    }

    // Usa o id direto (não valida contra o snapshot local, que pode estar
    // desatualizado). Entrar/sair de uma rede é decisão do próprio cliente.
    const existing = presence.networks[input.networkId]

    if (!existing) {
      presence.networks[input.networkId] = {
        online: input.online,
        lastHeartbeatAt: null,
        lastActivePeers: null,
        lastError: null
      }
    } else {
      existing.online = input.online
    }

    presence.updatedAt = new Date().toISOString()

    await this.presenceRuntimeStore.save(presence)

    return presence
  }
}