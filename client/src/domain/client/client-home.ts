import { AccessMode, UpdateMode } from "../network/network.js"
import { NetworkFile, FileVersionsResult } from "../file/network-file.js"
import { ActivePeersResult } from "../presence/peer.js"

export type ClientNetworkOverview = {
  index: number
  id: string
  title: string
  description: string
  tags: string[]
  accessMode: AccessMode
  updateMode: UpdateMode
  isSelected: boolean
  currentFile: NetworkFile | null
  versionsCount: number
  peersOnline: number
}

export type AvailableFileOverview = {
  index: number
  networkId: string
  networkTitle: string
  filename: string
  versionId: string
  lamportTs: number
}

export type ClientHomeOverview = {
  user: string
  selectedNetworkId: string | null
  refreshedAt: string
  networks: ClientNetworkOverview[]
  availableFiles: AvailableFileOverview[]
}

export type NetworkWorkspace = {
  user: string
  network: ClientNetworkOverview
  currentFile: NetworkFile | null
  versions: FileVersionsResult | null
  peers: ActivePeersResult | null
}