import { LocalLibraryManifest } from "./local-library.js"

export interface LocalLibraryStore {
  load(): Promise<LocalLibraryManifest | null>

  save(
    manifest: LocalLibraryManifest
  ): Promise<void>
}
