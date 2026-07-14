import { SessionStore } from "../../domain/auth/session-store.js"
import { HeartbeatResult } from "../../domain/presence/peer.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type SendHeartbeatInput = {
  networkId: string
  peerId: string
}

export class SendHeartbeat {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(input: SendHeartbeatInput): Promise<HeartbeatResult> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    return this.hubApi.sendHeartbeat(session.jwt, input)
  }
}