import { describe, it, expect } from "vitest"
import { InitializeClient } from "./initialize-client.js"
import { HubConnectionError } from "../../domain/errors/app-error.js"
import type { Session } from "../../domain/auth/session.js"
import type { SessionStore } from "../../domain/auth/session-store.js"
import type { ClientState } from "../../domain/client/client-state.js"
import type { ClientStateStore } from "../../domain/client/client-state-store.js"
import type { HubApi } from "../../infrastructure/hub/hub-api.js"

const fakeSession: Session = { userId: "u1", user: "alice", jwt: "tok" }

function fakeSessionStore(): SessionStore {
  return { load: async () => fakeSession, save: async () => {}, clear: async () => {} }
}

function fakeClientStateStore(): ClientStateStore {
  let state: ClientState | null = null
  return {
    load: async () => state,
    save: async (s: ClientState) => { state = s },
  }
}

function hubReturning404OnFile(): Partial<HubApi> {
  return {
    listNetworks: async () => [
      { id: "n1", title: "Docs", description: "", tags: [], ownerId: "u1", accessMode: "public", updateMode: "centralized", activeFileId: null, createdAt: "2026-01-01" },
    ],
    getCurrentFile: async () => { throw new HubConnectionError("GET", "/networks/n1/file", 404) },
    listVersions: async () => { throw new HubConnectionError("GET", "/networks/n1/versions", 404) },
    listActivePeers: async () => ({ networkId: "n1", activePeers: [] }),
  }
}

describe("InitializeClient", () => {
  it("treats a 404 on getCurrentFile as null (network has no file yet)", async () => {
    const init = new InitializeClient(
      hubReturning404OnFile() as unknown as HubApi,
      fakeSessionStore(),
      fakeClientStateStore(),
    )

    const state = await init.execute()
    expect(state.currentFilesByNetworkId["n1"]).toBeNull()
    expect(state.versionsByNetworkId["n1"]).toBeNull()
    expect(state.peersByNetworkId["n1"]).not.toBeNull()
  })

  it("treats a 403 on getCurrentFile as null (not yet approved)", async () => {
    const hub: Partial<HubApi> = {
      ...hubReturning404OnFile(),
      getCurrentFile: async () => { throw new HubConnectionError("GET", "/networks/n1/file", 403) },
    }
    const init = new InitializeClient(
      hub as unknown as HubApi,
      fakeSessionStore(),
      fakeClientStateStore(),
    )

    const state = await init.execute()
    expect(state.currentFilesByNetworkId["n1"]).toBeNull()
  })
})
