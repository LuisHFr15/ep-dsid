import { randomUUID } from "node:crypto"
import { mkdir } from "node:fs/promises"
import { join, resolve } from "node:path"

import {
  DownloadFileInput,
  DownloadFileResult,
  SeedFileInput,
  SeedFileResult,
  TorrentEngine,
  TorrentResource,
} from "../../domain/torrent/torrent-engine.js"
import { buildNetworkFolderName, sanitizeFilename } from "../../domain/torrent/network-folder-name.js"
import { TorrentTransfer } from "../../domain/torrent/torrent-transfer.js"
import { TorrentTransferStore } from "../../domain/torrent/torrent-transfer-store.js"

// Tipagem mínima local: WebTorrent 2.x é ESM-only e não publica @types.
// Descrevemos apenas o que usamos; o módulo é carregado via dynamic import.
interface Torrent {
  infoHash: string
  magnetURI: string
  length: number
  progress: number
  on(event: "done" | "error", handler: (err?: unknown) => void): void
}

interface WebTorrentClient {
  seed(input: string, opts: { path: string }, cb: (torrent: Torrent) => void): void
  add(magnet: string, opts: { path: string }, cb: (torrent: Torrent) => void): void
  on(event: "error", handler: (err: unknown) => void): void
  destroy(cb?: () => void): void
}

type WebTorrentCtor = new () => WebTorrentClient

export class WebTorrentEngine implements TorrentEngine {
  private client: WebTorrentClient | null = null

  constructor(
    private readonly transferStore: TorrentTransferStore,
    private readonly log: (message: string, err?: unknown) => void = () => {},
  ) {}

  private async getClient(): Promise<WebTorrentClient> {
    if (!this.client) {
      const mod = (await import("webtorrent")) as unknown as { default: WebTorrentCtor }
      const client = new mod.default()
      client.on("error", (err) => this.log("webtorrent client error", err))
      this.client = client
    }
    return this.client
  }

  async seedFile(input: SeedFileInput): Promise<SeedFileResult> {
    const client = await this.getClient()
    const sourcePath = resolve(input.sourceFilePath)
    const networkDirectory = this.getNetworkDirectory(
      input.destinationWorkspaceRoot,
      input.networkTitle,
      input.networkId,
    )
    await mkdir(networkDirectory, { recursive: true })

    const torrent = await new Promise<Torrent>((resolvePromise, reject) => {
      let settled = false
      client.seed(sourcePath, { path: networkDirectory }, (created) => {
        if (settled) return
        settled = true
        resolvePromise(created)
      })
      setTimeout(() => {
        if (!settled) {
          settled = true
          reject(new Error("Timeout ao criar o torrent para semear"))
        }
      }, 30000)
    })

    torrent.on("error", (err) => this.log(`torrent error (seed) ${input.networkId}`, err))

    const resource: TorrentResource = {
      filename: sanitizeFilename(input.sourceFilePath),
      size: torrent.length,
      infoHash: torrent.infoHash,
      magnet: torrent.magnetURI,
      filePath: sourcePath,
    }

    const transfer = this.completedTransfer("upload", input.networkId, input.networkTitle, resource, sourcePath, join(networkDirectory, resource.filename))
    await this.transferStore.save(transfer)
    return { resource, transfer }
  }

  async downloadFile(input: DownloadFileInput): Promise<DownloadFileResult> {
    const client = await this.getClient()
    const networkDirectory = this.getNetworkDirectory(
      input.destinationWorkspaceRoot,
      input.networkTitle,
      input.networkId,
    )
    await mkdir(networkDirectory, { recursive: true })

    const transferId = randomUUID()
    const startedAt = new Date().toISOString()

    const torrent = await new Promise<Torrent>((resolvePromise, reject) => {
      let settled = false
      client.add(input.sourceMagnet, { path: networkDirectory }, (added) => {
        added.on("done", () => {
          if (settled) return
          settled = true
          resolvePromise(added)
        })
        added.on("error", (err) => {
          if (settled) return
          settled = true
          reject(err instanceof Error ? err : new Error(String(err)))
        })
      })
    })

    // filename vem da metadata do hub (fonte não confiável) — sanitiza antes
    // de compor o caminho para não escapar do diretório da rede.
    const safeFilename = sanitizeFilename(input.filename)
    const destinationPath = join(networkDirectory, safeFilename)
    const resource: TorrentResource = {
      filename: safeFilename,
      size: torrent.length,
      infoHash: torrent.infoHash,
      magnet: torrent.magnetURI,
      filePath: destinationPath,
    }

    const transfer: TorrentTransfer = {
      id: transferId,
      direction: "download",
      status: "completed",
      networkId: input.networkId,
      networkTitle: input.networkTitle,
      filename: safeFilename,
      infoHash: torrent.infoHash,
      magnet: torrent.magnetURI,
      sourcePath: input.sourceMagnet,
      destinationPath,
      size: torrent.length,
      progress: 1,
      startedAt,
      completedAt: new Date().toISOString(),
      error: null,
    }
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
    if (this.client) {
      await new Promise<void>((resolvePromise) => this.client!.destroy(() => resolvePromise()))
      this.client = null
    }
  }

  private getNetworkDirectory(workspaceRoot: string, networkTitle: string, networkId: string): string {
    return join(resolve(workspaceRoot), buildNetworkFolderName(networkTitle, networkId))
  }

  private completedTransfer(
    direction: "upload" | "download",
    networkId: string,
    networkTitle: string,
    resource: TorrentResource,
    sourcePath: string,
    destinationPath: string,
  ): TorrentTransfer {
    const now = new Date().toISOString()
    return {
      id: randomUUID(),
      direction,
      status: "completed",
      networkId,
      networkTitle,
      filename: resource.filename,
      infoHash: resource.infoHash,
      magnet: resource.magnet,
      sourcePath,
      destinationPath,
      size: resource.size,
      progress: 1,
      startedAt: now,
      completedAt: now,
      error: null,
    }
  }
}
