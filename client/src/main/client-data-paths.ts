import { isAbsolute, resolve } from "node:path"

export type BootstrapDataPaths = {
  dataBaseDirectory: string
  pendingSessionFile: string
}

export type ClientDataPaths = {
  rootDirectory: string
  sessionFile: string
  stateFile: string
  presenceFile: string
  workspaceFile: string
}

export function resolveBootstrapDataPaths():
BootstrapDataPaths {
  const dataBaseDirectory =
    resolve(process.cwd(), ".client-data")

  return {
    dataBaseDirectory,
    pendingSessionFile: resolve(
      dataBaseDirectory,
      ".pending-session.json"
    )
  }
}

export function resolveClientDataPaths(
  configuredRoot: string
): ClientDataPaths {
  const rootDirectory = isAbsolute(configuredRoot)
    ? resolve(configuredRoot)
    : resolve(process.cwd(), configuredRoot)

  return {
    rootDirectory,
    sessionFile: resolve(rootDirectory, "session.json"),
    stateFile: resolve(rootDirectory, "state.json"),
    presenceFile: resolve(rootDirectory, "presence.json"),
    workspaceFile: resolve(rootDirectory, "workspace.json")
  }
}

export function requireClientDataRoot(): string {
  const value = process.env.CLIENT_DATA_DIR?.trim()

  if (!value) {
    throw new Error(
      [
        "CLIENT_DATA_DIR não está configurado neste terminal.",
        "",
        "Faça login e copie o comando exibido:",
        '$env:CLIENT_DATA_DIR = ".client-data\\<userId>"'
      ].join("\n")
    )
  }

  return value
}