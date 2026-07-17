import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises"
import { dirname } from "node:path"
import { randomUUID } from "node:crypto"

export async function readJsonFile<T>(
  filePath: string
): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8")
    return JSON.parse(content) as T
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null
    }

    throw new Error(
      `Não foi possível ler o arquivo JSON ${filePath}: ${getErrorMessage(error)}`
    )
  }
}

export async function writeJsonFile<T>(
  filePath: string,
  value: T
): Promise<void> {
  await mkdir(dirname(filePath), {
    recursive: true
  })

  /*
   * Escreve primeiro em um arquivo temporário e depois renomeia.
   * Isso reduz a chance de deixar um JSON incompleto se o processo
   * for interrompido durante a gravação.
   */
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  const content = `${JSON.stringify(value, null, 2)}\n`

  try {
    await writeFile(temporaryPath, content, "utf8")
    await rename(temporaryPath, filePath)
  } catch (error) {
    await rm(temporaryPath, {
      force: true
    })

    throw new Error(
      `Não foi possível salvar o arquivo JSON ${filePath}: ${getErrorMessage(error)}`
    )
  }
}

export async function removeFileIfExists(
  filePath: string
): Promise<void> {
  await rm(filePath, {
    force: true
  })
}

function isNodeError(
  error: unknown
): error is NodeJS.ErrnoException {
  return error instanceof Error
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error)
}