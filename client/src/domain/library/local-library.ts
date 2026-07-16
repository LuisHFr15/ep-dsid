export type LocalLibraryFileSource =
  | "published"
  | "downloaded"

export type LocalLibraryFile = {
  filename: string
  localPath: string
  size: number

  versionId: string
  lamportTs: number | null

  infoHash: string
  magnet: string

  source: LocalLibraryFileSource
  materializedAt: string
  lastVerifiedAt: string
  exists: boolean
}

export type LocalLibraryNetwork = {
  networkId: string
  networkTitle: string
  folderName: string
  files: Record<string, LocalLibraryFile>
}

export type LocalLibraryManifest = {
  schemaVersion: 1
  networks: Record<string, LocalLibraryNetwork>
  updatedAt: string
}

export function createEmptyLocalLibraryManifest(
  now: string
): LocalLibraryManifest {
  return {
    schemaVersion: 1,
    networks: {},
    updatedAt: now
  }
}
