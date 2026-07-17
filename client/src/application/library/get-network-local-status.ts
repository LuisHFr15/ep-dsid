import { NetworkWorkspace } from "../../domain/client/client-home.js"
import {
  LocalLibraryFile
} from "../../domain/library/local-library.js"
import { LocalLibraryStore } from "../../domain/library/local-library-store.js"

export type NetworkLocalStatus =
  | "not-materialized"
  | "missing"
  | "current"
  | "update-available"
  | "unknown"

export type GetNetworkLocalStatusResult = {
  networkId: string
  networkTitle: string
  folderName: string | null

  status: NetworkLocalStatus

  localFile: LocalLibraryFile | null

  remoteFile: {
    filename: string
    versionId: string
    lamportTs: number
    size: number
    infoHash: string
    magnet: string
  } | null
}

type GetCurrentNetworkPort = {
  execute(): Promise<NetworkWorkspace>
}

export class GetNetworkLocalStatus {
  constructor(
    private readonly getCurrentNetwork: GetCurrentNetworkPort,
    private readonly localLibraryStore: LocalLibraryStore
  ) { }

  async execute(): Promise<GetNetworkLocalStatusResult> {
    const workspace =
      await this.getCurrentNetwork.execute()

    const manifest =
      await this.localLibraryStore.load()

    const localNetwork =
      manifest?.networks[
      workspace.network.id
      ] ?? null

    const remoteFile =
      workspace.currentFile?.filename &&
        typeof workspace.currentFile.size === "number" &&
        workspace.currentFile.infoHash &&
        workspace.currentFile.magnet
        ? {
          filename:
            workspace.currentFile.filename,
          versionId:
            workspace.currentFile.versionId,
          lamportTs:
            workspace.currentFile.lamportTs,
          size:
            workspace.currentFile.size,
          infoHash:
            workspace.currentFile.infoHash,
          magnet:
            workspace.currentFile.magnet
        }
        : null

    const localFile =
      remoteFile && localNetwork
        ? localNetwork.files[
        remoteFile.filename
        ] ?? null
        : firstLocalFile(localNetwork)

    return {
      networkId: workspace.network.id,
      networkTitle:
        workspace.network.title,
      folderName:
        localNetwork?.folderName ?? null,
      status: resolveStatus(
        localFile,
        remoteFile
      ),
      localFile,
      remoteFile
    }
  }
}

function firstLocalFile(
  network:
    | {
      files: Record<
        string,
        LocalLibraryFile
      >
    }
    | null
): LocalLibraryFile | null {
  if (!network) {
    return null
  }

  return Object.values(network.files)[0] ?? null
}

function resolveStatus(
  localFile: LocalLibraryFile | null,
  remoteFile: {
    versionId: string
  } | null
): NetworkLocalStatus {
  if (!localFile) {
    return "not-materialized"
  }

  if (!localFile.exists) {
    return "missing"
  }

  if (!remoteFile) {
    return "unknown"
  }

  if (
    localFile.versionId ===
    remoteFile.versionId
  ) {
    return "current"
  }

  return "update-available"
}
