import {
  stat
} from "node:fs/promises"

import {
  LocalFileInspection,
  LocalFileInspector
} from "../../domain/library/local-file-inspector.js"

export class NodeLocalFileInspector
implements LocalFileInspector {
  async inspect(
    filePath: string
  ): Promise<LocalFileInspection> {
    try {
      const result =
        await stat(filePath)

      return {
        exists: true,
        isFile: result.isFile(),
        size: result.size,
        modifiedAt:
          result.mtime.toISOString()
      }
    } catch (error) {
      if (
        isNodeError(error) &&
        error.code === "ENOENT"
      ) {
        return {
          exists: false,
          isFile: false,
          size: null,
          modifiedAt: null
        }
      }

      throw error
    }
  }
}

function isNodeError(
  error: unknown
): error is NodeJS.ErrnoException {
  return error instanceof Error
}
