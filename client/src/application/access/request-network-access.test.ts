import { describe, it, expect } from "vitest"
import { RequestNetworkAccess } from "./request-network-access.js"
import type { Session } from "../../domain/auth/session.js"
import type { SessionStore } from "../../domain/auth/session-store.js"
import type { HubApi } from "../../infrastructure/hub/hub-api.js"

const session: Session = { userId: "u1", user: "bob", jwt: "tok" }

function fakeSessionStore(): SessionStore {
  return { load: async () => session, save: async () => {}, clear: async () => {} }
}

describe("RequestNetworkAccess", () => {
  it("pede acesso pelo id direto, mesmo com a rede fora do estado local", async () => {
    // Regressão: antes o use case validava o networkRef contra o snapshot local
    // (state.networks) e lançava "Network não encontrada no estado local" quando
    // a rede privada tinha sido criada após o login. Agora vai direto ao hub.
    const calls: Array<{ jwt: string; networkId: string }> = []
    const hub: Partial<HubApi> = {
      requestNetworkAccess: async (jwt: string, networkId: string) => {
        calls.push({ jwt, networkId })
        return { status: "pending" }
      },
    }

    const useCase = new RequestNetworkAccess(
      hub as unknown as HubApi,
      fakeSessionStore(),
    )

    const result = await useCase.execute({ networkRef: "net-criada-depois-do-login" })

    expect(result).toEqual({ status: "pending" })
    expect(calls).toEqual([{ jwt: "tok", networkId: "net-criada-depois-do-login" }])
  })

  it("exige login antes de pedir acesso", async () => {
    const hub: Partial<HubApi> = { requestNetworkAccess: async () => ({ status: "pending" }) }
    const noSession: SessionStore = { load: async () => null, save: async () => {}, clear: async () => {} }

    const useCase = new RequestNetworkAccess(hub as unknown as HubApi, noSession)

    await expect(useCase.execute({ networkRef: "n1" })).rejects.toThrow(/login/i)
  })
})
