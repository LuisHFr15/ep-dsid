import { SessionStore } from "../../domain/auth/session-store.js"
import { AnnounceFileResult } from "../../domain/file/network-file.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type AnnounceFileInput = {
  networkId: string
  filename: string
  infoHash: string
  magnet: string
  size: number
}

export class AnnounceFile {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(input: AnnounceFileInput): Promise<AnnounceFileResult> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    return this.hubApi.announceFile(session.jwt, input)
  }
}