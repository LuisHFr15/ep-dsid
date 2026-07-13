import { rm } from "node:fs/promises";
import { join } from "node:path";
import { TorrentSeeder } from "../../application/ports/torrent-seeder";

// Tipagem minima local: WebTorrent 2.x e ESM-only e nao publica @types.
// Descrevemos apenas o que usamos, e carregamos o modulo via dynamic import
// para nao quebrar o build CommonJS.
interface Torrent {
  destroy(cb?: () => void): void;
}

interface WebTorrentClient {
  add(magnetOrHash: string, opts: { path: string }, cb: (torrent: Torrent) => void): void;
  destroy(cb?: () => void): void;
}

type WebTorrentCtor = new () => WebTorrentClient;

export class WebTorrentSeeder implements TorrentSeeder {
  private client: WebTorrentClient | null = null;
  private readonly torrents = new Map<string, Torrent>();

  constructor(private readonly seedDir: string) {}

  private async getClient(): Promise<WebTorrentClient> {
    if (!this.client) {
      const mod = (await import("webtorrent")) as unknown as { default: WebTorrentCtor };
      const WebTorrent = mod.default;
      this.client = new WebTorrent();
    }
    return this.client;
  }

  async seed(fileId: string, infoHash: string): Promise<void> {
    const client = await this.getClient();
    const path = join(this.seedDir, fileId);
    await new Promise<void>((resolve) => {
      client.add(infoHash, { path }, (torrent) => {
        this.torrents.set(fileId, torrent);
        resolve();
      });
    });
  }

  async drop(fileId: string): Promise<void> {
    const torrent = this.torrents.get(fileId);
    if (torrent) {
      await new Promise<void>((resolve) => torrent.destroy(() => resolve()));
      this.torrents.delete(fileId);
    }
    await rm(join(this.seedDir, fileId), { recursive: true, force: true });
  }

  isSeeding(fileId: string): boolean {
    return this.torrents.has(fileId);
  }

  async close(): Promise<void> {
    if (this.client) {
      await new Promise<void>((resolve) => this.client!.destroy(() => resolve()));
      this.client = null;
    }
  }
}
