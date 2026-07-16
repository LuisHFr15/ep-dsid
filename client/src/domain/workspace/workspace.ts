export type Workspace = {
  rootDirectory: string
  configuredAt: string
}

export type WorkspaceStatus = {
  configured: boolean
  rootDirectory: string | null
  directoryExists: boolean
}