import { SessionStore } from "../../domain/auth/session-store.js"
import { PromoteVersionResult } from "../../domain/file/network-file.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type PromoteVersionInput = {
  networkId: string
  versionId: string
}

export class PromoteVersion {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(input: PromoteVersionInput): Promise<PromoteVersionResult> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    return this.hubApi.promoteVersion(session.jwt, input.networkId, input.versionId)
  }
}