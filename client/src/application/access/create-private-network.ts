import { SessionStore } from "../../domain/auth/session-store.js"
import {
  Network,
  UpdateMode
} from "../../domain/network/network.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type CreatePrivateNetworkInput = {
  title: string
  description: string
  tags: string[]
  updateMode: UpdateMode
}

export class CreatePrivateNetwork {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(
    input: CreatePrivateNetworkInput
  ): Promise<Network> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error(
        "Você precisa fazer login antes. Rode: auth:login <user> <password>"
      )
    }

    return this.hubApi.createNetwork(session.jwt, {
      title: input.title,
      description: input.description,
      tags: input.tags,
      accessMode: "private",
      updateMode: input.updateMode
    })
  }
}