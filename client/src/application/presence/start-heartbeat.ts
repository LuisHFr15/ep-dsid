import { SessionStore } from "../../domain/auth/session-store.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type StartHeartbeatInput = {
  networkId: string
  peerId: string
  intervalMs: number
}

export class StartHeartbeat {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore
  ) {}

  async execute(input: StartHeartbeatInput): Promise<void> {
    const session = await this.sessionStore.load()

    if (!session) {
      throw new Error("Você precisa fazer login antes. Rode: auth:login <user> <password>")
    }

    console.log("[heartbeat:start] Iniciando heartbeat contínuo.")
    console.log(`networkId: ${input.networkId}`)
    console.log(`peerId: ${input.peerId}`)
    console.log(`intervalMs: ${input.intervalMs}`)
    console.log("Pressione Ctrl+C para parar.")

    while (true) {
      const result = await this.hubApi.sendHeartbeat(session.jwt, {
        networkId: input.networkId,
        peerId: input.peerId
      })

      console.log("")
      console.log(`[heartbeat:start] ${new Date().toISOString()}`)
      console.log(JSON.stringify(result, null, 2))

      await sleep(input.intervalMs)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}