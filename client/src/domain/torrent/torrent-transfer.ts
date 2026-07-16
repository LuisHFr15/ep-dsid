export type TorrentTransferDirection = "upload" | "download"

export type TorrentTransferStatus =
  | "starting"
  | "completed"
  | "failed"

export type TorrentTransfer = {
  id: string
  direction: TorrentTransferDirection
  status: TorrentTransferStatus

  networkId: string
  networkTitle: string
  filename: string

  infoHash: string
  magnet: string

  sourcePath: string
  destinationPath: string

  size: number
  progress: number

  startedAt: string
  completedAt: string | null
  error: string | null
}
