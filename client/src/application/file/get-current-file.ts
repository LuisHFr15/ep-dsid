import { SessionStore } from "../../domain/auth/session-store.js"
import { NetworkFile } from "../../domain/file/network-file.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type GetCurrentFileInput = {
  networkId: string
}

export class GetCurrentFile {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(input: GetCurrentFileInput): Promise<NetworkFile> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    return this.hubApi.getCurrentFile(session.jwt, input.networkId)
  }
}