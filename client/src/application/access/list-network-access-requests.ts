import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { NetworkAccessRequest } from "../../domain/access/network-access.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

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

    const networkId = input.networkRef ?? resolveSelectedNetworkId(state)

    // O título é só para exibição; se a rede não estiver no snapshot local
    // (ex: criada após o login), o hub ainda responde e seguimos sem o título.
    const networkTitle =
      state.networks.find((network) => network.id === networkId)?.title ?? ""

    const requests = await this.hubApi.listNetworkAccessRequests(
      session.jwt,
      networkId
    )

    return {
      networkId,
      networkTitle,
      requests: requests.map((request, index) => ({
        ...request,
        index: index + 1
      }))
    }
  }
}

function resolveSelectedNetworkId(
  state: { selectedNetworkId: string | null }
): string {
  if (!state.selectedNetworkId) {
    throw new Error(
      "Nenhuma network selecionada. Informe uma rede ou use network:select."
    )
  }

  return state.selectedNetworkId
}