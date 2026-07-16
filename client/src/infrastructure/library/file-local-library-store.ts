import {
  dirname
} from "node:path"
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises"

import {
  LocalLibraryManifest
} from "../../domain/library/local-library.js"
import { LocalLibraryStore } from "../../domain/library/local-library-store.js"

export class FileLocalLibraryStore
implements LocalLibraryStore {
  constructor(
    private readonly filePath: string
  ) {}

  async load():
  Promise<LocalLibraryManifest | null> {
    try {
      const content =
        await readFile(
          this.filePath,
          "utf8"
        )

      const parsed =
        JSON.parse(content) as unknown

      if (!isLocalLibraryManifest(parsed)) {
        throw new Error(
          `Manifesto local inválido: ${this.filePath}`
        )
      }

      return parsed
    } catch (error) {
      if (
        isNodeError(error) &&
        error.code === "ENOENT"
      ) {
        return null
      }

      throw error
    }
  }

  async save(
    manifest: LocalLibraryManifest
  ): Promise<void> {
    await mkdir(
      dirname(this.filePath),
      {
        recursive: true
      }
    )

    const temporaryFile =
      `${this.filePath}.tmp`

    await writeFile(
      temporaryFile,
      JSON.stringify(
        manifest,
        null,
        2
      ),
      "utf8"
    )

    await rm(
      this.filePath,
      {
        force: true
      }
    )

    await rename(
      temporaryFile,
      this.filePath
    )
  }
}

function isLocalLibraryManifest(
  value: unknown
): value is LocalLibraryManifest {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false
  }

  const candidate =
    value as Partial<LocalLibraryManifest>

  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.networks ===
      "object" &&
    candidate.networks !== null &&
    typeof candidate.updatedAt ===
      "string"
  )
}

function isNodeError(
  error: unknown
): error is NodeJS.ErrnoException {
  return error instanceof Error
}
