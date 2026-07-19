import { ElectronContainer } from "./electron-container.js"

type IpcHandler = (...args: unknown[]) => Promise<unknown>

// Mapeia cada canal IPC para o use case do core. O renderer não passa JWT —
// os use cases resolvem a sessão pelo SessionStore (dono da sessão é o main).
// publishLocal/downloadCurrent selecionam a rede antes de agir, casando com o
// modelo de "rede selecionada" dos use cases de torrent.
export function buildIpcMap(container: ElectronContainer): Record<string, IpcHandler> {
  return {
    "health:check": async () => container.checkHealth.execute(),

    "auth:register": async (input) => {
      const { user, password } = input as { user: string; password: string }
      return container.registerUser.execute({ user, password })
    },
    "auth:login": async (input) => {
      const { user, password } = input as { user: string; password: string }
      const session = await container.login.execute({ user, password })
      try { await container.initializeClient.execute() } catch { /* non-fatal */ }
      return { userId: session.userId, username: session.user }
    },
    "auth:logout": async () => container.logout.execute(),
    "auth:session": async () => {
      const session = await container.getCurrentSession.execute()
      return session ? { userId: session.userId, username: session.user } : null
    },

    "networks:list": async () => container.listNetworks.execute(),
    "networks:create": async (input) => {
      const data = input as {
        title: string
        description?: string
        tags?: string[]
        accessMode: "public" | "private"
        updateMode: "centralized" | "collaborative"
      }
      const result = await container.createNetwork.execute({
        title: data.title,
        description: data.description ?? "",
        tags: data.tags ?? [],
        accessMode: data.accessMode,
        updateMode: data.updateMode,
      })
      try { await container.initializeClient.execute() } catch { /* non-fatal */ }
      return result
    },
    "networks:requestAccess": async (networkId) => {
      return container.requestNetworkAccess.execute({ networkRef: String(networkId) })
    },
    "networks:listAccessRequests": async (networkId) => {
      return container.listNetworkAccessRequests.execute({ networkRef: String(networkId) })
    },
    "networks:decideAccess": async (networkId, userId, decision) => {
      return container.decideNetworkAccess.execute({
        networkRef: String(networkId),
        requestRef: String(userId),
        decision: decision as "approve" | "reject",
      })
    },
    "networks:listPeers": async (networkId) => {
      return container.listActivePeers.execute({ networkId: String(networkId) })
    },

    "files:getCurrent": async (networkId) => {
      return container.getCurrentFile.execute({ networkId: String(networkId) })
    },
    "files:listVersions": async (networkId) => {
      return container.listVersions.execute({ networkId: String(networkId) })
    },
    "files:promote": async (networkId, versionId) => {
      return container.promoteVersion.execute({
        networkId: String(networkId),
        versionId: String(versionId),
      })
    },
    "files:publishLocal": async (networkId, sourceFilePath) => {
      await container.selectNetwork.execute({ networkRef: String(networkId) })
      return container.publishLocalFile.execute({ sourceFilePath: String(sourceFilePath) })
    },
    "files:downloadCurrent": async (networkId) => {
      await container.selectNetwork.execute({ networkRef: String(networkId) })
      return container.downloadCurrentFile.execute({})
    },

    "workspace:configure": async (rootDirectory) => {
      return container.configureWorkspace.execute({ rootDirectory: String(rootDirectory) })
    },
    "workspace:status": async () => container.getWorkspaceStatus.execute(),

    "transfers:list": async () => container.listTorrentTransfers.execute(),
  }
}
