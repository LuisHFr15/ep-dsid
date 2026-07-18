import { createHash, randomUUID } from "node:crypto"
import { copyFile, mkdir, readFile, stat } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"

import {
  DownloadFileInput,
  DownloadFileResult,
  SeedFileInput,
  SeedFileResult,
  TorrentEngine,
  TorrentResource
} from "../../domain/torrent/torrent-engine.js"
import { buildNetworkFolderName } from "../../domain/torrent/network-folder-name.js"
import { TorrentTransfer } from "../../domain/torrent/torrent-transfer.js"
import { TorrentTransferStore } from "../../domain/torrent/torrent-transfer-store.js"

export class FakeTorrentEngine implements TorrentEngine {
  constructor(
    private readonly transferStore: TorrentTransferStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async seedFile(input: SeedFileInput): Promise<SeedFileResult> {
    const sourcePath = resolve(input.sourceFilePath)
    const sourceStat = await stat(sourcePath)

    if (!sourceStat.isFile()) {
      throw new Error(`O caminho não representa um arquivo: ${sourcePath}`)
    }

    const filename = basename(sourcePath)
    const networkDirectory = this.getNetworkDirectory(
      input.destinationWorkspaceRoot,
      input.networkTitle,
      input.networkId
    )
    const destinationPath = join(networkDirectory, filename)

    await mkdir(networkDirectory, { recursive: true })

    if (!samePath(sourcePath, destinationPath)) {
      await copyFile(sourcePath, destinationPath)
    }

    const resource = await this.createFakeResource(destinationPath)
    const transfer = this.createCompletedTransfer({
      direction: "upload",
      networkId: input.networkId,
      networkTitle: input.networkTitle,
      resource,
      sourcePath,
      destinationPath
    })

    await this.transferStore.save(transfer)

    return { resource, transfer }
  }

  async downloadFile(input: DownloadFileInput): Promise<DownloadFileResult> {
    // TEMP-MVP8A: o magnet fake é o caminho absoluto da origem.
    const sourcePath = resolve(input.sourceMagnet)
    const sourceStat = await stat(sourcePath)

    if (!sourceStat.isFile()) {
      throw new Error(`A origem fake não representa um arquivo: ${sourcePath}`)
    }

    const networkDirectory = this.getNetworkDirectory(
      input.destinationWorkspaceRoot,
      input.networkTitle,
      input.networkId
    )
    const destinationPath = join(networkDirectory, input.filename)

    await mkdir(dirname(destinationPath), { recursive: true })

    if (!input.overwrite && await fileExists(destinationPath)) {
      throw new Error(`O arquivo de destino já existe: ${destinationPath}`)
    }

    if (!samePath(sourcePath, destinationPath)) {
      await copyFile(sourcePath, destinationPath)
    }

    const resource = await this.createFakeResource(destinationPath)
    const transfer = this.createCompletedTransfer({
      direction: "download",
      networkId: input.networkId,
      networkTitle: input.networkTitle,
      resource,
      sourcePath,
      destinationPath
    })

    await this.transferStore.save(transfer)

    return { resource, transfer }
  }

  async getTransfer(transferId: string): Promise<TorrentTransfer | null> {
    return this.transferStore.findById(transferId)
  }

  async listTransfers(): Promise<TorrentTransfer[]> {
    return this.transferStore.list()
  }

  async dispose(): Promise<void> {
    // O FakeTorrent não mantém sockets nem processos em segundo plano.
  }

  private getNetworkDirectory(
    workspaceRoot: string,
    networkTitle: string,
    networkId: string
  ): string {
    return join(
      resolve(workspaceRoot),
      buildNetworkFolderName(networkTitle, networkId)
    )
  }

  private async createFakeResource(filePath: string): Promise<TorrentResource> {
    const fileStat = await stat(filePath)
    const content = await readFile(filePath)
    const infoHash = createHash("sha1").update(content).digest("hex")

    return {
      filename: basename(filePath),
      size: fileStat.size,
      infoHash,
      magnet: `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(basename(filePath))}`,
      filePath
    }
  }

  private createCompletedTransfer(input: {
    direction: "upload" | "download"
    networkId: string
    networkTitle: string
    resource: TorrentResource
    sourcePath: string
    destinationPath: string
  }): TorrentTransfer {
    const now = this.now().toISOString()

    return {
      id: randomUUID(),
      direction: input.direction,
      status: "completed",
      networkId: input.networkId,
      networkTitle: input.networkTitle,
      filename: input.resource.filename,
      infoHash: input.resource.infoHash,
      magnet: input.resource.magnet,
      sourcePath: input.sourcePath,
      destinationPath: input.destinationPath,
      size: input.resource.size,
      progress: 1,
      startedAt: now,
      completedAt: now,
      error: null
    }
  }
}

function samePath(first: string, second: string): boolean {
  return resolve(first).toLowerCase() === resolve(second).toLowerCase()
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile()
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return false
    }

    throw error
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
}
