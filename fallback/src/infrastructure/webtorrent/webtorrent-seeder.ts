import { readdir, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
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

// WebTorrent 2.x é ESM-only. Como este pacote compila para CommonJS, um
// `import("webtorrent")` seria rebaixado pelo TypeScript para `require()`, que
// falha em módulos ESM ("require() of ES Module ..."). Este helper esconde o
// import() do compilador (via new Function) para que ele sobreviva como um
// import() dinâmico nativo em runtime — a forma correta de carregar ESM de CJS.
const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<unknown>;

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
      const mod = (await dynamicImport("webtorrent")) as { default: WebTorrentCtor };
      const WebTorrent = mod.default;
      const client = new WebTorrent();
      // Um 'error' de client sem listener derruba o processo (Node). Nunca deixe solto.
      client.on("error", (err) => this.log("webtorrent client error", err));
      this.client = client;
    }
    return this.client;
  }

  // Defesa em profundidade: o fileId já é validado como UUID em parse-command,
  // mas resolvemos o caminho e confirmamos que continua dentro do seedDir antes
  // de qualquer escrita/remoção. Um fileId com "../" ou vazio dispararia aqui.
  private resolveSeedPath(fileId: string): string {
    const root = resolve(this.seedDir);
    const target = resolve(root, fileId);

    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error(`fileId escapa do diretório de seed: ${fileId}`);
    }
    if (target === root) {
      throw new Error(`fileId inválido (resolve para o próprio seedDir): ${fileId}`);
    }

    return target;
  }

  async seed(fileId: string, infoHash: string, magnet?: string | null): Promise<void> {
    if (this.torrents.has(fileId)) {
      return;
    }
    const client = await this.getClient();
    const path = this.resolveSeedPath(fileId);

    // Semeia do EBS se ja temos o conteudo; senao busca da rede e persiste no path.
    // Preferimos o magnet completo (traz os trackers do publicador) ao infoHash
    // puro — sem trackers a descoberta de peers costuma falhar.
    // Ambos retornam o torrent imediatamente — nao bloqueamos esperando o download.
    const torrent = (await hasLocalContent(path))
      ? client.seed(path, { path })
      : client.add(magnet ?? infoHash, { path });

    torrent.on("error", (err) => {
      this.log(`torrent error for ${fileId}`, err);
      this.torrents.delete(fileId);
    });

    this.torrents.set(fileId, torrent);
  }

  async drop(fileId: string): Promise<void> {
    const path = this.resolveSeedPath(fileId);
    const torrent = this.torrents.get(fileId);
    if (torrent) {
      await new Promise<void>((done) => torrent.destroy(() => done()));
      this.torrents.delete(fileId);
    }
    await rm(path, { recursive: true, force: true });
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
