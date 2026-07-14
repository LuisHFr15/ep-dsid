export type NetworkFile = {
  fileId: string
  versionId: string
  parentVersionId?: string | null
  infoHash?: string
  magnet?: string
  filename?: string
  lamportTs: number
  [key: string]: unknown
}

export type AnnounceFileResult = {
  fileId: string
  versionId: string
  lamportTs: number
}

export type FileVersion = {
  versionId: string
  parentVersionId: string | null
  infoHash: string
  filename: string
  magnet?: string
  lamportTs: number
  authorId?: string
  createdAt?: string
  isCurrent?: boolean
  concurrent?: boolean
  [key: string]: unknown
}

export type FileVersionsResult = {
  fileId: string
  currentVersionId: string
  versions: FileVersion[]
}

export type PublishVersionResult = {
  fileId: string
  versionId: string
  lamportTs: number
  parentVersionId?: string | null
  concurrent?: boolean
}

export type PromoteVersionResult = {
  fileId: string
  versionId: string
  lamportTs: number
  parentVersionId: string
}