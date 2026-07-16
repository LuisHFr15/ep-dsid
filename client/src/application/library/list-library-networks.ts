import {
  LocalLibraryNetwork
} from "../../domain/library/local-library.js"
import { LocalLibraryStore } from "../../domain/library/local-library-store.js"

export type LibraryNetworkOverview = {
  networkId: string
  networkTitle: string
  folderName: string
  files: Array<{
    filename: string
    localPath: string
    size: number
    versionId: string
    lamportTs: number | null
    source: "published" | "downloaded"
    exists: boolean
    materializedAt: string
    lastVerifiedAt: string
  }>
}

export class ListLibraryNetworks {
  constructor(
    private readonly localLibraryStore: LocalLibraryStore
  ) {}

  async execute(): Promise<LibraryNetworkOverview[]> {
    const manifest =
      await this.localLibraryStore.load()

    if (!manifest) {
      return []
    }

    return Object.values(manifest.networks)
      .sort(compareNetworks)
      .map((network) => ({
        networkId: network.networkId,
        networkTitle: network.networkTitle,
        folderName: network.folderName,
        files: Object.values(network.files)
          .sort((first, second) =>
            first.filename.localeCompare(
              second.filename
            )
          )
          .map((file) => ({
            filename: file.filename,
            localPath: file.localPath,
            size: file.size,
            versionId: file.versionId,
            lamportTs: file.lamportTs,
            source: file.source,
            exists: file.exists,
            materializedAt:
              file.materializedAt,
            lastVerifiedAt:
              file.lastVerifiedAt
          }))
      }))
  }
}

function compareNetworks(
  first: LocalLibraryNetwork,
  second: LocalLibraryNetwork
): number {
  return first.networkTitle.localeCompare(
    second.networkTitle
  )
}
