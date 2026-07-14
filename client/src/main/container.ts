import { Login } from "../application/auth/login.js"
import { Logout } from "../application/auth/logout.js"
import { GetCurrentSession } from "../application/auth/get-current-session.js"
import { RegisterUser } from "../application/auth/register-user.js"
import { CheckHealth } from "../application/health/check-health.js"
import { CreateNetwork } from "../application/network/create-network.js"
import { ListNetworks } from "../application/network/list-networks.js"
import { loadClientConfig } from "../infrastructure/config/client-config.js"
import { HubApi } from "../infrastructure/hub/hub-api.js"
import { FileSessionStore } from "../infrastructure/session/file-session-store.js"
import { AnnounceFile } from "../application/file/announce-file.js"
import { GetCurrentFile } from "../application/file/get-current-file.js"
import { ListActivePeers } from "../application/presence/list-active-peers.js"
import { SendHeartbeat } from "../application/presence/send-heartbeat.js"
import { ListVersions } from "../application/file/list-versions.js"
import { PromoteVersion } from "../application/file/promote-version.js"
import { PublishVersion } from "../application/file/publish-version.js"
import { StartHeartbeat } from "../application/presence/start-heartbeat.js"


export type ClientContainer = {
  checkHealth: CheckHealth
  registerUser: RegisterUser
  login: Login
  logout: Logout
  getCurrentSession: GetCurrentSession
  listNetworks: ListNetworks
  createNetwork: CreateNetwork
  announceFile: AnnounceFile
  getCurrentFile: GetCurrentFile
  sendHeartbeat: SendHeartbeat
  listActivePeers: ListActivePeers
  listVersions: ListVersions
  publishVersion: PublishVersion
  promoteVersion: PromoteVersion
  startHeartbeat: StartHeartbeat
}

export function buildClientContainer(): ClientContainer {
  const config = loadClientConfig()

  const hubApi = new HubApi({
    hubBaseUrl: config.hubBaseUrl
  })

  const sessionStore = new FileSessionStore()

  return {
    checkHealth: new CheckHealth(hubApi),
    registerUser: new RegisterUser(hubApi),
    login: new Login(hubApi, sessionStore),
    logout: new Logout(sessionStore),
    getCurrentSession: new GetCurrentSession(sessionStore),
    listNetworks: new ListNetworks(hubApi, sessionStore),
    createNetwork: new CreateNetwork(hubApi, sessionStore),
    announceFile: new AnnounceFile(hubApi, sessionStore),
    getCurrentFile: new GetCurrentFile(hubApi, sessionStore),
    sendHeartbeat: new SendHeartbeat(hubApi, sessionStore),
    listActivePeers: new ListActivePeers(hubApi, sessionStore),
    listVersions: new ListVersions(hubApi, sessionStore),
    publishVersion: new PublishVersion(hubApi, sessionStore),
    promoteVersion: new PromoteVersion(hubApi, sessionStore),
    startHeartbeat: new StartHeartbeat(hubApi, sessionStore)
  }
}