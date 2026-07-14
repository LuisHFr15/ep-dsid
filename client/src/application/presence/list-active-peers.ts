import { SessionStore } from "../../domain/auth/session-store.js"
import { ActivePeersResult } from "../../domain/presence/peer.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type ListActivePeersInput = {
  networkId: string
}

export class ListActivePeers {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(input: ListActivePeersInput): Promise<ActivePeersResult> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    return this.hubApi.listActivePeers(session.jwt, input.networkId)
  }
}