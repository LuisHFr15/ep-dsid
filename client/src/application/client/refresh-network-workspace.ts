import { HubConnectionError } from "../../domain/errors/app-error.js"
import { SessionStore } from "../../domain/auth/session-store.js"
import { NetworkWorkspace } from "../../domain/client/client-home.js"
import { ClientState } from "../../domain/client/client-state.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import {
  FileVersionsResult,
  NetworkFile
} from "../../domain/file/network-file.js"
import { ActivePeersResult } from "../../domain/presence/peer.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"
import { buildHomeOverview } from "./get-client-home.js"

export class RefreshNetworkWorkspace {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore
  ) {}

  async execute(): Promise<NetworkWorkspace> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error(
        "Você precisa fazer login antes. Rode: auth:login <user> <password>"
      )
    }

    const state = await this.clientStateStore.load()

    if (!state) {
      throw new Error("Estado local não encontrado. Rode: client:init")
    }

    const networkId = state.selectedNetworkId

    if (!networkId) {
      throw new Error(
        "Nenhuma network selecionada. Rode: network:select <nome-ou-indice>"
      )
    }

    const networkExists = state.networks.some(
      (network) => network.id === networkId
    )

    if (!networkExists) {
      throw new Error(
        "A network selecionada não existe mais. Rode: client:refresh"
      )
    }

    const currentFile = await this.safeGetCurrentFile(
      session.jwt,
      networkId
    )

    state.currentFilesByNetworkId[networkId] = currentFile

    state.versionsByNetworkId[networkId] = currentFile
      ? await this.safeListVersions(session.jwt, networkId)
      : null

    state.peersByNetworkId[networkId] = await this.safeListPeers(
      session.jwt,
      networkId
    )

    state.refreshedAt = new Date().toISOString()

    await this.clientStateStore.save(state)

    return buildWorkspace(session.user, state, networkId)
  }

  private async safeGetCurrentFile(
    jwt: string,
    networkId: string
  ): Promise<NetworkFile | null> {
    try {
      return await this.hubApi.getCurrentFile(jwt, networkId)
    } catch (error) {
      if (isNotFoundError(error)) {
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
      return await this.hubApi.listVersions(jwt, networkId)
    } catch (error) {
      if (isNotFoundError(error)) {
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
      return await this.hubApi.listActivePeers(jwt, networkId)
    } catch (error) {
      if (isNotFoundError(error)) {
        return null
      }

      throw error
    }
  }
}

export function buildWorkspace(
  user: string,
  state: ClientState,
  networkId: string
): NetworkWorkspace {
  const home = buildHomeOverview(user, state)

  const network = home.networks.find(
    (item) => item.id === networkId
  )

  if (!network) {
    throw new Error("Network não encontrada no estado local.")
  }

  return {
    user,
    network,
    currentFile:
      state.currentFilesByNetworkId[networkId] ?? null,
    versions:
      state.versionsByNetworkId[networkId] ?? null,
    peers:
      state.peersByNetworkId[networkId] ?? null
  }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof HubConnectionError && error.status === 404
}