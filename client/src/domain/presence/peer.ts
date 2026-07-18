export type HeartbeatResult = {
  networkId: string
  peerId: string
  activePeers: number
}

export type ActivePeersResult = {
  networkId: string
  activePeers: unknown[]
}
