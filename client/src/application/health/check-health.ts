import { HealthStatus } from "../../domain/health/health-status.js"
import { HubApi } from "../../infrastructure/hub/hub-api.js"

export class CheckHealth {
  constructor(private readonly hubApi: HubApi) {}

  async execute(): Promise<HealthStatus> {
    return this.hubApi.health()
  }
}