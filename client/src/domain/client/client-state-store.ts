import { ClientState } from "./client-state.js"

export interface ClientStateStore {
  load(): Promise<ClientState | null>
  save(state: ClientState): Promise<void>
  clear(): Promise<void>
}