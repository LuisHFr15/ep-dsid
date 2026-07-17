import { SessionStore } from "../../domain/auth/session-store.js"
import { ClientState } from "../../domain/client/client-state.js"
import { ClientStateStore } from "../../domain/client/client-state-store.js"
import {
  PresenceRuntimeNetworkState,
  PresenceRuntimeState
} from "../../domain/presence-runtime/presence-runtime-state.js"
import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"
import { InitializeClient } from "../client/initialize-client.js"
import { InitializePresenceRuntime } from "./initialize-presence-runtime.js"

export type StartPresenceRuntimeInput = {
  intervalMs?: number
}

type NetworkLogSnapshot = {
  effectiveStatus: "online" | "offline"
  activePeers: number | null
  shouldActivateFallback: boolean | null
  error: string | null
}

type RuntimeLogSnapshot = {
  globalOnline: boolean | null
  networks: Record<string, NetworkLogSnapshot>
}

export class StartPresenceRuntime {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore,
    private readonly presenceRuntimeStore: PresenceRuntimeStore,
    private readonly initializeClient: InitializeClient,
    private readonly initializePresenceRuntime: InitializePresenceRuntime
  ) {}

  async execute(input: StartPresenceRuntimeInput = {}): Promise<void> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    await this.initializeClient.execute()
    await this.initializePresenceRuntime.execute({
      intervalMs: input.intervalMs
    })

    const snapshot: RuntimeLogSnapshot = {
      globalOnline: null,
      networks: {}
    }

    console.log("[client:start] Runtime de presença iniciado.")
    console.log(`Usuário: ${session.user}`)
    console.log("O loop relê client/.client-presence.json a cada ciclo.")
    console.log("Use outro terminal para ligar/desligar presença.")
    console.log("Logs aparecem apenas quando há mudança relevante.")
    console.log("Pressione Ctrl+C para parar.")

    while (true) {
      const presence = await this.presenceRuntimeStore.load()
      const clientState = await this.clientStateStore.load()

      if (!presence || !clientState) {
        throw new Error("Estado local ausente durante execução do runtime.")
      }

      await this.runHeartbeatCycle(session.jwt, presence, clientState, snapshot)

      await sleep(presence.defaultHeartbeatIntervalMs)
    }
  }

  private async runHeartbeatCycle(
    jwt: string,
    presence: PresenceRuntimeState,
    clientState: ClientState,
    snapshot: RuntimeLogSnapshot
  ): Promise<void> {
    this.logGlobalChangeIfNeeded(presence, snapshot)

    if (!presence.globalOnline) {
      await this.saveStates(presence, clientState)
      return
    }

    for (const network of clientState.networks) {
      const networkPresence = this.ensureNetworkPresence(presence, network.id)

      if (!networkPresence.online) {
        this.logNetworkChangeIfNeeded(snapshot, network.id, network.title, {
          effectiveStatus: "offline",
          activePeers: networkPresence.lastActivePeers,
          shouldActivateFallback: networkPresence.lastShouldActivateFallback,
          error: null
        })

        continue
      }

      try {
        const heartbeat = await this.hubApi.sendHeartbeat(jwt, {
          networkId: network.id,
          peerId: presence.peerId
        })

        const peers = await this.hubApi.listActivePeers(jwt, network.id)

        networkPresence.lastHeartbeatAt = new Date().toISOString()
        networkPresence.lastActivePeers = heartbeat.activePeers
        networkPresence.lastShouldActivateFallback = heartbeat.shouldActivateFallback
        networkPresence.lastError = null

        clientState.peersByNetworkId[network.id] = peers
        clientState.refreshedAt = new Date().toISOString()

        this.logNetworkChangeIfNeeded(snapshot, network.id, network.title, {
          effectiveStatus: "online",
          activePeers: heartbeat.activePeers,
          shouldActivateFallback: heartbeat.shouldActivateFallback,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        networkPresence.lastError = errorMessage

        this.logNetworkChangeIfNeeded(snapshot, network.id, network.title, {
          effectiveStatus: "online",
          activePeers: networkPresence.lastActivePeers,
          shouldActivateFallback: networkPresence.lastShouldActivateFallback,
          error: errorMessage
        })
      }
    }

    await this.saveStates(presence, clientState)
  }

  private logGlobalChangeIfNeeded(
    presence: PresenceRuntimeState,
    snapshot: RuntimeLogSnapshot
  ): void {
    if (snapshot.globalOnline === presence.globalOnline) {
      return
    }

    snapshot.globalOnline = presence.globalOnline

    console.log("")
    console.log(`[presence] global ${presence.globalOnline ? "online" : "offline"}`)
  }

  private logNetworkChangeIfNeeded(
    snapshot: RuntimeLogSnapshot,
    networkId: string,
    networkTitle: string,
    next: NetworkLogSnapshot
  ): void {
    const previous = snapshot.networks[networkId]

    if (previous && isSameNetworkSnapshot(previous, next)) {
      return
    }

    snapshot.networks[networkId] = next

    if (next.error) {
      console.log(`[presence] ${networkTitle}: erro | ${next.error}`)
      return
    }

    if (next.effectiveStatus === "offline") {
      console.log(`[presence] ${networkTitle}: offline localmente`)
      return
    }

    console.log(
      `[presence] ${networkTitle}: online | peers=${next.activePeers ?? "-"} | fallback=${next.shouldActivateFallback ? "sim" : "não"}`
    )
  }

  private ensureNetworkPresence(
    presence: PresenceRuntimeState,
    networkId: string
  ): PresenceRuntimeNetworkState {
    const existing = presence.networks[networkId]

    if (existing) {
      return existing
    }

    presence.networks[networkId] = {
      online: true,
      lastHeartbeatAt: null,
      lastActivePeers: null,
      lastShouldActivateFallback: null,
      lastError: null
    }

    return presence.networks[networkId]
  }

  private async saveStates(
    presence: PresenceRuntimeState,
    clientState: ClientState
  ): Promise<void> {
    presence.updatedAt = new Date().toISOString()

    await this.presenceRuntimeStore.save(presence)
    await this.clientStateStore.save(clientState)
  }
}

function isSameNetworkSnapshot(
  previous: NetworkLogSnapshot,
  next: NetworkLogSnapshot
): boolean {
  return (
    previous.effectiveStatus === next.effectiveStatus &&
    previous.activePeers === next.activePeers &&
    previous.shouldActivateFallback === next.shouldActivateFallback &&
    previous.error === next.error
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}