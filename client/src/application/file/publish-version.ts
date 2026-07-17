import { SessionStore } from "../../domain/auth/session-store.js"
import { PublishVersionResult } from "../../domain/file/network-file.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type PublishVersionInput = {
  networkId: string
  filename: string
  infoHash: string
  magnet: string
  size: number
  parentVersionId?: string
}

export class PublishVersion {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(input: PublishVersionInput): Promise<PublishVersionResult> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    return this.hubApi.publishVersion(session.jwt, input)
  }
}