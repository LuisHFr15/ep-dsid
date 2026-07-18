import { describe, it, expect } from "vitest"
import type { TorrentRequest, TorrentResponse } from "./torrent-protocol.js"

describe("torrent protocol types", () => {
  it("represents a seed request", () => {
    const req: TorrentRequest = {
      id: "r1",
      type: "seed",
      fileId: "f1",
      sourceFilePath: "/tmp/a.pdf",
      networkId: "n1",
      networkTitle: "Docs",
      workspaceRoot: "/home/user/shared",
    }
    expect(req.type).toBe("seed")
  })

  it("represents a successful response", () => {
    const res: TorrentResponse = { id: "r1", ok: true, data: { infoHash: "abc" } }
    expect(res.ok).toBe(true)
  })

  it("represents an error response", () => {
    const res: TorrentResponse = { id: "r1", ok: false, error: "file not found" }
    expect(res.ok).toBe(false)
  })
})
