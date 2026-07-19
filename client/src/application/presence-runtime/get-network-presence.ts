import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"

export type GetNetworkPresenceInput = {
  networkId: string
}

export type GetNetworkPresenceOutput = {
  online: boolean
}

// Consulta se o usuário está "dentro" (semeando/marcando presença) de uma rede.
// Ausência de estado = offline (default após a mudança de presença sob demanda).
export class GetNetworkPresence {
  constructor(private readonly presenceRuntimeStore: PresenceRuntimeStore) {}

  async execute(input: GetNetworkPresenceInput): Promise<GetNetworkPresenceOutput> {
    const presence = await this.presenceRuntimeStore.load()
    const online = presence?.networks[input.networkId]?.online ?? false
    return { online }
  }
}
