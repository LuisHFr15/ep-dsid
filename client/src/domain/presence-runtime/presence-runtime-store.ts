import { PresenceRuntimeState } from "./presence-runtime-state.js"

export interface PresenceRuntimeStore {
  load(): Promise<PresenceRuntimeState | null>
  save(state: PresenceRuntimeState): Promise<void>
  clear(): Promise<void>
}