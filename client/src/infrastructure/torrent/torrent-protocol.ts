// Protocol between main process and the torrent utility process.
// The utility process hosts the TorrentEngine; the main process sends
// requests and receives responses/events over the MessagePort.

export type TorrentRequest =
  | { id: string; type: "seed"; fileId: string; sourceFilePath: string; networkId: string; networkTitle: string; workspaceRoot: string }
  | { id: string; type: "download"; fileId: string; networkId: string; networkTitle: string; workspaceRoot: string; magnet: string; filename: string }
  | { id: string; type: "listTransfers" }
  | { id: string; type: "dispose" }

export type TorrentResponse =
  | { id: string; ok: true; data: unknown }
  | { id: string; ok: false; error: string }

export type TorrentEvent =
  | { type: "transfer:update"; transfer: unknown }
