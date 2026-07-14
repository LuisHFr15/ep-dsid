export type ClientConfig = {
  hubBaseUrl: string
}

export function loadClientConfig(): ClientConfig {
  return {
    hubBaseUrl: process.env.HUB_BASE_URL ?? "http://localhost:3000"
  }
}