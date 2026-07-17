import { SessionStore } from "../../domain/auth/session-store.js"
import { Network } from "../../domain/network/network.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export class ListNetworks {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(): Promise<Network[]> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    return this.hubApi.listNetworks(session.jwt)
  }
}