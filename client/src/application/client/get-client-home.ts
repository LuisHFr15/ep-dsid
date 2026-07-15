import {
  AvailableFileOverview,
  ClientHomeOverview,
  ClientNetworkOverview
} from "../../domain/client/client-home.js"
import { ClientState } from "../../domain/client/client-state.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { SessionStore } from "../../domain/auth/session-store.js"

export class GetClientHome {
  constructor(
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore
  ) {}

  async execute(): Promise<ClientHomeOverview> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    const state = await this.clientStateStore.load()

    if (!state) {
      throw new Error("Estado local não encontrado. Rode: client:init")
    }

    return buildHomeOverview(session.user, state)
  }
}

export function buildHomeOverview(user: string, state: ClientState): ClientHomeOverview {
  const networks: ClientNetworkOverview[] = state.networks.map((network, index) => {
    const currentFile = state.currentFilesByNetworkId[network.id] ?? null
    const versions = state.versionsByNetworkId[network.id] ?? null
    const peers = state.peersByNetworkId[network.id] ?? null

    return {
      index: index + 1,
      id: network.id,
      title: network.title,
      description: network.description,
      tags: network.tags,
      accessMode: network.accessMode,
      updateMode: network.updateMode,
      isSelected: state.selectedNetworkId === network.id,
      currentFile,
      versionsCount: versions?.versions.length ?? 0,
      peersOnline: peers?.activePeers.length ?? 0
    }
  })

  const availableFiles: AvailableFileOverview[] = networks
    .filter((network) => network.currentFile !== null)
    .map((network, index) => ({
      index: index + 1,
      networkId: network.id,
      networkTitle: network.title,
      filename: network.currentFile?.filename ?? "arquivo-sem-nome",
      versionId: network.currentFile?.versionId ?? "",
      lamportTs: network.currentFile?.lamportTs ?? 0
    }))

  return {
    user,
    selectedNetworkId: state.selectedNetworkId,
    refreshedAt: state.refreshedAt,
    networks,
    availableFiles
  }
}