import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import { PublishVersionResult } from "../../domain/file/network-file.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type PublishSelectedNetworkVersionInput = {
  filename: string
  infoHash: string
  magnet: string
  size: number
  parentVersionRef?: string
}

export class PublishSelectedNetworkVersion {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore
  ) {}

  async execute(
    input: PublishSelectedNetworkVersionInput
  ): Promise<PublishVersionResult> {
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

    // O parentVersionRef normalmente já é o versionId do arquivo atual (vindo da
    // UI). Só resolvemos contra o snapshot local quando for um índice/rótulo
    // (uso legado de CLI); um id vai direto ao hub, que é a fonte da verdade.
    // Isso evita falhar no 2º publish quando o snapshot local está desatualizado.
    const parentVersionId = input.parentVersionRef
      ? isVersionId(input.parentVersionRef)
        ? input.parentVersionRef
        : resolveVersionRef(
            input.parentVersionRef,
            state.versionsByNetworkId[networkId]?.versions ?? []
          )
      : undefined

    return this.hubApi.publishVersion(session.jwt, {
      networkId,
      filename: input.filename,
      infoHash: input.infoHash,
      magnet: input.magnet,
      size: input.size,
      parentVersionId
    })
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isVersionId(ref: string): boolean {
  return UUID_PATTERN.test(ref)
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