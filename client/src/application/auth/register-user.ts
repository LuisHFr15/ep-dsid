import { HubApi } from "../../infrastructure/hub/hub-api.js"
import { RegisterUserResponse } from "../../infrastructure/hub/hub-types.js"

export type RegisterUserInput = {
  user: string
  password: string
}

export class RegisterUser {
  constructor(private readonly hubApi: HubApi) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserResponse> {
    return this.hubApi.registerUser(input)
  }
}