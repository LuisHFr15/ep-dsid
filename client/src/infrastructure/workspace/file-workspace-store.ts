import {
  WorkspaceStore
} from "../../domain/workspace/workspace-store.js"
import {
  Workspace
} from "../../domain/workspace/workspace.js"
import {
  readJsonFile,
  removeFileIfExists,
  writeJsonFile
} from "../filesystem/json-file.js"

export class FileWorkspaceStore
implements WorkspaceStore {
  constructor(
    private readonly filePath: string
  ) {}

  async load(): Promise<Workspace | null> {
    const workspace =
      await readJsonFile<Workspace>(this.filePath)

    if (!workspace) {
      return null
    }

    if (
      !workspace.rootDirectory ||
      !workspace.configuredAt
    ) {
      throw new Error(
        "Arquivo workspace.json inválido"
      )
    }

    return workspace
  }

  async save(workspace: Workspace): Promise<void> {
    await writeJsonFile(
      this.filePath,
      workspace
    )
  }

  async clear(): Promise<void> {
    await removeFileIfExists(this.filePath)
  }
}