import { SessionStore } from "../../domain/auth/session-store.js"
import { FileVersionsResult } from "../../domain/file/network-file.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type ListVersionsInput = {
  networkId: string
}

export class ListVersions {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(input: ListVersionsInput): Promise<FileVersionsResult> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    return this.hubApi.listVersions(session.jwt, input.networkId)
  }
}