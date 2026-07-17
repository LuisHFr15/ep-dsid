import { PresenceRuntimeState } from "../../domain/presence-runtime/presence-runtime-state.js"
import { PresenceRuntimeStore } from "../../domain/presence-runtime/presence-runtime-store.js"
import { InitializePresenceRuntime } from "./initialize-presence-runtime.js"

export type SetGlobalPresenceInput = {
  online: boolean
}

export class SetGlobalPresence {
  constructor(
    private readonly presenceRuntimeStore: PresenceRuntimeStore,
    private readonly initializePresenceRuntime: InitializePresenceRuntime
  ) {}

  async execute(input: SetGlobalPresenceInput): Promise<PresenceRuntimeState> {
    let state = await this.presenceRuntimeStore.load()

    if (!state) {
      state = await this.initializePresenceRuntime.execute()
    }

    state.globalOnline = input.online
    state.updatedAt = new Date().toISOString()

    if (input.online) {
      for (const networkId of Object.keys(state.networks)) {
        state.networks[networkId].online = true
      }
    }

    await this.presenceRuntimeStore.save(state)

    return state
  }
}