import { TorrentTransfer } from "./torrent-transfer.js"

export type TorrentResource = {
  filename: string
  size: number
  infoHash: string
  magnet: string
  filePath: string
}

export type SeedFileInput = {
  networkId: string
  networkTitle: string
  sourceFilePath: string
  destinationWorkspaceRoot: string
}

export type SeedFileResult = {
  resource: TorrentResource
  transfer: TorrentTransfer
}

export type DownloadFileInput = {
  networkId: string
  networkTitle: string
  filename: string

  /**
   * TEMP-MVP8A:
   * No FakeTorrent, o magnet é diretamente o caminho absoluto da origem.
   * A implementação WebTorrent futura usará um magnet URI real.
   */
  sourceMagnet: string

  destinationWorkspaceRoot: string
  overwrite: boolean
}

export type DownloadFileResult = {
  resource: TorrentResource
  transfer: TorrentTransfer
}

export interface TorrentEngine {
  seedFile(input: SeedFileInput): Promise<SeedFileResult>

  downloadFile(input: DownloadFileInput): Promise<DownloadFileResult>

  getTransfer(transferId: string): Promise<TorrentTransfer | null>

  listTransfers(): Promise<TorrentTransfer[]>

  dispose(): Promise<void>
}
