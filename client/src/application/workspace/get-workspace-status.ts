import { stat } from "node:fs/promises"
import {
  WorkspaceStatus
} from "../../domain/workspace/workspace.js"
import {
  WorkspaceStore
} from "../../domain/workspace/workspace-store.js"

export class GetWorkspaceStatus {
  constructor(
    private readonly workspaceStore: WorkspaceStore
  ) {}

  async execute(): Promise<WorkspaceStatus> {
    const workspace =
      await this.workspaceStore.load()

    if (!workspace) {
      return {
        configured: false,
        rootDirectory: null,
        directoryExists: false
      }
    }

    return {
      configured: true,
      rootDirectory: workspace.rootDirectory,
      directoryExists:
        await directoryExists(workspace.rootDirectory)
    }
  }
}

async function directoryExists(
  directory: string
): Promise<boolean> {
  try {
    const result = await stat(directory)
    return result.isDirectory()
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false
    }

    throw error
  }
}