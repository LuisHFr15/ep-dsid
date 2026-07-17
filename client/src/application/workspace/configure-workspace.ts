import { mkdir, stat } from "node:fs/promises"
import { isAbsolute, resolve } from "node:path"
import {
  Workspace
} from "../../domain/workspace/workspace.js"
import {
  WorkspaceStore
} from "../../domain/workspace/workspace-store.js"

export type ConfigureWorkspaceInput = {
  rootDirectory: string
}

export class ConfigureWorkspace {
  constructor(
    private readonly workspaceStore: WorkspaceStore
  ) {}

  async execute(
    input: ConfigureWorkspaceInput
  ): Promise<Workspace> {
    const rootDirectory =
      normalizeWorkspacePath(input.rootDirectory)

    await mkdir(rootDirectory, {
      recursive: true
    })

    const directoryStat = await stat(rootDirectory)

    if (!directoryStat.isDirectory()) {
      throw new Error(
        `O caminho escolhido não é um diretório: ${rootDirectory}`
      )
    }

    const workspace: Workspace = {
      rootDirectory,
      configuredAt: new Date().toISOString()
    }

    await this.workspaceStore.save(workspace)

    return workspace
  }
}

function normalizeWorkspacePath(
  input: string
): string {
  const trimmed = input.trim()

  if (!trimmed) {
    throw new Error(
      "O diretório da workspace é obrigatório"
    )
  }

  return isAbsolute(trimmed)
    ? resolve(trimmed)
    : resolve(process.cwd(), trimmed)
}