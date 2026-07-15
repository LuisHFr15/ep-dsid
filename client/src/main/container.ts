import { Login } from "../application/auth/login.js"
import { Logout } from "../application/auth/logout.js"
import { GetCurrentSession } from "../application/auth/get-current-session.js"
import { RegisterUser } from "../application/auth/register-user.js"

import { GetClientHome } from "../application/client/get-client-home.js"
import { GetCurrentNetwork } from "../application/client/get-current-network.js"
import { InitializeClient } from "../application/client/initialize-client.js"
import { OpenNetwork } from "../application/client/open-network.js"
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

import { loadClientConfig } from "../infrastructure/config/client-config.js"
import { HubApi } from "../infrastructure/hub/hub-api.js"
import { FileSessionStore } from "../infrastructure/session/file-session-store.js"
import { FileClientStateStore } from "../infrastructure/state/file-client-state-store.js"

import { GetPresenceRuntimeStatus } from "../application/presence-runtime/get-presence-runtime-status.js"
import { InitializePresenceRuntime } from "../application/presence-runtime/initialize-presence-runtime.js"
import { SetGlobalPresence } from "../application/presence-runtime/set-global-presence.js"
import { SetNetworkPresence } from "../application/presence-runtime/set-network-presence.js"
import { StartPresenceRuntime } from "../application/presence-runtime/start-presence-runtime.js"
import { FilePresenceRuntimeStore } from "../infrastructure/presence-runtime/file-presence-runtime-store.js"

import { CreatePrivateNetwork } from "../application/access/create-private-network.js"
import { DecideNetworkAccess } from "../application/access/decide-network-access.js"
import { ListNetworkAccessRequests } from "../application/access/list-network-access-requests.js"
import { RequestNetworkAccess } from "../application/access/request-network-access.js"

import { PromoteSelectedNetworkVersion } from "../application/client/promote-selected-network-version.js"
import { PublishSelectedNetworkVersion } from "../application/client/publish-selected-network-version.js"
import { RefreshNetworkWorkspace } from "../application/client/refresh-network-workspace.js"


export type ClientContainer = {
  checkHealth: CheckHealth

  registerUser: RegisterUser
  login: Login
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
  startPresenceRuntime: StartPresenceRuntime

  refreshNetworkWorkspace: RefreshNetworkWorkspace
  publishSelectedNetworkVersion: PublishSelectedNetworkVersion
  promoteSelectedNetworkVersion: PromoteSelectedNetworkVersion

  createPrivateNetwork: CreatePrivateNetwork
  requestNetworkAccess: RequestNetworkAccess
  listNetworkAccessRequests: ListNetworkAccessRequests
  decideNetworkAccess: DecideNetworkAccess
}

export function buildClientContainer(): ClientContainer {
  const config = loadClientConfig()

  const hubApi = new HubApi({
    hubBaseUrl: config.hubBaseUrl
  })

  const sessionStore = new FileSessionStore()
  const clientStateStore = new FileClientStateStore()

  const presenceRuntimeStore = new FilePresenceRuntimeStore()

  const logout = new Logout(
    sessionStore,
    clientStateStore,
    presenceRuntimeStore
  )

  const selectNetwork = new SelectNetwork(clientStateStore)

  const getCurrentNetwork = new GetCurrentNetwork(
    sessionStore,
    clientStateStore
  )

  const initializeClient = new InitializeClient(
    hubApi,
    sessionStore,
    clientStateStore
  )

  const initializePresenceRuntime = new InitializePresenceRuntime(
    sessionStore,
    clientStateStore,
    presenceRuntimeStore
  )

  return {
    checkHealth: new CheckHealth(hubApi),

    registerUser: new RegisterUser(hubApi),
    login: new Login(
      hubApi,
      sessionStore,
      logout
    ),
    logout,
    getCurrentSession: new GetCurrentSession(sessionStore),

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
    getPresenceRuntimeStatus: new GetPresenceRuntimeStatus(
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
    startPresenceRuntime: new StartPresenceRuntime(
      hubApi,
      sessionStore,
      clientStateStore,
      presenceRuntimeStore,
      initializeClient,
      initializePresenceRuntime
    ),

    listNetworks: new ListNetworks(hubApi, sessionStore),
    createNetwork: new CreateNetwork(hubApi, sessionStore),

    announceFile: new AnnounceFile(hubApi, sessionStore),
    getCurrentFile: new GetCurrentFile(hubApi, sessionStore),
    listVersions: new ListVersions(hubApi, sessionStore),
    publishVersion: new PublishVersion(hubApi, sessionStore),
    promoteVersion: new PromoteVersion(hubApi, sessionStore),

    sendHeartbeat: new SendHeartbeat(hubApi, sessionStore),
    listActivePeers: new ListActivePeers(hubApi, sessionStore),
    startHeartbeat: new StartHeartbeat(hubApi, sessionStore),

    refreshNetworkWorkspace: new RefreshNetworkWorkspace(
      hubApi,
      sessionStore,
      clientStateStore
    ),

    publishSelectedNetworkVersion:
      new PublishSelectedNetworkVersion(
        hubApi,
        sessionStore,
        clientStateStore
      ),

    promoteSelectedNetworkVersion:
      new PromoteSelectedNetworkVersion(
        hubApi,
        sessionStore,
        clientStateStore
      ),

    createPrivateNetwork: new CreatePrivateNetwork(
      hubApi,
      sessionStore
    ),

    requestNetworkAccess: new RequestNetworkAccess(
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

    decideNetworkAccess: new DecideNetworkAccess(
      hubApi,
      sessionStore,
      clientStateStore
    )
  }
}