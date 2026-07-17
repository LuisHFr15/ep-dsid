import { Session } from "../../domain/auth/./session.js"
import { SessionStore } from "../../domain/auth/session-store.js"
import { decodeClientIdentityFromJwt } from "../../infrastructure/auth/decode-jwt-payload.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export type LoginInput = {
  user: string
  password: string
}

export type LoginOutput = Session

export class Login {
  constructor(
    private readonly hubApi: HubApi,
    private readonly pendingSessionStore: SessionStore
  ) {}

  async execute(
    input: LoginInput
  ): Promise<LoginOutput> {
    /*
     * Existe apenas uma sessão provisória por instalação.
     * Um login novo substitui uma tentativa anterior não concluída.
     */
    await this.pendingSessionStore.clear()

    const response =
      await this.hubApi.authenticateUser(input)

    const identity =
      decodeClientIdentityFromJwt(response.jwt)

    const session: Session = {
      userId: identity.userId,
      user: input.user,
      jwt: response.jwt
    }

    await this.pendingSessionStore.save(session)

    return session
  }
}