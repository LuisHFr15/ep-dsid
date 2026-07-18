import { join } from "node:path"

import { GetCurrentSession } from "../application/auth/get-current-session.js"
import { Login } from "../application/auth/login.js"
import { Logout } from "../application/auth/logout.js"
import { PromotePendingSession } from "../application/auth/promote-pending-session.js"
import { RegisterUser } from "../application/auth/register-user.js"

import { CreatePrivateNetwork } from "../application/access/create-private-network.js"
import { DecideNetworkAccess } from "../application/access/decide-network-access.js"
import { ListNetworkAccessRequests } from "../application/access/list-network-access-requests.js"
import { RequestNetworkAccess } from "../application/access/request-network-access.js"

import { GetClientHome } from "../application/client/get-client-home.js"
import { GetCurrentNetwork } from "../application/client/get-current-network.js"
import { InitializeClient } from "../application/client/initialize-client.js"
import { OpenNetwork } from "../application/client/open-network.js"
import { PromoteSelectedNetworkVersion } from "../application/client/promote-selected-network-version.js"
import { PublishSelectedNetworkVersion } from "../application/client/publish-selected-network-version.js"
import { RefreshNetworkWorkspace } from "../application/client/refresh-network-workspace.js"
import { SelectNetwork } from "../application/client/select-network.js"

import { AnnounceFile } from "../application/file/announce-file.js"
import { GetCurrentFile } from "../application/file/get-current-file.js"
import { ListVersions } from "../application/file/list-versions.js"
import { PromoteVersion } from "../application/file/promote-version.js"
import { PublishVersion } from "../application/file/publish-version.js"

import { CheckHealth } from "../application/health/check-health.js"

import { CreateNetwork } from "../application/network/create-network.js"
import { ListNetworks } from "../application/network/list-networks.js"

import { ListActivePeers } from "../application/presence/list-active-peers.js"
import { SendHeartbeat } from "../application/presence/send-heartbeat.js"
import { StartHeartbeat } from "../application/presence/start-heartbeat.js"

import { GetPresenceRuntimeStatus } from "../application/presence-runtime/get-presence-runtime-status.js"
import { InitializePresenceRuntime } from "../application/presence-runtime/initialize-presence-runtime.js"
import { SetGlobalPresence } from "../application/presence-runtime/set-global-presence.js"
import { SetNetworkPresence } from "../application/presence-runtime/set-network-presence.js"
import { PresenceRuntime } from "../application/presence-runtime/presence-runtime.js"

import { ConfigureWorkspace } from "../application/workspace/configure-workspace.js"
import { GetWorkspaceStatus } from "../application/workspace/get-workspace-status.js"
import { ListLocalLibrary } from "../application/workspace/list-local-library.js"

import { GetNetworkLocalStatus } from "../application/library/get-network-local-status.js"
import { ListLibraryNetworks } from "../application/library/list-library-networks.js"
import { ReconcileLocalLibrary } from "../application/library/reconcile-local-library.js"
import { RegisterLocalResource } from "../application/library/register-local-resource.js"

import { DownloadCurrentFile } from "../application/torrent/download-current-file.js"
import { ListTorrentTransfers } from "../application/torrent/list-torrent-transfers.js"
import { PublishLocalFile } from "../application/torrent/publish-local-file.js"

import { loadClientConfig } from "../infrastructure/config/client-config.js"
import { HubApi } from "../infrastructure/hub/hub-api.js"
import { FilePresenceRuntimeStore } from "../infrastructure/presence-runtime/file-presence-runtime-store.js"
import { FileSessionStore } from "../infrastructure/session/file-session-store.js"
import { FileClientStateStore } from "../infrastructure/state/file-client-state-store.js"
import { FileWorkspaceStore } from "../infrastructure/workspace/file-workspace-store.js"
import { NodeLocalLibraryScanner } from "../infrastructure/workspace/node-local-library-scanner.js"
import { FileLocalLibraryStore } from "../infrastructure/library/file-local-library-store.js"
import { NodeLocalFileInspector } from "../infrastructure/library/node-local-file-inspector.js"

import { FakeTorrentEngine } from "../infrastructure/torrent/fake-torrent-engine.js"
import { FileTorrentTransferStore } from "../infrastructure/torrent/file-torrent-transfer-store.js"

import {
  resolveBootstrapDataPaths,
  resolveClientDataPaths
} from "./client-data-paths.js"

export type BootstrapContainer = {
  checkHealth: CheckHealth
  registerUser: RegisterUser
  login: Login
}

export type ClientContainer = {
  clientDataRoot: string

  promotePendingSession: PromotePendingSession

  logout: Logout
  getCurrentSession: GetCurrentSession

  initializeClient: InitializeClient
  getClientHome: GetClientHome
  selectNetwork: SelectNetwork
  getCurrentNetwork: GetCurrentNetwork
  openNetwork: OpenNetwork

  listNetworks: ListNetworks
  createNetwork: CreateNetwork

  announceFile: AnnounceFile
  getCurrentFile: GetCurrentFile
  listVersions: ListVersions
  publishVersion: PublishVersion
  promoteVersion: PromoteVersion

  sendHeartbeat: SendHeartbeat
  listActivePeers: ListActivePeers
  startHeartbeat: StartHeartbeat

  initializePresenceRuntime: InitializePresenceRuntime
  getPresenceRuntimeStatus: GetPresenceRuntimeStatus
  setGlobalPresence: SetGlobalPresence
  setNetworkPresence: SetNetworkPresence
  presenceRuntime: PresenceRuntime

  refreshNetworkWorkspace: RefreshNetworkWorkspace
  publishSelectedNetworkVersion: PublishSelectedNetworkVersion
  promoteSelectedNetworkVersion: PromoteSelectedNetworkVersion

  createPrivateNetwork: CreatePrivateNetwork
  requestNetworkAccess: RequestNetworkAccess
  listNetworkAccessRequests: ListNetworkAccessRequests
  decideNetworkAccess: DecideNetworkAccess

  configureWorkspace: ConfigureWorkspace
  getWorkspaceStatus: GetWorkspaceStatus
  listLocalLibrary: ListLocalLibrary

  publishLocalFile: PublishLocalFile
  downloadCurrentFile: DownloadCurrentFile
  listTorrentTransfers: ListTorrentTransfers

  listLibraryNetworks: ListLibraryNetworks
  getNetworkLocalStatus: GetNetworkLocalStatus
  reconcileLocalLibrary: ReconcileLocalLibrary
}

export function buildBootstrapContainer(): BootstrapContainer {
  const config = loadClientConfig()

  const hubApi = new HubApi({
    hubBaseUrl: config.hubBaseUrl
  })

  const bootstrapPaths = resolveBootstrapDataPaths()

  const pendingSessionStore = new FileSessionStore(
    bootstrapPaths.pendingSessionFile
  )

  return {
    checkHealth: new CheckHealth(hubApi),

    registerUser: new RegisterUser(hubApi),

    login: new Login(
      hubApi,
      pendingSessionStore
    )
  }
}

export function buildClientContainer(
  clientDataRoot: string
): ClientContainer {
  const config = loadClientConfig()

  const hubApi = new HubApi({
    hubBaseUrl: config.hubBaseUrl
  })

  const bootstrapPaths = resolveBootstrapDataPaths()
  const clientPaths = resolveClientDataPaths(clientDataRoot)

  /*
   * Sessão provisória criada pelo auth:login.
   *
   * Ela fica fora do diretório definitivo do usuário porque,
   * no momento do login, CLIENT_DATA_DIR ainda não foi definido.
   */
  const pendingSessionStore = new FileSessionStore(
    bootstrapPaths.pendingSessionFile
  )

  /*
   * Stores definitivas desta instância.
   *
   * Cada terminal fornece seu próprio clientDataRoot, portanto
   * sessão, estado, presença e workspace ficam isolados.
   */
  const sessionStore = new FileSessionStore(
    clientPaths.sessionFile
  )

  const clientStateStore = new FileClientStateStore(
    clientPaths.stateFile
  )

  const presenceRuntimeStore = new FilePresenceRuntimeStore(
    clientPaths.presenceFile
  )

  const workspaceStore = new FileWorkspaceStore(
    clientPaths.workspaceFile
  )

  const localLibraryScanner = new NodeLocalLibraryScanner()

  const logout = new Logout(
    sessionStore,
    clientStateStore,
    presenceRuntimeStore
  )

  const selectNetwork = new SelectNetwork(
    clientStateStore
  )

  const getCurrentNetwork = new GetCurrentNetwork(
    sessionStore,
    clientStateStore
  )

  const initializeClient = new InitializeClient(
    hubApi,
    sessionStore,
    clientStateStore
  )

  const initializePresenceRuntime =
    new InitializePresenceRuntime(
      sessionStore,
      clientStateStore,
      presenceRuntimeStore
    )

  const refreshNetworkWorkspace =
    new RefreshNetworkWorkspace(
      hubApi,
      sessionStore,
      clientStateStore
    )

  const publishSelectedNetworkVersion =
    new PublishSelectedNetworkVersion(
      hubApi,
      sessionStore,
      clientStateStore
    )

  const promoteSelectedNetworkVersion =
    new PromoteSelectedNetworkVersion(
      hubApi,
      sessionStore,
      clientStateStore
    )

  const getWorkspaceStatus =
    new GetWorkspaceStatus(
      workspaceStore
    )

  const torrentTransferStore =
    new FileTorrentTransferStore(
      join(
        clientPaths.rootDirectory,
        "transfers.json"
      )
    )

  const torrentEngine =
    new FakeTorrentEngine(
      torrentTransferStore
    )

  const localLibraryStore =
    new FileLocalLibraryStore(
      join(
        clientPaths.rootDirectory,
        "library.json"
      )
    )

  const localFileInspector =
    new NodeLocalFileInspector()

  const registerLocalResource =
    new RegisterLocalResource(
      localLibraryStore
    )

  const publishLocalFile =
    new PublishLocalFile(
      getCurrentNetwork,
      getWorkspaceStatus,
      torrentEngine,
      publishSelectedNetworkVersion,
      promoteSelectedNetworkVersion,
      refreshNetworkWorkspace,
      registerLocalResource
    )

  const downloadCurrentFile =
    new DownloadCurrentFile(
      refreshNetworkWorkspace,
      getWorkspaceStatus,
      torrentEngine,
      registerLocalResource
    )

  const listTorrentTransfers =
    new ListTorrentTransfers(
      torrentEngine
    )

  const listLibraryNetworks =
    new ListLibraryNetworks(
      localLibraryStore
    )

  const getNetworkLocalStatus =
    new GetNetworkLocalStatus(
      getCurrentNetwork,
      localLibraryStore
    )

  const reconcileLocalLibrary =
    new ReconcileLocalLibrary(
      localLibraryStore,
      localFileInspector
    )

  return {
    clientDataRoot: clientPaths.rootDirectory,

    promotePendingSession:
      new PromotePendingSession(
        pendingSessionStore,
        sessionStore,
        clientPaths.rootDirectory
      ),

    logout,

    getCurrentSession: new GetCurrentSession(
      sessionStore
    ),

    initializeClient,

    getClientHome: new GetClientHome(
      sessionStore,
      clientStateStore
    ),

    selectNetwork,

    getCurrentNetwork,

    openNetwork: new OpenNetwork(
      selectNetwork,
      getCurrentNetwork
    ),

    initializePresenceRuntime,

    getPresenceRuntimeStatus:
      new GetPresenceRuntimeStatus(
        sessionStore,
        clientStateStore,
        presenceRuntimeStore
      ),

    setGlobalPresence: new SetGlobalPresence(
      presenceRuntimeStore,
      initializePresenceRuntime
    ),

    setNetworkPresence: new SetNetworkPresence(
      clientStateStore,
      presenceRuntimeStore,
      initializePresenceRuntime
    ),

    presenceRuntime: new PresenceRuntime(
      hubApi,
      sessionStore,
      clientStateStore,
      presenceRuntimeStore,
      initializeClient,
      initializePresenceRuntime
    ),

    listNetworks: new ListNetworks(
      hubApi,
      sessionStore
    ),

    createNetwork: new CreateNetwork(
      hubApi,
      sessionStore
    ),

    announceFile: new AnnounceFile(
      hubApi,
      sessionStore
    ),

    getCurrentFile: new GetCurrentFile(
      hubApi,
      sessionStore
    ),

    listVersions: new ListVersions(
      hubApi,
      sessionStore
    ),

    publishVersion: new PublishVersion(
      hubApi,
      sessionStore
    ),

    promoteVersion: new PromoteVersion(
      hubApi,
      sessionStore
    ),

    sendHeartbeat: new SendHeartbeat(
      hubApi,
      sessionStore
    ),

    listActivePeers: new ListActivePeers(
      hubApi,
      sessionStore
    ),

    startHeartbeat: new StartHeartbeat(
      hubApi,
      sessionStore
    ),

    refreshNetworkWorkspace,

    publishSelectedNetworkVersion,

    promoteSelectedNetworkVersion,

    createPrivateNetwork:
      new CreatePrivateNetwork(
        hubApi,
        sessionStore
      ),

    requestNetworkAccess:
      new RequestNetworkAccess(
        hubApi,
        sessionStore,
        clientStateStore
      ),

    listNetworkAccessRequests:
      new ListNetworkAccessRequests(
        hubApi,
        sessionStore,
        clientStateStore
      ),

    decideNetworkAccess:
      new DecideNetworkAccess(
        hubApi,
        sessionStore,
        clientStateStore
      ),

    configureWorkspace:
      new ConfigureWorkspace(
        workspaceStore
      ),

    getWorkspaceStatus,

    listLocalLibrary:
      new ListLocalLibrary(
        workspaceStore,
        localLibraryScanner
      ),

    publishLocalFile,

    downloadCurrentFile,

    listTorrentTransfers,

    listLibraryNetworks,

    getNetworkLocalStatus,

    reconcileLocalLibrary
  }
}