import { useState, useCallback, useRef } from 'react'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useInterval } from './useInterval'
import type { ActivePeer } from '../types'

const HEARTBEAT_INTERVAL = 10_000

export function useHeartbeat(networkId: string | null) {
  const { session } = useAuth()
  const peerId = useRef(crypto.randomUUID())
  const [peers, setPeers] = useState<ActivePeer[]>([])
  const [fallbackActive, setFallbackActive] = useState(false)

  const beat = useCallback(async () => {
    if (!session || !networkId) return
    try {
      const result = await api.sendHeartbeat(session.jwt, networkId, peerId.current)
      setPeers(result.activePeers)
      setFallbackActive(result.shouldActivateFallback)
    } catch {
      // silently ignore transient errors — next beat will retry
    }
  }, [session, networkId])

  useInterval(beat, networkId ? HEARTBEAT_INTERVAL : null)

  return { peers, fallbackActive, peerId: peerId.current }
}
