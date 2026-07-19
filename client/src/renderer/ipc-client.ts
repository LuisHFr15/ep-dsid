import type {
  Network,
  FileVersionsResult,
  ActivePeer,
  AccessRequestsResult,
} from "./types"

declare global {
  interface Window {
    clientApi: {
      invoke(channel: string, ...args: unknown[]): Promise<{ ok: boolean; data?: unknown; error?: { code: string; message: string } }>
      on(channel: string, handler: (...args: unknown[]) => void): void
    }
  }
}

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await window.clientApi.invoke(channel, ...args)) as IpcResult<T>
  if (!result.ok) {
    throw new Error(result.error.message)
  }
  return result.data
}

export function subscribe(channel: string, handler: (...args: unknown[]) => void): void {
  window.clientApi.on(channel, handler)
}

export type CreateNetworkData = {
  title: string
  description?: string
  tags?: string[]
  accessMode: "public" | "private"
  updateMode: "centralized" | "collaborative"
}

// O renderer nunca lida com JWT — o processo main é o dono da sessão.
export const api = {
  health: () => invoke<{ status: string }>("health:check"),
  register: (user: string, password: string) => invoke<{ id: string; username: string }>("auth:register", { user, password }),
  login: (user: string, password: string) => invoke<{ userId: string; username: string }>("auth:login", { user, password }),
  logout: () => invoke<void>("auth:logout"),
  session: () => invoke<{ userId: string; username: string } | null>("auth:session"),

  listNetworks: () => invoke<Network[]>("networks:list"),
  createNetwork: (data: CreateNetworkData) => invoke<Network>("networks:create", data),
  requestAccess: (networkId: string) => invoke<unknown>("networks:requestAccess", networkId),
  listAccessRequests: (networkId: string) => invoke<AccessRequestsResult>("networks:listAccessRequests", networkId),
  decideAccess: (networkId: string, userId: string, decision: "approve" | "reject") =>
    invoke<unknown>("networks:decideAccess", networkId, userId, decision),
  listPeers: (networkId: string) => invoke<{ activePeers: ActivePeer[] }>("networks:listPeers", networkId),

  getCurrentFile: (networkId: string) => invoke<unknown>("files:getCurrent", networkId),
  listVersions: (networkId: string) => invoke<FileVersionsResult>("files:listVersions", networkId),
  promoteVersion: (networkId: string, versionId: string) => invoke<void>("files:promote", networkId, versionId),
  publishLocal: (networkId: string, sourceFilePath: string) => invoke<unknown>("files:publishLocal", networkId, sourceFilePath),
  downloadCurrent: (networkId: string) => invoke<unknown>("files:downloadCurrent", networkId),

  openFilePicker: () => invoke<string | null>("dialog:openFile"),
  copyToClipboard: (text: string) => invoke<null>("clipboard:write", text),

  workspaceStatus: () => invoke<WorkspaceStatus>("workspace:status"),
  chooseWorkspace: () => invoke<{ rootDirectory: string }>("workspace:choose"),

  listTransfers: () => invoke<TransferView[]>("transfers:list"),

  startPresence: () => invoke<null>("presence:start"),
  stopPresence: () => invoke<null>("presence:stop"),
  joinNetwork: (networkId: string) => invoke<{ online: boolean }>("presence:joinNetwork", networkId),
  leaveNetwork: (networkId: string) => invoke<{ online: boolean }>("presence:leaveNetwork", networkId),
  networkPresence: (networkId: string) => invoke<{ online: boolean }>("presence:getNetwork", networkId),
}

export type WorkspaceStatus = {
  configured: boolean
  rootDirectory: string | null
  directoryExists: boolean
}

export type TransferView = {
  id: string
  direction: "upload" | "download"
  status: string
  filename: string
  size: number
  progress: number
  destinationPath: string
  networkTitle: string
}

export type PresenceUpdate = {
  networkId: string
  networkTitle: string
  online: boolean
  activePeers: number | null
  error: string | null
}

export function onPresenceUpdate(handler: (update: PresenceUpdate) => void): void {
  subscribe("presence:update", (payload) => handler(payload as PresenceUpdate))
}
