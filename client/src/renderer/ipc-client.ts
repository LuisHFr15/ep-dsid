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
  const result = await window.clientApi.invoke(channel, ...args) as IpcResult<T>
  if (!result.ok) {
    throw new Error(result.error.message)
  }
  return result.data
}

export function subscribe(channel: string, handler: (...args: unknown[]) => void): void {
  window.clientApi.on(channel, handler)
}

export const api = {
  health: () => invoke<{ status: string }>("health:check"),
  register: (user: string, password: string) => invoke<{ id: string; username: string }>("auth:register", { user, password }),
  login: (user: string, password: string) => invoke<{ jwt: string }>("auth:login", { user, password }),
  logout: () => invoke<void>("auth:logout"),
  session: () => invoke<{ userId: string; username: string; jwt: string } | null>("auth:session"),
  listNetworks: (q?: string, tag?: string) => invoke<unknown[]>("networks:list", { q, tag }),
  createNetwork: (data: unknown) => invoke<unknown>("networks:create", data),
  requestAccess: (networkId: string) => invoke<unknown>("networks:requestAccess", networkId),
  listAccessRequests: (networkId: string) => invoke<unknown[]>("networks:listAccessRequests", networkId),
  decideAccess: (networkId: string, userId: string, decision: string) => invoke<unknown>("networks:decideAccess", networkId, userId, decision),
  listPeers: (networkId: string) => invoke<unknown>("networks:listPeers", networkId),
  getCurrentFile: (networkId: string, versionId?: string) => invoke<unknown>("files:getCurrent", networkId, versionId),
  listVersions: (networkId: string) => invoke<unknown>("files:listVersions", networkId),
  promoteVersion: (networkId: string, versionId: string) => invoke<void>("files:promote", networkId, versionId),
  publishLocal: (networkId: string) => invoke<unknown>("files:publishLocal", networkId),
  downloadCurrent: (networkId: string) => invoke<unknown>("files:downloadCurrent", networkId),
  openFilePicker: () => invoke<string | null>("dialog:openFile"),
}
