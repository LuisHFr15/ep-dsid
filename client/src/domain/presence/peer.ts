export type HeartbeatResult = {
  networkId: string
  peerId: string
  activePeers: number
  shouldActivateFallback: boolean
}

export type ActivePeersResult = {
  networkId: string
  activePeers: unknown[]
}