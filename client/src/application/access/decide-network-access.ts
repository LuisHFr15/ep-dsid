import {
  DecideNetworkAccessResult,
  NetworkAccessDecision
} from "../../domain/access/network-access.js"
import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"
import { resolveNetworkRef } from "../client/select-network.js"

export type DecideNetworkAccessInput = {
  requestRef: string
  decision: NetworkAccessDecision
  networkRef?: string
}

export class DecideNetworkAccess {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore
  ) {}

  async execute(
    input: DecideNetworkAccessInput
  ): Promise<DecideNetworkAccessResult> {
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

    const userId = resolveRequestRef(
      input.requestRef,
      requests
    )

    return this.hubApi.decideNetworkAccess(
      session.jwt,
      network.id,
      {
        userId,
        decision: input.decision
      }
    )
  }
}

function resolveRequestRef(
  requestRef: string,
  requests: Array<{ userId: string }>
): string {
  const index = Number(requestRef)

  if (
    Number.isInteger(index) &&
    index >= 1 &&
    index <= requests.length
  ) {
    return requests[index - 1].userId
  }

  const byUserId = requests.find(
    (request) => request.userId === requestRef
  )

  if (byUserId) {
    return byUserId.userId
  }

  throw new Error(
    `Pedido não encontrado: ${requestRef}. Rode: network:access-requests`
  )
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