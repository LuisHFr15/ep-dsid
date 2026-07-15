import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { RequestNetworkAccessResult } from "../../domain/access/network-access.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"
import { resolveNetworkRef } from "../client/select-network.js"

export type RequestNetworkAccessInput = {
  networkRef: string
}

export class RequestNetworkAccess {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore
  ) {}

  async execute(
    input: RequestNetworkAccessInput
  ): Promise<RequestNetworkAccessResult> {
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

    const network = resolveNetworkRef(
      input.networkRef,
      state.networks
    )

    return this.hubApi.requestNetworkAccess(
      session.jwt,
      network.id
    )
  }
}