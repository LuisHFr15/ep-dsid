import { HubConnectionError } from "../../domain/errors/app-error.js"
import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientState } from "../../domain/client/client-state.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { ActivePeersResult } from "../../domain/presence/peer.js"
import {
  FileVersionsResult,
  NetworkFile
} from "../../domain/file/network-file.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export class InitializeClient {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore
  ) {}

  async execute(): Promise<ClientState> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error(
        "Você precisa fazer login antes. Rode: auth:login <user> <password>"
      )
    }

    const previousState =
      await this.clientStateStore.load()

    const networks =
      await this.hubApi.listNetworks(session.jwt)

    const currentFilesByNetworkId:
      Record<string, NetworkFile | null> = {}

    const versionsByNetworkId:
      Record<string, FileVersionsResult | null> = {}

    const peersByNetworkId:
      Record<string, ActivePeersResult | null> = {}

    for (const network of networks) {
      const currentFile =
        await this.safeGetCurrentFile(
          session.jwt,
          network.id
        )

      currentFilesByNetworkId[network.id] =
        currentFile

      if (currentFile) {
        versionsByNetworkId[network.id] =
          await this.safeListVersions(
            session.jwt,
            network.id
          )
      } else {
        versionsByNetworkId[network.id] = null
      }

      peersByNetworkId[network.id] =
        await this.safeListPeers(
          session.jwt,
          network.id
        )
    }

    const selectedNetworkId =
      this.resolveSelectedNetworkId(
        previousState?.selectedNetworkId ?? null,
        networks.map((network) => network.id)
      )

    const state: ClientState = {
      selectedNetworkId,
      networks,
      currentFilesByNetworkId,
      versionsByNetworkId,
      peersByNetworkId,
      refreshedAt: new Date().toISOString()
    }

    await this.clientStateStore.save(state)

    return state
  }

  private resolveSelectedNetworkId(
    previousSelectedNetworkId: string | null,
    availableNetworkIds: string[]
  ): string | null {
    if (
      previousSelectedNetworkId &&
      availableNetworkIds.includes(
        previousSelectedNetworkId
      )
    ) {
      return previousSelectedNetworkId
    }

    return availableNetworkIds[0] ?? null
  }

  private async safeGetCurrentFile(
    jwt: string,
    networkId: string
  ): Promise<NetworkFile | null> {
    try {
      return await this.hubApi.getCurrentFile(
        jwt,
        networkId
      )
    } catch (error) {
      if (isUnavailableNetworkContentError(error)) {
        return null
      }

      throw error
    }
  }

  private async safeListVersions(
    jwt: string,
    networkId: string
  ): Promise<FileVersionsResult | null> {
    try {
      return await this.hubApi.listVersions(
        jwt,
        networkId
      )
    } catch (error) {
      if (isUnavailableNetworkContentError(error)) {
        return null
      }

      throw error
    }
  }

  private async safeListPeers(
    jwt: string,
    networkId: string
  ): Promise<ActivePeersResult | null> {
    try {
      return await this.hubApi.listActivePeers(
        jwt,
        networkId
      )
    } catch (error) {
      if (isUnavailableNetworkContentError(error)) {
        return null
      }

      throw error
    }
  }
}

function isUnavailableNetworkContentError(
  error: unknown
): boolean {
  return (
    error instanceof HubConnectionError &&
    (error.status === 403 || error.status === 404)
  )
}