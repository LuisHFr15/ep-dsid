import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { PromoteVersionResult } from "../../domain/file/network-file.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type PromoteSelectedNetworkVersionInput = {
  versionRef: string
}

export class PromoteSelectedNetworkVersion {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore
  ) {}

  async execute(
    input: PromoteSelectedNetworkVersionInput
  ): Promise<PromoteVersionResult> {
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

    const versions =
      state.versionsByNetworkId[networkId]?.versions ?? []

    const versionId = resolveVersionRef(
      input.versionRef,
      versions
    )

    return this.hubApi.promoteVersion(
      session.jwt,
      networkId,
      versionId
    )
  }
}

function resolveVersionRef(
  versionRef: string,
  versions: Array<{ versionId: string }>
): string {
  const index = Number(versionRef)

  if (
    Number.isInteger(index) &&
    index >= 1 &&
    index <= versions.length
  ) {
    return versions[index - 1].versionId
  }

  const byId = versions.find(
    (version) => version.versionId === versionRef
  )

  if (byId) {
    return byId.versionId
  }

  throw new Error(
    `Versão não encontrada: ${versionRef}. Rode: network:versions`
  )
}