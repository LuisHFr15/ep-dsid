import { SessionStore } from "../../domain/auth/session-store.js"
import { RequestNetworkAccessResult } from "../../domain/access/network-access.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type RequestNetworkAccessInput = {
  networkRef: string
}

export class RequestNetworkAccess {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
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

    // O networkRef já é o id vindo da UI. Não validamos contra o estado local
    // (que pode estar desatualizado) — o hub é a fonte da verdade e valida o
    // acesso. Isso permite pedir acesso a redes criadas após o login.
    return this.hubApi.requestNetworkAccess(session.jwt, input.networkRef)
  }
}