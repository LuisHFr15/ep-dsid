import { join } from "node:path"

import { GetCurrentSession } from "../application/auth/get-current-session.js"
import { Login } from "../application/auth/login.js"
import { Logout } from "../application/auth/logout.js"
import { RegisterUser } from "../application/auth/register-user.js"
import { DecideNetworkAccess } from "../application/access/decide-network-access.js"
import { ListNetworkAccessRequests } from "../application/access/list-network-access-requests.js"
import { RequestNetworkAccess } from "../application/access/request-network-access.js"
import { GetCurrentNetwork } from "../application/client/get-current-network.js"
import { InitializeClient } from "../application/client/initialize-client.js"
import { SelectNetwork } from "../application/client/select-network.js"
import { PromoteSelectedNetworkVersion } from "../application/client/promote-selected-network-version.js"
import { PublishSelectedNetworkVersion } from "../application/client/publish-selected-network-version.js"
import { RefreshNetworkWorkspace } from "../application/client/refresh-network-workspace.js"
import { GetCurrentFile } from "../application/file/get-current-file.js"
import { ListVersions } from "../application/file/list-versions.js"
import { PromoteVersion } from "../application/file/promote-version.js"
import { CheckHealth } from "../application/health/check-health.js"
import { CreateNetwork } from "../application/network/create-network.js"
import { ListNetworks } from "../application/network/list-networks.js"
import { ListActivePeers } from "../application/presence/list-active-peers.js"
import { InitializePresenceRuntime } from "../application/presence-runtime/initialize-presence-runtime.js"
import { PresenceRuntime } from "../application/presence-runtime/presence-runtime.js"
import { ConfigureWorkspace } from "../application/workspace/configure-workspace.js"
import { GetWorkspaceStatus } from "../application/workspace/get-workspace-status.js"
import { RegisterLocalResource } from "../application/library/register-local-resource.js"
import { DownloadCurrentFile } from "../application/torrent/download-current-file.js"
import { ListTorrentTransfers } from "../application/torrent/list-torrent-transfers.js"
import { PublishLocalFile } from "../application/torrent/publish-local-file.js"

import { TorrentEngine } from "../domain/torrent/torrent-engine.js"
import { HubApi } from "../infrastructure/hub/hub-api.js"
import { FilePresenceRuntimeStore } from "../infrastructure/presence-runtime/file-presence-runtime-store.js"
import { FileSessionStore } from "../infrastructure/session/file-session-store.js"
import { FileClientStateStore } from "../infrastructure/state/file-client-state-store.js"
import { FileWorkspaceStore } from "../infrastructure/workspace/file-workspace-store.js"
import { FileLocalLibraryStore } from "../infrastructure/library/file-local-library-store.js"

export type ElectronContainer = {
  checkHealth: CheckHealth
  registerUser: RegisterUser
  login: Login
  logout: Logout
  getCurrentSession: GetCurrentSession
  initializeClient: InitializeClient
  getCurrentNetwork: GetCurrentNetwork
  selectNetwork: SelectNetwork
  listNetworks: ListNetworks
  createNetwork: CreateNetwork
  getCurrentFile: GetCurrentFile
  listVersions: ListVersions
  promoteVersion: PromoteVersion
  listActivePeers: ListActivePeers
  requestNetworkAccess: RequestNetworkAccess
  listNetworkAccessRequests: ListNetworkAccessRequests
  decideNetworkAccess: DecideNetworkAccess
  configureWorkspace: ConfigureWorkspace
  getWorkspaceStatus: GetWorkspaceStatus
  publishLocalFile: PublishLocalFile
  downloadCurrentFile: DownloadCurrentFile
  listTorrentTransfers: ListTorrentTransfers
  presenceRuntime: PresenceRuntime
}

export function buildElectronContainer(
  dataRoot: string,
  hubBaseUrl: string,
  torrentEngine: TorrentEngine,
): ElectronContainer {
  const hubApi = new HubApi({ hubBaseUrl })

  const sessionStore = new FileSessionStore(join(dataRoot, "session.json"))
  const clientStateStore = new FileClientStateStore(join(dataRoot, "state.json"))
  const presenceRuntimeStore = new FilePresenceRuntimeStore(join(dataRoot, "presence.json"))
  const workspaceStore = new FileWorkspaceStore(join(dataRoot, "workspace.json"))
  const localLibraryStore = new FileLocalLibraryStore(join(dataRoot, "library.json"))

  const initializeClient = new InitializeClient(hubApi, sessionStore, clientStateStore)
  const getCurrentNetwork = new GetCurrentNetwork(sessionStore, clientStateStore)
  const getWorkspaceStatus = new GetWorkspaceStatus(workspaceStore)
  const refreshNetworkWorkspace = new RefreshNetworkWorkspace(hubApi, sessionStore, clientStateStore)
  const publishSelectedNetworkVersion = new PublishSelectedNetworkVersion(hubApi, sessionStore, clientStateStore)
  const promoteSelectedNetworkVersion = new PromoteSelectedNetworkVersion(hubApi, sessionStore, clientStateStore)
  const registerLocalResource = new RegisterLocalResource(localLibraryStore)
  const initializePresenceRuntime = new InitializePresenceRuntime(
    sessionStore,
    clientStateStore,
    presenceRuntimeStore,
  )

  return {
    checkHealth: new CheckHealth(hubApi),
    registerUser: new RegisterUser(hubApi),
    login: new Login(hubApi, sessionStore),
    logout: new Logout(sessionStore, clientStateStore, presenceRuntimeStore),
    getCurrentSession: new GetCurrentSession(sessionStore),
    initializeClient,
    getCurrentNetwork,
    selectNetwork: new SelectNetwork(clientStateStore),
    listNetworks: new ListNetworks(hubApi, sessionStore),
    createNetwork: new CreateNetwork(hubApi, sessionStore),
    getCurrentFile: new GetCurrentFile(hubApi, sessionStore),
    listVersions: new ListVersions(hubApi, sessionStore),
    promoteVersion: new PromoteVersion(hubApi, sessionStore),
    listActivePeers: new ListActivePeers(hubApi, sessionStore),
    requestNetworkAccess: new RequestNetworkAccess(hubApi, sessionStore),
    listNetworkAccessRequests: new ListNetworkAccessRequests(hubApi, sessionStore, clientStateStore),
    decideNetworkAccess: new DecideNetworkAccess(hubApi, sessionStore, clientStateStore),
    configureWorkspace: new ConfigureWorkspace(workspaceStore),
    getWorkspaceStatus,
    publishLocalFile: new PublishLocalFile(
      getCurrentNetwork,
      getWorkspaceStatus,
      torrentEngine,
      publishSelectedNetworkVersion,
      promoteSelectedNetworkVersion,
      refreshNetworkWorkspace,
      registerLocalResource,
    ),
    downloadCurrentFile: new DownloadCurrentFile(
      refreshNetworkWorkspace,
      getWorkspaceStatus,
      torrentEngine,
      registerLocalResource,
    ),
    listTorrentTransfers: new ListTorrentTransfers(torrentEngine),
    presenceRuntime: new PresenceRuntime(
      hubApi,
      sessionStore,
      clientStateStore,
      presenceRuntimeStore,
      initializeClient,
      initializePresenceRuntime,
    ),
  }
}
