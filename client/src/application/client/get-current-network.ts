import { SessionStore } from "../../domain/auth/session-store.js"
import { NetworkWorkspace } from "../../domain/client/client-home.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { buildHomeOverview } from "./get-client-home.js"

export class GetCurrentNetwork {
  constructor(
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore
  ) {}

  async execute(): Promise<NetworkWorkspace> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    const state = await this.clientStateStore.load()

    if (!state) {
      throw new Error("Estado local não encontrado. Rode: client:init")
    }

    if (!state.selectedNetworkId) {
      throw new Error("Nenhuma network selecionada. Rode: network:select <nome-ou-id-ou-indice>")
    }

    const home = buildHomeOverview(session.user, state)
    const network = home.networks.find((item) => item.id === state.selectedNetworkId)

    if (!network) {
      throw new Error("A network selecionada não existe mais no estado local. Rode: client:refresh")
    }

    return {
      user: session.user,
      network,
      currentFile: state.currentFilesByNetworkId[network.id] ?? null,
      versions: state.versionsByNetworkId[network.id] ?? null,
      peers: state.peersByNetworkId[network.id] ?? null
    }
  }
}