import { ClientStateStore } from "../../domain/client/client-state-store.js"

export type SelectNetworkInput = {
  networkRef: string
}

export type SelectNetworkOutput = {
  selectedNetworkId: string
  selectedNetworkTitle: string
}

export class SelectNetwork {
  constructor(private readonly clientStateStore: ClientStateStore) {}

  async execute(input: SelectNetworkInput): Promise<SelectNetworkOutput> {
    const state = await this.clientStateStore.load()

    if (!state) {
      throw new Error("Estado local não encontrado. Rode: client:init")
    }

    const network = resolveNetworkRef(input.networkRef, state.networks)

    state.selectedNetworkId = network.id

    await this.clientStateStore.save(state)

    return {
      selectedNetworkId: network.id,
      selectedNetworkTitle: network.title
    }
  }
}

export function resolveNetworkRef<T extends { id: string; title: string }>(
  networkRef: string,
  networks: T[]
): T {
  const byIndex = Number(networkRef)

  if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= networks.length) {
    return networks[byIndex - 1]
  }

  const byId = networks.find((network) => network.id === networkRef)

  if (byId) {
    return byId
  }

  const normalizedRef = normalize(networkRef)

  const byTitle = networks.find((network) => normalize(network.title) === normalizedRef)

  if (byTitle) {
    return byTitle
  }

  throw new Error(`Network não encontrada no estado local: ${networkRef}. Rode client:home para ver as opções.`)
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}