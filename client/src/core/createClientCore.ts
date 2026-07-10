import {
  AnnounceFileInput,
  HeartbeatInput,
  HubHttpClient
} from "../hub/HubHttpClient.js"

export type ClientCoreConfig = {
  hubBaseUrl: string
}

export function createClientCore(config: ClientCoreConfig) {
  const hub = new HubHttpClient({
    hubBaseUrl: config.hubBaseUrl
  })

  return {
    health: () => hub.health(),

    listFiles: () => hub.listFiles(),

    getFile: (fileId: string) => hub.getFile(fileId),

    announceFile: (input: AnnounceFileInput) => hub.announceFile(input),

    heartbeat: (input: HeartbeatInput) => hub.heartbeat(input)
  }
}