import { TorrentEngine } from "../../domain/torrent/torrent-engine.js"
import { TorrentTransfer } from "../../domain/torrent/torrent-transfer.js"

export class ListTorrentTransfers {
  constructor(private readonly torrentEngine: TorrentEngine) {}

  execute(): Promise<TorrentTransfer[]> {
    return this.torrentEngine.listTransfers()
  }
}
