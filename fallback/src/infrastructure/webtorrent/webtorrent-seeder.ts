import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { TorrentSeeder } from "../../application/ports/torrent-seeder";

// Tipagem minima local: WebTorrent 2.x e ESM-only e nao publica @types.
// Descrevemos apenas o que usamos, e carregamos o modulo via dynamic import
// para nao quebrar o build CommonJS.
interface Torrent {
  infoHash: string;
  on(event: "error", handler: (err: unknown) => void): void;
  destroy(cb?: () => void): void;
}

interface WebTorrentClient {
  add(magnetOrHash: string, opts: { path: string }): Torrent;
  seed(input: string, opts: { path: string }): Torrent;
  on(event: "error", handler: (err: unknown) => void): void;
  destroy(cb?: () => void): void;
}

type WebTorrentCtor = new () => WebTorrentClient;

async function hasLocalContent(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.length > 0;
  } catch {
    return false;
  }
}

export class WebTorrentSeeder implements TorrentSeeder {
  private client: WebTorrentClient | null = null;
  private readonly torrents = new Map<string, Torrent>();

  constructor(
    private readonly seedDir: string,
    private readonly log: (message: string, err?: unknown) => void = () => {},
  ) {}

  private async getClient(): Promise<WebTorrentClient> {
    if (!this.client) {
      const mod = (await import("webtorrent")) as unknown as { default: WebTorrentCtor };
      const WebTorrent = mod.default;
      const client = new WebTorrent();
      // Um 'error' de client sem listener derruba o processo (Node). Nunca deixe solto.
      client.on("error", (err) => this.log("webtorrent client error", err));
      this.client = client;
    }
    return this.client;
  }

  async seed(fileId: string, infoHash: string): Promise<void> {
    if (this.torrents.has(fileId)) {
      return;
    }
    const client = await this.getClient();
    const path = join(this.seedDir, fileId);

    // Semeia do EBS se ja temos o conteudo; senao busca da rede e persiste no path.
    // Ambos retornam o torrent imediatamente — nao bloqueamos esperando o download.
    const torrent = (await hasLocalContent(path))
      ? client.seed(path, { path })
      : client.add(infoHash, { path });

    torrent.on("error", (err) => {
      this.log(`torrent error for ${fileId}`, err);
      this.torrents.delete(fileId);
    });

    this.torrents.set(fileId, torrent);
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
      this.torrents.clear();
    }
  }
}
