import { SessionStore } from "../../domain/auth/session-store.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"
import { Logout } from "./logout.js"

export type LoginInput = {
  user: string
  password: string
}

export type LoginOutput = {
  user: string
  jwt: string
}

export class Login {
  constructor(
    private readonly hubApi: HubApi,
    private readonly sessionStore: SessionStore,
    private readonly logout: Logout
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    await this.logout.execute()

    const response = await this.hubApi.authenticateUser(input)

    const session: LoginOutput = {
      user: input.user,
      jwt: response.jwt
    }

    await this.sessionStore.save(session)

    return session
  }
}