import {
  readdir,
  stat
} from "node:fs/promises"
import {
  join,
  relative
} from "node:path"

export type LocalLibraryEntry = {
  relativePath: string
  absolutePath: string
  size: number
  modifiedAt: string
}

export class NodeLocalLibraryScanner {
  async scan(
    rootDirectory: string
  ): Promise<LocalLibraryEntry[]> {
    const files: LocalLibraryEntry[] = []

    await this.scanDirectory(
      rootDirectory,
      rootDirectory,
      files
    )

    return files.sort((left, right) =>
      left.relativePath.localeCompare(
        right.relativePath
      )
    )
  }

  private async scanDirectory(
    rootDirectory: string,
    currentDirectory: string,
    files: LocalLibraryEntry[]
  ): Promise<void> {
    const entries = await readdir(
      currentDirectory,
      {
        withFileTypes: true
      }
    )

    for (const entry of entries) {
      const absolutePath = join(
        currentDirectory,
        entry.name
      )

      if (entry.isDirectory()) {
        await this.scanDirectory(
          rootDirectory,
          absolutePath,
          files
        )

        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const fileStat = await stat(absolutePath)

      files.push({
        relativePath: relative(
          rootDirectory,
          absolutePath
        ),
        absolutePath,
        size: fileStat.size,
        modifiedAt:
          fileStat.mtime.toISOString()
      })
    }
  }
}