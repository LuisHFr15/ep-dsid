import { Session } from "./session.js"

export interface SessionStore {
  load(): Promise<Session | null>
  save(session: Session): Promise<void>
  clear(): Promise<void>
}