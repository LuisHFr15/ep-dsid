import { Workspace } from "./workspace.js"

export interface WorkspaceStore {
  load(): Promise<Workspace | null>
  save(workspace: Workspace): Promise<void>
  clear(): Promise<void>
}