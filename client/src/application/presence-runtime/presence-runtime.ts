import { AuthError } from "../../domain/errors/app-error.js"
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

export type PresenceUpdate = {
  networkId: string
  networkTitle: string
  online: boolean
  activePeers: number | null
  error: string | null
}

export type PresenceRuntimeOptions = {
  intervalMs?: number
  onUpdate?: (update: PresenceUpdate) => void
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export class PresenceRuntime {
  private running = false
  private stopRequested: (() => void) | null = null

  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly clientStateStore: ClientStateStore,
    private readonly presenceRuntimeStore: PresenceRuntimeStore,
    private readonly initializeClient: InitializeClient,
    private readonly initializePresenceRuntime: InitializePresenceRuntime
  ) {}

  isRunning(): boolean {
    return this.running
  }

  async start(options: PresenceRuntimeOptions = {}): Promise<void> {
    if (this.running) {
      return
    }

    const session = await this.sessionStore.load()
    if (!session) {
      throw new AuthError("Sessão não encontrada. Faça login antes de iniciar a presença.")
    }

    await this.initializeClient.execute()
    await this.initializePresenceRuntime.execute({ intervalMs: options.intervalMs })

    const sleep = options.sleep ?? defaultSleep
    const onUpdate = options.onUpdate ?? (() => {})

    this.running = true

    while (this.running) {
      const presence = await this.presenceRuntimeStore.load()
      const clientState = await this.clientStateStore.load()

      if (!presence || !clientState) {
        this.running = false
        throw new Error("Estado local ausente durante execução do runtime.")
      }

      await this.runHeartbeatCycle(session.jwt, presence, clientState, onUpdate)

      if (!this.running) {
        break
      }
      await Promise.race([
        sleep(presence.defaultHeartbeatIntervalMs),
        new Promise<void>((resolve) => {
          this.stopRequested = resolve
        })
      ])
      this.stopRequested = null
    }
  }

  stop(): void {
    this.running = false
    if (this.stopRequested) {
      this.stopRequested()
    }
  }

  private async runHeartbeatCycle(
    jwt: string,
    presence: PresenceRuntimeState,
    clientState: ClientState,
    onUpdate: (update: PresenceUpdate) => void
  ): Promise<void> {
    if (!presence.globalOnline) {
      await this.saveStates(presence, clientState)
      return
    }

    for (const network of clientState.networks) {
      const networkPresence = this.ensureNetworkPresence(presence, network.id)

      if (!networkPresence.online) {
        onUpdate({
          networkId: network.id,
          networkTitle: network.title,
          online: false,
          activePeers: networkPresence.lastActivePeers,
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
        networkPresence.lastError = null

        clientState.peersByNetworkId[network.id] = peers
        clientState.refreshedAt = new Date().toISOString()

        onUpdate({
          networkId: network.id,
          networkTitle: network.title,
          online: true,
          activePeers: heartbeat.activePeers,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        networkPresence.lastError = errorMessage

        onUpdate({
          networkId: network.id,
          networkTitle: network.title,
          online: true,
          activePeers: networkPresence.lastActivePeers,
          error: errorMessage
        })
      }
    }

    await this.saveStates(presence, clientState)
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
      // Default offline: redes só recebem heartbeat depois que o usuário entra.
      online: false,
      lastHeartbeatAt: null,
      lastActivePeers: null,
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
