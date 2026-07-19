// Shared domain types — mirrors hub domain interfaces

export type AccessMode = 'public' | 'private'
export type UpdateMode = 'centralized' | 'collaborative'
export type MembershipStatus = 'pending' | 'approved' | 'rejected'

export interface Network {
  id: string
  title: string
  description?: string
  tags: string[]
  accessMode: AccessMode
  updateMode: UpdateMode
  ownerId: string
  activeFileId?: string
  createdAt: string
}

export interface FileVersion {
  networkId: string
  fileId: string
  versionId: string
  parentVersionId: string | null
  infoHash: string
  magnet: string
  filename: string
  size: number
  lamportTs: number
  authorId: string
  createdAt: string
}

export interface VersionNode extends FileVersion {
  isCurrent: boolean
  concurrent: boolean
}

export interface FileVersionsResult {
  fileId: string
  versions: VersionNode[]
}

export interface ActivePeer {
  username: string
  lastSeenAt: string
}

export interface HeartbeatResult {
  activePeers: ActivePeer[]
  shouldActivateFallback: boolean
}

export interface NetworkAccessRequest {
  networkId: string
  userId: string
  username: string
  status: MembershipStatus
  createdAt: string
}

export interface Session {
  userId: string
  username: string
  jwt: string
}
