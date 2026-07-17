import { dirname } from "node:path"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"

import { TorrentTransfer } from "../../domain/torrent/torrent-transfer.js"
import { TorrentTransferStore } from "../../domain/torrent/torrent-transfer-store.js"

type TransferFile = {
  transfers: TorrentTransfer[]
}

export class FileTorrentTransferStore implements TorrentTransferStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<TorrentTransfer[]> {
    const file = await this.loadFile()

    return [...file.transfers].sort((a, b) =>
      b.startedAt.localeCompare(a.startedAt)
    )
  }

  async findById(id: string): Promise<TorrentTransfer | null> {
    const file = await this.loadFile()

    return file.transfers.find((transfer) => transfer.id === id) ?? null
  }

  async save(transfer: TorrentTransfer): Promise<void> {
    const file = await this.loadFile()
    const existingIndex = file.transfers.findIndex(
      (item) => item.id === transfer.id
    )

    if (existingIndex >= 0) {
      file.transfers[existingIndex] = transfer
    } else {
      file.transfers.push(transfer)
    }

    await this.writeFile(file)
  }

  async clear(): Promise<void> {
    await rm(this.filePath, { force: true })
  }

  private async loadFile(): Promise<TransferFile> {
    try {
      const content = await readFile(this.filePath, "utf8")
      const parsed = JSON.parse(content) as Partial<TransferFile>

      return {
        transfers: Array.isArray(parsed.transfers)
          ? parsed.transfers
          : []
      }
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { transfers: [] }
      }

      throw error
    }
  }

  private async writeFile(value: TransferFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })

    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`
    const serialized = `${JSON.stringify(value, null, 2)}\n`

    await writeFile(temporaryPath, serialized, "utf8")

    try {
      await rm(this.filePath, { force: true })
      await rename(temporaryPath, this.filePath)
    } catch (error) {
      await rm(temporaryPath, { force: true })
      throw error
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
}
