import {
  LocalLibraryFileSource,
  LocalLibraryManifest,
  createEmptyLocalLibraryManifest
} from "../../domain/library/local-library.js"
import { LocalLibraryStore } from "../../domain/library/local-library-store.js"
import { buildNetworkFolderName } from "../../domain/torrent/network-folder-name.js"

export type RegisterLocalResourceInput = {
  networkId: string
  networkTitle: string

  filename: string
  localPath: string
  size: number

  versionId: string
  lamportTs?: number | null

  infoHash: string
  magnet: string

  source: LocalLibraryFileSource
}

export class RegisterLocalResource {
  constructor(
    private readonly localLibraryStore: LocalLibraryStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(
    input: RegisterLocalResourceInput
  ): Promise<LocalLibraryManifest> {
    const now = this.now().toISOString()

    const manifest =
      await this.localLibraryStore.load() ??
      createEmptyLocalLibraryManifest(now)

    const previousNetwork =
      manifest.networks[input.networkId]

    const previousFiles =
      previousNetwork?.files ?? {}

    const updatedManifest: LocalLibraryManifest = {
      ...manifest,
      networks: {
        ...manifest.networks,
        [input.networkId]: {
          networkId: input.networkId,
          networkTitle: input.networkTitle,
          folderName: buildNetworkFolderName(
            input.networkTitle,
            input.networkId
          ),
          files: {
            ...previousFiles,
            [input.filename]: {
              filename: input.filename,
              localPath: input.localPath,
              size: input.size,
              versionId: input.versionId,
              lamportTs: input.lamportTs ?? null,
              infoHash: input.infoHash,
              magnet: input.magnet,
              source: input.source,
              materializedAt: now,
              lastVerifiedAt: now,
              exists: true
            }
          }
        }
      },
      updatedAt: now
    }

    await this.localLibraryStore.save(
      updatedManifest
    )

    return updatedManifest
  }
}
