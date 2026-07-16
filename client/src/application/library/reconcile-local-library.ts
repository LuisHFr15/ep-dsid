import {
  LocalLibraryManifest
} from "../../domain/library/local-library.js"
import { LocalFileInspector } from "../../domain/library/local-file-inspector.js"
import { LocalLibraryStore } from "../../domain/library/local-library-store.js"

export type ReconcileLocalLibraryResult = {
  networks: number
  files: number
  availableFiles: number
  missingFiles: number
  sizeChangedFiles: number
  reconciledAt: string
}

export class ReconcileLocalLibrary {
  constructor(
    private readonly localLibraryStore: LocalLibraryStore,
    private readonly localFileInspector: LocalFileInspector,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(): Promise<ReconcileLocalLibraryResult> {
    const manifest =
      await this.localLibraryStore.load()

    const reconciledAt =
      this.now().toISOString()

    if (!manifest) {
      return {
        networks: 0,
        files: 0,
        availableFiles: 0,
        missingFiles: 0,
        sizeChangedFiles: 0,
        reconciledAt
      }
    }

    let files = 0
    let availableFiles = 0
    let missingFiles = 0
    let sizeChangedFiles = 0

    const updatedManifest: LocalLibraryManifest = {
      ...manifest,
      networks: {},
      updatedAt: reconciledAt
    }

    for (
      const [
        networkId,
        network
      ] of Object.entries(
        manifest.networks
      )
    ) {
      const updatedFiles = {
        ...network.files
      }

      for (
        const [
          filename,
          file
        ] of Object.entries(
          network.files
        )
      ) {
        files += 1

        const inspection =
          await this.localFileInspector.inspect(
            file.localPath
          )

        const exists =
          inspection.exists &&
          inspection.isFile

        if (exists) {
          availableFiles += 1
        } else {
          missingFiles += 1
        }

        if (
          exists &&
          inspection.size !== null &&
          inspection.size !== file.size
        ) {
          sizeChangedFiles += 1
        }

        updatedFiles[filename] = {
          ...file,
          exists,
          size:
            exists &&
            inspection.size !== null
              ? inspection.size
              : file.size,
          lastVerifiedAt: reconciledAt
        }
      }

      updatedManifest.networks[
        networkId
      ] = {
        ...network,
        files: updatedFiles
      }
    }

    await this.localLibraryStore.save(
      updatedManifest
    )

    return {
      networks: Object.keys(
        manifest.networks
      ).length,
      files,
      availableFiles,
      missingFiles,
      sizeChangedFiles,
      reconciledAt
    }
  }
}
