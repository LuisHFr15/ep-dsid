export type PresenceRuntimeNetworkState = {
  online: boolean
  lastHeartbeatAt: string | null
  lastActivePeers: number | null
  lastShouldActivateFallback: boolean | null
  lastError: string | null
}

export type PresenceRuntimeState = {
  globalOnline: boolean
  defaultHeartbeatIntervalMs: number
  peerId: string
  networks: Record<string, PresenceRuntimeNetworkState>
  updatedAt: string
}

export type PresenceRuntimeNetworkStatus = {
  index: number
  networkId: string
  networkTitle: string
  online: boolean
  lastHeartbeatAt: string | null
  lastActivePeers: number | null
  lastShouldActivateFallback: boolean | null
  lastError: string | null
}

export type PresenceRuntimeStatus = {
  user: string
  globalOnline: boolean
  peerId: string
  defaultHeartbeatIntervalMs: number
  updatedAt: string
  networks: PresenceRuntimeNetworkStatus[]
}