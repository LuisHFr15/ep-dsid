import {
  WorkspaceStore
} from "../../domain/workspace/workspace-store.js"
import {
  LocalLibraryEntry,
  NodeLocalLibraryScanner
} from "../../infrastructure/workspace/node-local-library-scanner.js"

export type LocalLibrary = {
  rootDirectory: string
  files: LocalLibraryEntry[]
}

export class ListLocalLibrary {
  constructor(
    private readonly workspaceStore: WorkspaceStore,
    private readonly scanner: NodeLocalLibraryScanner
  ) {}

  async execute(): Promise<LocalLibrary> {
    const workspace =
      await this.workspaceStore.load()

    if (!workspace) {
      throw new Error(
        "Workspace não configurada. Execute client:init ou workspace:configure."
      )
    }

    return {
      rootDirectory: workspace.rootDirectory,
      files: await this.scanner.scan(
        workspace.rootDirectory
      )
    }
  }
}