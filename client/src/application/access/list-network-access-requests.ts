import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { NetworkAccessRequest } from "../../domain/access/network-access.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"
import { resolveNetworkRef } from "../client/select-network.js"

export type ListNetworkAccessRequestsInput = {
  networkRef?: string
}

export type NetworkAccessRequestsOverview = {
  networkId: string
  networkTitle: string
  requests: Array<
    NetworkAccessRequest & {
      index: number
    }
  >
}

export class ListNetworkAccessRequests {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore
  ) {}

  async execute(
    input: ListNetworkAccessRequestsInput = {}
  ): Promise<NetworkAccessRequestsOverview> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error(
        "Você precisa fazer login antes. Rode: auth:login <user> <password>"
      )
    }

    const state = await this.clientStateStore.load()

    if (!state) {
      throw new Error("Estado local não encontrado. Rode: client:init")
    }

    const network = input.networkRef
      ? resolveNetworkRef(input.networkRef, state.networks)
      : resolveSelectedNetwork(state)

    const requests = await this.hubApi.listNetworkAccessRequests(
      session.jwt,
      network.id
    )

    return {
      networkId: network.id,
      networkTitle: network.title,
      requests: requests.map((request, index) => ({
        ...request,
        index: index + 1
      }))
    }
  }
}

function resolveSelectedNetwork(
  state: {
    selectedNetworkId: string | null
    networks: Array<{ id: string; title: string }>
  }
): { id: string; title: string } {
  if (!state.selectedNetworkId) {
    throw new Error(
      "Nenhuma network selecionada. Informe uma rede ou use network:select."
    )
  }

  const network = state.networks.find(
    (item) => item.id === state.selectedNetworkId
  )

  if (!network) {
    throw new Error(
      "A network selecionada não existe mais. Rode: client:refresh"
    )
  }

  return network
}