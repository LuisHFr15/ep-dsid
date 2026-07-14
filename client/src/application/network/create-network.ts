import { SessionStore } from "../../domain/auth/session-store.js"
import { AccessMode, Network, UpdateMode } from "../../domain/network/network.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type CreateNetworkInput = {
  title: string
  description: string
  tags: string[]
  accessMode: AccessMode
  updateMode: UpdateMode
}

export class CreateNetwork {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(input: CreateNetworkInput): Promise<Network> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    return this.hubApi.createNetwork(session.jwt, input)
  }
}