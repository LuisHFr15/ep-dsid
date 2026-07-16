import { TorrentTransfer } from "./torrent-transfer.js"

export interface TorrentTransferStore {
  list(): Promise<TorrentTransfer[]>
  findById(id: string): Promise<TorrentTransfer | null>
  save(transfer: TorrentTransfer): Promise<void>
  clear(): Promise<void>
}
