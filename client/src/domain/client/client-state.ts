import { Network } from "../network/network.js"
import { NetworkFile, FileVersionsResult } from "../file/network-file.js"
import { ActivePeersResult } from "../presence/peer.js"

export type ClientState = {
  selectedNetworkId: string | null
  networks: Network[]
  currentFilesByNetworkId: Record<string, NetworkFile | null>
  versionsByNetworkId: Record<string, FileVersionsResult | null>
  peersByNetworkId: Record<string, ActivePeersResult | null>
  refreshedAt: string
}